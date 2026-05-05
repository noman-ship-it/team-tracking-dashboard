import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { apiError } from '@/lib/api';
import { generateSnapshotsForAllActive, ymOf } from '@/lib/reports/snapshot';

const Body = z.object({
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = Body.parse(await req.json().catch(() => ({})));
    const now = new Date();
    const ym = body.year && body.month ? { year: body.year, month: body.month } : ymOf(now);
    const generated = await generateSnapshotsForAllActive(ym.year, ym.month);
    return NextResponse.json({ ok: true, year: ym.year, month: ym.month, generated });
  } catch (err) {
    return apiError(err);
  }
}
