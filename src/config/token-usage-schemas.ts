import { z } from "zod/v4";

/** Names of the application-specific AG-UI CUSTOM events carrying token usage. */
export const TOKEN_USAGE_EVENT_NAME = "token_usage";
export const TURN_USAGE_EVENT_NAME = "turn_usage";

const tokenCount = z.int().min(0);
const ratio = z.number().min(0).refine(Number.isFinite);

const tokenCountFields = {
  input_tokens: tokenCount.optional(),
  output_tokens: tokenCount.optional(),
  cache_read_tokens: tokenCount.optional(),
  cache_write_tokens: tokenCount.optional(),
  reasoning_tokens: tokenCount.optional(),
};

const tokenUsageEventSchema = z.object({
  model: z.string().optional(),
  ...tokenCountFields,
  context_window_tokens: tokenCount.optional(),
  provider_max_output_tokens: tokenCount.optional(),
  context_ratio: ratio.optional(),
  output_ratio: ratio.optional(),
});

const turnUsageEventSchema = z.object({
  model: z.string().optional(),
  ...tokenCountFields,
});

/** Confirmed usage of a single completed LLM call. Absent fields are unknown, not zero. */
export type TokenUsage = z.infer<typeof tokenUsageEventSchema>;

/** Authoritative counts for one completed or interrupted turn. */
export type TurnUsage = z.infer<typeof turnUsageEventSchema>;

/** Cumulative session totals, limited to fields confirmed at least once. */
export type CumulativeUsage = z.infer<typeof turnUsageEventSchema>;

export const CUMULATIVE_USAGE_FIELDS = [
  "input_tokens",
  "output_tokens",
  "cache_read_tokens",
  "cache_write_tokens",
  "reasoning_tokens",
] as const;

export function parseTokenUsageEvent(value: unknown): TokenUsage | undefined {
  const parsed = tokenUsageEventSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseTurnUsageEvent(value: unknown): TurnUsage | undefined {
  const parsed = turnUsageEventSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Adds an authoritative turn total to the running session totals. */
export function addTurnUsage(
  current: CumulativeUsage | null,
  turn: TurnUsage,
): CumulativeUsage {
  const next: CumulativeUsage = { ...current };
  for (const field of CUMULATIVE_USAGE_FIELDS) {
    const increment = turn[field];
    if (increment === undefined) continue;
    next[field] = (next[field] ?? 0) + increment;
  }
  return next;
}

export type ContextStatus = "normal" | "warning" | "critical" | "blocked";

export const CONTEXT_STATUS_LABELS: Record<ContextStatus, string> = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
  blocked: "Limit reached",
};

export function contextStatusFromRatio(value: number): ContextStatus {
  const visibleRatio = Math.round(value * 100) / 100;
  if (visibleRatio >= 1) return "blocked";
  if (visibleRatio >= 0.85) return "critical";
  if (visibleRatio >= 0.7) return "warning";
  return "normal";
}

/**
 * Context data for the indicator. The limit is usable only when both a positive
 * context window and a backend-provided ratio are available.
 */
export interface ContextUsageView {
  inputTokens: number;
  limitTokens?: number;
  ratio?: number;
  status?: ContextStatus;
}

export function contextUsageView(
  usage: TokenUsage | null,
): ContextUsageView | null {
  if (usage === null) return null;
  const inputTokens = usage.input_tokens;
  if (inputTokens === undefined) return null;

  const limitTokens = usage.context_window_tokens;
  const ratioValue = usage.context_ratio;
  if (
    limitTokens === undefined ||
    limitTokens <= 0 ||
    ratioValue === undefined
  ) {
    return { inputTokens };
  }

  return {
    inputTokens,
    limitTokens,
    ratio: ratioValue,
    status: contextStatusFromRatio(ratioValue),
  };
}

export function formatTokenCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100).toString()}%`;
}
