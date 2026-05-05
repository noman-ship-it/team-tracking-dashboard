import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requirePrimary, requireSession } from '@/lib/auth/session';
import { apiError } from '@/lib/api';
import { getMember } from '@/lib/data/members';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const member = await getMember(Number(id));
    if (!member) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ member });
  } catch (err) {
    return apiError(err);
  }
}

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.string().min(1).max(120).optional(),
  startDate: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePrimary();
    const { id } = await params;
    const body = Patch.parse(await req.json());
    const update: Record<string, unknown> = {};
    if (body.name) update.name = body.name;
    if (body.role) update.role = body.role;
    if (body.startDate) update.startDate = new Date(body.startDate);
    if (typeof body.active === 'boolean') {
      update.active = body.active;
      update.archivedAt = body.active ? null : new Date();
    }
    await db.update(schema.teamMembers).set(update).where(eq(schema.teamMembers.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePrimary();
    const { id } = await params;
    // Soft delete (archive)
    await db
      .update(schema.teamMembers)
      .set({ active: false, archivedAt: new Date() })
      .where(eq(schema.teamMembers.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
