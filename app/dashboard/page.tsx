import Link from 'next/link';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Eye,
  Sparkles,
  TrendingDown,
  Trophy,
  Users,
} from 'lucide-react';
import { summarizeAll } from '@/lib/data/members';
import { designerLeaderboard, listDesigns, topDesignsByImpressions } from '@/lib/data/designs';
import { monthEventCounts, recentActivity, type ActivityItem } from '@/lib/data/activity';
import { STATUSES, type Status } from '@/lib/db/schema';
import { STATUS_LABELS, STATUS_RANK, CATEGORY_LABELS } from '@/lib/scoring/config';
import { round1 } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function relTime(d: Date): string {
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default async function OverviewPage() {
  const [summaries, designs, leaders, topDesigns, activity, monthCounts] = await Promise.all([
    summarizeAll(),
    listDesigns(false),
    designerLeaderboard(),
    topDesignsByImpressions(5),
    recentActivity(10),
    monthEventCounts(),
  ]);

  // Team health summary
  const teamScore =
    summaries.length === 0 ? 0 : summaries.reduce((s, m) => s + m.score, 0) / summaries.length;
  const avgRank =
    summaries.length === 0
      ? 0
      : summaries.reduce((s, m) => s + STATUS_RANK[m.status], 0) / summaries.length;
  const healthLabel =
    avgRank >= 4.5 ? 'Excellent' :
    avgRank >= 3.5 ? 'Healthy' :
    avgRank >= 2.5 ? 'Mixed' :
    avgRank >= 1.5 ? 'Strained' :
    summaries.length === 0 ? '—' : 'Critical';
  const healthFg =
    avgRank >= 4.5 ? 'status-fg-going-great' :
    avgRank >= 3.5 ? 'status-fg-on-track' :
    avgRank >= 2.5 ? 'status-fg-needs-attention' :
    avgRank >= 1.5 ? 'status-fg-behind-target' : 'status-fg-at-risk';

  const totalImpressions = designs.reduce((s, d) => s + d.latestImpressions, 0);
  const totalEngagements = designs.reduce((s, d) => s + d.latestEngagements, 0);

  const dist: Record<Status, number> = {
    going_great: 0, on_track: 0, needs_attention: 0, behind_target: 0, at_risk: 0,
  };
  for (const s of summaries) dist[s.status]++;

  const sortedByScore = [...summaries].sort((a, b) => b.score - a.score);
  const topPerformer = sortedByScore[0];
  const needsAttention = sortedByScore[sortedByScore.length - 1];

  const evDelta = monthCounts.thisMonth.total - monthCounts.lastMonth.total;
  const evDeltaPct = monthCounts.lastMonth.total > 0
    ? Math.round((evDelta / monthCounts.lastMonth.total) * 100)
    : null;

  return (
    <div className="space-y-10">
      {/* Hero — cluely-ish gradient panel with bold serif greeting */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-amber-50 via-orange-50 to-sky-50 p-8 shadow-sm dark:from-amber-950/40 dark:via-orange-950/30 dark:to-sky-950/40">
        <Mountains />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-2 font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl">
            Your team is <span className={healthFg}>{healthLabel.toLowerCase()}</span>.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            {summaries.length === 0
              ? 'Add team members to start tracking.'
              : `Average score ${round1(teamScore)} across ${summaries.length} member${summaries.length === 1 ? '' : 's'}.
                  ${monthCounts.thisMonth.total} event${monthCounts.thisMonth.total === 1 ? '' : 's'} logged this month, ${fmt(totalImpressions)} impressions tracked across designs.`}
          </p>
        </div>
      </section>

      {/* KPI tiles */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile
          icon={<Activity className="h-4 w-4" />}
          label="Team health"
          value={healthLabel}
          sub={`Avg score ${round1(teamScore)}`}
          accent={healthFg}
        />
        <KpiTile
          icon={<Users className="h-4 w-4" />}
          label="Active members"
          value={summaries.length.toString()}
          sub={`${dist.going_great + dist.on_track} on or above track`}
        />
        <KpiTile
          icon={<Eye className="h-4 w-4" />}
          label="Total impressions"
          value={fmt(totalImpressions)}
          sub={`${designs.length} design${designs.length === 1 ? '' : 's'} tracked`}
        />
        <KpiTile
          icon={<Sparkles className="h-4 w-4" />}
          label="Events this month"
          value={monthCounts.thisMonth.total.toString()}
          sub={
            evDeltaPct == null
              ? `${monthCounts.thisMonth.positive} pos · ${monthCounts.thisMonth.negative} neg`
              : `${evDelta >= 0 ? '+' : ''}${evDelta} vs last month (${evDeltaPct >= 0 ? '+' : ''}${evDeltaPct}%)`
          }
          deltaSign={evDelta === 0 ? 'flat' : evDelta > 0 ? 'up' : 'down'}
        />
      </section>

      {/* Status spread + this-month detail */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border bg-card p-6 shadow-sm">
          <header className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-2xl tracking-tight">Status spread</h2>
              <p className="text-xs text-muted-foreground">Where each member sits today.</p>
            </div>
          </header>
          {summaries.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="space-y-3">
              {STATUSES.map((s) => {
                const count = dist[s];
                const pct = summaries.length === 0 ? 0 : (count / summaries.length) * 100;
                return (
                  <div key={s} className="flex items-center gap-4">
                    <div className="w-32 shrink-0 text-sm">{STATUS_LABELS[s]}</div>
                    <div className="relative h-8 flex-1 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className={`status-${s.replace(/_/g, '-')} h-full rounded-full transition-all`}
                        style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }}
                      />
                      {count > 0 && (
                        <span className="absolute inset-y-0 left-3 flex items-center text-xs font-medium tabular-nums text-white mix-blend-difference">
                          {count} · {Math.round(pct)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <header className="mb-4">
            <h2 className="font-serif text-2xl tracking-tight">This month</h2>
            <p className="text-xs text-muted-foreground">vs the previous month</p>
          </header>
          <ul className="space-y-4 text-sm">
            <MetricRow
              label="Positive events"
              value={monthCounts.thisMonth.positive}
              prev={monthCounts.lastMonth.positive}
              positiveIsGood
            />
            <MetricRow
              label="Negative events"
              value={monthCounts.thisMonth.negative}
              prev={monthCounts.lastMonth.negative}
              positiveIsGood={false}
            />
            <MetricRow
              label="Total logged"
              value={monthCounts.thisMonth.total}
              prev={monthCounts.lastMonth.total}
              positiveIsGood
            />
          </ul>
        </div>
      </section>

      {/* Top performers + top designs + activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RankCard
          title="Top performers"
          subtitle="By behavioural score"
          icon={<Trophy className="h-4 w-4" />}
          colorClass="status-fg-going-great"
          empty="No data yet."
          rows={sortedByScore.slice(0, 5).map((s) => ({
            href: `/dashboard/members/${s.member.id}`,
            primary: s.member.name,
            secondary: `${s.member.role}`,
            value: round1(s.score).toString(),
            valueSub: STATUS_LABELS[s.status],
          }))}
        />

        <RankCard
          title="Top designs"
          subtitle="By impressions"
          icon={<Eye className="h-4 w-4" />}
          colorClass="text-foreground"
          empty="No designs tracked yet."
          rows={topDesigns.map((d) => ({
            href: `/dashboard/designs`,
            primary: d.design.name,
            secondary: `${d.owner.name} · ${d.design.platform}`,
            value: fmt(d.latestImpressions),
            valueSub: `${fmt(d.latestEngagements)} eng`,
          }))}
        />

        <ActivityCard items={activity} />
      </section>

      {/* Watchlist row */}
      {topPerformer && needsAttention && topPerformer !== needsAttention && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SpotlightCard
            kind="positive"
            label="On a roll"
            member={topPerformer.member.name}
            sub={`${topPerformer.member.role} · score ${round1(topPerformer.score)}`}
            href={`/dashboard/members/${topPerformer.member.id}`}
          />
          <SpotlightCard
            kind="negative"
            label="Needs a check-in"
            member={needsAttention.member.name}
            sub={`${needsAttention.member.role} · score ${round1(needsAttention.score)} (${STATUS_LABELS[needsAttention.status]})`}
            href={`/dashboard/members/${needsAttention.member.id}`}
          />
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Want the personal view? Jump to <Link href="/dashboard/team" className="underline">Team</Link>.
        Reports live in <Link href="/dashboard/reports" className="underline">Reports</Link>.
      </p>
    </div>
  );
}

// ---------- components ----------

function KpiTile({
  icon, label, value, sub, accent, deltaSign,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: string;
  deltaSign?: 'up' | 'down' | 'flat';
}) {
  const DeltaIcon = deltaSign === 'up' ? ArrowUp : deltaSign === 'down' ? ArrowDown : deltaSign === 'flat' ? ArrowRight : null;
  const deltaClass =
    deltaSign === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
    deltaSign === 'down' ? 'text-red-600 dark:text-red-400' :
    'text-muted-foreground';
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`font-serif text-4xl tracking-tight ${accent ?? ''}`}>{value}</p>
      <div className={`mt-2 flex items-center gap-1 text-xs ${deltaClass}`}>
        {DeltaIcon && <DeltaIcon className="h-3 w-3" />}
        <span>{sub}</span>
      </div>
    </div>
  );
}

function MetricRow({
  label, value, prev, positiveIsGood,
}: { label: string; value: number; prev: number; positiveIsGood: boolean }) {
  const delta = value - prev;
  const Icon = delta === 0 ? ArrowRight : delta > 0 ? ArrowUp : ArrowDown;
  const goodDirection = positiveIsGood ? delta >= 0 : delta <= 0;
  const cls = delta === 0
    ? 'text-muted-foreground'
    : goodDirection
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';
  return (
    <li className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="font-serif text-2xl tabular-nums">{value}</span>
        <span className={`inline-flex items-center gap-0.5 text-xs tabular-nums ${cls}`}>
          <Icon className="h-3 w-3" />
          {delta >= 0 ? '+' : ''}{delta}
        </span>
      </span>
    </li>
  );
}

function RankCard({
  title, subtitle, icon, colorClass, rows, empty,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  colorClass: string;
  empty: string;
  rows: Array<{ href: string; primary: string; secondary: string; value: string; valueSub: string }>;
}) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h3 className={`flex items-center gap-1.5 text-xs uppercase tracking-wider ${colorClass}`}>
            {icon}
            {title}
          </h3>
          <p className="mt-1 font-serif text-xl tracking-tight">{subtitle}</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border bg-background/60 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums">
                {i + 1}
              </span>
              <Link href={r.href} className="min-w-0 flex-1 hover:underline">
                <p className="truncate text-sm font-semibold">{r.primary}</p>
                <p className="truncate text-xs text-muted-foreground">{r.secondary}</p>
              </Link>
              <div className="shrink-0 text-right tabular-nums">
                <p className="text-sm font-semibold">{r.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.valueSub}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm">
      <header className="mb-4">
        <h3 className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Activity className="h-4 w-4" />
          Recent activity
        </h3>
        <p className="mt-1 font-serif text-xl tracking-tight">Latest signals</p>
      </header>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Nothing logged yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={`${it.kind}-${it.id}`} className="flex items-start gap-3 text-sm">
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                  it.kind === 'event'
                    ? it.sentiment === 'positive' ? 'bg-emerald-500' : 'bg-red-500'
                    : 'bg-sky-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                {it.kind === 'event' ? (
                  <p className="leading-snug">
                    <Link href={`/dashboard/members/${it.memberId}`} className="font-medium hover:underline">
                      {it.memberName}
                    </Link>{' '}
                    <span className="text-muted-foreground">·</span>{' '}
                    <span className="text-muted-foreground">
                      {CATEGORY_LABELS[it.category as keyof typeof CATEGORY_LABELS] ?? it.category}
                    </span>
                    {it.note && <span className="block truncate text-xs text-muted-foreground">{it.note}</span>}
                  </p>
                ) : (
                  <p className="leading-snug">
                    <Link href="/dashboard/designs" className="font-medium hover:underline">
                      {it.designName}
                    </Link>{' '}
                    <span className="text-muted-foreground">·</span>{' '}
                    <span>
                      {fmt(it.value)} {it.metricType}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {it.ownerName}
                    </span>
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{relTime(it.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SpotlightCard({
  kind, label, member, sub, href,
}: {
  kind: 'positive' | 'negative';
  label: string;
  member: string;
  sub: string;
  href: string;
}) {
  const Icon = kind === 'positive' ? Trophy : TrendingDown;
  const bg = kind === 'positive'
    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40'
    : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40';
  const fg = kind === 'positive' ? 'status-fg-going-great' : 'status-fg-at-risk';
  return (
    <Link
      href={href}
      className={`group block overflow-hidden rounded-3xl border p-6 shadow-sm transition-shadow hover:shadow-md ${bg}`}
    >
      <div className={`flex items-center gap-1.5 text-xs uppercase tracking-wider ${fg}`}>
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 font-serif text-3xl tracking-tight group-hover:underline">{member}</p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </Link>
  );
}

function Mountains() {
  // Subtle illustrative accent on the hero — cluely-ish.
  return (
    <svg
      className="pointer-events-none absolute -right-6 -bottom-2 h-32 w-[60%] opacity-50 md:opacity-70"
      viewBox="0 0 800 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M0 180 L150 80 L260 140 L380 40 L520 130 L640 70 L800 160 L800 200 L0 200 Z" fill="hsl(var(--muted))" opacity="0.6" />
      <path d="M0 200 L120 110 L240 170 L380 90 L520 160 L640 110 L800 185 L800 200 L0 200 Z" fill="hsl(var(--muted-foreground) / 0.25)" />
    </svg>
  );
}
