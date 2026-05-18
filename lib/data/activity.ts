import 'server-only';
import { db, schema } from '@/lib/db/client';
import { desc, eq } from 'drizzle-orm';

export type ActivityItem =
  | {
      kind: 'event';
      id: number;
      at: Date;
      memberName: string;
      memberId: number;
      managerName: string;
      sentiment: 'positive' | 'negative';
      severity: string;
      category: string;
      note: string;
    }
  | {
      kind: 'metric';
      id: number;
      at: Date;
      designName: string;
      designId: number;
      ownerName: string;
      ownerId: number;
      managerName: string;
      metricType: string;
      value: number;
    };

export async function recentActivity(limit = 12): Promise<ActivityItem[]> {
  const events = await db
    .select({
      id: schema.events.id,
      at: schema.events.occurredAt,
      memberName: schema.teamMembers.name,
      memberId: schema.teamMembers.id,
      managerName: schema.users.name,
      sentiment: schema.events.sentiment,
      severity: schema.events.severity,
      category: schema.events.category,
      note: schema.events.note,
    })
    .from(schema.events)
    .innerJoin(schema.teamMembers, eq(schema.teamMembers.id, schema.events.teamMemberId))
    .innerJoin(schema.users, eq(schema.users.id, schema.events.managerId))
    .orderBy(desc(schema.events.occurredAt))
    .limit(limit);

  const metrics = await db
    .select({
      id: schema.designMetrics.id,
      at: schema.designMetrics.recordedAt,
      designName: schema.designAssets.name,
      designId: schema.designAssets.id,
      ownerName: schema.teamMembers.name,
      ownerId: schema.teamMembers.id,
      managerName: schema.users.name,
      metricType: schema.designMetrics.metricType,
      value: schema.designMetrics.value,
    })
    .from(schema.designMetrics)
    .innerJoin(schema.designAssets, eq(schema.designAssets.id, schema.designMetrics.designAssetId))
    .innerJoin(schema.teamMembers, eq(schema.teamMembers.id, schema.designAssets.teamMemberId))
    .innerJoin(schema.users, eq(schema.users.id, schema.designMetrics.managerId))
    .orderBy(desc(schema.designMetrics.recordedAt))
    .limit(limit);

  const merged: ActivityItem[] = [
    ...events.map<ActivityItem>((e) => ({
      kind: 'event',
      id: e.id,
      at: e.at as Date,
      memberName: e.memberName,
      memberId: e.memberId,
      managerName: e.managerName,
      sentiment: e.sentiment,
      severity: e.severity,
      category: e.category,
      note: e.note,
    })),
    ...metrics.map<ActivityItem>((m) => ({
      kind: 'metric',
      id: m.id,
      at: m.at as Date,
      designName: m.designName,
      designId: m.designId,
      ownerName: m.ownerName,
      ownerId: m.ownerId,
      managerName: m.managerName,
      metricType: m.metricType,
      value: m.value,
    })),
  ];

  return merged.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

export type MonthCounts = {
  thisMonth: { positive: number; negative: number; total: number };
  lastMonth: { positive: number; negative: number; total: number };
};

export async function monthEventCounts(): Promise<MonthCounts> {
  const now = new Date();
  const startThis = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const endLast = startThis;

  const rows = await db.select({
    occurredAt: schema.events.occurredAt,
    sentiment: schema.events.sentiment,
  }).from(schema.events);

  const acc: MonthCounts = {
    thisMonth: { positive: 0, negative: 0, total: 0 },
    lastMonth: { positive: 0, negative: 0, total: 0 },
  };
  for (const r of rows) {
    const t = (r.occurredAt as Date).getTime();
    if (t >= startThis) {
      acc.thisMonth.total++;
      if (r.sentiment === 'positive') acc.thisMonth.positive++;
      else acc.thisMonth.negative++;
    } else if (t >= startLast && t < endLast) {
      acc.lastMonth.total++;
      if (r.sentiment === 'positive') acc.lastMonth.positive++;
      else acc.lastMonth.negative++;
    }
  }
  return acc;
}
