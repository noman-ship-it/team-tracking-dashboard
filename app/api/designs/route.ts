import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession, AuthError } from '@/lib/auth/session';
import { createDesign } from '@/lib/data/designs';
import { PLATFORMS } from '@/lib/db/schema';

const schema = z.object({
  teamMemberId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  link: z.string().max(500).optional().default(''),
  platform: z.enum(PLATFORMS).default('other'),
});

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = schema.parse(body);
    const design = await createDesign(parsed);
    return NextResponse.json({ design }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.kind }, { status: err.kind === 'forbidden' ? 403 : 401 });
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'invalid_input', detail: err.flatten() }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
