import 'server-only';
import { db, schema } from '@/lib/db/client';
import { and, eq } from 'drizzle-orm';

export async function getKpiOverride(
  year: number,
  month: number,
  key: string,
): Promise<number | null> {
  const rows = await db
    .select({ value: schema.kpiOverrides.value })
    .from(schema.kpiOverrides)
    .where(
      and(
        eq(schema.kpiOverrides.year, year),
        eq(schema.kpiOverrides.month, month),
        eq(schema.kpiOverrides.key, key),
      ),
    )
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setKpiOverride(
  year: number,
  month: number,
  key: string,
  value: number,
): Promise<void> {
  await db
    .insert(schema.kpiOverrides)
    .values({ year, month, key, value })
    .onConflictDoUpdate({
      target: [schema.kpiOverrides.year, schema.kpiOverrides.month, schema.kpiOverrides.key],
      set: { value, updatedAt: new Date() },
    });
}
