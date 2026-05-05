import { CATEGORIES, type Category, type Event, type Status } from '@/lib/db/schema';
import { BASE_POINTS, DECAY_HALF_LIFE_DAYS, STATUS_THRESHOLDS } from './config';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function decayWeight(daysAgo: number, halfLifeDays = DECAY_HALF_LIFE_DAYS): number {
  if (daysAgo <= 0) return 1;
  return Math.pow(0.5, daysAgo / halfLifeDays);
}

export function eventBasePoints(event: Pick<Event, 'sentiment' | 'severity'>): number {
  return BASE_POINTS[event.sentiment][event.severity];
}

export function eventContribution(
  event: Pick<Event, 'sentiment' | 'severity' | 'occurredAt'>,
  asOf: Date = new Date()
): number {
  const occurred = event.occurredAt instanceof Date ? event.occurredAt : new Date(event.occurredAt);
  const daysAgo = (asOf.getTime() - occurred.getTime()) / MS_PER_DAY;
  return eventBasePoints(event) * decayWeight(daysAgo);
}

export function computeScore(events: Array<Pick<Event, 'sentiment' | 'severity' | 'occurredAt'>>, asOf: Date = new Date()): number {
  return events.reduce((sum, e) => sum + eventContribution(e, asOf), 0);
}

export function statusForScore(score: number): Status {
  for (const tier of STATUS_THRESHOLDS) {
    if (score >= tier.min) return tier.status;
  }
  return 'at_risk';
}

export type CategoryScores = Record<Category, number>;

export function emptyCategoryScores(): CategoryScores {
  return CATEGORIES.reduce<CategoryScores>(
    (acc, c) => ({ ...acc, [c]: 0 }),
    {} as CategoryScores
  );
}

export function computeCategoryScores(
  events: Array<Pick<Event, 'category' | 'sentiment' | 'severity' | 'occurredAt'>>,
  asOf: Date = new Date()
): CategoryScores {
  const out = emptyCategoryScores();
  for (const e of events) {
    out[e.category] += eventContribution(e, asOf);
  }
  return out;
}

export function strongestCategory(scores: CategoryScores): Category {
  return CATEGORIES.reduce((best, c) => (scores[c] > scores[best] ? c : best), CATEGORIES[0]);
}

export function weakestCategory(scores: CategoryScores): Category {
  return CATEGORIES.reduce((worst, c) => (scores[c] < scores[worst] ? c : worst), CATEGORIES[0]);
}

export function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export function firstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

export function eventsBefore<T extends { occurredAt: Date | number }>(events: T[], asOf: Date): T[] {
  const cutoff = asOf.getTime();
  return events.filter((e) => {
    const t = e.occurredAt instanceof Date ? e.occurredAt.getTime() : new Date(e.occurredAt).getTime();
    return t <= cutoff;
  });
}

export function eventsInMonth<T extends { occurredAt: Date | number }>(events: T[], year: number, month: number): T[] {
  const start = firstDayOfMonth(year, month).getTime();
  const end = lastDayOfMonth(year, month).getTime();
  return events.filter((e) => {
    const t = e.occurredAt instanceof Date ? e.occurredAt.getTime() : new Date(e.occurredAt).getTime();
    return t >= start && t <= end;
  });
}

export function trendDirection(thisScore: number, prevScore: number | null): 'up' | 'down' | 'flat' {
  if (prevScore == null) return 'flat';
  const delta = thisScore - prevScore;
  if (Math.abs(delta) < 0.5) return 'flat';
  return delta > 0 ? 'up' : 'down';
}
