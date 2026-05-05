import type { SessionOptions } from 'iron-session';
import type { UserRole } from '@/lib/db/schema';

export type SessionData = {
  userId?: number;
  email?: string;
  name?: string;
  role?: UserRole;
};

const sessionPassword = process.env.SESSION_PASSWORD;
if (!sessionPassword || sessionPassword.length < 32) {
  throw new Error('SESSION_PASSWORD env var must be set and at least 32 characters long.');
}

export const sessionOptions: SessionOptions = {
  password: sessionPassword,
  cookieName: 'team_dashboard_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  },
};
