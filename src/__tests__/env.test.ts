import { describe, expect, it, vi, beforeEach } from "vitest";

describe("env config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("parses a valid URL from VITE_AGENT_URL", async () => {
    vi.stubEnv("VITE_AGENT_URL", "http://localhost:8090");
    const { config } = await import("../config/env");
    expect(config.VITE_AGENT_URL).toBe("http://localhost:8090");
    vi.unstubAllEnvs();
  });

  it("falls back to default when VITE_AGENT_URL is not set", async () => {
    vi.stubEnv("VITE_AGENT_URL", "");
    // Empty string is falsy, so the fallback kicks in via ??
    // Actually "" is not nullish, so we need to test undefined
    vi.unstubAllEnvs();
    vi.resetModules();

    // Simulate undefined env var
    vi.stubEnv("VITE_AGENT_URL", undefined as unknown as string);
    const { config } = await import("../config/env");
    expect(config.VITE_AGENT_URL).toBe("http://localhost:8090");
    vi.unstubAllEnvs();
  });

  it("throws on invalid URL", async () => {
    vi.stubEnv("VITE_AGENT_URL", "not-a-url");
    await expect(import("../config/env")).rejects.toThrow(
      "Environment validation failed",
    );
    vi.unstubAllEnvs();
  });
});
