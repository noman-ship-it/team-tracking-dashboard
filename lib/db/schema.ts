import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const CATEGORIES = ['quality', 'deadlines', 'communication', 'attitude', 'client_feedback'] as const;
export type Category = (typeof CATEGORIES)[number];

export const SENTIMENTS = ['positive', 'negative'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const SEVERITIES = ['minor', 'moderate', 'significant'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const STATUSES = [
  'going_great',
  'on_track',
  'needs_attention',
  'behind_target',
  'at_risk',
] as const;
export type Status = (typeof STATUSES)[number];

export const USER_ROLES = ['primary', 'secondary'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role', { enum: USER_ROLES }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
  })
);

export const teamMembers = sqliteTable('team_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  role: text('role').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    teamMemberId: integer('team_member_id')
      .notNull()
      .references(() => teamMembers.id, { onDelete: 'cascade' }),
    managerId: integer('manager_id')
      .notNull()
      .references(() => users.id),
    category: text('category', { enum: CATEGORIES }).notNull(),
    sentiment: text('sentiment', { enum: SENTIMENTS }).notNull(),
    severity: text('severity', { enum: SEVERITIES }).notNull(),
    note: text('note').notNull().default(''),
    occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    memberIdx: index('events_member_occurred_idx').on(t.teamMemberId, t.occurredAt),
    managerIdx: index('events_manager_idx').on(t.managerId),
  })
);

export const managerNotes = sqliteTable('manager_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamMemberId: integer('team_member_id')
    .notNull()
    .references(() => teamMembers.id, { onDelete: 'cascade' }),
  managerId: integer('manager_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const monthlySnapshots = sqliteTable(
  'monthly_snapshots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    teamMemberId: integer('team_member_id')
      .notNull()
      .references(() => teamMembers.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    score: real('score').notNull(),
    status: text('status', { enum: STATUSES }).notNull(),
    positiveCount: integer('positive_count').notNull(),
    negativeCount: integer('negative_count').notNull(),
    categoryScoresJson: text('category_scores_json').notNull(),
    summaryText: text('summary_text').notNull(),
    summarySource: text('summary_source', { enum: ['llm', 'fallback'] }).notNull().default('fallback'),
    generatedAt: integer('generated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    memberMonthIdx: uniqueIndex('snapshots_member_month_idx').on(t.teamMemberId, t.year, t.month),
  })
);

export type User = typeof users.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type Event = typeof events.$inferSelect;
export type ManagerNote = typeof managerNotes.$inferSelect;
export type MonthlySnapshot = typeof monthlySnapshots.$inferSelect;
