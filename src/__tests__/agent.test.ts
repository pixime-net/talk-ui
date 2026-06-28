import { describe, expect, it, vi, beforeEach } from "vitest";
import { HttpAgent } from "@ag-ui/client";

describe("agent config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_AGENT_URL", "http://localhost:9999");
  });

  it("exports an agents map with 'default' key", async () => {
    const { agents } = await import("../config/agent");
    expect(agents).toHaveProperty("default");
  });

  it("creates an HttpAgent instance", async () => {
    const { agents } = await import("../config/agent");
    expect(agents.default).toBeInstanceOf(HttpAgent);
  });
});
