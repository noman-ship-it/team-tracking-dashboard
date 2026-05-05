import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { db, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import type { User } from '@/lib/db/schema';
import { sessionOptions, type SessionData } from './session-options';

export { sessionOptions };
export type { SessionData };

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireSession(): Promise<Required<Pick<SessionData, 'userId' | 'email' | 'name' | 'role'>>> {
  const session = await getSession();
  if (!session.userId || !session.role) {
    throw new AuthError('unauthenticated');
  }
  return {
    userId: session.userId,
    email: session.email!,
    name: session.name!,
    role: session.role,
  };
}

export async function requirePrimary() {
  const session = await requireSession();
  if (session.role !== 'primary') throw new AuthError('forbidden');
  return session;
}

export async function loadUser(id: number): Promise<User | undefined> {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return rows[0];
}

export class AuthError extends Error {
  constructor(public kind: 'unauthenticated' | 'forbidden') {
    super(kind);
    this.name = 'AuthError';
  }
}
