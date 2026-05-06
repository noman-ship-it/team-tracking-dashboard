import 'server-only';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import path from 'node:path';
import fs from 'node:fs';
import * as schema from './schema';

// For local development the URL defaults to a SQLite file under ./data/app.db.
// For Vercel / production, set TURSO_DATABASE_URL=libsql://... and TURSO_AUTH_TOKEN=...
const url = process.env.TURSO_DATABASE_URL || 'file:./data/app.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

if (url.startsWith('file:')) {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

declare global {
  // eslint-disable-next-line no-var
  var __libsql: Client | undefined;
}

const client = global.__libsql ?? createClient({ url, authToken });
if (process.env.NODE_ENV !== 'production') global.__libsql = client;

export const db = drizzle(client, { schema });
export { schema };
