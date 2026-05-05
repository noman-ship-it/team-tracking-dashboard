'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BASE_POINTS, DECAY_HALF_LIFE_DAYS, STATUS_LABELS, STATUS_THRESHOLDS } from '@/lib/scoring/config';

export function ScoringInfo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Info className="h-3.5 w-3.5" /> How scoring works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How scoring works</DialogTitle>
          <DialogDescription>Transparent, explainable, and tunable.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <section>
            <h3 className="mb-1 font-medium">Base points</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-normal">Severity</th>
                  <th className="text-right font-normal">Positive</th>
                  <th className="text-right font-normal">Negative</th>
                </tr>
              </thead>
              <tbody>
                {(['minor', 'moderate', 'significant'] as const).map((sev) => (
                  <tr key={sev}>
                    <td className="capitalize">{sev}</td>
                    <td className="text-right tabular-nums">+{BASE_POINTS.positive[sev]}</td>
                    <td className="text-right tabular-nums">{BASE_POINTS.negative[sev]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h3 className="mb-1 font-medium">Time decay</h3>
            <p className="text-muted-foreground">
              Each event's contribution halves every {DECAY_HALF_LIFE_DAYS} days. Today's event = 100%, 30 days ago = 50%, 90 days ago ≈ 12.5%.
            </p>
          </section>
          <section>
            <h3 className="mb-1 font-medium">Status thresholds</h3>
            <ul className="space-y-1 text-xs">
              {STATUS_THRESHOLDS.map((t, i) => {
                const next = STATUS_THRESHOLDS[i - 1];
                const upper = next ? `< ${next.min}` : '';
                const lower = t.min === -Infinity ? '< previous tier' : `≥ ${t.min}`;
                return (
                  <li key={t.status} className="flex justify-between gap-3">
                    <span>{STATUS_LABELS[t.status]}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {t.min === -Infinity ? upper || '< -20' : `${lower}${upper ? `, ${upper}` : ''}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <p className="text-xs text-muted-foreground">
            Tune in <code>lib/scoring/config.ts</code>.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
