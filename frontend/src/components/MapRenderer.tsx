import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import Map, { Source, Layer } from "react-map-gl";
import DeckGL from "@deck.gl/react";
import { FlyToInterpolator } from "@deck.gl/core";
import "mapbox-gl/dist/mapbox-gl.css";
import { INITIAL_VIEW_STATE } from "../constants/mapConfig";

interface ZoomTarget {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

interface MapRendererProps {
  mapStyle: string;
  mapboxAccessToken: string;
  deckLayers: any[];
  cursor: string;
  zoomTarget?: ZoomTarget | null;
  onDeckFeatureClick: (info: any, event: any) => void;
  onDeckFeatureHover: (info: any, event: any) => void;
  onViewStateChange?: (viewState: any) => void;
  editableLayer?: any; // Add support for editable layer cursor
  onMouseDown?: (event: any) => void;
  onMouseMove?: (event: any) => void;
  onMouseUp?: (event: any) => void;
  isMovingFeatures?: boolean; // Disable map pan when moving features
}

const MapRenderer: React.FC<MapRendererProps> = memo(
  ({
    mapStyle,
    mapboxAccessToken,
    deckLayers,
    cursor,
    zoomTarget,
    onDeckFeatureClick,
    onDeckFeatureHover,
    onViewStateChange,
    editableLayer,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    isMovingFeatures = false,
  }) => {
    // Store current viewport for mouse handlers
    const currentViewportRef = useRef<any>(null);
    // Store programmatic view state - only used during transitions
    const programmaticViewStateRef = useRef<any>(undefined);
    // Force re-render when we need to update DeckGL's viewState prop
    const [, forceUpdate] = useState({});

    // Memoize controller config to prevent unnecessary re-creation
    const controllerConfig = useMemo(
      () => ({
        doubleClickZoom: false,
        inertia: true,
        dragPan: !isMovingFeatures,
        scrollZoom: true,
        touchRotate: true,
        keyboard: false,
      }),
      [isMovingFeatures]
    );

    // Watch for zoom target changes and imperatively set view state
    useEffect(() => {
      if (!zoomTarget) return;

      // Set programmatic view state with transition
      programmaticViewStateRef.current = {
        ...zoomTarget,
        transitionDuration: 1000,
        transitionInterpolator: new FlyToInterpolator(),
      };
      forceUpdate({}); // Trigger re-render to pass new viewState to DeckGL

      // Clear it after transition completes
      const timer = setTimeout(() => {
        programmaticViewStateRef.current = undefined;
        forceUpdate({}); // Trigger re-render to return to uncontrolled
      }, 1100);

      return () => clearTimeout(timer);
    }, [zoomTarget]);

    // Handle view state changes
    const handleViewStateChange = useCallback((evt: any) => {
      // Store viewport for mouse handlers
      currentViewportRef.current = evt.viewState;

      // Call parent's handler if provided
      if (onViewStateChange) {
        onViewStateChange(evt);
      }
    }, [onViewStateChange]);

    // Wrap mouse handlers to include viewport
    const handleMouseDownWithViewport = (event: React.MouseEvent) => {
      if (onMouseDown) {
        onMouseDown({
          ...event,
          point: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
          viewport: currentViewportRef.current,
        });
      }
    };

    const handleMouseMoveWithViewport = (event: React.MouseEvent) => {
      if (onMouseMove) {
        onMouseMove({
          ...event,
          point: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
          viewport: currentViewportRef.current,
        });
      }
    };

    const handleMouseUpWithViewport = (event: React.MouseEvent) => {
      if (onMouseUp) {
        onMouseUp({
          ...event,
          point: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
          viewport: currentViewportRef.current,
        });
      }
    };

    return (
      <div
        style={{ position: "relative", width: "100%", height: "100%" }}
        onMouseDown={handleMouseDownWithViewport}
        onMouseMove={handleMouseMoveWithViewport}
        onMouseUp={handleMouseUpWithViewport}
      >
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          viewState={programmaticViewStateRef.current}
          onViewStateChange={handleViewStateChange}
          controller={controllerConfig}
          layers={deckLayers}
          getCursor={
            editableLayer
              ? editableLayer.getCursor?.bind(editableLayer)
              : () => cursor
          }
          onClick={onDeckFeatureClick}
          onHover={onDeckFeatureHover}
          style={{ position: "relative", width: "100%", height: "100%" }}
        >
          <Map
            mapboxAccessToken={mapboxAccessToken}
            mapStyle={mapStyle}
            projection={{ name: "mercator" }}
            style={{ width: "100%", height: "100%" }}
            terrain={{ source: "mapbox-dem" }}
          >
            <Source
              id="mapbox-dem"
              type="raster-dem"
              url="mapbox://mapbox.mapbox-terrain-dem-v1"
              tileSize={512}
              maxzoom={14}
            />
            <Layer
              id="sky"
              type="sky"
              paint={{
                "sky-type": "atmosphere",
                "sky-atmosphere-sun": [0.0, 0.0],
                "sky-atmosphere-sun-intensity": 15,
              }}
            />
          </Map>
        </DeckGL>
      </div>
    );
  }
);

MapRenderer.displayName = "MapRenderer";

export default MapRenderer;
