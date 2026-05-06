import 'dotenv/config';
import { createClient, type Client } from '@libsql/client';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import type { Category, Sentiment, Severity, Status } from '../lib/db/schema';

const url = process.env.TURSO_DATABASE_URL || 'file:./data/app.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

if (url.startsWith('file:')) {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

const client: Client = createClient({ url, authToken });

const DEFAULT_PASSWORD = 'change-me-please';

type SeedEvent = {
  daysAgo: number;
  category: Category;
  sentiment: Sentiment;
  severity: Severity;
  note: string;
};

function dayOffset(daysAgo: number, hour = 10): number {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return Math.floor(d.getTime() / 1000);
}

function unix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

async function clear() {
  await client.executeMultiple(`
    DELETE FROM monthly_snapshots;
    DELETE FROM manager_notes;
    DELETE FROM events;
    DELETE FROM team_members;
    DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);
}

async function seedUsers(): Promise<{ primary: number; secondary: number }> {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const r1 = await client.execute({
    sql: `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
    args: ['founder@example.com', hash, 'Alex Chen', 'primary'],
  });
  const r2 = await client.execute({
    sql: `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
    args: ['manager@example.com', hash, 'Jamie Park', 'secondary'],
  });
  return { primary: Number(r1.lastInsertRowid), secondary: Number(r2.lastInsertRowid) };
}

async function seedMember(name: string, role: string, startDaysAgo: number): Promise<number> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDaysAgo);
  startDate.setHours(0, 0, 0, 0);
  const r = await client.execute({
    sql: `INSERT INTO team_members (name, role, start_date, active) VALUES (?, ?, ?, 1)`,
    args: [name, role, unix(startDate)],
  });
  return Number(r.lastInsertRowid);
}

async function insertEvents(memberId: number, managerId: number, events: SeedEvent[]) {
  await client.batch(
    events.map((e) => ({
      sql: `INSERT INTO events (team_member_id, manager_id, category, sentiment, severity, note, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [memberId, managerId, e.category, e.sentiment, e.severity, e.note, dayOffset(e.daysAgo)],
    })),
    'write'
  );
}

const sashaEvents: SeedEvent[] = [
  { daysAgo: 95, category: 'quality', sentiment: 'positive', severity: 'moderate', note: 'Delivered initial brand exploration, well received internally.' },
  { daysAgo: 88, category: 'deadlines', sentiment: 'negative', severity: 'minor', note: 'Slightly late on the moodboard — flagged the risk early though.' },
  { daysAgo: 80, category: 'communication', sentiment: 'positive', severity: 'minor', note: 'Clear async updates throughout the week.' },
  { daysAgo: 70, category: 'client_feedback', sentiment: 'positive', severity: 'significant', note: 'Acme client specifically praised the typography system.' },
  { daysAgo: 60, category: 'quality', sentiment: 'positive', severity: 'moderate', note: 'High-quality figma delivery, no revision rounds needed.' },
  { daysAgo: 55, category: 'attitude', sentiment: 'positive', severity: 'minor', note: 'Stepped up to onboard the new contractor.' },
  { daysAgo: 35, category: 'deadlines', sentiment: 'positive', severity: 'moderate', note: 'Shipped landing page two days ahead of schedule.' },
  { daysAgo: 28, category: 'client_feedback', sentiment: 'positive', severity: 'significant', note: 'Client requested Sasha specifically for the next engagement.' },
  { daysAgo: 18, category: 'quality', sentiment: 'positive', severity: 'significant', note: 'Exceptional work on the rebrand pitch deck.' },
  { daysAgo: 12, category: 'communication', sentiment: 'positive', severity: 'moderate', note: 'Proactively raised a scope concern that saved a week of rework.' },
  { daysAgo: 5, category: 'attitude', sentiment: 'positive', severity: 'moderate', note: 'Mentored junior designer through a tough review.' },
  { daysAgo: 1, category: 'quality', sentiment: 'positive', severity: 'minor', note: 'Polished icon set, everyone happy.' },
];

