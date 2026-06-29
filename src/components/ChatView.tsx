import { useEffect, useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { useCopilotKit } from "@copilotkit/react-core/v2";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { ActivityIndicator } from "./ActivityIndicator";
import { useAgentError } from "../config/error-context";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { DEFAULT_MODEL, type ModelAlias } from "../config/models";

type ChatRole = "user" | "assistant";

interface ChatMessageViewModel {
  id: string;
  role: ChatRole;
  content: unknown;
}

function normalizeMessages(messages: unknown[]): ChatMessageViewModel[] {
  return messages.flatMap((message, index) => {
    if (!message || typeof message !== "object") return [];

    const messageRecord = message as {
      id?: unknown;
      role?: unknown;
      content?: unknown;
    };

    if (messageRecord.role !== "user" && messageRecord.role !== "assistant") {
      return [];
    }

    if (
      typeof messageRecord.content === "string" &&
      messageRecord.content.trim() === ""
    ) {
      return [];
    }

    const id =
      typeof messageRecord.id === "string" && messageRecord.id.trim() !== ""
        ? messageRecord.id
        : `msg-${index}`;

    return [
      {
        id,
        role: messageRecord.role,
        content: messageRecord.content,
      },
    ];
  });
}

export function ChatView() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const { error, setError } = useAgentError();
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

  // Subscribe to CopilotKit core errors (HTTP failures, network errors, etc.)
  useEffect(() => {
    const { unsubscribe } = copilotkit.subscribe({
      onError: (event: { error: Error }) => {
        setError(event.error.message || "An unexpected error occurred");
      },
    });
    return () => unsubscribe();
  }, [copilotkit, setError]);

  const visibleMessages = normalizeMessages(agent.messages as unknown[]);
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
    void copilotkit
      .runAgent({ agent, forwardedProps: { model: selectedModel } })
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
  };

  if (!hasMessages) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <ChatInput
          onSend={handleSend}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          disabled={agent.isRunning}
        />
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {visibleMessages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
          ))}
          {agent.isRunning && <ActivityIndicator />}
          {error && (
            <div className="flex justify-start">
              <div
                role="alert"
                aria-live="polite"
                className="max-w-[75%] rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400"
              >
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t border-white/10 p-4">
        <div className="mx-auto flex max-w-2xl justify-center">
          <ChatInput
            onSend={handleSend}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            disabled={agent.isRunning}
          />
        </div>
      </div>
    </main>
  );
}
