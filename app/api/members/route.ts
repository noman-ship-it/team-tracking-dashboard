import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requirePrimary, requireSession } from '@/lib/auth/session';
import { apiError } from '@/lib/api';
import { listActiveMembers } from '@/lib/data/members';

export async function GET() {
  try {
    await requireSession();
    return NextResponse.json({ members: await listActiveMembers() });
  } catch (err) {
    return apiError(err);
  }
}

const Create = z.object({
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  startDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
});

export async function POST(req: NextRequest) {
  try {
    await requirePrimary();
    const body = Create.parse(await req.json());
    const inserted = await db
      .insert(schema.teamMembers)
      .values({ name: body.name, role: body.role, startDate: new Date(body.startDate), active: true })
      .returning();
    return NextResponse.json({ member: inserted[0] }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
