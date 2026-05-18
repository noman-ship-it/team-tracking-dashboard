import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { QuickLogDialog } from './quick-log-dialog';
import { round1 } from '@/lib/utils';
import type { MemberSummary } from '@/lib/data/members';

export function TeamCard({ summary }: { summary: MemberSummary }) {
  const { member, score, status, eventsThisMonth, scoreDelta, trend } = summary;

  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : ArrowRight;
  const trendClass =
    trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
    trend === 'down' ? 'text-red-600 dark:text-red-400' :
    'text-muted-foreground';

  return (
    <Card className="flex flex-col rounded-3xl shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link href={`/dashboard/members/${member.id}`} className="block">
              <h3 className="truncate text-base font-semibold hover:underline">{member.name}</h3>
              <p className="truncate text-sm text-muted-foreground">{member.role}</p>
            </Link>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-2">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold tabular-nums">{round1(score)}</span>
          <span className={`flex items-center gap-0.5 text-sm tabular-nums ${trendClass}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {scoreDelta == null ? '—' : `${scoreDelta > 0 ? '+' : ''}${round1(scoreDelta)}`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {eventsThisMonth} event{eventsThisMonth === 1 ? '' : 's'} this month
          </span>
          <QuickLogDialog memberId={member.id} memberName={member.name} />
        </div>
      </CardContent>
    </Card>
  );
}
