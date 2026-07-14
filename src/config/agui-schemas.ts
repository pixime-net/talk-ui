import { z } from "zod/v4";

const toolCallSchema = z.object({
  id: z.string(),
  type: z.string(),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

const baseFields = {
  id: z.string().optional(),
};

const textMessageSchema = z
  .object({
    ...baseFields,
    role: z.enum(["user", "assistant"]),
    content: z.unknown(),
  })
  .transform((d) => ({ ...d, kind: "text" as const }));

const reasoningMessageSchema = z
  .object({
    ...baseFields,
    role: z.literal("reasoning"),
    content: z.string(),
  })
  .transform((d) => ({ ...d, kind: "text" as const }));

const toolCallContainerSchema = z
  .object({
    ...baseFields,
    role: z.literal("assistant"),
    toolCalls: z.array(toolCallSchema),
    content: z.unknown().optional(),
  })
  .transform((d) => ({ ...d, kind: "tool-call-container" as const }));

const toolResultSchema = z
  .object({
    ...baseFields,
    role: z.literal("tool"),
    content: z.unknown(),
    toolCallId: z.string().optional(),
  })
  .transform((d) => ({ ...d, kind: "tool-result" as const }));

export type TextMessage =
  z.infer<typeof textMessageSchema> | z.infer<typeof reasoningMessageSchema>;

export type ToolCallContainer = z.infer<typeof toolCallContainerSchema>;
export type ToolResult = z.infer<typeof toolResultSchema>;

export type ParsedAguiMessage = TextMessage | ToolCallContainer | ToolResult;

export function parseAguiMessage(
  value: unknown,
): ParsedAguiMessage | undefined {
  if (!value || typeof value !== "object") return undefined;

  const base = z
    .object({ id: z.string().optional(), role: z.string() })
    .safeParse(value);

  if (!base.success) return undefined;

  const { role } = base.data;

  if (role === "assistant") {
    const container = toolCallContainerSchema.safeParse(value);
    if (container.success) return container.data;

    const text = textMessageSchema.safeParse(value);
    if (text.success) return text.data;
    return undefined;
  }

  if (role === "tool") {
    const result = toolResultSchema.safeParse(value);
    if (result.success) return result.data;
    return undefined;
  }

  if (role === "user") {
    const parsed = textMessageSchema.safeParse(value);
    if (parsed.success) return parsed.data;
  }

  if (role === "reasoning") {
    const parsed = reasoningMessageSchema.safeParse(value);
    if (parsed.success) return parsed.data;
  }

  return undefined;
}

export function isTextMessage(msg: ParsedAguiMessage): msg is TextMessage {
  return msg.kind === "text";
}
