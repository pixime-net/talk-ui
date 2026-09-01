import { describe, it, expect } from "vitest";
import { routeToolMapper } from "../map/adapters/route-tool-mapper";

const validRoute = {
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

describe("routeToolMapper", () => {
  it("toolName is route", () => {
    expect(routeToolMapper.toolName).toBe("route");
  });

  it("transforms valid output into one MapFeature", () => {
    const features = routeToolMapper.toMapFeatures(validRoute);
    expect(features).toHaveLength(1);
    expect(features[0]?.bbox).toEqual([2.33, 48.84, 2.37, 48.86]);
    expect(features[0]?.geometry).toMatchObject({ type: "LineString" });
    expect(features[0]?.properties?.distance).toBe(1234.5);
    expect(features[0]?.properties?.profile).toBe("car");
  });

  it("builds label from startLabel and endLabel when present", () => {
    const features = routeToolMapper.toMapFeatures({
      ...validRoute,
      startLabel: "Paris",
      endLabel: "Lyon",
    });
    expect(features[0]?.label).toBe("Paris → Lyon (car, fastest)");
  });

  it("falls back to coordinate strings when labels absent", () => {
    const features = routeToolMapper.toMapFeatures(validRoute);
    expect(features[0]?.label).toMatch(/^2\.337306,48\.849319/);
    expect(features[0]?.label).toContain("2.367776,48.852891");
  });

  it("handles stringified JSON content", () => {
    const features = routeToolMapper.toMapFeatures(JSON.stringify(validRoute));
    expect(features).toHaveLength(1);
    expect(features[0]?.label).toContain("car, fastest");
  });

  it("returns [] for null content", () => {
    expect(routeToolMapper.toMapFeatures(null)).toEqual([]);
  });

  it("returns [] for malformed JSON string", () => {
    expect(routeToolMapper.toMapFeatures("{bad json")).toEqual([]);
  });

  it("returns [] for object missing required fields", () => {
    expect(routeToolMapper.toMapFeatures({ foo: "bar" })).toEqual([]);
  });
});
