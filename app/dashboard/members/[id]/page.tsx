import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';
import { memberDetail } from '@/lib/data/members';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { TrendChart } from '@/components/trend-chart';
import { CategoryBreakdown } from '@/components/category-breakdown';
import { EventTimeline } from '@/components/event-timeline';
import { NotesPanel } from '@/components/notes-panel';
import { QuickLogDialog } from '@/components/quick-log-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { formatDate, round1 } from '@/lib/utils';
import { CATEGORY_LABELS, STATUS_DESCRIPTIONS, STATUS_LABELS } from '@/lib/scoring/config';
import { strongestCategory, weakestCategory } from '@/lib/scoring/engine';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function MemberProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await memberDetail(Number(id));
  if (!detail) notFound();

  const session = await getSession();
  const { member, score, status, eventsThisMonth, scoreDelta, trend, categoryScores, events, notes, snapshots } = detail;

  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : ArrowRight;
  const trendClass =
    trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
    trend === 'down' ? 'text-red-600 dark:text-red-400' :
    'text-muted-foreground';

  const startDate = member.startDate instanceof Date ? member.startDate : new Date(member.startDate);
  const strongest = strongestCategory(categoryScores);
  const weakest = weakestCategory(categoryScores);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{member.name}</h1>
          <p className="text-sm text-muted-foreground">
            {member.role} · started {formatDate(startDate)}
          </p>
        </div>
        <QuickLogDialog memberId={member.id} memberName={member.name} trigger={undefined} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={status} size="lg" />
              <span className="text-3xl font-semibold tabular-nums">{round1(score)}</span>
              <span className={`flex items-center gap-1 text-sm tabular-nums ${trendClass}`}>
                <TrendIcon className="h-4 w-4" />
                {scoreDelta == null ? '—' : `${scoreDelta > 0 ? '+' : ''}${round1(scoreDelta)} vs last month`}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{STATUS_DESCRIPTIONS[status]}</p>
            <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Strongest</p>
                <p className="font-medium">{CATEGORY_LABELS[strongest]}</p>
                <p className="text-xs tabular-nums status-fg-going-great">+{round1(categoryScores[strongest])}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Weakest</p>
                <p className="font-medium">{CATEGORY_LABELS[weakest]}</p>
                <p className="text-xs tabular-nums status-fg-at-risk">{round1(categoryScores[weakest])}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">This month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{eventsThisMonth}</p>
            <p className="text-xs text-muted-foreground">event{eventsThisMonth === 1 ? '' : 's'} logged</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={snapshots.map((s) => ({ year: s.year, month: s.month, score: s.score }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown scores={categoryScores} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="events">
            <TabsList>
              <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
              <TabsTrigger value="notes">Private notes ({notes.length})</TabsTrigger>
              <TabsTrigger value="reports">Monthly reports ({snapshots.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="events">
              <EventTimeline events={events} currentUserId={session.userId!} />
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel memberId={member.id} notes={notes} />
            </TabsContent>
            <TabsContent value="reports">
              {snapshots.length === 0 ? (
                <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No monthly snapshots yet. Generate them from{' '}
                  <Link href="/dashboard/reports" className="underline">Reports</Link>.
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {[...snapshots].reverse().map((s) => (
                    <li key={s.id} className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(s.year, s.month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Score {round1(s.score)} · {STATUS_LABELS[s.status]}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/reports/${s.year}/${s.month}/${member.id}`}>View report</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
