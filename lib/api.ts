import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@/lib/auth/session';

export function apiError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: err.kind },
      { status: err.kind === 'unauthenticated' ? 401 : 403 }
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: 'invalid_input', issues: err.flatten() }, { status: 400 });
  }
  console.error('[api]', err);
  const message = err instanceof Error ? err.message : 'internal_error';
  return NextResponse.json({ error: message }, { status: 500 });
}
