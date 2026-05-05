import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { apiError } from '@/lib/api';
import { CATEGORIES, SENTIMENTS, SEVERITIES } from '@/lib/db/schema';

const Create = z.object({
  teamMemberId: z.number().int().positive(),
  category: z.enum(CATEGORIES),
  sentiment: z.enum(SENTIMENTS),
  severity: z.enum(SEVERITIES),
  note: z.string().max(2000).default(''),
  occurredAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = Create.parse(await req.json());
    const inserted = await db
      .insert(schema.events)
      .values({
        teamMemberId: body.teamMemberId,
        managerId: session.userId,
        category: body.category,
        sentiment: body.sentiment,
        severity: body.severity,
        note: body.note ?? '',
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
      })
      .returning();
    return NextResponse.json({ event: inserted[0] }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
