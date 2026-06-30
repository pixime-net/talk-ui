import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolCallItem } from "../components/ToolCallItem";

describe("ToolCallItem", () => {
  it("renders the tool name", () => {
    render(
      <ToolCallItem
        toolName="get_weather"
        toolArgs='{"city":"Paris"}'
        toolResult='{"temperature":22}'
      />,
    );
    expect(screen.getByText("get_weather")).toBeInTheDocument();
  });

  it("is collapsed by default when result exists", () => {
    render(
      <ToolCallItem
        toolName="get_weather"
        toolArgs='{"city":"Paris"}'
        toolResult='{"temperature":22}'
      />,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Arguments/i)).not.toBeInTheDocument();
  });

  it("expands on click showing args and result", async () => {
    const user = userEvent.setup();
    render(
      <ToolCallItem
        toolName="get_weather"
        toolArgs='{"city":"Paris"}'
        toolResult='{"temperature":22}'
      />,
    );
    const button = screen.getByRole("button");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Arguments/i)).toBeInTheDocument();
    expect(screen.getByText(/Result/i)).toBeInTheDocument();
  });

  it("collapses on second click", async () => {
    const user = userEvent.setup();
    render(
      <ToolCallItem
        toolName="get_weather"
        toolArgs='{"city":"Paris"}'
        toolResult='{"temperature":22}'
      />,
    );
    const button = screen.getByRole("button");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Arguments/i)).not.toBeInTheDocument();
  });

  it("shows in-progress indicator when no result", () => {
    render(<ToolCallItem toolName="get_weather" toolArgs='{"city":"Paris"}' />);
    expect(screen.getByTestId("tool-call-in-progress")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("is not expandable when in-progress", async () => {
    const user = userEvent.setup();
    render(<ToolCallItem toolName="get_weather" toolArgs='{"city":"Paris"}' />);
    const header = screen.getByTestId("tool-call-header");
    await user.click(header);
    expect(screen.queryByText(/Arguments/i)).not.toBeInTheDocument();
  });

  it("pretty-prints valid JSON in args", async () => {
    const user = userEvent.setup();
    render(
      <ToolCallItem
        toolName="search"
        toolArgs='{"query":"test","limit":10}'
        toolResult='"done"'
      />,
    );
    await user.click(screen.getByRole("button"));
    // Should contain formatted JSON (with newlines/indentation)
    const argsBlock = screen.getByTestId("tool-call-args");
    expect(argsBlock.textContent).toContain('"query"');
    expect(argsBlock.textContent).toContain('"test"');
  });

  it("displays raw string when args is invalid JSON", async () => {
    const user = userEvent.setup();
    render(
      <ToolCallItem
        toolName="search"
        toolArgs="not json"
        toolResult='"done"'
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("tool-call-args").textContent).toContain(
      "not json",
    );
  });

  it("does not render RESULT section when tool result is empty string", async () => {
    const user = userEvent.setup();
    render(
      <ToolCallItem toolName="search" toolArgs='{"q":"x"}' toolResult="" />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText(/Result/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("tool-call-result")).not.toBeInTheDocument();
  });
});
