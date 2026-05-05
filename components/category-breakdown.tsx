'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, ReferenceLine, Tooltip } from 'recharts';
import { CATEGORIES } from '@/lib/db/schema';
import { CATEGORY_LABELS } from '@/lib/scoring/config';
import type { CategoryScores } from '@/lib/scoring/engine';
import { round1 } from '@/lib/utils';

export function CategoryBreakdown({ scores }: { scores: CategoryScores }) {
  const data = CATEGORIES.map((c) => ({
    category: CATEGORY_LABELS[c],
    score: round1(scores[c]),
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} stroke="currentColor" />
          <YAxis
            dataKey="category"
            type="category"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={130}
            stroke="currentColor"
          />
          <ReferenceLine x={0} stroke="currentColor" strokeOpacity={0.3} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
            cursor={{ fill: 'hsl(var(--muted))' }}
          />
          <Bar dataKey="score" radius={3}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.score >= 0 ? 'hsl(var(--status-going-great))' : 'hsl(var(--status-at-risk))'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
