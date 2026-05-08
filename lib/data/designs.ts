import 'server-only';
import { db, schema } from '@/lib/db/client';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { DesignAsset, DesignMetric, MetricType, Platform, TeamMember } from '@/lib/db/schema';

// Each row in design_metrics is a snapshot. The "current" value of a design's
// impressions / reach / etc is the latest snapshot of that metric type.
// Aggregations below all use that "latest per (asset, metric_type)" pattern.

export type DesignWithLatest = {
  design: DesignAsset;
  owner: TeamMember;
  latestImpressions: number;
  latestReach: number;
  latestEngagements: number;
  latestClicks: number;
  latestConversions: number;
  lastRecordedAt: Date | null;
  snapshotCount: number;
};

export type DesignerLeaderRow = {
  member: TeamMember;
  designCount: number;
  totalImpressions: number;
  totalEngagements: number;
  topDesignName: string | null;
  topDesignImpressions: number;
};

export async function listDesigns(includeArchived = false): Promise<DesignWithLatest[]> {
  const rows = await db
    .select({
      design: schema.designAssets,
      owner: schema.teamMembers,
    })
    .from(schema.designAssets)
    .innerJoin(schema.teamMembers, eq(schema.teamMembers.id, schema.designAssets.teamMemberId))
    .where(includeArchived ? sql`1 = 1` : isNull(schema.designAssets.archivedAt))
    .orderBy(desc(schema.designAssets.createdAt));

  // Latest value per (asset, metric_type)
  const latest = await db
    .select({
      designAssetId: schema.designMetrics.designAssetId,
      metricType: schema.designMetrics.metricType,
      value: schema.designMetrics.value,
      recordedAt: schema.designMetrics.recordedAt,
    })
    .from(schema.designMetrics)
    .innerJoin(
      db
        .select({
          designAssetId: schema.designMetrics.designAssetId,
          metricType: schema.designMetrics.metricType,
          maxId: sql<number>`max(${schema.designMetrics.id})`.as('maxId'),
        })
        .from(schema.designMetrics)
        .groupBy(schema.designMetrics.designAssetId, schema.designMetrics.metricType)
        .as('latest_ids'),
      sql`design_metrics.id = latest_ids."maxId"`
    );

  const counts = await db
    .select({
      designAssetId: schema.designMetrics.designAssetId,
      n: sql<number>`count(*)`,
    })
    .from(schema.designMetrics)
    .groupBy(schema.designMetrics.designAssetId);

  const countMap = new Map<number, number>(counts.map((c) => [c.designAssetId, Number(c.n)]));
  const latestMap = new Map<number, Map<MetricType, { value: number; recordedAt: Date }>>();
  for (const r of latest) {
    if (!latestMap.has(r.designAssetId)) latestMap.set(r.designAssetId, new Map());
    latestMap
      .get(r.designAssetId)!
      .set(r.metricType as MetricType, { value: r.value, recordedAt: r.recordedAt as Date });
  }

  return rows.map(({ design, owner }) => {
    const m = latestMap.get(design.id) ?? new Map();
    const lastRecordedAt =
      Array.from(m.values()).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0]
        ?.recordedAt ?? null;
    return {
      design,
      owner,
      latestImpressions: m.get('impressions')?.value ?? 0,
      latestReach: m.get('reach')?.value ?? 0,
      latestEngagements: m.get('engagements')?.value ?? 0,
      latestClicks: m.get('clicks')?.value ?? 0,
      latestConversions: m.get('conversions')?.value ?? 0,
      lastRecordedAt,
      snapshotCount: countMap.get(design.id) ?? 0,
    };
  });
}

export async function listDesignsForMember(memberId: number): Promise<DesignWithLatest[]> {
  const all = await listDesigns(true);
  return all.filter((d) => d.owner.id === memberId);
}

export async function metricsForDesign(designId: number): Promise<DesignMetric[]> {
  return db
    .select()
    .from(schema.designMetrics)
    .where(eq(schema.designMetrics.designAssetId, designId))
    .orderBy(desc(schema.designMetrics.recordedAt));
}

export async function topDesignsByImpressions(limit = 5): Promise<DesignWithLatest[]> {
  const all = await listDesigns(false);
  return [...all].sort((a, b) => b.latestImpressions - a.latestImpressions).slice(0, limit);
}

export async function designerLeaderboard(): Promise<DesignerLeaderRow[]> {
  const all = await listDesigns(false);
  const byOwner = new Map<number, DesignWithLatest[]>();
  for (const d of all) {
    if (!byOwner.has(d.owner.id)) byOwner.set(d.owner.id, []);
    byOwner.get(d.owner.id)!.push(d);
  }

  const rows: DesignerLeaderRow[] = [];
  for (const [, designs] of byOwner) {
    const owner = designs[0].owner;
    const totalImpressions = designs.reduce((s, d) => s + d.latestImpressions, 0);
    const totalEngagements = designs.reduce((s, d) => s + d.latestEngagements, 0);
    const top = [...designs].sort((a, b) => b.latestImpressions - a.latestImpressions)[0];
    rows.push({
      member: owner,
      designCount: designs.length,
      totalImpressions,
      totalEngagements,
      topDesignName: top?.design.name ?? null,
      topDesignImpressions: top?.latestImpressions ?? 0,
    });
  }
  return rows.sort((a, b) => b.totalImpressions - a.totalImpressions);
}

export async function createDesign(input: {
  teamMemberId: number;
  name: string;
  link: string;
  platform: Platform;
}): Promise<DesignAsset> {
  const [row] = await db
    .insert(schema.designAssets)
    .values({
      teamMemberId: input.teamMemberId,
      name: input.name,
      link: input.link,
      platform: input.platform,
    })
    .returning();
  return row;
}

export async function archiveDesign(id: number): Promise<void> {
  await db
    .update(schema.designAssets)
    .set({ archivedAt: new Date() })
    .where(eq(schema.designAssets.id, id));
}

export async function logMetric(input: {
  designAssetId: number;
  metricType: MetricType;
  value: number;
  managerId: number;
  note?: string;
}): Promise<DesignMetric> {
  const [row] = await db
    .insert(schema.designMetrics)
    .values({
      designAssetId: input.designAssetId,
      metricType: input.metricType,
      value: input.value,
      managerId: input.managerId,
      note: input.note ?? '',
    })
    .returning();
  return row;
}

// Suppress unused import if and asc never used
void and;
void asc;
