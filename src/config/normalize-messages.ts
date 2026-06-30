import { type Message } from "@ag-ui/client";

export type ChatRole = "user" | "assistant" | "reasoning";

export interface ChatMessageViewModel {
  id: string;
  role: ChatRole;
  content: unknown;
}

export function normalizeMessages(
  messages: ReadonlyArray<Message>,
): ChatMessageViewModel[] {
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

    // AG-UI may create assistant tool-call containers without a content field.
    // Keep those hidden from the chat timeline.
    if (!Object.prototype.hasOwnProperty.call(messageRecord, "content")) {
      continue;
    }

    if (messageRecord.role === "reasoning") {
      if (typeof messageRecord.content !== "string") {
        continue;
      }

      if (messageRecord.content.trim() === "") {
        continue;
      }
    }

    if (
      (messageRecord.role === "user" || messageRecord.role === "assistant") &&
      typeof messageRecord.content === "string" &&
      messageRecord.content.trim() === ""
    ) {
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