const moEvents: SeedEvent[] = [
  { daysAgo: 100, category: 'quality', sentiment: 'positive', severity: 'moderate', note: 'Set up a clean tracker for client onboarding.' },
  { daysAgo: 85, category: 'deadlines', sentiment: 'positive', severity: 'minor', note: 'Got the supplier contracts done on time.' },
  { daysAgo: 75, category: 'communication', sentiment: 'negative', severity: 'minor', note: 'Slow to respond to a sub-contractor query.' },
  { daysAgo: 62, category: 'attitude', sentiment: 'positive', severity: 'moderate', note: 'Calm under pressure during the supplier outage.' },
  { daysAgo: 55, category: 'deadlines', sentiment: 'negative', severity: 'moderate', note: 'Missed the Q3 reporting deadline by three days.' },
  { daysAgo: 38, category: 'communication', sentiment: 'negative', severity: 'moderate', note: 'Went silent on an escalation for two days.' },
  { daysAgo: 30, category: 'quality', sentiment: 'negative', severity: 'minor', note: 'Spreadsheet had a few formula errors — caught in review.' },
  { daysAgo: 25, category: 'client_feedback', sentiment: 'negative', severity: 'moderate', note: 'Client noted invoice mistakes have happened twice now.' },
  { daysAgo: 15, category: 'deadlines', sentiment: 'negative', severity: 'moderate', note: 'Late on internal payroll prep — required Saturday work.' },
  { daysAgo: 9, category: 'communication', sentiment: 'negative', severity: 'minor', note: 'Forgot to loop in the design team on supplier change.' },
  { daysAgo: 4, category: 'attitude', sentiment: 'positive', severity: 'minor', note: 'Owned the missed-deadline conversation, came with a plan.' },
];

const remiEvents: SeedEvent[] = [
  { daysAgo: 105, category: 'quality', sentiment: 'positive', severity: 'moderate', note: 'Strong shipping cadence on the v1 product page.' },
  { daysAgo: 90, category: 'deadlines', sentiment: 'positive', severity: 'minor', note: 'Hit launch date with no fire drills.' },
  { daysAgo: 78, category: 'attitude', sentiment: 'positive', severity: 'minor', note: 'Helpful on cross-team syncs.' },
  { daysAgo: 65, category: 'quality', sentiment: 'negative', severity: 'moderate', note: 'PR shipped with regression that was caught in QA.' },
  { daysAgo: 58, category: 'communication', sentiment: 'negative', severity: 'minor', note: 'Vague about timeline when asked directly.' },
  { daysAgo: 50, category: 'deadlines', sentiment: 'negative', severity: 'moderate', note: 'Quietly missed a sprint commitment, surfaced too late.' },
  { daysAgo: 35, category: 'attitude', sentiment: 'negative', severity: 'moderate', note: 'Pushed back hard on direct feedback in 1:1.' },
  { daysAgo: 30, category: 'client_feedback', sentiment: 'negative', severity: 'significant', note: 'Client raised a concern about responsiveness on Slack.' },
  { daysAgo: 22, category: 'quality', sentiment: 'negative', severity: 'significant', note: 'Released a feature that broke billing for ~30 mins. Rolled back.' },
  { daysAgo: 14, category: 'deadlines', sentiment: 'negative', severity: 'moderate', note: 'Asked for an extension twice on the same deliverable.' },
  { daysAgo: 7, category: 'communication', sentiment: 'negative', severity: 'moderate', note: 'No status update for three days on a blocker we asked about.' },
  { daysAgo: 2, category: 'attitude', sentiment: 'positive', severity: 'minor', note: 'Acknowledged the pattern in 1:1, asked for support.' },
];

