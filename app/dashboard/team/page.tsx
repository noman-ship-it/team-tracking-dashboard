import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Eye,
  Layers,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { summarizeAll } from '@/lib/data/members';
import { listDesigns, topDesignsByImpressions } from '@/lib/data/designs';
import { monthEventCounts } from '@/lib/data/activity';
import { STATUS_LABELS, STATUS_RANK } from '@/lib/scoring/config';
import { round1 } from '@/lib/utils';
import { TeamGrid } from '@/components/team-grid';
import { ScoringInfo } from '../scoring-info';
import type { MemberSummary } from '@/lib/data/members';

export const dynamic = 'force-dynamic';

/* ─── formatting helpers ─────────────────────────────────────── */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/* ─── health score ────────────────────────────────────────────── */
function computeHealthScore(
  summaries: MemberSummary[],
  positiveCount: number,
  totalCount: number,
): { score: number; label: string; color: string } {
  if (summaries.length === 0) return { score: 0, label: 'No data', color: 'text-muted-foreground' };

  const avgRank = summaries.reduce((s, m) => s + STATUS_RANK[m.status], 0) / summaries.length;
  const qualityRatio = totalCount > 0 ? positiveCount / totalCount : 0.5;
  const activityBonus = Math.min(totalCount / Math.max(summaries.length * 2, 1), 1);

  const raw =
    ((avgRank - 1) / 4) * 55 +
    qualityRatio * 30 +
    activityBonus * 15;

  const score = Math.round(Math.max(0, Math.min(100, raw)));

  const label =
    score >= 80 ? 'Excellent' :
    score >= 65 ? 'Good' :
    score >= 50 ? 'Fair' :
    score >= 35 ? 'Poor' :
    'Critical';

  const color =
    score >= 80 ? 'status-fg-going-great' :
    score >= 65 ? 'status-fg-on-track' :
    score >= 50 ? 'status-fg-needs-attention' :
    score >= 35 ? 'status-fg-behind-target' :
    'status-fg-at-risk';

  return { score, label, color };
}

/* ─── page ────────────────────────────────────────────────────── */
export default async function TeamPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [summaries, designs, topDesigns, monthCounts] = await Promise.all([
    summarizeAll(),
    listDesigns(false),
    topDesignsByImpressions(1),
    monthEventCounts(),
  ]);

  // KPI computations
  const health = computeHealthScore(
    summaries,
    monthCounts.thisMonth.positive,
    monthCounts.thisMonth.total,
  );

  const designsThisMonth = designs.filter(
    (d) => new Date(d.design.createdAt as Date) >= startOfMonth,
  ).length;

  const totalImpressions = designs.reduce((s, d) => s + d.latestImpressions, 0);

  const sortedByScore = [...summaries].sort((a, b) => b.score - a.score);
  const topPerformer = sortedByScore[0] ?? null;
  const topPiece = topDesigns[0] ?? null;

  const evDelta = monthCounts.thisMonth.total - monthCounts.lastMonth.total;
  const impDelta = null; // impressions are cumulative, delta not meaningful without per-month tracking

  const monthLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-10">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {monthLabel}
          </p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">
            Your team
            {summaries.length > 0 && (
              <span className={`ml-3 ${health.color}`}>{health.label.toLowerCase()}</span>
            )}
          </h1>
        </div>
        <ScoringInfo />
      </div>

      {/* ── 6 KPI tiles ──────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {/* 1 — Team Health */}
        <KpiTile
          icon={<BarChart3 className="h-4 w-4" />}
          label="Team health"
          value={summaries.length === 0 ? '—' : `${health.score}`}
          valueSuffix={summaries.length > 0 ? '/100' : undefined}
          sub={health.label}
          subColor={health.color}
          wide
        />

        {/* 2 — Designs produced */}
        <KpiTile
          icon={<Layers className="h-4 w-4" />}
          label="Designs this month"
          value={designsThisMonth.toString()}
          sub={`${designs.length} total active`}
        />

        {/* 3 — Impressions */}
        <KpiTile
          icon={<Eye className="h-4 w-4" />}
          label="Impressions"
          value={fmt(totalImpressions)}
          sub="across all designs"
        />

        {/* 4 — Top piece */}
        <KpiTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Top piece"
          value={topPiece ? topPiece.design.name : '—'}
          valueIsText
          sub={topPiece ? `${fmt(topPiece.latestImpressions)} impressions` : 'No designs yet'}
        />

        {/* 5 — Top performer */}
        <KpiTile
          icon={<Trophy className="h-4 w-4" />}
          label="Top performer"
          value={topPerformer ? topPerformer.member.name : '—'}
          valueIsText
          sub={
            topPerformer
              ? `${round1(topPerformer.score)} · ${STATUS_LABELS[topPerformer.status]}`
              : 'No team members'
          }
          href={topPerformer ? `/dashboard/members/${topPerformer.member.id}` : undefined}
        />

        {/* 6 — Month delta */}
        <KpiTile
          icon={<Sparkles className="h-4 w-4" />}
          label="Events vs last month"
          value={evDelta === 0 ? '—' : `${evDelta > 0 ? '+' : ''}${evDelta}`}
          sub={`${monthCounts.thisMonth.total} this · ${monthCounts.lastMonth.total} last`}
          deltaSign={evDelta === 0 ? 'flat' : evDelta > 0 ? 'up' : 'down'}
        />
      </section>

      {/* ── Team grid ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {summaries.length} member{summaries.length === 1 ? '' : 's'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Click any card to see the full picture — events, scores, trends.
            </p>
          </div>
        </div>
        <TeamGrid summaries={summaries} />
      </section>

    </div>
  );
}

/* ─── KpiTile ─────────────────────────────────────────────────── */
function KpiTile({
  icon,
  label,
  value,
  valueSuffix,
  valueIsText,
  sub,
  subColor,
  deltaSign,
  href,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueSuffix?: string;
  valueIsText?: boolean;
  sub: string;
  subColor?: string;
  deltaSign?: 'up' | 'down' | 'flat';
  href?: string;
  wide?: boolean;
}) {
  const DeltaIcon =
    deltaSign === 'up' ? ArrowUp :
    deltaSign === 'down' ? ArrowDown :
    deltaSign === 'flat' ? ArrowRight : null;
  const deltaClass =
    deltaSign === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
    deltaSign === 'down' ? 'text-red-600 dark:text-red-400' :
    'text-muted-foreground';

  const inner = (
    <div
      className={`flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-shadow ${href ? 'hover:shadow-md' : ''} ${wide ? '' : ''}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div>
        {valueIsText ? (
          <p className="truncate font-display text-xl font-semibold leading-tight tracking-tight">
            {value}
          </p>
        ) : (
          <p className="font-display text-4xl font-bold tabular-nums leading-none tracking-tight">
            {value}
            {valueSuffix && (
              <span className="ml-0.5 font-display text-lg font-medium text-muted-foreground">
                {valueSuffix}
              </span>
            )}
          </p>
        )}
        <p className={`mt-1.5 flex items-center gap-1 text-xs ${subColor ?? deltaClass}`}>
          {DeltaIcon && <DeltaIcon className="h-3 w-3 shrink-0" />}
          {sub}
        </p>
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
