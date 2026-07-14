import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type PropsWithChildren } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AgentErrorContext } from "../config/error-context";
import { ChatUIProvider } from "../context/ChatUIContext";
import { useChatUIContext } from "../context/use-chat-ui-context";

const mockAgent = {
  messages: [] as {
    id?: string;
    role: string;
    content?: unknown;
    toolCalls?: unknown;
    toolCallId?: string;
  }[],
  isRunning: false,
  addMessage: vi.fn(),
  agentId: "default",
  threadId: "thread-1",
  state: {},
  setState: vi.fn(),
  subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
};

const mockCopilotKit = {
  runAgent: vi.fn(),
  stopAgent: vi.fn(),
  subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
};

vi.mock("@copilotkit/react-core/v2", () => ({
  useAgent: () => ({ agent: mockAgent }),
  useCopilotKit: () => ({ copilotkit: mockCopilotKit }),
}));

function ErrorProvider({ children }: PropsWithChildren) {
  const [error, setError] = useState<string | null>(null);
  return (
    <AgentErrorContext.Provider value={{ error, setError }}>
      {children}
    </AgentErrorContext.Provider>
  );
}

function TestConsumer() {
  const {
    visibleMessages,
    isRunning,
    selectedModel,
    thinkingEffort,
    supportsThinkingForSelectedModel,
    sendMessage,
    setSelectedModel,
    setThinkingEffort,
    error,
  } = useChatUIContext();

  return (
    <div>
      <div data-testid="messages-count">{visibleMessages.length}</div>
      <div data-testid="messages-json">{JSON.stringify(visibleMessages)}</div>
      <div data-testid="is-running">{String(isRunning)}</div>
      <div data-testid="selected-model">{selectedModel}</div>
      <div data-testid="thinking-effort">{thinkingEffort}</div>
      <div data-testid="supports-thinking">
        {String(supportsThinkingForSelectedModel)}
      </div>
      <div data-testid="error">{error ?? ""}</div>
      <button onClick={() => sendMessage("hello")}>send</button>
      <button onClick={() => setThinkingEffort("high")}>set-high</button>
      <button onClick={() => setSelectedModel("gpt-5.4")}>
        set-model-gpt54
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <ErrorProvider>
      <ChatUIProvider>
        <TestConsumer />
      </ChatUIProvider>
    </ErrorProvider>,
  );
}

describe("ChatUIContext", () => {
  beforeEach(() => {
    mockAgent.messages = [];
    mockAgent.isRunning = false;
    mockAgent.addMessage.mockReset();
    mockCopilotKit.runAgent.mockReset();
    mockCopilotKit.runAgent.mockResolvedValue(undefined);
    mockCopilotKit.subscribe.mockReset();
    mockCopilotKit.subscribe.mockReturnValue({ unsubscribe: vi.fn() });
  });

  it("projects visibleMessages through normalizeMessages", () => {
    mockAgent.messages = [
      { id: "u1", role: "user", content: "hello" },
      {
        id: "a1",
        role: "assistant",
        toolCalls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "search", arguments: '{"q":"x"}' },
          },
        ],
      },
    ];

    renderProvider();
    expect(screen.getByTestId("messages-count")).toHaveTextContent("2");
  });

  it("reconciles out-of-order tool results through provider visibleMessages", () => {
    mockAgent.messages = [
      {
        id: "tool-result-first",
        role: "tool",
        toolCallId: "call_42",
        content: '{"answer":42}',
      },
      {
        id: "assistant-with-tool-call",
        role: "assistant",
        toolCalls: [
          {
            id: "call_42",
            type: "function",
            function: { name: "lookup", arguments: '{"id":42}' },
          },
        ],
      },
    ];

    renderProvider();

    const messages = JSON.parse(
      screen.getByTestId("messages-json").textContent || "[]",
    ) as Array<{
      role: string;
      toolCallId?: string;
      toolResult?: string;
      toolArgs?: string;
    }>;

    const toolCall = messages.find((msg) => msg.role === "tool-call");
    expect(toolCall).toBeDefined();
    expect(toolCall?.toolCallId).toBe("call_42");
    expect(toolCall?.toolArgs).toBe('{"id":42}');
    expect(toolCall?.toolResult).toBe('{"answer":42}');
  });

  it("sends message with default forwarded props", async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByText("send"));

    expect(mockAgent.addMessage).toHaveBeenCalledTimes(1);
    expect(mockCopilotKit.runAgent).toHaveBeenCalledWith({
      agent: mockAgent,
      forwardedProps: { model: "sonnet-4.6" },
    });
  });

  it("shows user message optimistically before agent messages update", async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByText("send"));

    const messages = JSON.parse(
      screen.getByTestId("messages-json").textContent || "[]",
    ) as Array<{ role: string; content: string }>;

    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "user", content: "hello" }),
      ]),
    );
  });

  it("includes thinkingEffort when enabled", async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByText("set-high"));
    await user.click(screen.getByText("send"));

    expect(mockCopilotKit.runAgent).toHaveBeenCalledWith({
      agent: mockAgent,
      forwardedProps: { model: "sonnet-4.6", thinkingEffort: "high" },
    });
  });

  it("resets thinking effort when switching to non-thinking model", async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByText("set-high"));
    expect(screen.getByTestId("thinking-effort")).toHaveTextContent("high");

    await user.click(screen.getByText("set-model-gpt54"));

    expect(screen.getByTestId("selected-model")).toHaveTextContent("gpt-5.4");
    expect(screen.getByTestId("supports-thinking")).toHaveTextContent("false");
    expect(screen.getByTestId("thinking-effort")).toHaveTextContent("off");
  });

  it("subscribes to copilot errors", () => {
    renderProvider();
    expect(mockCopilotKit.subscribe).toHaveBeenCalledTimes(1);
    expect(mockCopilotKit.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("exposes running state", () => {
    mockAgent.isRunning = true;
    renderProvider();
    expect(screen.getByTestId("is-running")).toHaveTextContent("true");
  });
});
