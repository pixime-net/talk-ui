import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "../components/MessageBubble";

describe("MessageBubble", () => {
  it("renders message content", () => {
    render(<MessageBubble role="user" content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders user messages right-aligned", () => {
    const { container } = render(
      <MessageBubble role="user" content="User msg" />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("justify-end");
  });

  it("renders assistant messages left-aligned", () => {
    const { container } = render(
      <MessageBubble role="assistant" content="Assistant msg" />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("justify-start");
  });

  it("applies accent background for user messages", () => {
    render(<MessageBubble role="user" content="test" />);
    const bubble = screen.getByText("test").parentElement;
    expect(bubble).toHaveClass("bg-accent/20");
  });

  it("applies muted background for assistant messages", () => {
    render(<MessageBubble role="assistant" content="test" />);
    const bubble = screen.getByText("test").parentElement;
    expect(bubble).toHaveClass("bg-white/5");
  });
});
