import Link from 'next/link';
import { ExternalLink, Trophy, Eye, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { listActiveMembers } from '@/lib/data/members';
import { designerLeaderboard, listDesigns, topDesignsByImpressions } from '@/lib/data/designs';
import { NewDesignButton, LogMetricButton } from './forms';

export const dynamic = 'force-dynamic';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function relTime(d: Date | null): string {
  if (!d) return 'never';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default async function DesignsPage() {
  const [members, designs, leaderboard, topDesigns] = await Promise.all([
    listActiveMembers(),
    listDesigns(false),
    designerLeaderboard(),
    topDesignsByImpressions(5),
  ]);

  const totalImpressions = designs.reduce((s, d) => s + d.latestImpressions, 0);
  const totalEngagements = designs.reduce((s, d) => s + d.latestEngagements, 0);
  const activeDesigners = leaderboard.filter((r) => r.designCount > 0).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Designs &amp; impressions</h1>
          <p className="text-sm text-muted-foreground">
            Tie growth KPIs to specific design files and the people who made them.
          </p>
        </div>
        <NewDesignButton members={members.map((m) => ({ id: m.id, name: m.name }))} />
      </div>

      {/* Top stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile icon={<Eye className="h-4 w-4" />} label="Total impressions" value={fmt(totalImpressions)} />
        <StatTile icon={<Sparkles className="h-4 w-4" />} label="Total engagements" value={fmt(totalEngagements)} />
        <StatTile icon={<ImageIcon className="h-4 w-4" />} label="Designs tracked" value={designs.length.toString()} />
        <StatTile icon={<Trophy className="h-4 w-4" />} label="Active designers" value={activeDesigners.toString()} />
      </section>

      {/* Leaderboard + top designs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold">Designer leaderboard</h2>
            <p className="text-xs text-muted-foreground">Ranked by total latest impressions across owned designs.</p>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No designs tracked yet. Add one to get started.</p>
            ) : (
              <ol className="space-y-3">
                {leaderboard.map((row, i) => (
                  <li
                    key={row.member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/dashboard/members/${row.member.id}`} className="block hover:underline">
                          <p className="truncate text-sm font-semibold">{row.member.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.member.role} · {row.designCount} design{row.designCount === 1 ? '' : 's'}
                            {row.topDesignName && ` · top: ${row.topDesignName}`}
                          </p>
                        </Link>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="text-base font-semibold">{fmt(row.totalImpressions)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">impressions</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold">Top designs by impressions</h2>
            <p className="text-xs text-muted-foreground">Highest-performing files across the team.</p>
          </CardHeader>
          <CardContent>
            {topDesigns.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No metrics logged yet.</p>
            ) : (
              <ol className="space-y-3">
                {topDesigns.map((d, i) => (
                  <li
                    key={d.design.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{d.design.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.owner.name} · {d.design.platform}
                        </p>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="text-base font-semibold">{fmt(d.latestImpressions)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {fmt(d.latestEngagements)} eng
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All designs */}
      <Card className="rounded-3xl shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">All designs</h2>
            <p className="text-xs text-muted-foreground">
              {designs.length} active. Click <span className="font-medium">Log KPI</span> to add the latest impression / engagement count.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {designs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No designs tracked yet. Click <span className="font-medium">+ Add design</span> above to start.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Design</th>
                    <th className="py-2 pr-4 font-medium">Designer</th>
                    <th className="py-2 pr-4 font-medium">Platform</th>
                    <th className="py-2 pr-4 text-right font-medium">Impressions</th>
                    <th className="py-2 pr-4 text-right font-medium">Engagements</th>
                    <th className="py-2 pr-4 text-right font-medium">Updated</th>
                    <th className="py-2 pr-0 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {designs.map((d) => (
                    <tr key={d.design.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium">{d.design.name}</span>
                          {d.design.link && (
                            <a
                              href={d.design.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Open design link"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Link href={`/dashboard/members/${d.owner.id}`} className="hover:underline">
                          {d.owner.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{d.design.platform}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{fmt(d.latestImpressions)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{fmt(d.latestEngagements)}</td>
                      <td className="py-3 pr-4 text-right text-xs text-muted-foreground">
                        {relTime(d.lastRecordedAt)}
                      </td>
                      <td className="py-3 pr-0 text-right">
                        <LogMetricButton designId={d.design.id} designName={d.design.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
