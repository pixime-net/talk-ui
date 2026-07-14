import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type PropsWithChildren } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AgentErrorContext } from "../config/error-context";
import { DEFAULT_MODEL } from "../config/models";
import { ChatUIProvider } from "../context/ChatUIContext";

const mockAgent = {
  messages: [] as Record<string, unknown>[],
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

import { ChatView } from "../components/ChatView";

function ErrorProvider({ children }: PropsWithChildren) {
  const [error, setError] = useState<string | null>(null);
  return (
    <AgentErrorContext.Provider value={{ error, setError }}>
      {children}
    </AgentErrorContext.Provider>
  );
}

function Providers({ children }: PropsWithChildren) {
  return (
    <ErrorProvider>
      <ChatUIProvider>{children}</ChatUIProvider>
    </ErrorProvider>
  );
}

describe("ChatView", () => {
  beforeEach(() => {
    mockAgent.messages = [];
    mockAgent.isRunning = false;
    mockAgent.addMessage.mockClear();
    mockCopilotKit.runAgent.mockReset();
    mockCopilotKit.runAgent.mockResolvedValue(undefined);
    mockCopilotKit.stopAgent.mockClear();
    mockCopilotKit.subscribe.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders empty state with centered input when no messages", () => {
    mockAgent.messages = [];
    const { container } = render(
      <Providers>
        <ChatView />
      </Providers>,
    );
    const main = container.querySelector("main");
    expect(main).toHaveClass("items-center", "justify-center");
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("renders message list when messages exist", () => {
    mockAgent.messages = [
      { id: "1", role: "user", content: "Hello" },
      { id: "2", role: "assistant", content: "Hi there" },
    ];
    render(
      <Providers>
        <ChatView />
      </Providers>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there")).toBeInTheDocument();
  });

  it("shows activity indicator when agent is running", () => {
    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    mockAgent.isRunning = true;
    render(
      <Providers>
        <ChatView />
      </Providers>,
    );
    expect(screen.getByLabelText("L'assistant réfléchit")).toBeInTheDocument();
  });

  it("shows activity indicator in empty state during first response", () => {
    mockAgent.messages = [];
    mockAgent.isRunning = true;
    const { container } = render(
      <Providers>
        <ChatView />
      </Providers>,
    );

    expect(screen.getByLabelText("L'assistant réfléchit")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();

    const main = container.querySelector("main");
    expect(main).toHaveClass("h-screen", "flex-col");
  });

  it("hides activity indicator when agent is not running", () => {
    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    mockAgent.isRunning = false;
    render(
      <Providers>
        <ChatView />
      </Providers>,
    );
    expect(
      screen.queryByLabelText("L'assistant réfléchit"),
    ).not.toBeInTheDocument();
  });

  it("filters out tool messages", () => {
    mockAgent.messages = [
      { id: "1", role: "user", content: "Hello" },
      { id: "2", role: "tool", content: "tool result" },
      { id: "3", role: "assistant", content: "Reply" },
    ];
    render(
      <Providers>
        <ChatView />
      </Providers>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Reply")).toBeInTheDocument();
    expect(screen.queryByText("tool result")).not.toBeInTheDocument();
  });

  it("renders placeholder for assistant messages with non-text content", () => {
    mockAgent.messages = [
      { id: "1", role: "user", content: "hello" },
      { id: "2", role: "assistant", content: { type: "video" } },
    ];

    const { container } = render(
      <Providers>
        <ChatView />
      </Providers>,
    );
    expect(
      screen.getByText("video content is not displayed yet."),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".rounded-lg")).toHaveLength(2);
  });

  it("transitions from empty state to messages state", () => {
    mockAgent.messages = [];
    const { container, rerender } = render(
      <Providers>
        <ChatView />
      </Providers>,
    );
    let main = container.querySelector("main");
    expect(main).toHaveClass("items-center");

    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    rerender(
      <Providers>
        <ChatView />
      </Providers>,
    );
    main = container.querySelector("main");
    expect(main).toHaveClass("h-screen", "flex-col");
  });

  it("has a scroll container with overflow-y-auto", () => {
    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    const { container } = render(
      <Providers>
        <ChatView />
      </Providers>,
    );
    const scrollContainer = container.querySelector(".overflow-y-auto");
    expect(scrollContainer).toBeInTheDocument();
  });

  it("has a scroll sentinel at the bottom of the message list", () => {
    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    const { container } = render(
      <Providers>
        <ChatView />
      </Providers>,
    );
    const messageArea = container.querySelector(".overflow-y-auto > div");
    const lastChild = messageArea?.lastElementChild;
    // The sentinel is an empty div at the end
    expect(lastChild?.tagName).toBe("DIV");
    expect(lastChild?.children).toHaveLength(0);
    expect(lastChild?.textContent).toBe("");
  });

  it("shows an accessible error alert when runAgent rejects", async () => {
    const user = userEvent.setup();
    mockCopilotKit.runAgent.mockRejectedValueOnce(new Error("boom"));

    render(
      <Providers>
        <ChatView />
      </Providers>,
    );

    await user.type(screen.getByLabelText("Message"), "Hello");
    await user.click(screen.getByLabelText("Envoyer"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("boom");
    expect(mockCopilotKit.runAgent).toHaveBeenCalledTimes(1);
  });

  it("forwards the selected model when sending a message", async () => {
    const user = userEvent.setup();

    render(
      <Providers>
        <ChatView />
      </Providers>,
    );

    // Open custom dropdown and select gpt-5.4
    await user.click(screen.getByLabelText("Modèle"));
    await user.click(screen.getByRole("option", { name: "gpt-5.4" }));

    await user.type(screen.getByLabelText("Message"), "Hello");
    await user.click(screen.getByLabelText("Envoyer"));

    expect(mockCopilotKit.runAgent).toHaveBeenCalledWith({
      agent: mockAgent,
      forwardedProps: { model: "gpt-5.4" },
    });

    expect(screen.getByLabelText("Modèle")).toHaveTextContent("gpt-5.4");
    expect(DEFAULT_MODEL).toBe("sonnet-4.6");
  });

  it("disables model selector when agent is running", () => {
    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    mockAgent.isRunning = true;

    render(
      <Providers>
        <ChatView />
      </Providers>,
    );

    expect(screen.getByLabelText("Modèle")).toBeDisabled();
  });

  it("forwards default model without user interaction", async () => {
    const user = userEvent.setup();

    render(
      <Providers>
        <ChatView />
      </Providers>,
    );

    await user.type(screen.getByLabelText("Message"), "Hello");
    await user.click(screen.getByLabelText("Envoyer"));

    expect(mockCopilotKit.runAgent).toHaveBeenCalledWith({
      agent: mockAgent,
      forwardedProps: { model: "sonnet-4.6" },
    });
  });

  describe("thinking effort selector", () => {
    it("shows thinking selector when model supports thinking", () => {
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );
      // Default model is sonnet-4.6 which supports thinking
      expect(screen.getByLabelText("Effort de réflexion")).toBeInTheDocument();
    });

    it("hides thinking selector when model does not support thinking", async () => {
      const user = userEvent.setup();
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );

      // Switch to gpt-5.4 which does not support thinking
      await user.click(screen.getByLabelText("Modèle"));
      await user.click(screen.getByRole("option", { name: "gpt-5.4" }));

      expect(
        screen.queryByLabelText("Effort de réflexion"),
      ).not.toBeInTheDocument();
    });

    it("forwards thinkingEffort in forwardedProps when effort is not off", async () => {
      const user = userEvent.setup();
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );

      // Select high thinking effort
      await user.click(screen.getByLabelText("Effort de réflexion"));
      await user.click(screen.getByRole("option", { name: "high" }));

      await user.type(screen.getByLabelText("Message"), "Hello");
      await user.click(screen.getByLabelText("Envoyer"));

      expect(mockCopilotKit.runAgent).toHaveBeenCalledWith({
        agent: mockAgent,
        forwardedProps: { model: "sonnet-4.6", thinkingEffort: "high" },
      });
    });

    it("omits thinkingEffort when effort is off", async () => {
      const user = userEvent.setup();
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );

      // Default is "off" — just send a message
      await user.type(screen.getByLabelText("Message"), "Hello");
      await user.click(screen.getByLabelText("Envoyer"));

      expect(mockCopilotKit.runAgent).toHaveBeenCalledWith({
        agent: mockAgent,
        forwardedProps: { model: "sonnet-4.6" },
      });
    });

    it("omits thinkingEffort when model does not support thinking", async () => {
      const user = userEvent.setup();
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );

      // Select thinking effort first, then switch to non-thinking model
      await user.click(screen.getByLabelText("Effort de réflexion"));
      await user.click(screen.getByRole("option", { name: "high" }));

      // Switch to gpt-5.4 (non-thinking) — should reset effort
      await user.click(screen.getByLabelText("Modèle"));
      await user.click(screen.getByRole("option", { name: "gpt-5.4" }));

      await user.type(screen.getByLabelText("Message"), "Hello");
      await user.click(screen.getByLabelText("Envoyer"));

      expect(mockCopilotKit.runAgent).toHaveBeenCalledWith({
        agent: mockAgent,
        forwardedProps: { model: "gpt-5.4" },
      });
    });

    it("resets thinking effort to off when switching to non-thinking model", async () => {
      const user = userEvent.setup();
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );

      // Select high effort
      await user.click(screen.getByLabelText("Effort de réflexion"));
      await user.click(screen.getByRole("option", { name: "high" }));

      // Switch to non-thinking model
      await user.click(screen.getByLabelText("Modèle"));
      await user.click(screen.getByRole("option", { name: "gpt-5.4" }));

      // Selector should disappear
      expect(
        screen.queryByLabelText("Effort de réflexion"),
      ).not.toBeInTheDocument();

      // Switch back to thinking model
      await user.click(screen.getByLabelText("Modèle"));
      await user.click(screen.getByRole("option", { name: "sonnet-4.6" }));

      // Selector reappears with default "off"
      expect(screen.getByLabelText("Effort de réflexion")).toHaveTextContent(
        "off",
      );
    });

    it("disables thinking selector when agent is running", () => {
      mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
      mockAgent.isRunning = true;
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );

      expect(screen.getByLabelText("Effort de réflexion")).toBeDisabled();
    });
  });

  describe("reasoning display", () => {
    it("displays reasoning as a standalone block before assistant text", () => {
      mockAgent.messages = [
        { id: "u1", role: "user", content: "Explain this" },
        {
          id: "r1",
          role: "reasoning",
          content: "Let me think step by step...",
        },
        { id: "a1", role: "assistant", content: "Here is the answer." },
      ];
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );
      const reasoningText = screen.getByText("Let me think step by step...");
      const answerText = screen.getByText("Here is the answer.");
      expect(reasoningText).toBeInTheDocument();
      expect(answerText).toBeInTheDocument();
      expect(
        reasoningText.compareDocumentPosition(answerText) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("does not display reasoning block when no reasoning messages exist", () => {
      mockAgent.messages = [
        { id: "u1", role: "user", content: "Hello" },
        { id: "a1", role: "assistant", content: "Hi there" },
      ];
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );
      expect(screen.queryByText(/Let me think/i)).not.toBeInTheDocument();
      expect(screen.getByText("Hi there")).toBeInTheDocument();
    });

    it("displays each reasoning message as a separate block in natural order", () => {
      mockAgent.messages = [
        { id: "u1", role: "user", content: "Do something complex" },
        { id: "r1", role: "reasoning", content: "First I need to call a tool" },
        {
          id: "r2",
          role: "reasoning",
          content: "Now with the result I can answer",
        },
        { id: "a1", role: "assistant", content: "Done!" },
      ];
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );
      const reasoning1 = screen.getByText(/First I need to call a tool/);
      const reasoning2 = screen.getByText(/Now with the result I can answer/);
      const answer = screen.getByText("Done!");
      expect(reasoning1).toBeInTheDocument();
      expect(reasoning2).toBeInTheDocument();
      expect(answer).toBeInTheDocument();
      expect(
        reasoning1.compareDocumentPosition(reasoning2) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        reasoning2.compareDocumentPosition(answer) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe("tool call display", () => {
    it("renders tool-call items in the message flow", () => {
      mockAgent.messages = [
        { id: "u1", role: "user", content: "What's the weather?" },
        {
          id: "tc1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Paris"}' },
            },
          ],
        },
        {
          id: "t1",
          role: "tool",
          content: '{"temperature":22}',
          toolCallId: "call_1",
        },
        { id: "a1", role: "assistant", content: "It's 22°C in Paris." },
      ];
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );
      expect(screen.getByText("get_weather")).toBeInTheDocument();
      expect(screen.getByText("It's 22°C in Paris.")).toBeInTheDocument();
    });

    it("shows in-progress indicator during active tool call", () => {
      mockAgent.messages = [
        { id: "u1", role: "user", content: "Check something" },
        {
          id: "tc1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "search", arguments: '{"q":"test"}' },
            },
          ],
        },
      ];
      mockAgent.isRunning = true;
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );
      expect(screen.getByText("search")).toBeInTheDocument();
      expect(screen.getByTestId("tool-call-in-progress")).toBeInTheDocument();
    });

    it("renders and expands tool call before final assistant message", async () => {
      const user = userEvent.setup();
      mockAgent.messages = [
        { id: "u1", role: "user", content: "Check something" },
        {
          id: "tc1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "search", arguments: '{"q":"test"}' },
            },
          ],
        },
      ];
      mockAgent.isRunning = true;

      render(
        <Providers>
          <ChatView />
        </Providers>,
      );

      const toolHeader = screen.getByRole("button", { name: /search/i });
      await user.click(toolHeader);

      expect(toolHeader).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText(/Arguments/i)).toBeInTheDocument();
      expect(screen.getByText(/Running.../i)).toBeInTheDocument();
      expect(screen.queryByText(/Done!|It's /i)).not.toBeInTheDocument();
    });

    it("renders multiple tool calls as separate items", () => {
      mockAgent.messages = [
        { id: "u1", role: "user", content: "Compare" },
        {
          id: "tc1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Paris"}' },
            },
            {
              id: "call_2",
              type: "function",
              function: {
                name: "get_weather",
                arguments: '{"city":"London"}',
              },
            },
          ],
        },
        {
          id: "t1",
          role: "tool",
          content: '{"temperature":22}',
          toolCallId: "call_1",
        },
        {
          id: "t2",
          role: "tool",
          content: '{"temperature":18}',
          toolCallId: "call_2",
        },
        { id: "a1", role: "assistant", content: "Paris is warmer." },
      ];
      render(
        <Providers>
          <ChatView />
        </Providers>,
      );
      const toolNames = screen.getAllByText("get_weather");
      expect(toolNames).toHaveLength(2);
      expect(screen.getByText("Paris is warmer.")).toBeInTheDocument();
    });

    it("hides tool-call items when tools selector is set to Hide", async () => {
      const user = userEvent.setup();
      mockAgent.messages = [
        { id: "u1", role: "user", content: "What's the weather?" },
        {
          id: "tc1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Paris"}' },
            },
          ],
        },
        {
          id: "t1",
          role: "tool",
          content: '{"temperature":22}',
          toolCallId: "call_1",
        },
        { id: "a1", role: "assistant", content: "It's 22°C in Paris." },
      ];

      render(
        <Providers>
          <ChatView />
        </Providers>,
      );

      expect(screen.getByText("get_weather")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Tools" }));

      expect(screen.getByRole("button", { name: "Tools" })).toHaveTextContent(
        "Show",
      );
      const hiddenTool = screen.getByText("get_weather");
      expect(hiddenTool.closest("div[aria-hidden='true']")).not.toBeNull();
      expect(screen.getByText("It's 22°C in Paris.")).toBeInTheDocument();
    });

    it("shows tool-call items again when tools selector is toggled back to Show", async () => {
      const user = userEvent.setup();
      mockAgent.messages = [
        { id: "u1", role: "user", content: "What's the weather?" },
        {
          id: "tc1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Paris"}' },
            },
          ],
        },
        {
          id: "t1",
          role: "tool",
          content: '{"temperature":22}',
          toolCallId: "call_1",
        },
      ];

      render(
        <Providers>
          <ChatView />
        </Providers>,
      );

      const toolsToggle = screen.getByRole("button", { name: "Tools" });
      expect(toolsToggle).toHaveTextContent("Hide");

      await user.click(toolsToggle);
      expect(toolsToggle).toHaveTextContent("Show");
      const hiddenTool = screen.getByText("get_weather");
      expect(hiddenTool.closest("div[aria-hidden='true']")).not.toBeNull();

      await user.click(toolsToggle);
      expect(toolsToggle).toHaveTextContent("Hide");
      const shownTool = screen.getByText("get_weather");
      expect(shownTool.closest("div[aria-hidden='false']")).not.toBeNull();
    });
  });
});
