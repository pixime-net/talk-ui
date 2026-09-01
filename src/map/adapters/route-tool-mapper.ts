import { z } from "zod/v4";
import type { Geometry } from "geojson";
import type { MapFeature, ToolResultMapper } from "../types";

const routeToolOutputSchema = z.object({
  start: z.string(),
  end: z.string(),
  profile: z.string(),
  optimization: z.string(),
  distance: z.number(),
  duration: z.number(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  geometry: z.object({
    type: z.string(),
    coordinates: z.array(z.array(z.number())),
  }),
  portions: z.array(z.unknown()),
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
  const from = data.startLabel ?? data.start;
  const to = data.endLabel ?? data.end;
  const label = `${from} → ${to} (${data.profile}, ${data.optimization})`;

  return [
    {
      id: "", // MapProvider overrides this with toolCallId
      label,
      geometry: data.geometry as unknown as Geometry,
      bbox: data.bbox,
      properties: {
        distance: data.distance,
        duration: data.duration,
        profile: data.profile,
        optimization: data.optimization,
        portions: data.portions,
      },
    },
  ];
}

export const routeToolMapper: ToolResultMapper = {
  toolName: "route",
  toMapFeatures,
};
