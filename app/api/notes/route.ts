import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { apiError } from '@/lib/api';

const Create = z.object({
  teamMemberId: z.number().int().positive(),
  body: z.string().min(1).max(4000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = Create.parse(await req.json());
    const inserted = await db
      .insert(schema.managerNotes)
      .values({ teamMemberId: body.teamMemberId, managerId: session.userId, body: body.body })
      .returning();
    return NextResponse.json({ note: inserted[0] }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
