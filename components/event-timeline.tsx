'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import type { Event } from '@/lib/db/schema';
import { CATEGORIES, SENTIMENTS } from '@/lib/db/schema';
import { CATEGORY_LABELS, SEVERITY_LABELS } from '@/lib/scoring/config';
import { cn, formatDate } from '@/lib/utils';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type EventWithManager = Event & { managerName: string };

export function EventTimeline({
  events,
  currentUserId,
}: {
  events: EventWithManager[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = React.useState<string>('all');
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const filtered = React.useMemo(() => {
    return events.filter(
      (e) =>
        (categoryFilter === 'all' || e.category === categoryFilter) &&
        (sentimentFilter === 'all' || e.sentiment === sentimentFilter)
    );
  }, [events, categoryFilter, sentimentFilter]);

  async function deleteEvent(id: number) {
    if (!confirm('Delete this event?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || 'failed to delete');
      } else {
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sentiments</SelectItem>
            {SENTIMENTS.map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No events match these filters.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {filtered.map((e) => {
            const occurred = e.occurredAt instanceof Date ? e.occurredAt : new Date(e.occurredAt);
            const created = e.createdAt instanceof Date ? e.createdAt : new Date(e.createdAt);
            const canDelete = e.managerId === currentUserId && Date.now() - created.getTime() < 24 * 60 * 60 * 1000;
            return (
              <li key={e.id} className="flex items-start gap-3 p-3">
                <span
                  className={cn(
                    'mt-1 h-2 w-2 shrink-0 rounded-full',
                    e.sentiment === 'positive' ? 'bg-emerald-500' : 'bg-red-500'
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                    <span className="font-medium">{CATEGORY_LABELS[e.category]}</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{SEVERITY_LABELS[e.severity]}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDate(occurred)}</span>
                  </div>
                  {e.note && <p className="mt-1 text-sm text-foreground/80">{e.note}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">Logged by {e.managerName}</p>
                </div>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => deleteEvent(e.id)}
                    disabled={busyId === e.id}
                    aria-label="Delete event"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
