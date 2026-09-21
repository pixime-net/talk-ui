import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  useAgent,
  useCopilotKit,
  type Interrupt,
} from "@copilotkit/react-core/v2";
import { useAgentError } from "../config/error-context";
import {
  normalizeMessages,
  type ChatMessageViewModel,
} from "../config/normalize-messages";
import { ChatUIContext } from "./chat-ui-context-core";
import type { ChatUIContextValue } from "./chat-ui-context-types";
import {
  DEFAULT_MODEL,
  DEFAULT_THINKING_EFFORT,
  supportsThinking,
  type ModelAlias,
  type ThinkingEffort,
} from "../config/models";
import {
  addTurnUsage,
  parseTokenUsageEvent,
  parseTurnUsageEvent,
  TOKEN_USAGE_EVENT_NAME,
  TURN_USAGE_EVENT_NAME,
  type CumulativeUsage,
  type TokenUsage,
} from "../config/token-usage-schemas";

export function ChatUIProvider({ children }: Readonly<PropsWithChildren>) {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const { error, setError } = useAgentError();
  const [showTools, setShowTools] = useState(true);
  const [selectedModel, setSelectedModel] = useState<ModelAlias>(DEFAULT_MODEL);
  const [thinkingEffort, setThinkingEffort] = useState<ThinkingEffort>(
    DEFAULT_THINKING_EFFORT,
  );
  const [optimisticUserMessage, setOptimisticUserMessage] =
    useState<ChatMessageViewModel | null>(null);
  const [lastCallUsage, setLastCallUsage] = useState<TokenUsage | null>(null);
  const [cumulativeUsage, setCumulativeUsage] =
    useState<CumulativeUsage | null>(null);
  const pendingCallUsageRef = useRef<TokenUsage | null>(null);
  // IDs of user messages that were sent while an interrupt was still pending.
  // A "Request cancelled by user" notice is rendered just before each of them.
  const [cancelledNoticeIds, setCancelledNoticeIds] = useState<Set<string>>(
    () => new Set(),
  );

  // The AG-UI client rejects a resume that does not cover every open interrupt,
  // so the resume payload must address all of them, not only the ones we render.
  const pendingInterrupts = agent.pendingInterrupts;

  // Guards sendMessage/continueFromInterrupt against a second click firing
  // before agent.isRunning flips to true on the next render.
  const isSubmittingRef = useRef(false);

  const handleRunAgentError = useCallback(
    (caught: unknown) => {
      const fallback = "An unexpected error occurred";
      if (caught instanceof Error && caught.message.trim() !== "") {
        setError(caught.message);
        return;
      }
      setError(fallback);
    },
    [setError],
  );

  const pendingInterrupt = useMemo<Interrupt | null>(() => {
    const maxIterInterrupt = pendingInterrupts.find(
      (interrupt) => interrupt.reason === "talk:max_iterations",
    );
    return maxIterInterrupt ?? null;
  }, [pendingInterrupts]);

  useEffect(() => {
    const { unsubscribe } = copilotkit.subscribe({
      onError: (event: { error: Error }) => {
        setError(event.error.message || "An unexpected error occurred");
      },
    });
    return () => {
      unsubscribe();
    };
  }, [copilotkit, setError]);

  const agentIdentity = `${agent.agentId ?? ""}:${agent.threadId}`;
  // Usage belongs to a conversation: a new agent/thread, or an emptied message
  // stream (start/load/reset), starts the indicators from scratch.
  const usageScopeKey = `${agentIdentity}:${agent.messages.length === 0 ? "empty" : "active"}`;
  const [previousUsageScopeKey, setPreviousUsageScopeKey] =
    useState(usageScopeKey);
  if (previousUsageScopeKey !== usageScopeKey) {
    setPreviousUsageScopeKey(usageScopeKey);
    setLastCallUsage(null);
    setCumulativeUsage(null);
    // The pending snapshot must be invalidated before any new boundary event.
    // eslint-disable-next-line react-hooks/refs
    pendingCallUsageRef.current = null;
  }

  useEffect(() => {
    // A stale subscription must never write into the current conversation.
    let active = true;
    const { unsubscribe } = agent.subscribe({
      onCustomEvent: ({ event }) => {
        if (!active) return;
        // AG-UI delivers an event envelope at runtime, but guard malformed input.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (event === null || event === undefined) return;
        const value: unknown = event.value;
        if (event.name === TOKEN_USAGE_EVENT_NAME) {
          // Buffered, not displayed: a turn can contain several LLM calls and
          // publishing each one makes the context indicator flicker up and down.
          const usage = parseTokenUsageEvent(value);
          if (usage !== undefined) pendingCallUsageRef.current = usage;
          return;
        }
        if (event.name === TURN_USAGE_EVENT_NAME) {
          const turn = parseTurnUsageEvent(value);
          if (turn !== undefined) {
            setCumulativeUsage((previous) => addTurnUsage(previous, turn));
            // The turn boundary is the publication point. With no buffered
            // snapshot the previous display is kept rather than cleared.
            const pending = pendingCallUsageRef.current;
            if (pending !== null) {
              setLastCallUsage(pending);
              pendingCallUsageRef.current = null;
            }
          }
        }
      },
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [agent]);

  const normalizedMessages = useMemo(
    () => normalizeMessages(agent.messages),
    [agent.messages],
  );
  const visibleMessages = useMemo(() => {
    if (!optimisticUserMessage) {
      return normalizedMessages;
    }

    const optimisticMessageResolved = normalizedMessages.some(
      (msg) => msg.id === optimisticUserMessage.id,
    );
    if (optimisticMessageResolved) {
      return normalizedMessages;
    }

    return [...normalizedMessages, optimisticUserMessage];
  }, [normalizedMessages, optimisticUserMessage]);

  const messagesWithNotices = useMemo(() => {
    if (cancelledNoticeIds.size === 0) {
      return visibleMessages;
    }

    const result: ChatMessageViewModel[] = [];
    for (const msg of visibleMessages) {
      if (cancelledNoticeIds.has(msg.id)) {
        result.push({
          id: `cancelled-notice-${msg.id}`,
          role: "notice",
          content: "Request cancelled by user",
        });
      }
      result.push(msg);
    }
    return result;
  }, [visibleMessages, cancelledNoticeIds]);

  const sendMessage = useCallback(
    (content: string) => {
      if (agent.isRunning || isSubmittingRef.current) return;
      if (content.trim() === "") return;

      setError(null);
      const messageId = crypto.randomUUID();
      const optimisticMessage: ChatMessageViewModel = {
        id: messageId,
        role: "user",
        content,
      };

      setOptimisticUserMessage(optimisticMessage);

      agent.addMessage({
        id: messageId,
        role: "user",
        content,
      });

      const forwardedProps: Record<string, string> = { model: selectedModel };
      if (thinkingEffort !== "off" && supportsThinking(selectedModel)) {
        forwardedProps.thinkingEffort = thinkingEffort;
      }

      // Sending a new message while interrupts are still open means the user is
      // abandoning the interrupted turn. The AG-UI client rejects a run that
      // leaves any open interrupt unaddressed, so cancel every pending one.
      const resume =
        pendingInterrupts.length > 0
          ? pendingInterrupts.map((interrupt) => ({
              interruptId: interrupt.id,
              status: "cancelled" as const,
            }))
          : undefined;

      if (resume !== undefined) {
        setCancelledNoticeIds((prev) => {
          const next = new Set(prev);
          next.add(messageId);
          return next;
        });
      }

      isSubmittingRef.current = true;
      void copilotkit
        .runAgent(
          resume === undefined
            ? { agent, forwardedProps }
            : { agent, forwardedProps, resume },
        )
        .catch(handleRunAgentError)
        .finally(() => {
          isSubmittingRef.current = false;
        });
    },
    [
      agent,
      copilotkit,
      handleRunAgentError,
      pendingInterrupts,
      selectedModel,
      setError,
      thinkingEffort,
    ],
  );

  const continueFromInterrupt = useCallback(() => {
    if (
      pendingInterrupts.length === 0 ||
      agent.isRunning ||
      isSubmittingRef.current
    )
      return;

    setError(null);

    const forwardedProps: Record<string, string> = { model: selectedModel };
    if (thinkingEffort !== "off" && supportsThinking(selectedModel)) {
      forwardedProps.thinkingEffort = thinkingEffort;
    }

    const resume = pendingInterrupts.map((interrupt) => ({
      interruptId: interrupt.id,
      status: "resolved" as const,
    }));

    isSubmittingRef.current = true;
    void copilotkit
      .runAgent({
        agent,
        forwardedProps,
        resume,
      })
      .catch(handleRunAgentError)
      .finally(() => {
        isSubmittingRef.current = false;
      });
  }, [
    agent,
    copilotkit,
    handleRunAgentError,
    pendingInterrupts,
    selectedModel,
    setError,
    thinkingEffort,
  ]);

  const setSelectedModelCallback = useCallback((model: ModelAlias) => {
    setSelectedModel(model);
    if (!supportsThinking(model)) {
      setThinkingEffort(DEFAULT_THINKING_EFFORT);
    }
  }, []);

  const setThinkingEffortCallback = useCallback((effort: ThinkingEffort) => {
    setThinkingEffort(effort);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const value = useMemo<ChatUIContextValue>(
    () => ({
      visibleMessages: messagesWithNotices,
      isRunning: agent.isRunning,
      error,
      showTools,
      selectedModel,
      thinkingEffort,
      supportsThinkingForSelectedModel: supportsThinking(selectedModel),
      pendingInterrupt,
      lastCallUsage,
      cumulativeUsage,
      sendMessage,
      continueFromInterrupt,
      setShowTools,
      setSelectedModel: setSelectedModelCallback,
      setThinkingEffort: setThinkingEffortCallback,
      clearError,
    }),
    [
      agent.isRunning,
      clearError,
      continueFromInterrupt,
      cumulativeUsage,
      error,
      lastCallUsage,
      pendingInterrupt,
      selectedModel,
      sendMessage,
      setSelectedModelCallback,
      setThinkingEffortCallback,
      showTools,
      thinkingEffort,
      messagesWithNotices,
    ],
  );

  return (
    <ChatUIContext.Provider value={value}>{children}</ChatUIContext.Provider>
  );
}
