import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { apiError } from '@/lib/api';

const DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const rows = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, Number(id)))
      .limit(1);
    const event = rows[0];
    if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (event.managerId !== session.userId) {
      return NextResponse.json({ error: 'only_author_can_delete' }, { status: 403 });
    }
    const created = event.createdAt instanceof Date ? event.createdAt.getTime() : new Date(event.createdAt).getTime();
    if (Date.now() - created > DELETE_WINDOW_MS) {
      return NextResponse.json({ error: 'delete_window_expired' }, { status: 403 });
    }
    await db.delete(schema.events).where(eq(schema.events.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
