import { describe, expect, it } from "vitest";
import {
  normalizeMessages,
  type ToolCallMessageVM,
} from "../config/normalize-messages";

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

  it("reasoning appears before tool-call VMs in natural order", () => {
    const messages = [
      { id: "u1", role: "user", content: "do Z" },
      { id: "r1", role: "reasoning", content: "I need tool A" },
      {
        id: "tc1",
        role: "assistant",
        toolCalls: [
          {
            id: "tc1",
            type: "function",
            function: { name: "tool_a", arguments: "{}" },
          },
        ],
      },
      { id: "t1", role: "tool", content: "tool result", toolCallId: "tc1" },
      { id: "r2", role: "reasoning", content: "Now I can answer" },
      { id: "a1", role: "assistant", content: "Final answer" },
    ];
    const result = normalizeMessages(messages);
    const roles = result.map((m) => m.role);
    expect(roles).toEqual([
      "user",
      "reasoning",
      "tool-call",
      "reasoning",
      "assistant",
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
    expect(result[0]?.role).toBe("user");
    expect(result[1]?.role).toBe("assistant");
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

  it("keeps assistant messages with non-string content for fallback rendering", () => {
    const messages = [
      { id: "u1", role: "user", content: "hello" },
      { id: "a1", role: "assistant", content: { type: "video" } },
    ];
    const result = normalizeMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      id: "a1",
      role: "assistant",
      content: { type: "video" },
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

  it("emits tool-call VMs for assistant messages with toolCalls and no content", () => {
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
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ role: "user" });
    expect(result[1]).toMatchObject({
      role: "tool-call",
      toolName: "search",
      toolResult: "tool result",
    });
    expect(result[2]).toMatchObject({
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
    const roles = result.map((m) => m.role);
    expect(roles).toContain("reasoning");
    expect(roles).toContain("tool-call");
    expect(roles).toContain("assistant");
    expect(
      result.find((m) => m.role === "reasoning" && m.id === "r1"),
    ).toBeTruthy();
    expect(
      result.find((m) => m.role === "reasoning" && m.id === "r2"),
    ).toBeTruthy();
    expect(result.find((m) => m.role === "assistant")?.content).toBe(
      "Final answer",
    );
  });

  describe("tool-call view models", () => {
    it("emits a tool-call VM for a single tool call", () => {
      const messages = [
        { id: "u1", role: "user", content: "What's the weather?" },
        {
          id: "tc1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Paris"}' },
            },
          ],
        },
        {
          id: "t1",
          role: "tool",
          content: '{"temperature":22}',
          toolCallId: "call_1",
        },
        { id: "a1", role: "assistant", content: "It's 22°C in Paris." },
      ];
      const result = normalizeMessages(messages);
      const toolCallVM = result.find(
        (m) => m.role === "tool-call",
      ) as ToolCallMessageVM;
      expect(toolCallVM).toBeDefined();
      expect(toolCallVM.toolName).toBe("get_weather");
      expect(toolCallVM.toolArgs).toBe('{"city":"Paris"}');
      expect(toolCallVM.toolCallId).toBe("call_1");
      expect(toolCallVM.toolResult).toBe('{"temperature":22}');
    });

    it("tool-call VM has undefined toolResult when tool is in-progress", () => {
      const messages = [
        { id: "u1", role: "user", content: "What's the weather?" },
        {
          id: "tc1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Paris"}' },
            },
          ],
        },
      ];
      const result = normalizeMessages(messages);
      const toolCallVM = result.find(
        (m) => m.role === "tool-call",
      ) as ToolCallMessageVM;
      expect(toolCallVM).toBeDefined();
      expect(toolCallVM.toolName).toBe("get_weather");
      expect(toolCallVM.toolResult).toBeUndefined();
    });

    it("emits separate tool-call VMs for multiple tool calls in one turn", () => {
      const messages = [
        { id: "u1", role: "user", content: "Compare weather" },
        {
          id: "tc1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Paris"}' },
            },
            {
              id: "call_2",
              type: "function",
              function: {
                name: "get_weather",
                arguments: '{"city":"London"}',
              },
            },
          ],
        },
        {
          id: "t1",
          role: "tool",
          content: '{"temperature":22}',
          toolCallId: "call_1",
        },
        {
          id: "t2",
          role: "tool",
          content: '{"temperature":18}',
          toolCallId: "call_2",
        },
        { id: "a1", role: "assistant", content: "Paris is warmer." },
      ];
      const result = normalizeMessages(messages);
      const toolCalls = result.filter((m) => m.role === "tool-call");
      expect(toolCalls).toHaveLength(2);
      expect(toolCalls[0]?.toolName).toBe("get_weather");
      expect(toolCalls[0]?.toolArgs).toBe('{"city":"Paris"}');
      expect(toolCalls[0]?.toolResult).toBe('{"temperature":22}');
      expect(toolCalls[1]?.toolName).toBe("get_weather");
      expect(toolCalls[1]?.toolArgs).toBe('{"city":"London"}');
      expect(toolCalls[1]?.toolResult).toBe('{"temperature":18}');
    });

    it("skips unmatched tool messages (no matching tool-call VM)", () => {
      const messages = [
        { id: "u1", role: "user", content: "hello" },
        {
          id: "t1",
          role: "tool",
          content: "orphan result",
          toolCallId: "nonexistent",
        },
        { id: "a1", role: "assistant", content: "reply" },
      ];
      const result = normalizeMessages(messages);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ role: "user" });
      expect(result[1]).toMatchObject({ role: "assistant" });
    });

    it("preserves existing user/assistant/reasoning filtering unchanged", () => {
      const messages = [
        { id: "s1", role: "system", content: "sys" },
        { id: "u1", role: "user", content: "hello" },
        { id: "r1", role: "reasoning", content: "thinking" },
        { id: "a1", role: "assistant", content: "reply" },
      ];
      const result = normalizeMessages(messages);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ role: "user" });
      expect(result[1]).toMatchObject({ role: "reasoning" });
      expect(result[2]).toMatchObject({ role: "assistant" });
    });

    it("tool-call VMs appear in correct position within message flow", () => {
      const messages = [
        { id: "u1", role: "user", content: "do Z" },
        { id: "r1", role: "reasoning", content: "I need tool A" },
        {
          id: "tc1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "tool_a", arguments: "{}" },
            },
          ],
        },
        {
          id: "t1",
          role: "tool",
          content: "result",
          toolCallId: "call_1",
        },
        { id: "r2", role: "reasoning", content: "Now I can answer" },
        { id: "a1", role: "assistant", content: "Final answer" },
      ];
      const result = normalizeMessages(messages);
      const roles = result.map((m) => m.role);
      expect(roles).toEqual([
        "user",
        "reasoning",
        "tool-call",
        "reasoning",
        "assistant",
      ]);
    });

    it("preserves assistant text content when toolCalls and content coexist", () => {
      const messages = [
        {
          id: "a1",
          role: "assistant",
          content: "I called a tool and here is context",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "search", arguments: "{}" },
            },
          ],
        },
      ];

      const result = normalizeMessages(messages);

      expect(result.map((m) => m.role)).toEqual(["tool-call", "assistant"]);
      expect(result[1]).toMatchObject({
        role: "assistant",
        content: "I called a tool and here is context",
      });
    });

    it("uses unique fallback ids for multiple tool calls missing ids", () => {
      const messages = [
        {
          id: "a1",
          role: "assistant",
          toolCalls: [
            {
              id: "",
              type: "function",
              function: { name: "tool_a", arguments: "{}" },
            },
            {
              id: "",
              type: "function",
              function: { name: "tool_b", arguments: "{}" },
            },
          ],
        },
      ];

      const result = normalizeMessages(messages);
      const ids = result.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("buffers out-of-order tool results and reconciles when tool call appears", () => {
      const messages = [
        {
          id: "t1",
          role: "tool",
          content: '{"temperature":22}',
          toolCallId: "call_1",
        },
        {
          id: "a1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Paris"}' },
            },
          ],
        },
      ];

      const result = normalizeMessages(messages);
      const toolCallVM = result.find((m) => m.role === "tool-call");
      expect(toolCallVM?.toolResult).toBe('{"temperature":22}');
    });

    it("normalizes non-string tool results as strings", () => {
      const messages = [
        {
          id: "a1",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "lookup", arguments: "{}" },
            },
            {
              id: "call_2",
              type: "function",
              function: { name: "flag", arguments: "{}" },
            },
          ],
        },
        {
          id: "t1",
          role: "tool",
          content: { ok: true },
          toolCallId: "call_1",
        },
        {
          id: "t2",
          role: "tool",
          content: false,
          toolCallId: "call_2",
        },
      ];

      const result = normalizeMessages(messages);
      const first = result.find(
        (m) => m.role === "tool-call" && m.toolCallId === "call_1",
      );
      const second = result.find(
        (m) => m.role === "tool-call" && m.toolCallId === "call_2",
      );

      expect(first?.toolResult).toBe('{"ok":true}');
      expect(second?.toolResult).toBe("false");
    });

    it("marks unresolved tool calls as completed when final assistant text arrives", () => {
      const messages = [
        {
          id: "a-tool",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "geocode", arguments: '{"city":"Orleans"}' },
            },
            {
              id: "call_2",
              type: "function",
              function: {
                name: "get_current_weather",
                arguments: '{"lat":47.9,"lon":1.9}',
              },
            },
          ],
        },
        {
          id: "t1",
          role: "tool",
          content: '{"ok":true}',
          toolCallId: "call_2",
        },
        {
          id: "a-final",
          role: "assistant",
          content: "Météo à Orléans: ...",
        },
      ];

      const result = normalizeMessages(messages);
      const first = result.find(
        (m) => m.role === "tool-call" && m.toolCallId === "call_1",
      );
      const second = result.find(
        (m) => m.role === "tool-call" && m.toolCallId === "call_2",
      );

      expect(first?.toolResult).toBe("");
      expect(second?.toolResult).toBe('{"ok":true}');
    });

    it("falls back to oldest unresolved tool call when tool result has no toolCallId", () => {
      const messages = [
        {
          id: "a-tool",
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "geocode", arguments: '{"city":"Orleans"}' },
            },
          ],
        },
        {
          id: "t1",
          role: "tool",
          content: '{"lat":47.9,"lon":1.9}',
        },
      ];

      const result = normalizeMessages(messages);
      const toolCall = result.find((m) => m.role === "tool-call");
      expect(toolCall?.toolResult).toBe('{"lat":47.9,"lon":1.9}');
    });
  });
});
