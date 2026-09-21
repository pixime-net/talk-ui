import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TokenUsageIndicator } from "../components/TokenUsageIndicator";

function renderIndicator(
  lastCallUsage: Parameters<typeof TokenUsageIndicator>[0]["lastCallUsage"],
  cumulativeUsage: Parameters<
    typeof TokenUsageIndicator
  >[0]["cumulativeUsage"] = null,
) {
  return render(
    <TokenUsageIndicator
      lastCallUsage={lastCallUsage}
      cumulativeUsage={cumulativeUsage}
    />,
  );
}

describe("TokenUsageIndicator", () => {
  it("renders nothing without any confirmed usage", () => {
    const { container } = renderIndicator(null);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows count, percentage and accessible status text", () => {
    renderIndicator({
      input_tokens: 1200,
      context_window_tokens: 200000,
      context_ratio: 0.006,
    });

    const context = screen.getByTestId("context-usage");
    expect(context).toHaveAttribute("data-status", "normal");
    expect(context).toHaveAttribute("role", "progressbar");
    expect(context).toHaveAttribute("aria-valuenow", "1");
    expect(context.getAttribute("aria-label")).toContain("1,200");
    expect(context.getAttribute("aria-label")).toContain("200,000");
    expect(context.getAttribute("aria-label")).toContain("Normal");
    expect(context.getAttribute("aria-label")).toContain(
      "Last completed call context",
    );
  });

  it.each([
    [0.5, "normal", "Normal"],
    [0.6999, "warning", "Warning"],
    [0.7, "warning", "Warning"],
    [0.84, "warning", "Warning"],
    [0.8499, "critical", "Critical"],
    [0.85, "critical", "Critical"],
    [0.99, "critical", "Critical"],
    [0.9999, "blocked", "Limit reached"],
    [1, "blocked", "Limit reached"],
  ])("renders %s ratio as %s status", (ratio, status, label) => {
    renderIndicator({
      input_tokens: 100,
      context_window_tokens: 1000,
      context_ratio: ratio,
    });

    const context = screen.getByTestId("context-usage");
    expect(context).toHaveAttribute("data-status", status);
    expect(context.getAttribute("aria-label")).toContain(label);
  });

  it("clamps the progress value when usage exceeds the limit", () => {
    renderIndicator({
      input_tokens: 250,
      context_window_tokens: 200,
      context_ratio: 1.25,
    });

    const context = screen.getByTestId("context-usage");
    expect(context).toHaveAttribute("aria-valuenow", "100");
    expect(context.getAttribute("aria-label")).toContain("125%");
  });

  it("renders the unavailable-limit state without percentage or progress", () => {
    renderIndicator({ input_tokens: 1200 });

    const context = screen.getByTestId("context-usage");
    expect(context).toHaveAttribute("data-status", "limit-unavailable");
    expect(context).not.toHaveAttribute("role");
    expect(context).not.toHaveAttribute("aria-valuenow");
    expect(context.getAttribute("aria-label")).toContain(
      "context limit unavailable",
    );
    expect(context.textContent).not.toContain("%");
  });

  it("does not render a context indicator when input tokens are missing", () => {
    renderIndicator({
      output_tokens: 300,
      provider_max_output_tokens: 1000,
      output_ratio: 0.3,
    });
    expect(screen.queryByTestId("context-usage")).not.toBeInTheDocument();
  });

  it("keeps completed output usage in the details panel only", async () => {
    const user = userEvent.setup();
    renderIndicator({
      input_tokens: 10,
      output_tokens: 320,
      provider_max_output_tokens: 64000,
      output_ratio: 0.005,
    });

    expect(screen.queryByTestId("output-usage")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Token usage details" }),
    );
    const details = screen.getByTestId("token-usage-details");
    expect(details.textContent).toContain("Output");
    expect(details.textContent).toContain("320");
    expect(details.textContent).toContain("Provider output limit");
  });

  it("omits output usage when the provider limit or ratio is unavailable", () => {
    renderIndicator({ input_tokens: 10, output_tokens: 320 });
    expect(screen.queryByTestId("output-usage")).not.toBeInTheDocument();
  });

  it("exposes all confirmed values through the keyboard-accessible details", async () => {
    const user = userEvent.setup();
    renderIndicator(
      {
        input_tokens: 1200,
        output_tokens: 300,
        cache_read_tokens: 40,
        reasoning_tokens: 12,
        context_window_tokens: 200000,
        provider_max_output_tokens: 64000,
        context_ratio: 0.006,
        output_ratio: 0.0047,
      },
      { input_tokens: 5000, output_tokens: 900 },
    );

    const toggle = screen.getByRole("button", { name: "Token usage details" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-haspopup", "dialog");
    expect(toggle).toHaveAttribute("aria-controls");

    await user.tab();
    await user.keyboard("{Enter}");

    const details = screen.getByTestId("token-usage-details");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(details.textContent).toContain("Input");
    expect(details.textContent).toContain("1,200");
    expect(details.textContent).toContain("Cache read");
    expect(details.textContent).toContain("Reasoning");
    expect(details.textContent).toContain("Context limit");
    expect(details.textContent).toContain("Provider output limit");
    expect(details.textContent).toContain("Context ratio");
    expect(details.textContent).toContain("1%");
    expect(details.textContent).toContain("Output ratio");
    expect(details.textContent).toContain("Session total");
    expect(details.textContent).toContain("5,000");
    // Cache write was never confirmed and must not be shown as zero.
    expect(details.textContent).not.toContain("Cache write");

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("token-usage-details")).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("renders a cumulative-only state when no per-call event arrived", async () => {
    const user = userEvent.setup();
    renderIndicator(null, { input_tokens: 500 });

    expect(screen.queryByTestId("context-usage")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Token usage details" }),
    );
    const details = screen.getByTestId("token-usage-details");
    expect(details.textContent).toContain("Session total");
    expect(details.textContent).toContain("500");
  });
});
