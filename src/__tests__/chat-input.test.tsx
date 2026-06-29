import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatInput } from "../components/ChatInput";
import { DEFAULT_MODEL, MODEL_ALIASES } from "../config/models";

const defaultProps = {
  selectedModel: DEFAULT_MODEL,
  onModelChange: vi.fn(),
};

describe("ChatInput", () => {
  it("renders input and send button", () => {
    render(<ChatInput onSend={vi.fn()} {...defaultProps} />);
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByLabelText("Envoyer")).toBeInTheDocument();
  });

  it("renders model selector with all available models", () => {
    render(<ChatInput onSend={vi.fn()} {...defaultProps} />);

    const selector = screen.getByLabelText("Modèle");
    expect(selector).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(MODEL_ALIASES.length);
    for (const alias of MODEL_ALIASES) {
      expect(screen.getByRole("option", { name: alias })).toBeInTheDocument();
    }
  });

  it("uses sonnet-4.6 as selected model by default", () => {
    render(<ChatInput onSend={vi.fn()} {...defaultProps} />);

    expect(screen.getByLabelText("Modèle")).toHaveValue(DEFAULT_MODEL);
  });

  it("disables send button when input is empty", () => {
    render(<ChatInput onSend={vi.fn()} {...defaultProps} />);
    expect(screen.getByLabelText("Envoyer")).toBeDisabled();
  });

  it("enables send button when input has text", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={vi.fn()} {...defaultProps} />);
    await user.type(screen.getByLabelText("Message"), "hello");
    expect(screen.getByLabelText("Envoyer")).toBeEnabled();
  });

  it("calls onSend with trimmed text on submit", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} {...defaultProps} />);
    await user.type(screen.getByLabelText("Message"), "  hello world  ");
    await user.click(screen.getByLabelText("Envoyer"));
    expect(onSend).toHaveBeenCalledWith("hello world");
  });

  it("clears input after submit", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={vi.fn()} {...defaultProps} />);
    const input = screen.getByLabelText("Message");
    await user.type(input, "hello");
    await user.click(screen.getByLabelText("Envoyer"));
    expect(input).toHaveValue("");
  });

  it("submits on Enter key press", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} {...defaultProps} />);
    await user.type(screen.getByLabelText("Message"), "hello{Enter}");
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("disables input and button when disabled prop is true", () => {
    render(<ChatInput onSend={vi.fn()} {...defaultProps} disabled />);
    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(screen.getByLabelText("Modèle")).toBeDisabled();
    expect(screen.getByLabelText("Envoyer")).toBeDisabled();
  });

  it("does not call onSend when disabled", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} {...defaultProps} disabled />);
    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByLabelText("Envoyer"));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("calls onModelChange when user picks another model", async () => {
    const user = userEvent.setup();
    const onModelChange = vi.fn();

    render(
      <ChatInput
        onSend={vi.fn()}
        selectedModel={DEFAULT_MODEL}
        onModelChange={onModelChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Modèle"), "gpt-5.4");
    expect(onModelChange).toHaveBeenCalledWith("gpt-5.4");
  });
});
