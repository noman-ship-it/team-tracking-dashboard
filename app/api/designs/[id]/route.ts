import { NextResponse } from 'next/server';
import { requireSession, AuthError } from '@/lib/auth/session';
import { archiveDesign } from '@/lib/data/designs';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    await archiveDesign(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.kind }, { status: err.kind === 'forbidden' ? 403 : 401 });
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
