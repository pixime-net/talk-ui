import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReasoningBlock } from "../components/ReasoningBlock";

describe("ReasoningBlock", () => {
  it("renders reasoning content", () => {
    render(
      <ReasoningBlock content="Let me think about this step by step..." />,
    );
    expect(
      screen.getByText("Let me think about this step by step..."),
    ).toBeInTheDocument();
  });

  it("applies muted and italic styling", () => {
    const { container } = render(
      <ReasoningBlock content="Some reasoning text" />,
    );
    const block = container.firstElementChild;
    expect(block).toHaveClass("italic");
    expect(block).toHaveClass("text-white/50");
  });

  it("applies left border styling", () => {
    const { container } = render(
      <ReasoningBlock content="Some reasoning text" />,
    );
    const block = container.firstElementChild;
    expect(block).toHaveClass("border-l-2");
    expect(block).toHaveClass("border-white/20");
    expect(block).toHaveClass("pl-3");
  });

  it("applies smaller text size", () => {
    const { container } = render(
      <ReasoningBlock content="Some reasoning text" />,
    );
    const block = container.firstElementChild;
    expect(block).toHaveClass("text-sm");
  });

  it("renders markdown content", () => {
    render(<ReasoningBlock content="**bold reasoning**" />);
    const bold = screen.getByText("bold reasoning");
    expect(bold.tagName).toBe("STRONG");
  });
});
