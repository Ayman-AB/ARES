"use client";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import {
  MARS_RADIUS_M,
  MARS_TREK_WMTS,
  MARS_VIKING_LAYER_ID,
  discoverMarsTrekLayerConfig,
} from "../../config/mars-map";
import {
  fetchMarsRegions,
  findMarsRegionAt,
  type MarsRegion,
  type MarsRegionSelection,
} from "../../data/mars-regions";

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

export default function MarsGlobe({
  onRegionSelect,
}: {
  onRegionSelect: (region: MarsRegionSelection) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Loading NASA Mars imagery…");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let inputHandler: Cesium.ScreenSpaceEventHandler | null = null;

    const initialize = async () => {
      try {
        setStatus("loading");
        setMessage("Reading NASA Mars Trek WMTS capabilities…");

        if (!window.CESIUM_BASE_URL) {
          window.CESIUM_BASE_URL = "/cesium/";
        }

        const config = await discoverMarsTrekLayerConfig(MARS_VIKING_LAYER_ID);

        if (cancelled || !containerRef.current) return;

        const marsEllipsoid = new Cesium.Ellipsoid(MARS_RADIUS_M, MARS_RADIUS_M, MARS_RADIUS_M);

        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          shouldAnimate: false,
          creditContainer: undefined,
          contextOptions: {
            webgl: {
              alpha: false,
              antialias: true,
            },
          },
        });

        viewerRef.current = viewer;

        const globe = new Cesium.Globe(marsEllipsoid);
        globe.showGroundAtmosphere = false;
        globe.enableLighting = false;
        globe.baseColor = Cesium.Color.fromCssColorString("#1b2a35");
        viewer.scene.globe = globe;
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#020b12");

        const imageryProvider = new Cesium.WebMapTileServiceImageryProvider({
          url: config.tileUrlTemplate,
          layer: config.layer,
          style: config.style,
          format: config.format,
          tileMatrixSetID: config.tileMatrixSetID,
          tileMatrixLabels: config.tileMatrixLabels,
          maximumLevel: config.tileMatrixLabels.length - 1,
          minimumLevel: 0,
          tilingScheme: new Cesium.GeographicTilingScheme({
            ellipsoid: marsEllipsoid,
            numberOfLevelZeroTilesX: 2,
            numberOfLevelZeroTilesY: 1,
          }),
          ellipsoid: marsEllipsoid,
          credit: MARS_TREK_WMTS.attribution,
        });

        imageryProvider.errorEvent.addEventListener((error) => {
          if (cancelled) return;
          setStatus("error");
          setMessage(`NASA Mars imagery request failed: ${error.message}`);
        });

        viewer.imageryLayers.addImageryProvider(imageryProvider);

        viewer.camera.setView({
          destination: new Cesium.Cartesian3(0, -MARS_RADIUS_M * 2.8, MARS_RADIUS_M * 1.15),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-90),
            roll: 0,
          },
        });

        const baseOutline = Cesium.Color.fromCssColorString("#fed7aa").withAlpha(0.72);
        const hoverOutline = Cesium.Color.fromCssColorString("#fff7ed");

        const regions = await fetchMarsRegions();
        if (cancelled) return;

        const displayRegions = regions.map((region) => {
          const boundaryEntities: Cesium.Entity[] = [];
          region.polygons.forEach((polygon, polygonIndex) => {
            polygon.forEach((ring, ringIndex) => {
              const coordinates = ring.flatMap(([longitude, latitude]) => [longitude, latitude]);
              boundaryEntities.push(
                viewer.entities.add({
                  id: `mars-region-${region.id}-${polygonIndex}-${ringIndex}`,
                  name: region.title,
                  polyline: {
                    positions: Cesium.Cartesian3.fromDegreesArray(coordinates),
                    width: 1.5,
                    material: baseOutline,
                    arcType: Cesium.ArcType.GEODESIC,
                  },
                }),
              );
            });
          });
          return { ...region, boundaryEntities };
        });

        const coordinatesAt = (position: Cesium.Cartesian2): [number, number] | undefined => {
          const point = viewer.camera.pickEllipsoid(position, marsEllipsoid);
          if (!point) return undefined;
          const cartographic = Cesium.Cartographic.fromCartesian(point, marsEllipsoid);
          return [
            Cesium.Math.toDegrees(cartographic.longitude),
            Cesium.Math.toDegrees(cartographic.latitude),
          ];
        };
        const regionAt = (position: Cesium.Cartesian2) => {
          const coordinates = coordinatesAt(position);
          return coordinates
            ? findMarsRegionAt(regions, coordinates[0], coordinates[1])
            : undefined;
        };
        const styleRegion = (region: MarsRegion | undefined, highlighted: boolean) => {
          if (!region) return;
          const displayRegion = displayRegions.find((candidate) => candidate.id === region.id);
          if (!displayRegion) return;
          const color = highlighted ? hoverOutline : baseOutline;
          displayRegion.boundaryEntities.forEach((entity) => {
            if (!entity.polyline) return;
            entity.polyline.material = new Cesium.ColorMaterialProperty(color);
            entity.polyline.width = new Cesium.ConstantProperty(highlighted ? 3 : 1.5);
          });
        };
        let hoveredRegion: MarsRegion | undefined;

        inputHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        inputHandler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
          const nextRegion = regionAt(movement.endPosition);
          if (hoveredRegion !== nextRegion) {
            styleRegion(hoveredRegion, false);
            styleRegion(nextRegion, true);
            hoveredRegion = nextRegion;
          }

          const name = nextRegion?.title ?? null;
          setHoveredRegion((current) => (current === name ? current : name));
          viewer.scene.canvas.style.cursor = nextRegion ? "pointer" : "";
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        inputHandler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
          const coordinates = coordinatesAt(click.position);
          if (!coordinates) return;
          const region = findMarsRegionAt(regions, coordinates[0], coordinates[1]);
          if (region) {
            onRegionSelect({ id: region.id, title: region.title, center: coordinates });
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        viewer.scene.requestRender();

        setStatus("ready");
        setMessage("Hover over a region, then click to explore it");
      } catch (error) {
        if (cancelled) return;
        const errorMessage =
          error instanceof TypeError
            ? "Could not reach NASA Mars Trek. Check the network connection and NASA service availability."
            : error instanceof Error
              ? error.message
              : "Unknown Mars imagery error";
        setStatus("error");
        setMessage(errorMessage);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      inputHandler?.destroy();
      if (viewerRef.current) {
        viewerRef.current.scene.canvas.style.cursor = "";
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [onRegionSelect]);

  return (
    <div className="relative min-h-[420px] w-full flex-1 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
      <div ref={containerRef} className="h-full w-full" aria-label="3D Mars globe" />

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
          <div className="rounded-full border border-sky-400/40 bg-slate-950/85 px-3 py-1 text-xs font-medium tracking-wide text-sky-200 shadow-lg backdrop-blur-sm">
            {message}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
          <div className="max-w-lg rounded-md border border-red-500/40 bg-slate-950/90 px-3 py-2 text-center text-xs text-red-100 shadow-lg backdrop-blur-sm">
            {message}
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md border border-slate-600/60 bg-slate-950/80 px-2 py-1 text-xs text-slate-200 shadow backdrop-blur-sm">
          {hoveredRegion ? `${hoveredRegion} · click to explore` : message}
        </div>
      )}
    </div>
  );
}
