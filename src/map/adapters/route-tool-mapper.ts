import { z } from "zod/v4";
import type { Geometry } from "geojson";
import type { MapFeature, ToolResultMapper } from "../types";

const routeToolOutputSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  profile: z.string().optional(),
  optimization: z.string().optional(),
  distance: z.number().optional(),
  duration: z.number().optional(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  geometry: z.object({
    type: z.string().optional(),
    coordinates: z.array(z.array(z.number())),
  }),
  portions: z.array(z.unknown()).optional(),
  startLabel: z.string().optional(),
  endLabel: z.string().optional(),
});

function toMapFeatures(toolResult: unknown): MapFeature[] {
  let candidate: unknown = toolResult;
  if (typeof toolResult === "string") {
    try {
      candidate = JSON.parse(toolResult) as unknown;
    } catch {
      return [];
    }
  }

  const result = routeToolOutputSchema.safeParse(candidate);
  if (!result.success) return [];

  const data = result.data;
  const from = data.startLabel ?? data.start ?? "origin";
  const to = data.endLabel ?? data.end ?? "destination";
  const profile = data.profile ?? "car";
  const optimization = data.optimization ?? "fastest";
  const geometryType = data.geometry.type?.trim() || "LineString";
  const label = `${from} → ${to} (${profile}, ${optimization})`;

  return [
    {
      id: "", // MapProvider overrides this with toolCallId
      label,
      geometry: {
        type: geometryType,
        coordinates: data.geometry.coordinates,
      } as unknown as Geometry,
      bbox: data.bbox,
      properties: {
        ...(data.distance !== undefined && { distance: data.distance }),
        ...(data.duration !== undefined && { duration: data.duration }),
        profile,
        optimization,
        portions: data.portions ?? [],
      },
    },
  ];
}

export const routeToolMapper: ToolResultMapper = {
  toolName: "route",
  toMapFeatures,
};