async function backfillSnapshots() {
  const BASE_POINTS: Record<Sentiment, Record<Severity, number>> = {
    positive: { minor: 2, moderate: 5, significant: 10 },
    negative: { minor: -2, moderate: -5, significant: -10 },
  };
  const HALF_LIFE = 30;
  const STATUS_TIERS: Array<[number, Status]> = [
    [30, 'going_great'],
    [10, 'on_track'],
    [-5, 'needs_attention'],
    [-20, 'behind_target'],
    [-Infinity, 'at_risk'],
  ];
  function statusForScore(score: number): Status {
    for (const [min, status] of STATUS_TIERS) if (score >= min) return status;
    return 'at_risk';
  }

  const membersRes = await client.execute(`SELECT id, name, role FROM team_members WHERE active = 1`);
  const members = membersRes.rows as unknown as Array<{ id: number; name: string; role: string }>;

  const now = new Date();
  const targets: Array<{ year: number; month: number }> = [];
  for (let i = 3; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    targets.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  type EventRow = { category: Category; sentiment: Sentiment; severity: Severity; occurred_at: number };

  for (const m of members) {
    const evRes = await client.execute({
      sql: `SELECT category, sentiment, severity, occurred_at FROM events WHERE team_member_id = ?`,
      args: [m.id],
    });
    const events = evRes.rows as unknown as EventRow[];

    const stmts: Array<{ sql: string; args: unknown[] }> = [];
    for (const t of targets) {
      const monthEnd = new Date(t.year, t.month, 0, 23, 59, 59, 999);
      const monthStart = new Date(t.year, t.month - 1, 1);
      const eligible = events.filter((e) => e.occurred_at * 1000 <= monthEnd.getTime());

      let score = 0;
      const cat: Record<Category, number> = {
        quality: 0, deadlines: 0, communication: 0, attitude: 0, client_feedback: 0,
      };
      for (const e of eligible) {
        const daysAgo = (monthEnd.getTime() - e.occurred_at * 1000) / MS_PER_DAY;
        const w = Math.pow(0.5, Math.max(0, daysAgo) / HALF_LIFE);
        const points = BASE_POINTS[e.sentiment][e.severity] * w;
        score += points;
        cat[e.category] += points;
      }
      const inMonth = events.filter(
        (e) => e.occurred_at * 1000 >= monthStart.getTime() && e.occurred_at * 1000 <= monthEnd.getTime()
      );
      const pos = inMonth.filter((e) => e.sentiment === 'positive').length;
      const neg = inMonth.filter((e) => e.sentiment === 'negative').length;
      const status = statusForScore(score);

      const summary = `${m.name} closed ${monthEnd.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} ${status === 'going_great' ? 'with strong momentum' : status === 'on_track' ? 'on solid footing' : status === 'needs_attention' ? 'with some patterns worth watching' : status === 'behind_target' ? 'with clear concerns to address' : 'in a position requiring formal action'}. Score ${score.toFixed(1)} based on ${pos} positive and ${neg} negative events. Backfilled snapshot.`;

      stmts.push({
        sql: `INSERT INTO monthly_snapshots (team_member_id, year, month, score, status, positive_count, negative_count, category_scores_json, summary_text, summary_source, generated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'fallback', unixepoch())`,
        args: [m.id, t.year, t.month, score, status, pos, neg, JSON.stringify(cat), summary],
      });
    }
    if (stmts.length) await client.batch(stmts as never, 'write');
  }
}

async function main() {
  console.log(`seeding against ${url.startsWith('file:') ? 'local file' : 'remote libsql'}`);
  console.log('clearing existing data...');
  await clear();

  console.log('seeding users...');
  const { primary, secondary } = await seedUsers();
  console.log(`  primary  → founder@example.com / ${DEFAULT_PASSWORD}`);
  console.log(`  secondary → manager@example.com / ${DEFAULT_PASSWORD}`);

  console.log('seeding members...');
  const sasha = await seedMember('Sasha Lin', 'Senior Designer', 220);
  const mo = await seedMember('Mo Adebayo', 'Operations Lead', 410);
  const remi = await seedMember('Remi Voss', 'Product Generalist', 180);

  console.log('seeding events...');
  await insertEvents(sasha, primary, sashaEvents);
  await insertEvents(mo, secondary, moEvents.slice(0, 6));
  await insertEvents(mo, primary, moEvents.slice(6));
  await insertEvents(remi, primary, remiEvents.slice(0, 7));
  await insertEvents(remi, secondary, remiEvents.slice(7));

  console.log('backfilling snapshots...');
  await backfillSnapshots();

  console.log('seed complete.');
  console.log('');
  console.log('Sign in with founder@example.com or manager@example.com');
  console.log(`Default password: ${DEFAULT_PASSWORD}`);
  console.log('Change passwords after first login (see README).');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
