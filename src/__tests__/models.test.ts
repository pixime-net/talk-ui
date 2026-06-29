import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODEL,
  DEFAULT_THINKING_EFFORT,
  MODEL_ALIASES,
  THINKING_EFFORTS,
  parseModelAlias,
  supportsThinking,
} from "../config/models";

describe("models config", () => {
  it("exposes expected model aliases", () => {
    expect(MODEL_ALIASES).toEqual([
      "haiku-4.5",
      "sonnet-4.6",
      "opus-4.6",
      "o4-mini",
      "gpt-5.4",
      "mistral-small",
      "agent",
    ]);
  });

  it("uses sonnet-4.6 as default model", () => {
    expect(DEFAULT_MODEL).toBe("sonnet-4.6");
  });

  it("throws for invalid model aliases", () => {
    expect(() => parseModelAlias("not-a-model")).toThrow();
  });
});

describe("thinking effort", () => {
  it("exposes thinking effort levels", () => {
    expect(THINKING_EFFORTS).toEqual(["off", "low", "medium", "high"]);
  });

  it("uses off as default thinking effort", () => {
    expect(DEFAULT_THINKING_EFFORT).toBe("off");
  });

  it("identifies thinking-capable models", () => {
    expect(supportsThinking("haiku-4.5")).toBe(true);
    expect(supportsThinking("sonnet-4.6")).toBe(true);
    expect(supportsThinking("opus-4.6")).toBe(true);
    expect(supportsThinking("o4-mini")).toBe(true);
  });

  it("identifies non-thinking models", () => {
    expect(supportsThinking("gpt-5.4")).toBe(false);
    expect(supportsThinking("mistral-small")).toBe(false);
    expect(supportsThinking("agent")).toBe(false);
  });
});
