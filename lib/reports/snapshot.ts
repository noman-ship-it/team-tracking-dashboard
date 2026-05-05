import 'server-only';
import { db, schema } from '@/lib/db/client';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import {
  computeScore,
  computeCategoryScores,
  statusForScore,
  eventsBefore,
  firstDayOfMonth,
  lastDayOfMonth,
  type CategoryScores,
} from '@/lib/scoring/engine';
import { generateSummary } from './summary';
import type { Event, MonthlySnapshot, TeamMember } from '@/lib/db/schema';

export type GeneratedSnapshot = {
  teamMemberId: number;
  year: number;
  month: number;
  source: 'llm' | 'fallback';
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function generateSnapshotForMember(
  member: TeamMember,
  year: number,
  month: number
): Promise<GeneratedSnapshot> {
  const monthEnd = lastDayOfMonth(year, month);
  const monthStart = firstDayOfMonth(year, month);

  const allEvents = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.teamMemberId, member.id))
    .orderBy(asc(schema.events.occurredAt));

  const eventsAsOfMonthEnd = eventsBefore(allEvents, monthEnd);
  const score = computeScore(eventsAsOfMonthEnd, monthEnd);
  const categoryScores = computeCategoryScores(eventsAsOfMonthEnd, monthEnd);
  const status = statusForScore(score);

  const inMonth = allEvents.filter((e) => {
    const t = e.occurredAt instanceof Date ? e.occurredAt.getTime() : new Date(e.occurredAt).getTime();
    return t >= monthStart.getTime() && t <= monthEnd.getTime();
  });
  const positiveCount = inMonth.filter((e) => e.sentiment === 'positive').length;
  const negativeCount = inMonth.filter((e) => e.sentiment === 'negative').length;

  // Previous snapshot for trend reference
  const prev = await previousSnapshot(member.id, year, month);

  // Top 3 most-significant events (by base point magnitude) in this month
  const severityWeight = { significant: 3, moderate: 2, minor: 1 };
  const ranked = [...inMonth].sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
  const topPositive = ranked.filter((e) => e.sentiment === 'positive').slice(0, 3);
  const topNegative = ranked.filter((e) => e.sentiment === 'negative').slice(0, 3);

  const summary = await generateSummary({
    name: member.name,
    role: member.role,
    status,
    previousStatus: prev?.status ?? null,
    thisMonthScore: score,
    previousMonthScore: prev?.score ?? null,
    categoryScores,
    topPositive: topPositive.map((e) => ({
      category: e.category,
      severity: e.severity,
      note: e.note,
      date: fmtDate(e.occurredAt as Date),
    })),
    topNegative: topNegative.map((e) => ({
      category: e.category,
      severity: e.severity,
      note: e.note,
      date: fmtDate(e.occurredAt as Date),
    })),
    positiveCount,
    negativeCount,
  });

  // Upsert
  const existing = await db
    .select()
    .from(schema.monthlySnapshots)
    .where(
      and(
        eq(schema.monthlySnapshots.teamMemberId, member.id),
        eq(schema.monthlySnapshots.year, year),
        eq(schema.monthlySnapshots.month, month)
      )
    )
    .limit(1);

  const row = {
    teamMemberId: member.id,
    year,
    month,
    score,
    status,
    positiveCount,
    negativeCount,
    categoryScoresJson: JSON.stringify(categoryScores),
    summaryText: summary.text,
    summarySource: summary.source,
    generatedAt: new Date(),
  };

  if (existing[0]) {
    await db
      .update(schema.monthlySnapshots)
      .set(row)
      .where(eq(schema.monthlySnapshots.id, existing[0].id));
  } else {
    await db.insert(schema.monthlySnapshots).values(row);
  }

  return { teamMemberId: member.id, year, month, source: summary.source };
}

export async function generateSnapshotsForAllActive(year: number, month: number): Promise<GeneratedSnapshot[]> {
  const members = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.active, true));
  const out: GeneratedSnapshot[] = [];
  for (const m of members) {
    out.push(await generateSnapshotForMember(m, year, month));
  }
  return out;
}

export async function previousSnapshot(memberId: number, year: number, month: number): Promise<MonthlySnapshot | undefined> {
  const all = await db
    .select()
    .from(schema.monthlySnapshots)
    .where(eq(schema.monthlySnapshots.teamMemberId, memberId))
    .orderBy(desc(schema.monthlySnapshots.year), desc(schema.monthlySnapshots.month));
  return all.find((s) => s.year < year || (s.year === year && s.month < month));
}

export async function snapshotsForMember(memberId: number): Promise<MonthlySnapshot[]> {
  return db
    .select()
    .from(schema.monthlySnapshots)
    .where(eq(schema.monthlySnapshots.teamMemberId, memberId))
    .orderBy(asc(schema.monthlySnapshots.year), asc(schema.monthlySnapshots.month));
}

export async function snapshotForMonth(memberId: number, year: number, month: number): Promise<MonthlySnapshot | undefined> {
  const rows = await db
    .select()
    .from(schema.monthlySnapshots)
    .where(
      and(
        eq(schema.monthlySnapshots.teamMemberId, memberId),
        eq(schema.monthlySnapshots.year, year),
        eq(schema.monthlySnapshots.month, month)
      )
    )
    .limit(1);
  return rows[0];
}

export function ymOf(date: Date): { year: number; month: number } {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function previousYm(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}
