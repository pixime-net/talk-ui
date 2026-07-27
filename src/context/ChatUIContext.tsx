import {
  useCallback,
  useEffect,
  useMemo,
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

export function ChatUIProvider({ children }: Readonly<PropsWithChildren>) {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const { error, setError } = useAgentError();
  const [showTools, setShowTools] = useState(true);
  const [selectedModel, setSelectedModelState] =
    useState<ModelAlias>(DEFAULT_MODEL);
  const [thinkingEffort, setThinkingEffortState] = useState<ThinkingEffort>(
    DEFAULT_THINKING_EFFORT,
  );
  const [optimisticUserMessage, setOptimisticUserMessage] =
    useState<ChatMessageViewModel | null>(null);

  // The AG-UI client rejects a resume that does not cover every open interrupt,
  // so the resume payload must address all of them, not only the ones we render.
  const pendingInterrupts = useMemo<Interrupt[]>(
    () => agent.pendingInterrupts,
    [agent.pendingInterrupts],
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

  const sendMessage = useCallback(
    (content: string) => {
      if (agent.isRunning) return;
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

      copilotkit
        .runAgent({ agent, forwardedProps })
        .catch((error_: unknown) => {
          const fallback = "An unexpected error occurred";
          if (error_ instanceof Error && error_.message.trim() !== "") {
            setError(error_.message);
            return;
          }
          setError(fallback);
        });
    },
    [agent, copilotkit, selectedModel, setError, thinkingEffort],
  );

  const continueFromInterrupt = useCallback(() => {
    if (pendingInterrupts.length === 0 || agent.isRunning) return;

    setError(null);

    const forwardedProps: Record<string, string> = { model: selectedModel };
    if (thinkingEffort !== "off" && supportsThinking(selectedModel)) {
      forwardedProps.thinkingEffort = thinkingEffort;
    }

    const resume = pendingInterrupts.map((interrupt) => ({
      interruptId: interrupt.id,
      status: "resolved" as const,
    }));

    copilotkit
      .runAgent({
        agent,
        forwardedProps,
        resume,
      })
      .catch((error_: unknown) => {
        const fallback = "An unexpected error occurred";
        if (error_ instanceof Error && error_.message.trim() !== "") {
          setError(error_.message);
          return;
        }
        setError(fallback);
      });
  }, [
    agent,
    copilotkit,
    pendingInterrupts,
    selectedModel,
    setError,
    thinkingEffort,
  ]);

  const setSelectedModel = useCallback((model: ModelAlias) => {
    setSelectedModelState(model);
    if (!supportsThinking(model)) {
      setThinkingEffortState(DEFAULT_THINKING_EFFORT);
    }
  }, []);

  const setThinkingEffort = useCallback((effort: ThinkingEffort) => {
    setThinkingEffortState(effort);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const value = useMemo<ChatUIContextValue>(
    () => ({
      visibleMessages,
      isRunning: agent.isRunning,
      error,
      showTools,
      selectedModel,
      thinkingEffort,
      supportsThinkingForSelectedModel: supportsThinking(selectedModel),
      pendingInterrupt,
      sendMessage,
      continueFromInterrupt,
      setShowTools,
      setSelectedModel,
      setThinkingEffort,
      clearError,
    }),
    [
      agent.isRunning,
      clearError,
      continueFromInterrupt,
      error,
      pendingInterrupt,
      selectedModel,
      sendMessage,
      setSelectedModel,
      setThinkingEffort,
      showTools,
      thinkingEffort,
      visibleMessages,
    ],
  );

  return (
    <ChatUIContext.Provider value={value}>{children}</ChatUIContext.Provider>
  );
}
