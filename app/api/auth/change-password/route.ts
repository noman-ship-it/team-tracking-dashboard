import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';

const body = z.object({
  current: z.string().min(1),
  next: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const parsed = body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { current, next } = parsed.data;

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

    const hash = await bcrypt.hash(next, 12);
    await db
      .update(schema.users)
      .set({ passwordHash: hash })
      .where(eq(schema.users.id, session.userId));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
