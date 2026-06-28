import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@copilotkit/react-core/v2", () => ({
  useAgent: () => ({
    agent: {
      messages: [],
      isRunning: false,
      addMessage: vi.fn(),
    },
  }),
  useCopilotKit: () => ({
    copilotkit: {
      runAgent: vi.fn(),
      stopAgent: vi.fn(),
    },
  }),
}));

import { App } from "../App";

describe("App", () => {
  it("renders the chat input", () => {
    render(<App />);
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });
});
