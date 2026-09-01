import { act, render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MapContextValue, MapFeature } from "../map/types";
import { MapContext } from "../map/map-context";

// ─── Mock react-map-gl/maplibre (no WebGL in jsdom) ───────────────────────────

const mockFitBounds = vi.fn();
const mockResize = vi.fn();
const mockMapRef = {
  fitBounds: mockFitBounds,
  resize: mockResize,
};

let capturedRef: React.RefObject<unknown> | null = null;

vi.mock("react-map-gl/maplibre", () => ({
  Map: vi.fn(
    ({
      ref,
      children,
      mapStyle,
      initialViewState,
    }: {
      ref?: React.RefObject<unknown>;
      children?: ReactNode;
      mapStyle?: unknown;
      initialViewState?: unknown;
    }) => {
      if (ref) capturedRef = ref as React.RefObject<unknown>;
      return (
        <div
          data-testid="maplibre-map"
          data-mapstyle={JSON.stringify(mapStyle)}
          data-initialviewstate={JSON.stringify(initialViewState)}
        >
          {children}
        </div>
      );
    },
  ),
  Source: vi.fn(({ id, children }: { id?: string; children?: ReactNode }) => (
    <div data-testid={`source-${id ?? "unknown"}`}>{children}</div>
  )),
  Layer: vi.fn(
    ({ id, paint }: { id?: string; paint?: Record<string, unknown> }) => (
      <div
        data-testid={`layer-${id ?? "unknown"}`}
        data-paint={JSON.stringify(paint)}
      />
    ),
  ),
  Marker: vi.fn(({ children }: { children?: ReactNode }) => (
    <div data-testid="marker">{children}</div>
  )),
}));

vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeFeature(overrides?: Partial<MapFeature>): MapFeature {
  return {
    id: "tc-1-0",
    label: "Paris → Lyon (car, fastest)",
    geometry: {
      type: "LineString",
      coordinates: [
        [2.33, 48.84],
        [2.5, 48.9],
        [4.83, 45.76],
      ],
    },
    bbox: [2.33, 45.76, 4.83, 48.84],
    properties: {
      distance: 461000,
      duration: 8880,
      profile: "car",
      optimization: "fastest",
      portions: [{ start: "2.33,48.84" }],
    },
    ...overrides,
  };
}

