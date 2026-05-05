'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GenerateSnapshotsButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/snapshots/generate', { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'failed');
      const llm = j.generated.filter((g: { source: string }) => g.source === 'llm').length;
      const fb = j.generated.length - llm;
      setMsg(`Generated ${j.generated.length} snapshots (${llm} via Claude, ${fb} fallback).`);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <Button onClick={run} disabled={busy} size="sm" variant="outline">
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
        {busy ? 'Generating…' : 'Generate snapshots'}
      </Button>
    </div>
  );
}
