import { summarizeAll } from '@/lib/data/members';
import { TeamGrid } from '@/components/team-grid';
import { ScoringInfo } from '../scoring-info';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const summaries = await summarizeAll();
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {summaries.length} active member{summaries.length === 1 ? '' : 's'} · click a card to drill into anyone's full picture
          </p>
        </div>
        <ScoringInfo />
      </div>
      <TeamGrid summaries={summaries} />
    </div>
  );
}
