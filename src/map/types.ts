import type { Geometry } from "geojson";

export interface MapFeature {
  id: string; // "${toolCallId}-${idx}" — unique per feature, stable across re-renders
  label: string;
  geometry: Geometry;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  properties?: Record<string, unknown>;
}

export interface ToolResultMapper {
  toolName: string;
  toMapFeatures: (toolResult: unknown) => MapFeature[];
}

export interface MapContextValue {
  itineraries: MapFeature[];
  selectedFeatureId: string | null;
  isMapPanelOpen: boolean;
  toggleMapPanel: () => void;
  selectFeature: (id: string | null) => void;
}
