import { useEffect, useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { useCopilotKit } from "@copilotkit/react-core/v2";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { ThinkingEffortSelector } from "./ThinkingEffortSelector";
import { MessageBubble } from "./MessageBubble";
import { ReasoningBlock } from "./ReasoningBlock";
import { ToolCallItem } from "./ToolCallItem";
import { ActivityIndicator } from "./ActivityIndicator";
import { ErrorBlock } from "./ErrorBlock";
import { useAgentError } from "../config/error-context";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { normalizeMessages } from "../config/normalize-messages";
import {
  DEFAULT_MODEL,
  DEFAULT_THINKING_EFFORT,
  supportsThinking,
  type ModelAlias,
  type ThinkingEffort,
} from "../config/models";

export function ChatView() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const { error, setError } = useAgentError();
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [thinkingEffort, setThinkingEffort] = useState<ThinkingEffort>(
    DEFAULT_THINKING_EFFORT,
  );

  // Subscribe to CopilotKit core errors (HTTP failures, network errors, etc.)
  useEffect(() => {
    const { unsubscribe } = copilotkit.subscribe({
      onError: (event: { error: Error }) => {
        setError(event.error.message || "An unexpected error occurred");
      },
    });
    return () => unsubscribe();
  }, [copilotkit, setError]);

  const visibleMessages = normalizeMessages(agent.messages);
  const hasMessages = visibleMessages.length > 0 || error !== null;

  const { containerRef, bottomRef } = useAutoScroll([
    visibleMessages.length,
    visibleMessages.at(-1)?.content,
    agent.isRunning,
  ]);

  const handleSend = (content: string) => {
    if (agent.isRunning) return;

    setError(null);
    agent.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content,
    });
    const forwardedProps: Record<string, string> = { model: selectedModel };
    if (thinkingEffort !== "off" && supportsThinking(selectedModel)) {
      forwardedProps.thinkingEffort = thinkingEffort;
    }
    void copilotkit
      .runAgent({ agent, forwardedProps })
      .catch((error: unknown) => {
        const fallback = "An unexpected error occurred";
        if (error instanceof Error && error.message.trim() !== "") {
          setError(error.message);
          return;
        }
        setError(fallback);
      });
  };

  const handleModelChange = (model: ModelAlias) => {
    setSelectedModel(model);
    if (!supportsThinking(model)) {
      setThinkingEffort(DEFAULT_THINKING_EFFORT);
    }
  };

  const chatBox = (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-white/20 bg-white/5 px-4 pb-2 pt-3">
      <ChatInput onSend={handleSend} disabled={agent.isRunning} />
      <div className="flex justify-end gap-2 pt-2.5">
        <ModelSelector
          value={selectedModel}
          onChange={handleModelChange}
          disabled={agent.isRunning}
        />
        {supportsThinking(selectedModel) && (
          <ThinkingEffortSelector
            value={thinkingEffort}
            onChange={setThinkingEffort}
            disabled={agent.isRunning}
          />
        )}
      </div>
    </div>
  );

  if (!hasMessages) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        {chatBox}
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {visibleMessages.map((msg) =>
            msg.role === "reasoning" ? (
              <ReasoningBlock key={msg.id} content={msg.content as string} />
            ) : msg.role === "tool-call" ? (
              <ToolCallItem
                key={msg.id}
                toolName={msg.toolName ?? "unknown"}
                toolArgs={msg.toolArgs}
                toolResult={msg.toolResult}
              />
            ) : (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
              />
            ),
          )}
          {agent.isRunning && <ActivityIndicator />}
          {error && <ErrorBlock message={error} />}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="p-4">{chatBox}</div>
    </main>
  );
}
