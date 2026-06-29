import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAgent = {
  messages: [] as { id: string; role: string; content: string }[],
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

describe("ChatView", () => {
  beforeEach(() => {
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
});
