import { type Message } from "@ag-ui/client";

export type ChatRole = "user" | "assistant" | "reasoning" | "tool-call";

export interface ChatMessageViewModel {
  id: string;
  role: ChatRole;
  content: unknown;
  toolName?: string;
  toolArgs?: string;
  toolResult?: string;
  toolCallId?: string;
}

interface ToolCallRecord {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

function toToolResultString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function normalizeMessages(
  messages: ReadonlyArray<Message>,
): ChatMessageViewModel[] {
  const result: ChatMessageViewModel[] = [];
  const pendingToolResultsById = new Map<string, string>();
  const unresolvedToolCalls: ChatMessageViewModel[] = [];

  const markResolved = (vm: ChatMessageViewModel, toolResult: string) => {
    vm.toolResult = toolResult;
    const idx = unresolvedToolCalls.indexOf(vm);
    if (idx >= 0) {
      unresolvedToolCalls.splice(idx, 1);
    }
  };

  const resolveOldestUnmatched = (toolResult: string): boolean => {
    const oldest = unresolvedToolCalls.find(
      (vm) => vm.toolResult === undefined,
    );
    if (!oldest) return false;
    markResolved(oldest, toolResult);
    return true;
  };

  const finalizeUnresolvedForCompletedAssistantTurn = () => {
    for (const vm of unresolvedToolCalls) {
      if (vm.toolResult === undefined) {
        // When an assistant text answer is emitted, the tool phase is over.
        // Keep an empty result so the UI stops showing in-progress and stays expandable.
        vm.toolResult = "";
      }
    }
    unresolvedToolCalls.length = 0;
  };

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (!message || typeof message !== "object") continue;

    const messageRecord = message as {
      id?: unknown;
      role?: unknown;
      content?: unknown;
      toolCalls?: unknown;
      toolCallId?: unknown;
    };

    // Handle assistant messages with toolCalls (tool-call containers)
    if (
      messageRecord.role === "assistant" &&
      Array.isArray(messageRecord.toolCalls)
    ) {
      for (const [toolIndex, tc] of (
        messageRecord.toolCalls as ToolCallRecord[]
      ).entries()) {
        if (!tc || typeof tc !== "object") continue;
        const fn = tc.function;
        if (!fn || typeof fn !== "object") continue;

        const toolCallId =
          typeof tc.id === "string" && tc.id.trim() !== "" ? tc.id : undefined;
        const pendingToolResult =
          toolCallId !== undefined
            ? pendingToolResultsById.get(toolCallId)
            : undefined;
        if (toolCallId !== undefined) {
          pendingToolResultsById.delete(toolCallId);
        }

        const vmId =
          toolCallId !== undefined
            ? `tool-${toolCallId}`
            : `tool-msg-${index}-${toolIndex}`;

        const vm: ChatMessageViewModel = {
          id: vmId,
          role: "tool-call",
          content: null,
          toolName: typeof fn.name === "string" ? fn.name : "unknown",
          toolArgs: typeof fn.arguments === "string" ? fn.arguments : undefined,
          toolCallId,
          toolResult: pendingToolResult,
        };

        result.push(vm);

        if (vm.toolResult === undefined) {
          unresolvedToolCalls.push(vm);
        }
      }

      // Preserve assistant content if the message includes both toolCalls and text.
      if (!Object.prototype.hasOwnProperty.call(messageRecord, "content")) {
        continue;
      }
    }

    // Handle tool result messages — attach result to matching tool-call VM
    if (messageRecord.role === "tool") {
      const toolCallId = messageRecord.toolCallId;
      const normalizedToolResult = toToolResultString(messageRecord.content);

      if (normalizedToolResult === undefined) {
        continue;
      }

      if (typeof toolCallId === "string") {
        const matchingVM = result.find(
          (vm) => vm.role === "tool-call" && vm.toolCallId === toolCallId,
        );
        if (matchingVM) {
          markResolved(matchingVM, normalizedToolResult);
        } else {
          pendingToolResultsById.set(toolCallId, normalizedToolResult);
          resolveOldestUnmatched(normalizedToolResult);
        }
      } else {
        resolveOldestUnmatched(normalizedToolResult);
      }
      continue;
    }

    if (
      messageRecord.role !== "user" &&
      messageRecord.role !== "assistant" &&
      messageRecord.role !== "reasoning"
    ) {
      continue;
    }

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

    if (
      messageRecord.role === "assistant" &&
      typeof messageRecord.content === "string" &&
      messageRecord.content.trim() !== ""
    ) {
      finalizeUnresolvedForCompletedAssistantTurn();
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
