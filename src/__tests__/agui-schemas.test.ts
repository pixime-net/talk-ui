import { describe, expect, it } from "vitest";
import { parseAguiMessage, isTextMessage } from "../config/agui-schemas";

describe("parseAguiMessage", () => {
  it("parses a user text message", () => {
    const result = parseAguiMessage({
      id: "u1",
      role: "user",
      content: "hello",
    });
    expect(result?.kind).toBe("text");
    if (result?.kind === "text") {
      expect(result.role).toBe("user");
      expect(result.content).toBe("hello");
    }
  });

  it("parses an assistant text message", () => {
    const result = parseAguiMessage({
      id: "a1",
      role: "assistant",
      content: "hi there",
    });
    expect(result?.kind).toBe("text");
    if (result?.kind === "text") {
      expect(result.role).toBe("assistant");
      expect(result.content).toBe("hi there");
    }
  });

  it("parses a reasoning message", () => {
    const result = parseAguiMessage({
      id: "r1",
      role: "reasoning",
      content: "thinking...",
    });
    expect(result?.kind).toBe("text");
    if (result?.kind === "text") {
      expect(result.role).toBe("reasoning");
      expect(result.content).toBe("thinking...");
    }
  });

  it("parses a tool-call container assistant message", () => {
    const result = parseAguiMessage({
      id: "tc1",
      role: "assistant",
      toolCalls: [
        {
          id: "call_1",
          type: "function",
          function: { name: "search", arguments: '{"q":"test"}' },
        },
      ],
    });
    expect(result?.kind).toBe("tool-call-container");
    if (result?.kind === "tool-call-container") {
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0]?.function.name).toBe("search");
    }
  });

  it("parses a tool-call container with both content and toolCalls", () => {
    const result = parseAguiMessage({
      id: "a1",
      role: "assistant",
      content: "I will search for that",
      toolCalls: [
        {
          id: "call_1",
          type: "function",
          function: { name: "search", arguments: "{}" },
        },
      ],
    });
    expect(result?.kind).toBe("tool-call-container");
    if (result?.kind === "tool-call-container") {
      expect(result.content).toBe("I will search for that");
    }
  });

  it("parses a tool result message", () => {
    const result = parseAguiMessage({
      id: "t1",
      role: "tool",
      content: "result data",
      toolCallId: "call_1",
    });
    expect(result?.kind).toBe("tool-result");
    if (result?.kind === "tool-result") {
      expect(result.content).toBe("result data");
      expect(result.toolCallId).toBe("call_1");
    }
  });

  it("parses a tool result message without toolCallId", () => {
    const result = parseAguiMessage({
      id: "t1",
      role: "tool",
      content: "result data",
    });
    expect(result?.kind).toBe("tool-result");
    if (result?.kind === "tool-result") {
      expect(result.toolCallId).toBeUndefined();
    }
  });

  it("parses messages without an id", () => {
    const result = parseAguiMessage({
      role: "user",
      content: "hello",
    });
    expect(result?.kind).toBe("text");
    if (result?.kind === "text") {
      expect(result.id).toBeUndefined();
    }
  });

  it("returns undefined for null", () => {
    expect(parseAguiMessage(null)).toBeUndefined();
  });

  it("returns undefined for non-object values", () => {
    expect(parseAguiMessage("string")).toBeUndefined();
    expect(parseAguiMessage(42)).toBeUndefined();
    expect(parseAguiMessage(undefined)).toBeUndefined();
  });

  it("returns undefined for messages with unknown role", () => {
    const result = parseAguiMessage({
      id: "x1",
      role: "system",
      content: "system prompt",
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined for tool messages without content", () => {
    const result = parseAguiMessage({
      id: "t1",
      role: "tool",
    });
    expect(result).toBeUndefined();
  });

  it("rejects assistant messages with malformed toolCalls", () => {
    const result = parseAguiMessage({
      id: "a1",
      role: "assistant",
      toolCalls: "not-an-array",
    });
    expect(result).toBeUndefined();
  });

  it("rejects assistant messages with partially malformed toolCalls", () => {
    const result = parseAguiMessage({
      id: "a1",
      role: "assistant",
      toolCalls: [{ id: "c1", type: "function" }],
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined for messages with empty role", () => {
    const result = parseAguiMessage({
      id: "x1",
      role: "",
      content: "test",
    });
    expect(result).toBeUndefined();
  });

  it("rejects reasoning messages with non-string content", () => {
    const result = parseAguiMessage({
      id: "r1",
      role: "reasoning",
      content: { type: "structured" },
    });
    expect(result).toBeUndefined();
  });

  it("rejects reasoning messages with numeric content", () => {
    const result = parseAguiMessage({
      id: "r1",
      role: "reasoning",
      content: 42,
    });
    expect(result).toBeUndefined();
  });
});

describe("isTextMessage", () => {
  it("returns true for text messages", () => {
    const msg = parseAguiMessage({
      role: "user",
      content: "hello",
    });
    if (msg) expect(isTextMessage(msg)).toBe(true);
  });

  it("returns false for tool-call containers", () => {
    const msg = parseAguiMessage({
      role: "assistant",
      toolCalls: [
        {
          id: "c1",
          type: "function",
          function: { name: "search", arguments: "{}" },
        },
      ],
    });
    if (msg) expect(isTextMessage(msg)).toBe(false);
  });

  it("returns false for tool results", () => {
    const msg = parseAguiMessage({
      role: "tool",
      content: "result",
    });
    if (msg) expect(isTextMessage(msg)).toBe(false);
  });
});
