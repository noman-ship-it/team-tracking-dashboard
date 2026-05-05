import Link from 'next/link';
import { db, schema } from '@/lib/db/client';
import { and, desc, eq } from 'drizzle-orm';
import { listActiveMembers, summarizeAll } from '@/lib/data/members';
import { previousYm, ymOf } from '@/lib/reports/snapshot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { GenerateSnapshotsButton } from './generate-button';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_RANK } from '@/lib/scoring/config';
import { CATEGORIES, type Category } from '@/lib/db/schema';
import { round1, monthName } from '@/lib/utils';
import { computeCategoryScores, type CategoryScores } from '@/lib/scoring/engine';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const summaries = await summarizeAll();
  const ranked = [...summaries].sort((a, b) => b.score - a.score);

  const teamHealth =
    summaries.length === 0
      ? 0
      : summaries.reduce((acc, s) => acc + STATUS_RANK[s.status], 0) / summaries.length;
  const teamHealthPct = Math.round((teamHealth / 5) * 100);

  // Team-wide weakest categories (sum of negative contributions across active members)
  const allEvents = await db.select().from(schema.events);
  const teamCategoryTotals: CategoryScores = computeCategoryScores(allEvents);
  const sortedCategories = [...CATEGORIES].sort((a, b) => teamCategoryTotals[a] - teamCategoryTotals[b]);
  const weakestCats = sortedCategories.slice(0, 2);

  // Members who dropped status this month vs last month
  const now = new Date();
  const { year, month } = ymOf(now);
  const prev = previousYm(year, month);
  const drops: Array<{ name: string; id: number; from: string; to: string }> = [];
  const allMembers = await listActiveMembers();
  for (const m of allMembers) {
    const prevSnap = (
      await db
        .select()
        .from(schema.monthlySnapshots)
        .where(
          and(
            eq(schema.monthlySnapshots.teamMemberId, m.id),
            eq(schema.monthlySnapshots.year, prev.year),
            eq(schema.monthlySnapshots.month, prev.month)
          )
        )
        .limit(1)
    )[0];
    if (!prevSnap) continue;
    const summary = summaries.find((s) => s.member.id === m.id);
    if (!summary) continue;
    if (STATUS_RANK[summary.status] < STATUS_RANK[prevSnap.status]) {
      drops.push({
        id: m.id,
        name: m.name,
        from: STATUS_LABELS[prevSnap.status],
        to: STATUS_LABELS[summary.status],
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Team overview · {monthName(month)} {year}
          </p>
        </div>
        <GenerateSnapshotsButton />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Team health</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{teamHealthPct}%</p>
            <p className="text-xs text-muted-foreground">average status across the team</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Weakest categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {weakestCats.map((c) => (
                <li key={c} className="flex justify-between">
                  <span>{CATEGORY_LABELS[c]}</span>
                  <span className="tabular-nums text-muted-foreground">{round1(teamCategoryTotals[c])}</span>
                </li>
              ))}
              {summaries.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status drops this month</CardTitle>
          </CardHeader>
          <CardContent>
            {drops.length === 0 ? (
              <p className="text-sm text-muted-foreground">None — nice.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {drops.map((d) => (
                  <li key={d.id}>
                    <Link href={`/dashboard/members/${d.id}`} className="hover:underline">
                      {d.name}
                    </Link>
                    <span className="text-muted-foreground"> · {d.from} → {d.to}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranked by score</CardTitle>
        </CardHeader>
        <CardContent>
          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <ol className="divide-y rounded-md border">
              {ranked.map((s, i) => (
                <li key={s.member.id} className="flex items-center gap-3 p-3">
                  <span className="w-6 text-right tabular-nums text-sm text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/members/${s.member.id}`} className="font-medium hover:underline">
                      {s.member.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{s.member.role}</p>
                  </div>
                  <span className="tabular-nums text-sm">{round1(s.score)}</span>
                  <StatusBadge status={s.status} />
                  <Link
                    href={`/dashboard/reports/${year}/${month}/${s.member.id}`}
                    className="hidden text-xs text-muted-foreground underline-offset-2 hover:underline sm:inline"
                  >
                    Report
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
