import {
  parseAguiMessage,
  type ToolCallContainer,
  type ToolResult,
  type TextMessage,
} from "./agui-schemas";

export type ChatRole = "user" | "assistant" | "reasoning" | "tool-call";

export type ContentMessageVM = {
  id: string;
  role: "user" | "assistant";
  content: unknown;
};

export type ReasoningMessageVM = {
  id: string;
  role: "reasoning";
  content: string;
};

export type ToolCallMessageVM = {
  id: string;
  role: "tool-call";
  content: null;
  toolName?: string;
  toolArgs?: string;
  toolResult?: string;
  toolCallId?: string;
};

export type ChatMessageViewModel =
  ContentMessageVM | ReasoningMessageVM | ToolCallMessageVM;

function toToolResultString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function handleToolCallContainer(
  msg: ToolCallContainer,
  index: number,
  pendingToolResultsById: Map<string, string>,
  unresolvedToolCalls: ToolCallMessageVM[],
): (ToolCallMessageVM | ContentMessageVM)[] {
  const vms: (ToolCallMessageVM | ContentMessageVM)[] = [];

  for (const [toolIndex, tc] of msg.toolCalls.entries()) {
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

    const vm: ToolCallMessageVM = {
      id: vmId,
      role: "tool-call",
      content: null,
      toolName:
        typeof tc.function.name === "string" ? tc.function.name : "unknown",
      ...(typeof tc.function.arguments === "string" && {
        toolArgs: tc.function.arguments,
      }),
      ...(toolCallId !== undefined && { toolCallId }),
      ...(pendingToolResult !== undefined && { toolResult: pendingToolResult }),
    };

    vms.push(vm);

    if (vm.toolResult === undefined) {
      unresolvedToolCalls.push(vm);
    }
  }

  if (msg.content !== undefined) {
    const msgId =
      msg.id !== undefined && msg.id.trim() !== "" ? msg.id : `msg-${index}`;

    const contentVm: ContentMessageVM = {
      id: msgId,
      role: "assistant",
      content: msg.content,
    };
    vms.push(contentVm);
  }

  return vms;
}

function handleToolResult(
  msg: ToolResult,
  result: ChatMessageViewModel[],
  pendingToolResultsById: Map<string, string>,
  unresolvedToolCalls: ToolCallMessageVM[],
): void {
  const normalizedToolResult = toToolResultString(msg.content);

  if (normalizedToolResult === undefined) return;

  if (msg.toolCallId !== undefined) {
    const matchingVM = result.find(
      (vm): vm is ToolCallMessageVM =>
        vm.role === "tool-call" && vm.toolCallId === msg.toolCallId,
    );
    if (matchingVM) {
      markResolved(matchingVM, normalizedToolResult, unresolvedToolCalls);
    } else {
      pendingToolResultsById.set(msg.toolCallId, normalizedToolResult);
      resolveOldestUnmatched(normalizedToolResult, unresolvedToolCalls);
    }
  } else {
    resolveOldestUnmatched(normalizedToolResult, unresolvedToolCalls);
  }
}

function markResolved(
  vm: ToolCallMessageVM,
  toolResult: string,
  unresolvedToolCalls: ToolCallMessageVM[],
) {
  vm.toolResult = toolResult;
  const idx = unresolvedToolCalls.indexOf(vm);
  if (idx >= 0) {
    unresolvedToolCalls.splice(idx, 1);
  }
}

function resolveOldestUnmatched(
  toolResult: string,
  unresolvedToolCalls: ToolCallMessageVM[],
): boolean {
  const oldest = unresolvedToolCalls.find((vm) => vm.toolResult === undefined);
  if (!oldest) return false;
  markResolved(oldest, toolResult, unresolvedToolCalls);
  return true;
}

function finalizeUnresolvedForCompletedAssistantTurn(
  unresolvedToolCalls: ToolCallMessageVM[],
) {
  for (const vm of unresolvedToolCalls) {
    if (vm.toolResult === undefined) {
      vm.toolResult = "";
    }
  }
  unresolvedToolCalls.length = 0;
}

function handleTextMessage(
  msg: TextMessage,
  index: number,
  unresolvedToolCalls: ToolCallMessageVM[],
): ContentMessageVM | ReasoningMessageVM | undefined {
  if (msg.role === "reasoning") {
    if (msg.content.trim() === "") return undefined;
  }

  if (
    (msg.role === "user" || msg.role === "assistant") &&
    typeof msg.content === "string" &&
    msg.content.trim() === ""
  ) {
    return undefined;
  }

  if (
    msg.role === "assistant" &&
    typeof msg.content === "string" &&
    msg.content.trim() !== ""
  ) {
    finalizeUnresolvedForCompletedAssistantTurn(unresolvedToolCalls);
  }

  const msgId =
    msg.id !== undefined && msg.id.trim() !== "" ? msg.id : `msg-${index}`;

  if (msg.role === "reasoning") {
    return {
      id: msgId,
      role: "reasoning" as const,
      content: msg.content,
    };
  }
  return {
    id: msgId,
    role: msg.role,
    content: msg.content,
  };
}

export function normalizeMessages(
  messages: ReadonlyArray<Record<string, unknown>>,
): ChatMessageViewModel[] {
  const result: ChatMessageViewModel[] = [];
  const pendingToolResultsById = new Map<string, string>();
  const unresolvedToolCalls: ToolCallMessageVM[] = [];

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];

    const parsed = parseAguiMessage(message);
    if (!parsed) continue;

    switch (parsed.kind) {
      case "tool-call-container": {
        const vms = handleToolCallContainer(
          parsed,
          index,
          pendingToolResultsById,
          unresolvedToolCalls,
        );
        result.push(...vms);
        break;
      }

      case "tool-result": {
        handleToolResult(
          parsed,
          result,
          pendingToolResultsById,
          unresolvedToolCalls,
        );
        break;
      }

      case "text": {
        const vm = handleTextMessage(parsed, index, unresolvedToolCalls);
        if (vm) result.push(vm);
        break;
      }
    }
  }

  return result;
}

export { parseAguiMessage } from "./agui-schemas";
