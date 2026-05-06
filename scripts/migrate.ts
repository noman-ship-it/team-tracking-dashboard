import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const url = process.env.TURSO_DATABASE_URL || 'file:./data/app.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url.startsWith('file:')) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }

  const client = createClient({ url, authToken });

  const migrationsDir = path.join(process.cwd(), 'lib/db/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`migrating against ${url.startsWith('file:') ? 'local file' : 'remote libsql'}`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await client.executeMultiple(sql);
    console.log(`applied ${file}`);
  }

  console.log('migrations complete');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
