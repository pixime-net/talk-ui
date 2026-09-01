import { lazy, Suspense } from "react";
import { ChatView } from "./components/ChatView";
import { ChatUIProvider } from "./context/ChatUIContext";
import { SplitLayout } from "./components/SplitLayout";
import { MapProvider } from "./map/MapProvider";
import { useMapContext } from "./map/map-context";
import { routeToolMapper } from "./map/adapters/route-tool-mapper";
import type { ToolResultMapper } from "./map/types";

const MAP_MAPPERS: ToolResultMapper[] = [routeToolMapper];

const LazyMapPanel = lazy(() =>
  import("./map/MapPanel").then((m) => ({ default: m.MapPanel })),
);

function AppLayout() {
  const { isMapPanelOpen, toggleMapPanel } = useMapContext();
  return (
    <ChatUIProvider>
      <SplitLayout
        mapPanelOpen={isMapPanelOpen}
        onToggleMap={toggleMapPanel}
        mapPanel={
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Chargement…
              </div>
            }
          >
            <LazyMapPanel />
          </Suspense>
        }
      >
        <ChatView />
      </SplitLayout>
    </ChatUIProvider>
  );
}

export function App() {
  return (
    <MapProvider mappers={MAP_MAPPERS}>
      <AppLayout />
    </MapProvider>
  );
}
