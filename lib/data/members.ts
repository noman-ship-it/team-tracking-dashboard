import 'server-only';
import { db, schema } from '@/lib/db/client';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import {
  computeCategoryScores,
  computeScore,
  eventsBefore,
  eventsInMonth,
  firstDayOfMonth,
  lastDayOfMonth,
  statusForScore,
  trendDirection,
  type CategoryScores,
} from '@/lib/scoring/engine';
import type { Event, ManagerNote, MonthlySnapshot, Status, TeamMember, User } from '@/lib/db/schema';
import { previousYm, snapshotsForMember, ymOf } from '@/lib/reports/snapshot';

export type MemberSummary = {
  member: TeamMember;
  score: number;
  status: Status;
  eventsThisMonth: number;
  trend: 'up' | 'down' | 'flat';
  scoreDelta: number | null;
};

export async function listActiveMembers(): Promise<TeamMember[]> {
  return db
    .select()
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.active, true))
    .orderBy(asc(schema.teamMembers.name));
}

export async function listAllMembers(): Promise<TeamMember[]> {
  return db.select().from(schema.teamMembers).orderBy(asc(schema.teamMembers.name));
}

export async function getMember(id: number): Promise<TeamMember | undefined> {
  const rows = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.id, id)).limit(1);
  return rows[0];
}

export async function eventsForMember(id: number): Promise<Event[]> {
  return db
    .select()
    .from(schema.events)
    .where(eq(schema.events.teamMemberId, id))
    .orderBy(desc(schema.events.occurredAt));
}

export async function notesForMember(id: number): Promise<Array<ManagerNote & { managerName: string }>> {
  const rows = await db
    .select({
      id: schema.managerNotes.id,
      teamMemberId: schema.managerNotes.teamMemberId,
      managerId: schema.managerNotes.managerId,
      body: schema.managerNotes.body,
      createdAt: schema.managerNotes.createdAt,
      managerName: schema.users.name,
    })
    .from(schema.managerNotes)
    .innerJoin(schema.users, eq(schema.users.id, schema.managerNotes.managerId))
    .where(eq(schema.managerNotes.teamMemberId, id))
    .orderBy(desc(schema.managerNotes.createdAt));
  return rows;
}

export async function eventsForMemberWithManager(id: number): Promise<Array<Event & { managerName: string }>> {
  const rows = await db
    .select({
      id: schema.events.id,
      teamMemberId: schema.events.teamMemberId,
      managerId: schema.events.managerId,
      category: schema.events.category,
      sentiment: schema.events.sentiment,
      severity: schema.events.severity,
      note: schema.events.note,
      occurredAt: schema.events.occurredAt,
      createdAt: schema.events.createdAt,
      managerName: schema.users.name,
    })
    .from(schema.events)
    .innerJoin(schema.users, eq(schema.users.id, schema.events.managerId))
    .where(eq(schema.events.teamMemberId, id))
    .orderBy(desc(schema.events.occurredAt));
  return rows;
}

export async function summarizeMember(member: TeamMember, asOf = new Date()): Promise<MemberSummary> {
  const events = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.teamMemberId, member.id));

  const score = computeScore(events, asOf);
  const status = statusForScore(score);
  const { year, month } = ymOf(asOf);
  const inMonth = eventsInMonth(events, year, month);

  const prev = previousYm(year, month);
  const prevSnapshots = await db
    .select()
    .from(schema.monthlySnapshots)
    .where(
      and(
        eq(schema.monthlySnapshots.teamMemberId, member.id),
        eq(schema.monthlySnapshots.year, prev.year),
        eq(schema.monthlySnapshots.month, prev.month)
      )
    )
    .limit(1);
  const prevScore = prevSnapshots[0]?.score ?? null;

  return {
    member,
    score,
    status,
    eventsThisMonth: inMonth.length,
    scoreDelta: prevScore == null ? null : score - prevScore,
    trend: trendDirection(score, prevScore),
  };
}

export async function summarizeAll(asOf = new Date()): Promise<MemberSummary[]> {
  const members = await listActiveMembers();
  return Promise.all(members.map((m) => summarizeMember(m, asOf)));
}

export type MemberDetail = MemberSummary & {
  categoryScores: CategoryScores;
  events: Array<Event & { managerName: string }>;
  notes: Array<ManagerNote & { managerName: string }>;
  snapshots: MonthlySnapshot[];
};

export async function memberDetail(id: number, asOf = new Date()): Promise<MemberDetail | null> {
  const member = await getMember(id);
  if (!member) return null;
  const summary = await summarizeMember(member, asOf);
  const events = await eventsForMemberWithManager(id);
  const notes = await notesForMember(id);
  const snapshots = await snapshotsForMember(id);
  const categoryScores = computeCategoryScores(events, asOf);
  return { ...summary, categoryScores, events, notes, snapshots };
}
