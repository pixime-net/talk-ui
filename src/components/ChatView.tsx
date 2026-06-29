import { useEffect } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { useCopilotKit } from "@copilotkit/react-core/v2";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { ActivityIndicator } from "./ActivityIndicator";
import { useAgentError } from "../config/error-context";
import { useAutoScroll } from "../hooks/useAutoScroll";

export function ChatView() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const { error, setError } = useAgentError();

  // Subscribe to CopilotKit core errors (HTTP failures, network errors, etc.)
  useEffect(() => {
    const { unsubscribe } = copilotkit.subscribe({
      onError: (event: { error: Error }) => {
        setError(event.error.message || "An unexpected error occurred");
      },
    });
    return () => unsubscribe();
  }, [copilotkit, setError]);

  const visibleMessages = agent.messages.filter(
    (msg) => msg.role === "user" || msg.role === "assistant",
  );
  const hasMessages = visibleMessages.length > 0 || error !== null;

  const { containerRef, bottomRef } = useAutoScroll([
    visibleMessages.length,
    visibleMessages.at(-1)?.content,
    agent.isRunning,
  ]);

  const handleSend = (content: string) => {
    setError(null);
    agent.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content,
    });
    void copilotkit.runAgent({ agent, forwardedProps: { model: "haiku-4.5" } });
  };

  if (!hasMessages) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <ChatInput onSend={handleSend} disabled={agent.isRunning} />
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {visibleMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role as "user" | "assistant"}
              content={typeof msg.content === "string" ? msg.content : ""}
            />
          ))}
          {agent.isRunning && <ActivityIndicator />}
          {error && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t border-white/10 p-4">
        <div className="mx-auto flex max-w-2xl justify-center">
          <ChatInput onSend={handleSend} disabled={agent.isRunning} />
        </div>
      </div>
    </main>
  );
}
