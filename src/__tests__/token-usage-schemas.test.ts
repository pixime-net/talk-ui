import { describe, expect, it } from "vitest";
import {
  addTurnUsage,
  contextStatusFromRatio,
  contextUsageView,
  formatPercent,
  formatTokenCount,
  parseTokenUsageEvent,
  parseTurnUsageEvent,
} from "../config/token-usage-schemas";

describe("token usage schemas", () => {
  it("parses a complete token_usage payload", () => {
    const parsed = parseTokenUsageEvent({
      model: "sonnet-4.6",
      input_tokens: 1200,
      output_tokens: 300,
      cache_read_tokens: 10,
      cache_write_tokens: 5,
      reasoning_tokens: 40,
      context_window_tokens: 200000,
      provider_max_output_tokens: 64000,
      context_ratio: 0.006,
      output_ratio: 0.0047,
    });

    expect(parsed?.input_tokens).toBe(1200);
    expect(parsed?.context_ratio).toBeCloseTo(0.006);
  });

  it("accepts payloads that omit unavailable fields", () => {
    const parsed = parseTokenUsageEvent({ model: "m", input_tokens: 10 });
    expect(parsed).toEqual({ model: "m", input_tokens: 10 });
    expect(parsed?.output_tokens).toBeUndefined();
  });

  it.each([
    ["negative count", { input_tokens: -1 }],
    ["fractional count", { input_tokens: 1.5 }],
    ["non-finite ratio", { input_tokens: 1, context_ratio: Number.NaN }],
    ["infinite ratio", { input_tokens: 1, context_ratio: Infinity }],
    ["negative ratio", { input_tokens: 1, context_ratio: -0.2 }],
    ["string count", { input_tokens: "12" }],
    ["null payload", null],
    ["string payload", "token_usage"],
  ])("rejects %s", (_label, value) => {
    expect(parseTokenUsageEvent(value)).toBeUndefined();
  });

  it("parses counts-only turn_usage without requiring limits or ratios", () => {
    const parsed = parseTurnUsageEvent({
      model: "m",
      input_tokens: 500,
      output_tokens: 100,
    });
    expect(parsed).toEqual({
      model: "m",
      input_tokens: 500,
      output_tokens: 100,
    });
  });

  it("rejects malformed turn_usage payloads", () => {
    expect(parseTurnUsageEvent({ output_tokens: -3 })).toBeUndefined();
  });
});

describe("addTurnUsage", () => {
  it("starts cumulative totals from a first turn", () => {
    expect(
      addTurnUsage(null, { input_tokens: 100, output_tokens: 20 }),
    ).toEqual({ input_tokens: 100, output_tokens: 20 });
  });

  it("adds authoritative totals across turns", () => {
    const first = addTurnUsage(null, { input_tokens: 100, output_tokens: 20 });
    const second = addTurnUsage(first, {
      input_tokens: 50,
      reasoning_tokens: 7,
    });
    expect(second).toEqual({
      input_tokens: 150,
      output_tokens: 20,
      reasoning_tokens: 7,
    });
  });

  it("leaves never-confirmed fields absent", () => {
    const totals = addTurnUsage(null, { input_tokens: 10 });
    expect(totals.cache_write_tokens).toBeUndefined();
    expect(Object.keys(totals)).not.toContain("cache_write_tokens");
  });
});

describe("contextStatusFromRatio", () => {
  it.each([
    [0.1, "normal"],
    [0.6999, "warning"],
    [0.7, "warning"],
    [0.8499, "critical"],
    [0.85, "critical"],
    [0.9999, "blocked"],
    [1, "blocked"],
    [1.4, "blocked"],
  ])("maps %s to %s", (value, expected) => {
    expect(contextStatusFromRatio(value)).toBe(expected);
  });
});

describe("contextUsageView", () => {
  it("returns null when no usage or no input tokens", () => {
    expect(contextUsageView(null)).toBeNull();
    expect(contextUsageView({ output_tokens: 5 })).toBeNull();
  });

  it("uses the backend ratio when a positive limit exists", () => {
    expect(
      contextUsageView({
        input_tokens: 140000,
        context_window_tokens: 200000,
        context_ratio: 0.7,
      }),
    ).toEqual({
      inputTokens: 140000,
      limitTokens: 200000,
      ratio: 0.7,
      status: "warning",
    });
  });

  it("omits ratio and limit when the context window is unavailable", () => {
    expect(contextUsageView({ input_tokens: 1200 })).toEqual({
      inputTokens: 1200,
    });
    expect(
      contextUsageView({ input_tokens: 1200, context_window_tokens: 0 }),
    ).toEqual({ inputTokens: 1200 });
    expect(
      contextUsageView({ input_tokens: 1200, context_window_tokens: 200000 }),
    ).toEqual({ inputTokens: 1200 });
  });
});

describe("formatting", () => {
  it("formats counts and percentages", () => {
    expect(formatTokenCount(1234567)).toBe("1,234,567");
    expect(formatPercent(0.7)).toBe("70%");
    expect(formatPercent(1.25)).toBe("125%");
  });
});
