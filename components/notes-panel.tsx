'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ManagerNote } from '@/lib/db/schema';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { formatDate } from '@/lib/utils';

export function NotesPanel({
  memberId,
  notes,
}: {
  memberId: number;
  notes: Array<ManagerNote & { managerName: string }>;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamMemberId: memberId, body }),
      });
      setBody('');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Private observation. Not visible to the team member, doesn't affect score."
          rows={3}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
            {submitting ? 'Saving…' : 'Add note'}
          </Button>
        </div>
      </form>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No private notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => {
            const created = n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt);
            return (
              <li key={n.id} className="rounded-md border p-3 text-sm">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {n.managerName} · {formatDate(created, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
