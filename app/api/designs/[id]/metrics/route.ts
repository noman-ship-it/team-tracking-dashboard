import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession, AuthError } from '@/lib/auth/session';
import { logMetric } from '@/lib/data/designs';
import { METRIC_TYPES } from '@/lib/db/schema';

const schema = z.object({
  metricType: z.enum(METRIC_TYPES).default('impressions'),
  value: z.number().int().nonnegative(),
  note: z.string().max(280).optional().default(''),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.parse(body);
    const row = await logMetric({
      designAssetId: Number(id),
      metricType: parsed.metricType,
      value: parsed.value,
      managerId: session.userId,
      note: parsed.note,
    });
    return NextResponse.json({ metric: row }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.kind }, { status: err.kind === 'forbidden' ? 403 : 401 });
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'invalid_input', detail: err.flatten() }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
