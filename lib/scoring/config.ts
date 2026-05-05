import type { Category, Severity, Sentiment, Status } from '@/lib/db/schema';

export const BASE_POINTS: Record<Sentiment, Record<Severity, number>> = {
  positive: { minor: 2, moderate: 5, significant: 10 },
  negative: { minor: -2, moderate: -5, significant: -10 },
};

export const DECAY_HALF_LIFE_DAYS = 30;

export const STATUS_THRESHOLDS: Array<{ min: number; status: Status }> = [
  { min: 30, status: 'going_great' },
  { min: 10, status: 'on_track' },
  { min: -5, status: 'needs_attention' },
  { min: -20, status: 'behind_target' },
  { min: -Infinity, status: 'at_risk' },
];

export const STATUS_LABELS: Record<Status, string> = {
  going_great: 'Going great',
  on_track: 'On track',
  needs_attention: 'Needs attention',
  behind_target: 'Behind target',
  at_risk: 'At risk',
};

export const STATUS_DESCRIPTIONS: Record<Status, string> = {
  going_great: 'Consistently strong performance across categories.',
  on_track: 'Solid performance, no major concerns.',
  needs_attention: 'Some negative patterns emerging — manager should check in.',
  behind_target: 'Clear performance issues across multiple categories.',
  at_risk: 'Serious and repeated issues requiring formal action.',
};

export const STATUS_RANK: Record<Status, number> = {
  going_great: 5,
  on_track: 4,
  needs_attention: 3,
  behind_target: 2,
  at_risk: 1,
};

export const CATEGORY_LABELS: Record<Category, string> = {
  quality: 'Quality of work',
  deadlines: 'Deadlines & delivery',
  communication: 'Communication',
  attitude: 'Attitude & behaviour',
  client_feedback: 'Client feedback',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  significant: 'Significant',
};
