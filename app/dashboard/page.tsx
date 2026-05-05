import { summarizeAll } from '@/lib/data/members';
import { TeamGrid } from '@/components/team-grid';
import { TeamHealth } from '@/components/team-health';
import { ScoringInfo } from './scoring-info';

export const dynamic = 'force-dynamic';

export default async function DashboardHome() {
  const summaries = await summarizeAll();
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            {summaries.length} active member{summaries.length === 1 ? '' : 's'} · status updates automatically as events are logged
          </p>
        </div>
        <ScoringInfo />
      </div>
      <TeamHealth summaries={summaries} />
      <TeamGrid summaries={summaries} />
    </div>
  );
}
