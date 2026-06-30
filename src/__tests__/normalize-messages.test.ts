import { describe, expect, it } from "vitest";
import { normalizeMessages } from "../config/normalize-messages";

describe("normalizeMessages", () => {
  it("returns user and assistant messages", () => {
    const messages = [
      { id: "u1", role: "user", content: "hello" },
      { id: "a1", role: "assistant", content: "hi there" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toEqual([
      { id: "u1", role: "user", content: "hello" },
      { id: "a1", role: "assistant", content: "hi there" },
    ]);
  });

  it("includes reasoning messages as standalone items at their natural position", () => {
    const messages = [
      { id: "u1", role: "user", content: "explain X" },
      { id: "r1", role: "reasoning", content: "Let me think about this..." },
      { id: "a1", role: "assistant", content: "Here's my answer" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toEqual([
      { id: "u1", role: "user", content: "explain X" },
      { id: "r1", role: "reasoning", content: "Let me think about this..." },
      { id: "a1", role: "assistant", content: "Here's my answer" },
    ]);
  });

  it("keeps multiple reasoning messages as separate items", () => {
    const messages = [
      { id: "u1", role: "user", content: "do Y" },
      { id: "r1", role: "reasoning", content: "First reasoning" },
      { id: "r2", role: "reasoning", content: "Second reasoning" },
      { id: "a1", role: "assistant", content: "Done" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toHaveLength(4);
    expect(result[1]).toMatchObject({
      id: "r1",
      role: "reasoning",
      content: "First reasoning",
    });
    expect(result[2]).toMatchObject({
      id: "r2",
      role: "reasoning",
      content: "Second reasoning",
    });
  });

  it("reasoning appears before tool-call messages in natural order", () => {
    const messages = [
      { id: "u1", role: "user", content: "do Z" },
      { id: "r1", role: "reasoning", content: "I need tool A" },
      { id: "tc1", role: "assistant", toolCalls: [{ id: "tc1" }] },
      { id: "t1", role: "tool", content: "tool result" },
      { id: "r2", role: "reasoning", content: "Now I can answer" },
      { id: "a1", role: "assistant", content: "Final answer" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toEqual([
      { id: "u1", role: "user", content: "do Z" },
      { id: "r1", role: "reasoning", content: "I need tool A" },
      { id: "r2", role: "reasoning", content: "Now I can answer" },
      { id: "a1", role: "assistant", content: "Final answer" },
    ]);
  });

  it("filters out reasoning messages with empty content", () => {
    const messages = [
      { id: "u1", role: "user", content: "hello" },
      { id: "r1", role: "reasoning", content: "" },
      { id: "a1", role: "assistant", content: "response" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });

  it("includes trailing reasoning messages", () => {
    const messages = [
      { id: "u1", role: "user", content: "hello" },
      { id: "a1", role: "assistant", content: "response" },
      { id: "r1", role: "reasoning", content: "trailing reasoning" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toHaveLength(3);
    expect(result[2]).toMatchObject({
      id: "r1",
      role: "reasoning",
      content: "trailing reasoning",
    });
  });

  it("filters out system, developer, and activity messages", () => {
    const messages = [
      { id: "s1", role: "system", content: "system prompt" },
      { id: "d1", role: "developer", content: "dev msg" },
      { id: "u1", role: "user", content: "hello" },
      { id: "act1", role: "activity", content: "activity" },
      { id: "a1", role: "assistant", content: "hi" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "u1", role: "user" });
    expect(result[1]).toMatchObject({ id: "a1", role: "assistant" });
  });

  it("filters out assistant messages with empty content", () => {
    const messages = [
      { id: "u1", role: "user", content: "hello" },
      { id: "a1", role: "assistant", content: "" },
      { id: "a2", role: "assistant", content: "real response" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      id: "a2",
      role: "assistant",
      content: "real response",
    });
  });

  it("assigns reasoning to correct positions in multiple exchanges", () => {
    const messages = [
      { id: "u1", role: "user", content: "first question" },
      { id: "r1", role: "reasoning", content: "thinking about first" },
      { id: "a1", role: "assistant", content: "first answer" },
      { id: "u2", role: "user", content: "second question" },
      { id: "r2", role: "reasoning", content: "thinking about second" },
      { id: "a2", role: "assistant", content: "second answer" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toHaveLength(6);
    expect(result[1]).toMatchObject({
      role: "reasoning",
      content: "thinking about first",
    });
    expect(result[4]).toMatchObject({
      role: "reasoning",
      content: "thinking about second",
    });
  });

  it("skips tool-call assistant messages with no content field", () => {
    const messages = [
      { id: "u1", role: "user", content: "call a tool" },
      {
        id: "tc1",
        role: "assistant",
        toolCalls: [
          {
            id: "tc1",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
      },
      { id: "t1", role: "tool", content: "tool result", toolCallId: "tc1" },
      { id: "a1", role: "assistant", content: "Here is the result" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ role: "user" });
    expect(result[1]).toMatchObject({
      role: "assistant",
      content: "Here is the result",
    });
  });

  it("preserves reasoning before tool-call assistant messages", () => {
    const messages = [
      { id: "u1", role: "user", content: "question" },
      { id: "r1", role: "reasoning", content: "I need to use a tool" },
      {
        id: "tc1",
        role: "assistant",
        toolCalls: [
          {
            id: "tc1",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
      },
      { id: "t1", role: "tool", content: "tool result", toolCallId: "tc1" },
      { id: "r2", role: "reasoning", content: "Now I can answer" },
      { id: "a1", role: "assistant", content: "Final answer" },
    ];
    const result = normalizeMessages(messages);
    expect(result).toHaveLength(4);
    expect(result[0]).toMatchObject({ role: "user" });
    expect(result[1]).toMatchObject({
      role: "reasoning",
      content: "I need to use a tool",
    });
    expect(result[2]).toMatchObject({
      role: "reasoning",
      content: "Now I can answer",
    });
    expect(result[3]).toMatchObject({
      role: "assistant",
      content: "Final answer",
    });
  });
});
