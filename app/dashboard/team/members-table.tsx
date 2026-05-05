'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TeamMember } from '@/lib/db/schema';
import { formatDate } from '@/lib/utils';

export function TeamMembersTable({ members }: { members: TeamMember[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<number | null>(null);

  async function toggleActive(m: TeamMember) {
    if (m.active && !confirm(`Archive ${m.name}? Their data is kept and they can be restored later.`)) return;
    setBusy(m.id);
    try {
      await fetch(`/api/members/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !m.active }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members yet. Add one with the form on the left.</p>;
  }

  return (
    <ul className="divide-y rounded-md border">
      {members.map((m) => {
        const startDate = m.startDate instanceof Date ? m.startDate : new Date(m.startDate);
        return (
          <li key={m.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {m.name}
                {!m.active && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Archived</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {m.role} · started {formatDate(startDate)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleActive(m)}
              disabled={busy === m.id}
            >
              {m.active ? <><Archive className="h-3.5 w-3.5" /> Archive</> : <><Undo2 className="h-3.5 w-3.5" /> Restore</>}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
