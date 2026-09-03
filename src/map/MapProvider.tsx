import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import {
  parseAguiMessage,
  type ToolCallContainer,
  type ToolResult,
} from "../config/agui-schemas";
import { MapContext } from "./map-context";
import type { MapContextValue, MapFeature, ToolResultMapper } from "./types";

interface PendingToolCall {
  id?: string;
  name: string;
}

/** Separator used by the backend to namespace a tool with its MCP server name. */
const SERVER_PREFIX_SEPARATOR = "__";

function stripServerPrefix(toolName: string): string {
  const idx = toolName.indexOf(SERVER_PREFIX_SEPARATOR);
  if (idx === -1) return toolName;
  return toolName.slice(idx + SERVER_PREFIX_SEPARATOR.length);
}

function registerPendingToolCalls(
  parsed: ToolCallContainer,
  pendingCalls: PendingToolCall[],
): void {
  for (const tc of parsed.toolCalls) {
    pendingCalls.push({
      ...(tc.id ? { id: tc.id } : {}),
      name: tc.function.name,
    });
  }
}

function takeMatchingPendingCall(
  pendingCalls: PendingToolCall[],
  toolCallId: string | undefined,
): PendingToolCall | undefined {
  const idx =
    toolCallId !== undefined
      ? pendingCalls.findIndex((c) => c.id === toolCallId)
      : 0;
  if (idx < 0 || idx >= pendingCalls.length) return undefined;
  return pendingCalls.splice(idx, 1)[0];
}

function findMapperForTool(
  toolName: string,
  mappers: ToolResultMapper[],
): ToolResultMapper | undefined {
  const normalizedName = stripServerPrefix(toolName).toLowerCase();
  return mappers.find((m) => normalizedName === m.toolName.toLowerCase());
}

function featuresFromToolResult(
  parsed: ToolResult,
  resultSeq: number,
  pendingCalls: PendingToolCall[],
  mappers: ToolResultMapper[],
): MapFeature[] {
  const { toolCallId, content } = parsed;
  const toolName = takeMatchingPendingCall(pendingCalls, toolCallId)?.name;
  if (!toolName) return [];

  const mapper = findMapperForTool(toolName, mappers);
  if (!mapper) return [];

  const featurePrefix = toolCallId ?? `tool-result-${resultSeq}`;
  return mapper
    .toMapFeatures(content)
    .map((f, idx) => ({ ...f, id: `${featurePrefix}-${idx}` }));
}

function extractFeatures(
  messages: unknown[],
  mappers: ToolResultMapper[],
): MapFeature[] {
  const features: MapFeature[] = [];
  const pendingCalls: PendingToolCall[] = [];
  let resultSeq = 0;

  for (const msg of messages) {
    const parsed = parseAguiMessage(msg);
    if (!parsed) continue;

    if (parsed.kind === "tool-call-container") {
      registerPendingToolCalls(parsed, pendingCalls);
      continue;
    }

    if (parsed.kind !== "tool-result") continue;

    resultSeq++;
    features.push(
      ...featuresFromToolResult(parsed, resultSeq, pendingCalls, mappers),
    );
  }
  return features;
}

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
    return extractFeatures(agent.messages, mappers);
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
