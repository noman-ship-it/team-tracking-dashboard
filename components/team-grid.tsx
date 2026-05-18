'use client';

import * as React from 'react';
import { TeamCard } from './team-card';
import type { MemberSummary } from '@/lib/data/members';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { STATUS_RANK } from '@/lib/scoring/config';

type SortKey = 'status' | 'score' | 'role' | 'name';

export function TeamGrid({ summaries }: { summaries: MemberSummary[] }) {
  const [sort, setSort] = React.useState<SortKey>('status');

  const sorted = React.useMemo(() => {
    const copy = [...summaries];
    copy.sort((a, b) => {
      switch (sort) {
        case 'status':
          return STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.score - a.score;
        case 'score':
          return b.score - a.score;
        case 'role':
          return a.member.role.localeCompare(b.member.role) || a.member.name.localeCompare(b.member.name);
        case 'name':
        default:
          return a.member.name.localeCompare(b.member.name);
      }
    });
    return copy;
  }, [summaries, sort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="sort" className="text-xs text-muted-foreground">
          Sort by
        </Label>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-[200px] whitespace-nowrap">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Status — low to high</SelectItem>
            <SelectItem value="score">Score — high to low</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((s) => (
          <TeamCard key={s.member.id} summary={s} />
        ))}
        {sorted.length === 0 && (
          <p className="col-span-full rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No team members yet. Add one in <a href="/dashboard/manage" className="underline">Manage</a>.
          </p>
        )}
      </div>
    </div>
  );
}
