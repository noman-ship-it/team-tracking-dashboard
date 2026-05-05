import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { Category, Status } from '@/lib/db/schema';
import { CATEGORY_LABELS, STATUS_LABELS, SEVERITY_LABELS } from '@/lib/scoring/config';
import type { CategoryScores } from '@/lib/scoring/engine';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are an experienced HR director writing a single-paragraph monthly check-in note about a team member, intended to be read by their manager.

Tone:
- Specific and behavioural — never vague impressions, never personality judgements.
- Plain English. No HR clichés ("synergy", "going forward", "stakeholders"), no praise sandwiches, no filler.
- Reference the actual events and categories provided. Cite at most one or two concrete examples.
- Acknowledge trend (improving / declining / stable) when the data supports it.
- 2 to 4 sentences. No bullet points. No headers. No greeting.
- If the data is sparse, say so plainly rather than padding.

Output: a single paragraph of prose. Nothing else.`;

export type SummaryInput = {
  name: string;
  role: string;
  status: Status;
  previousStatus: Status | null;
  thisMonthScore: number;
  previousMonthScore: number | null;
  categoryScores: CategoryScores;
  topPositive: Array<{ category: Category; severity: string; note: string; date: string }>;
  topNegative: Array<{ category: Category; severity: string; note: string; date: string }>;
  positiveCount: number;
  negativeCount: number;
};

export type SummaryResult = {
  text: string;
  source: 'llm' | 'fallback';
};

export async function generateSummary(input: SummaryInput): Promise<SummaryResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await llmSummary(input);
    } catch (err) {
      console.error('[summary] LLM call failed, using fallback:', err);
    }
  }
  return { text: fallbackSummary(input), source: 'fallback' };
}

async function llmSummary(input: SummaryInput): Promise<SummaryResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const userPayload = {
    name: input.name,
    role: input.role,
    current_status: STATUS_LABELS[input.status],
    previous_status: input.previousStatus ? STATUS_LABELS[input.previousStatus] : null,
    score_this_month: round1(input.thisMonthScore),
    score_last_month: input.previousMonthScore == null ? null : round1(input.previousMonthScore),
    score_delta: input.previousMonthScore == null ? null : round1(input.thisMonthScore - input.previousMonthScore),
    positive_event_count: input.positiveCount,
    negative_event_count: input.negativeCount,
    category_scores: Object.fromEntries(
      Object.entries(input.categoryScores).map(([k, v]) => [CATEGORY_LABELS[k as Category], round1(v)])
    ),
    notable_positives: input.topPositive.map((e) => ({
      category: CATEGORY_LABELS[e.category],
      severity: e.severity,
      note: e.note,
      date: e.date,
    })),
    notable_negatives: input.topNegative.map((e) => ({
      category: CATEGORY_LABELS[e.category],
      severity: e.severity,
      note: e.note,
      date: e.date,
    })),
  };

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 350,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Write the monthly check-in paragraph based on this data:\n\n${JSON.stringify(userPayload, null, 2)}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('empty response');
  return { text, source: 'llm' };
}

function fallbackSummary(input: SummaryInput): string {
  const parts: string[] = [];
  const delta =
    input.previousMonthScore == null ? null : round1(input.thisMonthScore - input.previousMonthScore);

  parts.push(
    `${input.name} is ${STATUS_LABELS[input.status].toLowerCase()} this month with a score of ${round1(
      input.thisMonthScore
    )}.`
  );

  if (delta != null) {
    if (delta > 1) parts.push(`That's up ${delta} points from last month.`);
    else if (delta < -1) parts.push(`That's down ${Math.abs(delta)} points from last month.`);
    else parts.push(`Roughly flat versus last month.`);
  }

  const top = input.topPositive[0];
  const bottom = input.topNegative[0];
  if (top) {
    parts.push(`Best moment: ${top.note || `${SEVERITY_LABELS[top.severity as keyof typeof SEVERITY_LABELS] ?? top.severity} ${CATEGORY_LABELS[top.category]} event`} on ${top.date}.`);
  }
  if (bottom) {
    parts.push(
      `Worth a check-in on: ${bottom.note || `${SEVERITY_LABELS[bottom.severity as keyof typeof SEVERITY_LABELS] ?? bottom.severity} ${CATEGORY_LABELS[bottom.category]} concern`} (${bottom.date}).`
    );
  }
  if (!top && !bottom) {
    parts.push(`No significant events logged this month.`);
  }

  return parts.join(' ');
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
