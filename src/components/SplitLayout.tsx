import type { ReactNode } from "react";

interface SplitLayoutProps {
  mapPanelOpen: boolean;
  mapPanel: ReactNode;
  onToggleMap?: () => void;
  children: ReactNode;
}

export function SplitLayout({
  mapPanelOpen,
  mapPanel,
  onToggleMap,
  children,
}: Readonly<SplitLayoutProps>) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="relative flex-1 min-w-0 overflow-hidden">
        {children}
        {onToggleMap !== undefined && (
          <button
            type="button"
            aria-label={mapPanelOpen ? "Close map panel" : "Open map panel"}
            className="absolute right-2 top-2 z-10 rounded border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-muted hover:text-foreground"
            onClick={onToggleMap}
          >
            {mapPanelOpen ? "Hide map" : "Show map"}
          </button>
        )}
      </div>
      <div
        aria-hidden={!mapPanelOpen || undefined}
        className={`min-w-0 overflow-hidden transition-[width] duration-300 ease-in-out ${mapPanelOpen ? "w-1/2 border-l border-white/10" : "w-0"}`}
      >
        {mapPanel}
      </div>
    </div>
  );
}
