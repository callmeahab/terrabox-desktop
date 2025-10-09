import React, { memo, useState, useEffect } from "react";
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
  }) => {
    const [viewState, setViewState] = useState<any>(INITIAL_VIEW_STATE);

    // Watch for zoom target changes
    useEffect(() => {
      if (!zoomTarget) return;

      // Trigger a transition
      setViewState({
        ...zoomTarget,
        transitionDuration: 1000,
        transitionInterpolator: new FlyToInterpolator(),
      });
    }, [zoomTarget]);

    // Handle view state changes from user interaction
    const handleViewStateChange = (evt: any) => {
      setViewState(evt.viewState);
      // Also call the parent's handler if provided
      if (onViewStateChange) {
        onViewStateChange(evt);
      }
    };

    // Wrap mouse handlers to include viewport
    const handleMouseDownWithViewport = (event: React.MouseEvent) => {
      if (onMouseDown) {
        onMouseDown({
          ...event,
          point: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
          viewport: viewState,
        });
      }
    };

    const handleMouseMoveWithViewport = (event: React.MouseEvent) => {
      if (onMouseMove) {
        onMouseMove({
          ...event,
          point: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
          viewport: viewState,
        });
      }
    };

    const handleMouseUpWithViewport = (event: React.MouseEvent) => {
      if (onMouseUp) {
        // Create a viewport object with unproject method
        const viewport = {
          unproject: (coords: [number, number]) => {
            // Simple mercator unprojection
            const { longitude, latitude, zoom } = viewState;
            const scale = Math.pow(2, zoom);
            const worldSize = 512 * scale;

            // Get container dimensions
            const container = (
              event.target as HTMLElement
            ).getBoundingClientRect();
            const centerX = container.width / 2;
            const centerY = container.height / 2;

            // Convert screen to world coordinates
            const worldX = (coords[0] - centerX) / worldSize;
            const worldY = (coords[1] - centerY) / worldSize;

            // Convert world to lng/lat
            const lng = longitude + worldX * 360;
            const lat =
              latitude -
              (Math.atan(Math.sinh(Math.PI * (1 - 2 * worldY))) * 180) /
                Math.PI;

            return [lng, lat];
          },
        };

        onMouseUp({
          ...event,
          point: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
          viewport,
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
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={{
            doubleClickZoom: false, // Disable double-click zoom for editing
            inertia: true,
          }}
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
            projection={{ name: "globe" }}
            style={{ width: "100%", height: "100%" }}
            terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
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
