import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatInput } from "../components/ChatInput";

describe("ChatInput", () => {
  it("renders input and send button", () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByLabelText("Envoyer")).toBeInTheDocument();
  });

  it("disables send button when input is empty", () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByLabelText("Envoyer")).toBeDisabled();
  });

  it("enables send button when input has text", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={vi.fn()} />);
    await user.type(screen.getByLabelText("Message"), "hello");
    expect(screen.getByLabelText("Envoyer")).toBeEnabled();
  });

  it("calls onSend with trimmed text on submit", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    await user.type(screen.getByLabelText("Message"), "  hello world  ");
    await user.click(screen.getByLabelText("Envoyer"));
    expect(onSend).toHaveBeenCalledWith("hello world");
  });

  it("clears input after submit", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={vi.fn()} />);
    const input = screen.getByLabelText("Message");
    await user.type(input, "hello");
    await user.click(screen.getByLabelText("Envoyer"));
    expect(input).toHaveValue("");
  });

  it("submits on Enter key press", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    await user.type(screen.getByLabelText("Message"), "hello{Enter}");
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("disables input and button when disabled prop is true", () => {
    render(<ChatInput onSend={vi.fn()} disabled />);
    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(screen.getByLabelText("Envoyer")).toBeDisabled();
  });

  it("does not call onSend when disabled", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled />);
    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByLabelText("Envoyer"));
    expect(onSend).not.toHaveBeenCalled();
  });
});
