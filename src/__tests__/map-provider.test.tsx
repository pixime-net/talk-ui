import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapProvider } from "../map/MapProvider";
import { useMapContext } from "../map/map-context";
import { routeToolMapper } from "../map/adapters/route-tool-mapper";
import type { ToolResultMapper } from "../map/types";

const mockAgent = {
  messages: [] as unknown[],
  isRunning: false,
  pendingInterrupts: [] as unknown[],
  addMessage: vi.fn(),
  agentId: "default",
  threadId: "thread-1",
  state: {},
  setState: vi.fn(),
};

vi.mock("@copilotkit/react-core/v2", () => ({
  useAgent: () => ({ agent: mockAgent }),
}));

const validRouteOutput = {
  start: "2.337306,48.849319",
  end: "2.367776,48.852891",
  profile: "car",
  optimization: "fastest",
  distance: 1234.5,
  duration: 120,
  bbox: [2.33, 48.84, 2.37, 48.86],
  geometry: {
    type: "LineString",
    coordinates: [
      [2.33, 48.84],
      [2.37, 48.86],
    ],
  },
  portions: [],
};

const toolCallMsg = {
  role: "assistant",
  toolCalls: [
    {
      id: "tc-1",
      type: "function",
      function: { name: "route", arguments: "" },
    },
  ],
};

const toolResultMsg = {
  role: "tool",
  toolCallId: "tc-1",
  content: validRouteOutput,
};

const toolResultWithoutID = {
  role: "tool",
  content: validRouteOutput,
};

function TestConsumer() {
  const {
    itineraries,
    isMapPanelOpen,
    toggleMapPanel,
    selectedFeatureId,
    selectFeature,
  } = useMapContext();
  return (
    <div>
      <div data-testid="count">{itineraries.length}</div>
      <div data-testid="panel-open">{String(isMapPanelOpen)}</div>
      <div data-testid="first-id">{itineraries[0]?.id ?? ""}</div>
      <div data-testid="ids">{itineraries.map((f) => f.id).join(",")}</div>
      <div data-testid="selected">{selectedFeatureId ?? "null"}</div>
      <button
        onClick={() => {
          toggleMapPanel();
        }}
      >
        toggle
      </button>
      <button
        onClick={() => {
          selectFeature("tc-1-0");
        }}
      >
        select
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <MapProvider mappers={[routeToolMapper]}>
      <TestConsumer />
    </MapProvider>,
  );
}

describe("MapProvider", () => {
  beforeEach(() => {
    mockAgent.messages = [];
  });

  it("initial state: panel closed, no itineraries", () => {
    renderProvider();
    expect(screen.getByTestId("panel-open").textContent).toBe("false");
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("auto-opens panel and adds feature when route result arrives", async () => {
    const { rerender } = renderProvider();

    mockAgent.messages = [toolCallMsg, toolResultMsg];
    rerender(
      <MapProvider mappers={[routeToolMapper]}>
        <TestConsumer />
      </MapProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("panel-open").textContent).toBe("true");
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("feature id is toolCallId-idx", async () => {
    mockAgent.messages = [toolCallMsg, toolResultMsg];
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("first-id").textContent).toBe("tc-1-0");
    });
  });

  it("idempotent — same messages do not duplicate features", async () => {
    mockAgent.messages = [toolCallMsg, toolResultMsg];
    const { rerender } = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });

    rerender(
      <MapProvider mappers={[routeToolMapper]}>
        <TestConsumer />
      </MapProvider>,
    );

    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("session reset clears itineraries and closes panel", async () => {
    mockAgent.messages = [toolCallMsg, toolResultMsg];
    const { rerender } = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("panel-open").textContent).toBe("true");
    });

    mockAgent.messages = [];
    rerender(
      <MapProvider mappers={[routeToolMapper]}>
        <TestConsumer />
      </MapProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("panel-open").textContent).toBe("false");
    });
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("toggleMapPanel closes an open panel", async () => {
    mockAgent.messages = [toolCallMsg, toolResultMsg];
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("panel-open").textContent).toBe("true");
    });

    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("panel-open").textContent).toBe("false");
  });

  it("toggleMapPanel reopens panel", async () => {
    mockAgent.messages = [toolCallMsg, toolResultMsg];
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("panel-open").textContent).toBe("true");
    });

    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("panel-open").textContent).toBe("true");
  });

  it("close preserves itineraries", async () => {
    mockAgent.messages = [toolCallMsg, toolResultMsg];
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("panel-open").textContent).toBe("true");
    });

    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("session reset closes panel even with no itineraries", async () => {
    mockAgent.messages = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ];
    const { rerender } = renderProvider();

    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("panel-open").textContent).toBe("true");
    expect(screen.getByTestId("count").textContent).toBe("0");

    mockAgent.messages = [];
    rerender(
      <MapProvider mappers={[routeToolMapper]}>
        <TestConsumer />
      </MapProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("panel-open").textContent).toBe("false");
    });
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("all extracted features keep toolCallId as id", async () => {
    const lineString: GeoJSON.Geometry = {
      type: "LineString",
      coordinates: [
        [2.33, 48.84],
        [2.37, 48.86],
      ],
    };
    const duplicateFeatureMapper: ToolResultMapper = {
      toolName: "route",
      toMapFeatures: () => [
        {
          id: "first",
          label: "A",
          geometry: lineString,
          bbox: [2.33, 48.84, 2.37, 48.86],
        },
        {
          id: "second",
          label: "B",
          geometry: lineString,
          bbox: [2.33, 48.84, 2.37, 48.86],
        },
      ],
    };

    mockAgent.messages = [toolCallMsg, toolResultMsg];
    render(
      <MapProvider mappers={[duplicateFeatureMapper]}>
        <TestConsumer />
      </MapProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("2");
    });
    expect(screen.getByTestId("ids").textContent).toBe("tc-1-0,tc-1-1");
  });

  it("session reset clears selectedFeatureId", async () => {
    mockAgent.messages = [toolCallMsg, toolResultMsg];
    const { rerender } = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("panel-open").textContent).toBe("true");
    });
    await userEvent.click(screen.getByRole("button", { name: "select" }));
    expect(screen.getByTestId("selected").textContent).toBe("tc-1-0");

    mockAgent.messages = [];
    rerender(
      <MapProvider mappers={[routeToolMapper]}>
        <TestConsumer />
      </MapProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("selected").textContent).toBe("null");
    });
  });

  it("matches prefixed tool names", async () => {
    const prefixedToolCallMsg = {
      role: "assistant",
      toolCalls: [
        {
          id: "tc-2",
          type: "function",
          function: { name: "ign-nav__route", arguments: "" },
        },
      ],
    };
    const prefixedToolResultMsg = {
      role: "tool",
      toolCallId: "tc-2",
      content: validRouteOutput,
    };

    mockAgent.messages = [prefixedToolCallMsg, prefixedToolResultMsg];
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
  });

  it("pairs tool results without toolCallId using message order", async () => {
    mockAgent.messages = [toolCallMsg, toolResultWithoutID];
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
    expect(screen.getByTestId("ids").textContent).toBe("tool-result-1-0");
  });
});
