import "maplibre-gl/dist/maplibre-gl.css";
import { Fragment, useEffect, useRef } from "react";
import { Layer, Map, Marker, Source } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { z } from "zod/v4";
import { useMapContext } from "./map-context";

const ROUTE_COLORS = [
  "#2196F3",
  "#FF5722",
  "#4CAF50",
  "#9C27B0",
  "#FF9800",
] as const;

const IGN_TILE_URL =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png" +
  "&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

// Metropolitan France [minLon, minLat, maxLon, maxLat]
const FRANCE_BOUNDS: [number, number, number, number] = [
  -5.14, 41.33, 9.56, 51.09,
];

const MAP_STYLE = {
  version: 8 as const,
  sources: {
    "ign-plan": {
      type: "raster" as const,
      tiles: [IGN_TILE_URL],
      tileSize: 256,
      maxzoom: 18,
      attribution: "© IGN",
    },
  },
  layers: [
    { id: "ign-plan-layer", type: "raster" as const, source: "ign-plan" },
  ],
};

const portionStartSchema = z.object({ start: z.string() });

function parseWaypoints(portions: unknown[]): [number, number][] {
  return portions.slice(1).flatMap((p) => {
    const r = portionStartSchema.safeParse(p);
    if (!r.success) return [];
    const parts = r.data.start.split(",");
    if (parts.length < 2) return [];
    const lon = Number.parseFloat(parts[0] ?? "");
    const lat = Number.parseFloat(parts[1] ?? "");
    return Number.isNaN(lon) || Number.isNaN(lat)
      ? []
      : [[lon, lat] as [number, number]];
  });
}

export function MapPanel() {
  const { itineraries, selectedFeatureId, isMapPanelOpen } = useMapContext();
  const mapRef = useRef<MapRef>(null);
  const prevCountRef = useRef(0);

  // Auto-fit on new feature; reset to France on session clear
  useEffect(() => {
    const current = itineraries.length;
    if (current > prevCountRef.current && current > 0) {
      const newest = itineraries[current - 1];
      if (newest) {
        mapRef.current?.fitBounds(newest.bbox, { padding: 40, duration: 500 });
      }
    } else if (current === 0 && prevCountRef.current > 0) {
      mapRef.current?.fitBounds(FRANCE_BOUNDS, {
        padding: 20,
        duration: 500,
      });
    }
    prevCountRef.current = current;
  }, [itineraries]);

  // Fit to selected feature when selection changes
  useEffect(() => {
    if (!selectedFeatureId) return;
    const feature = itineraries.find((f) => f.id === selectedFeatureId);
    if (feature) {
      mapRef.current?.fitBounds(feature.bbox, { padding: 40, duration: 500 });
    }
  }, [selectedFeatureId, itineraries]);

  // Resize after CSS transition completes when panel opens
  useEffect(() => {
    if (!isMapPanelOpen) return;
    const tid = window.setTimeout(() => {
      mapRef.current?.resize();
    }, 310);
    return () => {
      window.clearTimeout(tid);
    };
  }, [isMapPanelOpen]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        bounds: FRANCE_BOUNDS,
        fitBoundsOptions: { padding: 20 },
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_STYLE}
    >
      {itineraries.map((feature, idx) => {
        if (feature.geometry.type !== "LineString") return null;
        const coordinates = feature.geometry.coordinates;
        const isSelected = feature.id === selectedFeatureId;
        // fallback keeps type as string (noUncheckedIndexedAccess)
        const color: string =
          ROUTE_COLORS[idx % ROUTE_COLORS.length] ?? "#2196F3";
        const portions = Array.isArray(feature.properties?.portions)
          ? (feature.properties.portions as unknown[])
          : [];
        const waypoints = parseWaypoints(portions);
        const startCoord = coordinates[0];
        const endCoord = coordinates.at(-1);
        const startLon = startCoord?.[0];
        const startLat = startCoord?.[1];
        const endLon = endCoord?.[0];
        const endLat = endCoord?.[1];

        return (
          <Fragment key={feature.id}>
            <Source
              id={`route-${feature.id}`}
              type="geojson"
              data={{
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    geometry: feature.geometry,
                    properties: {},
                  },
                ],
              }}
            >
              <Layer
                id={`line-${feature.id}`}
                type="line"
                paint={{
                  "line-color": color,
                  "line-width": isSelected ? 12 : 8,
                  "line-opacity": isSelected ? 1 : 0.8,
                }}
                layout={{ "line-cap": "round", "line-join": "round" }}
              />
            </Source>

            {startLon !== undefined && startLat !== undefined && (
              <Marker longitude={startLon} latitude={startLat}>
                <div className="h-4 w-4 rounded-full border-2 border-white bg-green-500 shadow" />
              </Marker>
            )}

            {endLon !== undefined &&
              endLat !== undefined &&
              coordinates.length > 1 && (
                <Marker longitude={endLon} latitude={endLat}>
                  <div className="h-4 w-4 rounded-full border-2 border-white bg-red-500 shadow" />
                </Marker>
              )}

            {waypoints.map((wp) => (
              <Marker
                key={`${wp[0]},${wp[1]}`}
                longitude={wp[0]}
                latitude={wp[1]}
              >
                <div className="h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400 shadow" />
              </Marker>
            ))}
          </Fragment>
        );
      })}
    </Map>
  );
}
