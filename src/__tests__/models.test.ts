import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODEL,
  MODEL_ALIASES,
  parseModelAlias,
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
