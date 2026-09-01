import { createContext, useContext } from "react";
import type { MapContextValue } from "./types";

export const MapContext = createContext<MapContextValue | null>(null);

export function useMapContext(): MapContextValue {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapContext must be used within a MapProvider");
  }
  return context;
}
