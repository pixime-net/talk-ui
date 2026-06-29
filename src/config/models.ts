import { z } from "zod/v4";

export const MODEL_ALIASES = [
  "haiku-4.5",
  "sonnet-4.6",
  "opus-4.6",
  "o4-mini",
  "gpt-5.4",
  "mistral-small",
  "agent",
] as const;

export const modelAliasSchema = z.enum(MODEL_ALIASES);

export type ModelAlias = z.infer<typeof modelAliasSchema>;

export const DEFAULT_MODEL: ModelAlias = "sonnet-4.6";

export function parseModelAlias(value: unknown): ModelAlias {
  return modelAliasSchema.parse(value);
}

export function isModelAlias(value: unknown): value is ModelAlias {
  return modelAliasSchema.safeParse(value).success;
}

// --- Thinking effort ---

export const THINKING_EFFORTS = ["off", "low", "medium", "high"] as const;

export const thinkingEffortSchema = z.enum(THINKING_EFFORTS);

export type ThinkingEffort = z.infer<typeof thinkingEffortSchema>;

export const DEFAULT_THINKING_EFFORT: ThinkingEffort = "off";

const THINKING_MODELS: ReadonlySet<ModelAlias> = new Set([
  "haiku-4.5",
  "sonnet-4.6",
  "opus-4.6",
  "o4-mini",
]);

export function supportsThinking(model: ModelAlias): boolean {
  return THINKING_MODELS.has(model);
}
