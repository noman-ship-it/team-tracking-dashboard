import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';
import { db, schema } from '@/lib/db/client';
import { and, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/lib/scoring/config';
import { CATEGORIES, type Category } from '@/lib/db/schema';
import { round1, monthName } from '@/lib/utils';
import { previousYm } from '@/lib/reports/snapshot';
import { strongestCategory, weakestCategory, eventsInMonth, type CategoryScores } from '@/lib/scoring/engine';

export const dynamic = 'force-dynamic';

export default async function MonthlyReport({
  params,
}: {
  params: Promise<{ year: string; month: string; id: string }>;
}) {
  const p = await params;
  const year = Number(p.year);
  const month = Number(p.month);
  const memberId = Number(p.id);

  const member = (await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.id, memberId)).limit(1))[0];
  if (!member) notFound();

  const snapshot = (
    await db
      .select()
      .from(schema.monthlySnapshots)
      .where(
        and(
          eq(schema.monthlySnapshots.teamMemberId, memberId),
          eq(schema.monthlySnapshots.year, year),
          eq(schema.monthlySnapshots.month, month)
        )
      )
      .limit(1)
  )[0];

  if (!snapshot) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/members/${memberId}`}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No snapshot for {monthName(month)} {year}. Generate one from{' '}
            <Link href="/dashboard/reports" className="underline">Reports</Link>.
          </CardContent>
        </Card>
      </div>
    );
  }

  const prev = previousYm(year, month);
  const prevSnap = (
    await db
      .select()
      .from(schema.monthlySnapshots)
      .where(
        and(
          eq(schema.monthlySnapshots.teamMemberId, memberId),
          eq(schema.monthlySnapshots.year, prev.year),
          eq(schema.monthlySnapshots.month, prev.month)
        )
      )
      .limit(1)
  )[0];

  const categoryScores = JSON.parse(snapshot.categoryScoresJson) as CategoryScores;
  const strongest = strongestCategory(categoryScores);
  const weakest = weakestCategory(categoryScores);
  const delta = prevSnap ? snapshot.score - prevSnap.score : null;
  const TrendIcon = delta == null || Math.abs(delta) < 0.5 ? ArrowRight : delta > 0 ? ArrowUp : ArrowDown;
  const trendClass = delta == null || Math.abs(delta) < 0.5
    ? 'text-muted-foreground'
    : delta > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';

  // Most recent significant event in this month
  const allEvents = await db.select().from(schema.events).where(eq(schema.events.teamMemberId, memberId));
  const inMonth = eventsInMonth(allEvents, year, month);
  const significant = inMonth
    .filter((e) => e.severity === 'significant')
    .sort((a, b) => {
      const at = a.occurredAt instanceof Date ? a.occurredAt.getTime() : new Date(a.occurredAt).getTime();
      const bt = b.occurredAt instanceof Date ? b.occurredAt.getTime() : new Date(b.occurredAt).getTime();
      return bt - at;
    })[0];

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/members/${memberId}`}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to profile
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Monthly report · {monthName(month)} {year}
          </p>
          <h1 className="text-3xl font-semibold">{member.name}</h1>
          <p className="text-sm text-muted-foreground">{member.role}</p>
        </div>
        <StatusBadge status={snapshot.status} size="lg" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-base leading-relaxed">{snapshot.summaryText}</p>
          <p className="text-xs text-muted-foreground">
            {snapshot.summarySource === 'llm' ? 'AI-generated from event data' : 'Generated from event data (no API key configured)'}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Score</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">{round1(snapshot.score)}</span>
              <span className={`flex items-center gap-1 text-sm tabular-nums ${trendClass}`}>
                <TrendIcon className="h-4 w-4" />
                {delta == null ? 'no prior' : `${delta > 0 ? '+' : ''}${round1(delta)}`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {prevSnap ? `Last month: ${round1(prevSnap.score)}` : 'No previous snapshot'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Events</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="text-emerald-600 dark:text-emerald-400">+{snapshot.positiveCount} positive</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-red-600 dark:text-red-400">{snapshot.negativeCount} negative</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">
              {prevSnap ? `${STATUS_LABELS[prevSnap.status]} → ` : ''}
              <strong>{STATUS_LABELS[snapshot.status]}</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Strongest area</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{CATEGORY_LABELS[strongest]}</p>
            <p className="text-sm text-muted-foreground tabular-nums">+{round1(categoryScores[strongest])}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Weakest area</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{CATEGORY_LABELS[weakest]}</p>
            <p className="text-sm text-muted-foreground tabular-nums">{round1(categoryScores[weakest])}</p>
          </CardContent>
        </Card>
      </div>

      {significant && (
        <Card>
          <CardHeader><CardTitle>Most recent significant event</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm">
              <strong>{CATEGORY_LABELS[significant.category as Category]}</strong>{' '}
              · {significant.sentiment} · {(significant.occurredAt instanceof Date ? significant.occurredAt : new Date(significant.occurredAt)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            {significant.note && <p className="text-sm text-muted-foreground">{significant.note}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Score by category</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c} className="flex items-center justify-between border-b pb-1 last:border-b-0">
                <span>{CATEGORY_LABELS[c]}</span>
                <span className={`tabular-nums ${categoryScores[c] >= 0 ? 'status-fg-going-great' : 'status-fg-at-risk'}`}>
                  {round1(categoryScores[c])}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