/** Wraps MapPanel with a controllable context. */
function MapContextProvider({
  value,
  children,
}: {
  value: MapContextValue;
  children: ReactNode;
}) {
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

function makeContextValue(
  overrides?: Partial<MapContextValue>,
): MapContextValue {
  return {
    itineraries: [],
    selectedFeatureId: null,
    isMapPanelOpen: false,
    toggleMapPanel: vi.fn(),
    selectFeature: vi.fn(),
    ...overrides,
  };
}

// Import after mocks are set up
import { MapPanel } from "../map/MapPanel";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MapPanel", () => {
  beforeEach(() => {
    mockFitBounds.mockClear();
    mockResize.mockClear();
    capturedRef = null;
  });

  it("renders the MapLibre map container", () => {
    render(
      <MapContextProvider value={makeContextValue()}>
        <MapPanel />
      </MapContextProvider>,
    );
    expect(screen.getByTestId("maplibre-map")).toBeInTheDocument();
  });

  it("passes FRANCE_BOUNDS in initialViewState", () => {
    render(
      <MapContextProvider value={makeContextValue()}>
        <MapPanel />
      </MapContextProvider>,
    );
    const map = screen.getByTestId("maplibre-map");
    const viewState = JSON.parse(
      map.getAttribute("data-initialviewstate") ?? "{}",
    ) as { bounds?: unknown };
    expect(viewState.bounds).toEqual([-5.14, 41.33, 9.56, 51.09]);
  });

  it("passes IGN tile URL in mapStyle", () => {
    render(
      <MapContextProvider value={makeContextValue()}>
        <MapPanel />
      </MapContextProvider>,
    );
    const map = screen.getByTestId("maplibre-map");
    const style = JSON.parse(map.getAttribute("data-mapstyle") ?? "{}") as {
      sources?: { "ign-plan"?: { tiles?: string[] } };
    };
    const tileUrl = style.sources?.["ign-plan"]?.tiles?.[0] ?? "";
    expect(tileUrl).toContain("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2");
    expect(tileUrl).toContain("TILEMATRIX={z}");
  });

  it("renders one Source per feature", () => {
    const f1 = makeFeature({ id: "tc-1-0" });
    const f2 = makeFeature({ id: "tc-2-0" });
    render(
      <MapContextProvider value={makeContextValue({ itineraries: [f1, f2] })}>
        <MapPanel />
      </MapContextProvider>,
    );
    expect(screen.getByTestId("source-route-tc-1-0")).toBeInTheDocument();
    expect(screen.getByTestId("source-route-tc-2-0")).toBeInTheDocument();
  });

  it("renders selected feature at full opacity and unselected at 40%", () => {
    const f1 = makeFeature({ id: "tc-1-0" });
    const f2 = makeFeature({ id: "tc-2-0" });
    render(
      <MapContextProvider
        value={makeContextValue({
          itineraries: [f1, f2],
          selectedFeatureId: "tc-1-0",
        })}
      >
        <MapPanel />
      </MapContextProvider>,
    );
    const layer1 = screen.getByTestId("layer-line-tc-1-0");
    const layer2 = screen.getByTestId("layer-line-tc-2-0");
    const paint1 = JSON.parse(layer1.getAttribute("data-paint") ?? "{}") as {
      "line-opacity": number;
      "line-width": number;
    };
    const paint2 = JSON.parse(layer2.getAttribute("data-paint") ?? "{}") as {
      "line-opacity": number;
      "line-width": number;
    };
    expect(paint1["line-opacity"]).toBe(1);
    expect(paint1["line-width"]).toBe(5);
    expect(paint2["line-opacity"]).toBe(0.4);
    expect(paint2["line-width"]).toBe(3);
  });

  it("renders start and end markers for a LineString with no intermediate portions", () => {
    const feature = makeFeature({
      properties: {
        portions: [{ start: "2.33,48.84" }], // single portion = no waypoints
      },
    });
    render(
      <MapContextProvider value={makeContextValue({ itineraries: [feature] })}>
        <MapPanel />
      </MapContextProvider>,
    );
    // 2 markers: start (green) + end (red)
    const markers = screen.getAllByTestId("marker");
    expect(markers).toHaveLength(2);
    expect(markers[0]?.querySelector(".bg-green-500")).not.toBeNull();
    expect(markers[1]?.querySelector(".bg-red-500")).not.toBeNull();
  });

  it("renders intermediate waypoint markers for multi-portion routes", () => {
    const feature = makeFeature({
      geometry: {
        type: "LineString",
        coordinates: [
          [2.0, 48.0],
          [2.5, 48.5],
          [3.0, 49.0],
        ],
      },
      properties: {
        portions: [
          { start: "2.0,48.0" },
          { start: "2.5,48.5" },
          { start: "3.0,49.0" },
        ],
      },
    });
    render(
      <MapContextProvider value={makeContextValue({ itineraries: [feature] })}>
        <MapPanel />
      </MapContextProvider>,
    );
    // 2 start/end + 2 intermediate waypoints (portions[1] and portions[2])
    const markers = screen.getAllByTestId("marker");
    expect(markers).toHaveLength(4);
    const waypoints = markers.filter((m) => m.querySelector(".bg-slate-400"));
    expect(waypoints).toHaveLength(2);
  });

  it("skips invalid portion start coordinates silently", () => {
    const feature = makeFeature({
      properties: {
        portions: [
          { start: "2.0,48.0" },
          { start: "not,a,valid,coord" },
          { start: "3.0,49.0" },
        ],
      },
    });
    render(
      <MapContextProvider value={makeContextValue({ itineraries: [feature] })}>
        <MapPanel />
      </MapContextProvider>,
    );
    // 2 start/end + 1 valid intermediate (portions[2] only)
    const waypoints = screen
      .getAllByTestId("marker")
      .filter((m) => m.querySelector(".bg-slate-400"));
    expect(waypoints).toHaveLength(1);
  });

  it("cycles auto-color palette for 6 features", () => {
    const features = Array.from({ length: 6 }, (_, i) =>
      makeFeature({ id: `tc-${i}-0` }),
    );
    render(
      <MapContextProvider value={makeContextValue({ itineraries: features })}>
        <MapPanel />
      </MapContextProvider>,
    );
    // Feature at index 5 should cycle back to color at index 0: #2196F3
    const layer5 = screen.getByTestId("layer-line-tc-5-0");
    const paint = JSON.parse(layer5.getAttribute("data-paint") ?? "{}") as {
      "line-color": string;
    };
    expect(paint["line-color"]).toBe("#2196F3");
  });

  it("calls fitBounds with France bounds on session reset", () => {
    const f1 = makeFeature();
    const ctx: MapContextValue = makeContextValue({ itineraries: [f1] });

    const { rerender } = render(
      <MapContextProvider value={ctx}>
        <MapPanel />
      </MapContextProvider>,
    );

    // Inject mock ref
    if (capturedRef)
      (capturedRef as React.RefObject<unknown> & { current: unknown }).current =
        mockMapRef;

    act(() => {
      rerender(
        <MapContextProvider value={makeContextValue({ itineraries: [] })}>
          <MapPanel />
        </MapContextProvider>,
      );
    });

    expect(mockFitBounds).toHaveBeenCalledWith(
      [-5.14, 41.33, 9.56, 51.09],
      expect.objectContaining({ padding: 20 }),
    );
  });

  it("calls resize after 310ms when panel opens", () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <MapContextProvider value={makeContextValue({ isMapPanelOpen: false })}>
        <MapPanel />
      </MapContextProvider>,
    );

    if (capturedRef)
      (capturedRef as React.RefObject<unknown> & { current: unknown }).current =
        mockMapRef;

    act(() => {
      rerender(
        <MapContextProvider value={makeContextValue({ isMapPanelOpen: true })}>
          <MapPanel />
        </MapContextProvider>,
      );
    });

    expect(mockResize).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(310);
    });

    expect(mockResize).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
