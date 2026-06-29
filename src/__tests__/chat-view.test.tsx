import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type PropsWithChildren } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AgentErrorContext } from "../config/error-context";
import { DEFAULT_MODEL } from "../config/models";

const mockAgent = {
  messages: [] as { id: string; role: string; content: unknown }[],
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
    const { container } = render(<ChatView />);
    const main = container.querySelector("main");
    expect(main).toHaveClass("items-center", "justify-center");
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("renders message list when messages exist", () => {
    mockAgent.messages = [
      { id: "1", role: "user", content: "Hello" },
      { id: "2", role: "assistant", content: "Hi there" },
    ];
    render(<ChatView />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there")).toBeInTheDocument();
  });

  it("shows activity indicator when agent is running", () => {
    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    mockAgent.isRunning = true;
    render(<ChatView />);
    expect(screen.getByLabelText("L'assistant réfléchit")).toBeInTheDocument();
  });

  it("hides activity indicator when agent is not running", () => {
    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    mockAgent.isRunning = false;
    render(<ChatView />);
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
    render(<ChatView />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Reply")).toBeInTheDocument();
    expect(screen.queryByText("tool result")).not.toBeInTheDocument();
  });

  it("renders placeholder for non-text assistant content", () => {
    mockAgent.messages = [
      { id: "1", role: "assistant", content: { type: "video" } },
    ];

    render(<ChatView />);
    expect(
      screen.getByText("video content is not displayed yet."),
    ).toBeInTheDocument();
  });

  it("transitions from empty state to messages state", () => {
    mockAgent.messages = [];
    const { container, rerender } = render(<ChatView />);
    let main = container.querySelector("main");
    expect(main).toHaveClass("items-center");

    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    rerender(<ChatView />);
    main = container.querySelector("main");
    expect(main).toHaveClass("h-screen", "flex-col");
  });

  it("has a scroll container with overflow-y-auto", () => {
    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    const { container } = render(<ChatView />);
    const scrollContainer = container.querySelector(".overflow-y-auto");
    expect(scrollContainer).toBeInTheDocument();
  });

  it("has a scroll sentinel at the bottom of the message list", () => {
    mockAgent.messages = [{ id: "1", role: "user", content: "Hello" }];
    const { container } = render(<ChatView />);
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
      <ErrorProvider>
        <ChatView />
      </ErrorProvider>,
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
      <ErrorProvider>
        <ChatView />
      </ErrorProvider>,
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

    render(<ChatView />);

    expect(screen.getByLabelText("Modèle")).toBeDisabled();
  });

  it("forwards default model without user interaction", async () => {
    const user = userEvent.setup();

    render(
      <ErrorProvider>
        <ChatView />
      </ErrorProvider>,
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
      render(<ChatView />);
      // Default model is sonnet-4.6 which supports thinking
      expect(screen.getByLabelText("Effort de réflexion")).toBeInTheDocument();
    });

    it("hides thinking selector when model does not support thinking", async () => {
      const user = userEvent.setup();
      render(<ChatView />);

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
        <ErrorProvider>
          <ChatView />
        </ErrorProvider>,
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
        <ErrorProvider>
          <ChatView />
        </ErrorProvider>,
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
        <ErrorProvider>
          <ChatView />
        </ErrorProvider>,
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
      render(<ChatView />);

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
      render(<ChatView />);

      expect(screen.getByLabelText("Effort de réflexion")).toBeDisabled();
    });
  });
});
