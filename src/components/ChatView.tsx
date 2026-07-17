import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { ThinkingEffortSelector } from "./ThinkingEffortSelector";
import { MessageBubble } from "./MessageBubble";
import { ReasoningBlock } from "./ReasoningBlock";
import { ToolCallItem } from "./ToolCallItem";
import { ActivityIndicator } from "./ActivityIndicator";
import { ErrorBlock } from "./ErrorBlock";
import { useAutoScroll } from "../hooks/use-auto-scroll";
import { useChatUIContext } from "../context/use-chat-ui-context";

export function ChatView() {
  const {
    visibleMessages,
    isRunning,
    error,
    showTools,
    selectedModel,
    thinkingEffort,
    supportsThinkingForSelectedModel,
    sendMessage,
    setShowTools,
    setSelectedModel,
    setThinkingEffort,
  } = useChatUIContext();

  const hasMessages = visibleMessages.length > 0 || error !== null;
  const showConversationLayout = hasMessages || isRunning;

  const { containerRef, bottomRef } = useAutoScroll([
    visibleMessages.length,
    visibleMessages.at(-1)?.content,
    isRunning,
  ]);

  const chatBox = (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-white/20 bg-white/5 px-4 pb-2 pt-3">
      <ChatInput onSend={sendMessage} disabled={isRunning} />
      <div className="flex justify-end gap-2 pt-2.5">
        <ModelSelector
          value={selectedModel}
          onChange={setSelectedModel}
          disabled={isRunning}
        />
        {supportsThinkingForSelectedModel && (
          <ThinkingEffortSelector
            value={thinkingEffort}
            onChange={setThinkingEffort}
            disabled={isRunning}
          />
        )}
        <button
          type="button"
          aria-label="Tools"
          onClick={() => {
            setShowTools(!showTools);
          }}
          disabled={isRunning}
          className="flex min-w-15.5 items-center justify-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-white/30 hover:text-foreground disabled:opacity-50"
        >
          <span className="text-xs" aria-hidden="true">
            🔧
          </span>
          <span>{showTools ? "Hide" : "Show"}</span>
        </button>
      </div>
    </div>
  );

  if (!showConversationLayout) {
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
              <ReasoningBlock key={msg.id} content={msg.content} />
            ) : msg.role === "tool-call" ? (
              <div
                key={msg.id}
                className={`overflow-hidden transition-all duration-200 ease-out ${
                  showTools
                    ? "max-h-90 overflow-y-auto translate-y-0 opacity-100"
                    : "pointer-events-none max-h-0 -translate-y-1 opacity-0"
                }`}
                aria-hidden={!showTools}
                inert={!showTools}
              >
                <ToolCallItem
                  toolName={msg.toolName ?? "unknown"}
                  toolArgs={msg.toolArgs}
                  toolResult={msg.toolResult}
                />
              </div>
            ) : (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
              />
            ),
          )}
          {isRunning && <ActivityIndicator />}
          {error && <ErrorBlock message={error} />}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="p-4">{chatBox}</div>
    </main>
  );
}
