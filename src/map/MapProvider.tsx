import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { parseAguiMessage } from "../config/agui-schemas";
import { MapContext } from "./map-context";
import type { MapContextValue, MapFeature, ToolResultMapper } from "./types";

interface MapProviderProps {
  mappers: ToolResultMapper[];
  children: ReactNode;
}

export function MapProvider({ mappers, children }: Readonly<MapProviderProps>) {
  const { agent } = useAgent();
  const [isMapPanelOpen, setIsMapPanelOpen] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null,
  );

  const itineraries = useMemo<MapFeature[]>(() => {
    const toolCallNames = new Map<string, string>();
    for (const msg of agent.messages) {
      const parsed = parseAguiMessage(msg);
      if (parsed?.kind !== "tool-call-container") continue;
      for (const tc of parsed.toolCalls) {
        if (tc.id) toolCallNames.set(tc.id, tc.function.name);
      }
    }

    const features: MapFeature[] = [];
    for (const msg of agent.messages) {
      const parsed = parseAguiMessage(msg);
      if (parsed?.kind !== "tool-result") continue;
      const toolCallId = parsed.toolCallId;
      if (!toolCallId) continue;
      const toolName = toolCallNames.get(toolCallId);
      if (!toolName) continue;
      const mapper = mappers.find((m) => m.toolName === toolName);
      if (!mapper) continue;
      const extracted = mapper.toMapFeatures(parsed.content);
      features.push(
        ...extracted.map((f, idx) => ({
          ...f,
          id: `${toolCallId}-${idx}`,
        })),
      );
    }
    return features;
  }, [agent.messages, mappers]);

  useEffect(() => {
    // Closing on session clear is tied to message stream reset, not itinerary count.
    if (agent.messages.length === 0) {
      const timeoutId = window.setTimeout(() => {
        setIsMapPanelOpen(false);
        setSelectedFeatureId(null);
      }, 0);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }
    return undefined;
  }, [agent.messages.length]);

  const prevCountRef = useRef(0);
  useEffect(() => {
    const prev = prevCountRef.current;
    const next = itineraries.length;
    if (next > prev) {
      setIsMapPanelOpen(true);
    }
    prevCountRef.current = next;
  }, [itineraries.length]);

  const toggleMapPanel = useCallback(() => {
    setIsMapPanelOpen((v) => !v);
  }, []);

  const selectFeature = useCallback((id: string | null) => {
    setSelectedFeatureId(id);
  }, []);

  const value = useMemo<MapContextValue>(
    () => ({
      itineraries,
      selectedFeatureId,
      isMapPanelOpen,
      toggleMapPanel,
      selectFeature,
    }),
    [
      itineraries,
      selectedFeatureId,
      isMapPanelOpen,
      toggleMapPanel,
      selectFeature,
    ],
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}
