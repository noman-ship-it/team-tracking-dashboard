'use client';

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { round1 } from '@/lib/utils';
import { monthName } from '@/lib/utils';

export type TrendPoint = {
  year: number;
  month: number;
  score: number;
};

export function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No monthly snapshots yet — generate the first one from the team overview.
      </div>
    );
  }
  const formatted = data.map((d) => ({
    label: `${monthName(d.month).slice(0, 3)} '${String(d.year).slice(2)}`,
    score: round1(d.score),
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} stroke="currentColor" />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} stroke="currentColor" width={40} />
          <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
