import { Trophy, TrendingDown, Activity, Users } from 'lucide-react';
import Link from 'next/link';
import type { MemberSummary } from '@/lib/data/members';
import { STATUSES, type Status } from '@/lib/db/schema';
import { STATUS_LABELS, STATUS_RANK } from '@/lib/scoring/config';
import { round1 } from '@/lib/utils';

export function TeamHealth({ summaries }: { summaries: MemberSummary[] }) {
  if (summaries.length === 0) return null;

  const totalScore = summaries.reduce((sum, s) => sum + s.score, 0);
  const teamScore = totalScore / summaries.length;
  const totalEvents = summaries.reduce((sum, s) => sum + s.eventsThisMonth, 0);

  const sortedByScore = [...summaries].sort((a, b) => b.score - a.score);
  const best = sortedByScore[0];
  const worst = sortedByScore[sortedByScore.length - 1];

  const dist: Record<Status, number> = {
    going_great: 0, on_track: 0, needs_attention: 0, behind_target: 0, at_risk: 0,
  };
  for (const s of summaries) dist[s.status]++;

  // Health label from average team rank (1=at risk … 5=going great)
  const avgRank =
    summaries.reduce((sum, s) => sum + STATUS_RANK[s.status], 0) / summaries.length;
  const healthLabel =
    avgRank >= 4.5 ? 'Excellent'
    : avgRank >= 3.5 ? 'Healthy'
    : avgRank >= 2.5 ? 'Mixed'
    : avgRank >= 1.5 ? 'Strained'
    : 'Critical';
  const healthClass =
    avgRank >= 4.5 ? 'status-fg-going-great'
    : avgRank >= 3.5 ? 'status-fg-on-track'
    : avgRank >= 2.5 ? 'status-fg-needs-attention'
    : avgRank >= 1.5 ? 'status-fg-behind-target'
    : 'status-fg-at-risk';

  return (
    <section className="rounded-3xl border bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Team health</p>
          <h2 className={`mt-1 text-3xl font-semibold ${healthClass}`}>{healthLabel}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Average score {round1(teamScore)} across {summaries.length} member{summaries.length === 1 ? '' : 's'} · {totalEvents} event{totalEvents === 1 ? '' : 's'} logged this month
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          updated live
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Tile
          icon={<Trophy className="h-4 w-4" />}
          label="Top performer"
          colorClass="status-fg-going-great"
        >
          {best ? (
            <Link href={`/dashboard/members/${best.member.id}`} className="hover:underline">
              <p className="text-base font-semibold">{best.member.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {best.member.role} · score {round1(best.score)}
              </p>
            </Link>
          ) : <p className="text-sm text-muted-foreground">—</p>}
        </Tile>

        <Tile
          icon={<TrendingDown className="h-4 w-4" />}
          label="Needs most attention"
          colorClass="status-fg-at-risk"
        >
          {worst && worst !== best ? (
            <Link href={`/dashboard/members/${worst.member.id}`} className="hover:underline">
              <p className="text-base font-semibold">{worst.member.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {worst.member.role} · score {round1(worst.score)}
              </p>
            </Link>
          ) : <p className="text-sm text-muted-foreground">No-one flagged</p>}
        </Tile>

        <Tile
          icon={<Users className="h-4 w-4" />}
          label="Status spread"
          colorClass="text-foreground"
        >
          <div className="space-y-1.5">
            {STATUSES.filter((s) => dist[s] > 0).map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span className={`h-2 w-2 rounded-full status-${s.replace(/_/g, '-')}`} />
                <span className="flex-1 truncate">{STATUS_LABELS[s]}</span>
                <span className="tabular-nums text-muted-foreground">{dist[s]}</span>
              </div>
            ))}
          </div>
        </Tile>
      </div>
    </section>
  );
}

function Tile({
  icon, label, colorClass, children,
}: { icon: React.ReactNode; label: string; colorClass: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <div className={`mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider ${colorClass}`}>
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
