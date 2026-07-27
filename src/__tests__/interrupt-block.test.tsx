import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InterruptBlock } from "../components/InterruptBlock";

describe("InterruptBlock", () => {
  it("renders the limit message and a Continue button", () => {
    render(<InterruptBlock onContinue={vi.fn()} disabled={false} />);

    expect(
      screen.getByText("The assistant reached its tool call limit."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
  });

  it("calls onContinue when the button is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<InterruptBlock onContinue={onContinue} disabled={false} />);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("disables the button when disabled is true", () => {
    render(<InterruptBlock onContinue={vi.fn()} disabled={true} />);

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
