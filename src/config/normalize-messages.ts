export type ChatRole = "user" | "assistant" | "reasoning";

export interface ChatMessageViewModel {
  id: string;
  role: ChatRole;
  content: unknown;
}

export function normalizeMessages(messages: unknown[]): ChatMessageViewModel[] {
  const result: ChatMessageViewModel[] = [];

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (!message || typeof message !== "object") continue;

    const messageRecord = message as {
      id?: unknown;
      role?: unknown;
      content?: unknown;
    };

    if (
      messageRecord.role !== "user" &&
      messageRecord.role !== "assistant" &&
      messageRecord.role !== "reasoning"
    ) {
      continue;
    }

    if (typeof messageRecord.content !== "string") {
      continue;
    }

    if (messageRecord.content.trim() === "") {
      continue;
    }

    const id =
      typeof messageRecord.id === "string" && messageRecord.id.trim() !== ""
        ? messageRecord.id
        : `msg-${index}`;

    result.push({
      id,
      role: messageRecord.role,
      content: messageRecord.content,
    });
  }

  return result;
}
