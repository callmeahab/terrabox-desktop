import { useMemo } from "react";
import { GeoJsonLayer } from "@deck.gl/layers";
import { EditableGeoJsonLayer } from "@deck.gl-community/editable-layers";
import {
  ModifyMode,
  DrawPolygonMode,
  DrawPointMode,
  DrawLineStringMode,
  DrawRectangleMode,
  DrawCircleFromCenterMode,
  ViewMode,
  TransformMode,
  ScaleMode,
  TranslateMode,
  RotateMode,
} from "@deck.gl-community/editable-layers";
import { IVectorLayer } from "../types/interfaces";

interface UseDeckLayersProps {
  layers: IVectorLayer[];
  layerVisibility: Record<string, boolean>;
  selectedDeckFeature: any;
  hoveredDeckFeature: any;
  editMode: string;
  editableLayerId: string | null;
  selectedEditFeatureIndexes: number[];
  onEditEvent: (info: any, layer: IVectorLayer) => void;
  layerUpdateCounter: number;
}

const getEditModeClass = (editMode: string) => {
  switch (editMode) {
    case "modify":
      return ModifyMode;
    case "drawPolygon":
      return DrawPolygonMode;
    case "drawPoint":
      return DrawPointMode;
    case "drawLine":
      return DrawLineStringMode;
    case "drawRectangle":
      return DrawRectangleMode;
    case "drawCircle":
      return DrawCircleFromCenterMode;
    case "transform":
      return TransformMode;
    case "scale":
      return ScaleMode;
    case "translate":
      return TranslateMode;
    case "rotate":
      return RotateMode;
    default:
      return ViewMode;
  }
};

export const useDeckLayers = ({
  layers,
  layerVisibility,
  selectedDeckFeature,
  hoveredDeckFeature,
  editMode,
  editableLayerId,
  selectedEditFeatureIndexes,
  onEditEvent,
  layerUpdateCounter,
}: UseDeckLayersProps) => {
  return useMemo(() => {
    const allLayers: any[] = [];
    let currentEditableLayer: any = null;
    const visibleLayers = layers.filter(
      (layer) => layerVisibility[layer.id] !== false
    );

    visibleLayers.forEach((layer, index) => {
      const baseColor = layer.color || [33, 150, 243];

      // Check if this layer is in edit mode
      const isEditableLayer =
        editableLayerId === layer.id && editMode !== "view";

      if (isEditableLayer) {
        console.log(
          `🎯 Layer ${layer.id} is in edit mode, creating both regular and EditableGeoJsonLayer`
        );
        // Create an editable layer
        // Get the most current data from layers state
        const currentLayer = layers.find(l => l.id === layer.id);
        let geoJsonData =
          currentLayer?.data?.type === "FeatureCollection"
            ? currentLayer.data
            : ({ type: "FeatureCollection", features: [] } as any);

        console.log(`🔄 Using current layer data for ${layer.id}, features: ${geoJsonData.features?.length || 0}`);

        // More robust coordinate validation and cleaning
        if (geoJsonData.features) {
          geoJsonData = {
            ...geoJsonData,
            features: geoJsonData.features.filter((feature: any) => {
              if (!feature.geometry || !feature.geometry.coordinates) {
                return false;
              }

              // Clean and validate coordinates recursively
              const cleanCoordinates = (coords: any, type: string): any => {
                if (!Array.isArray(coords)) return null;

                switch (type) {
                  case "Point":
                    if (coords.length >= 2 &&
                        typeof coords[0] === "number" &&
                        typeof coords[1] === "number" &&
                        !isNaN(coords[0]) && !isNaN(coords[1])) {
                      return [coords[0], coords[1]];
                    }
                    return null;
                  case "LineString":
                    const cleanLine = coords.map((coord: any) => {
                      if (Array.isArray(coord) && coord.length >= 2 &&
                          typeof coord[0] === "number" && typeof coord[1] === "number" &&
                          !isNaN(coord[0]) && !isNaN(coord[1])) {
                        return [coord[0], coord[1]];
                      }
                      return null;
                    }).filter(c => c !== null);
                    return cleanLine.length >= 2 ? cleanLine : null;
                  case "Polygon":
                    const cleanRings = coords.map((ring: any) => {
                      if (!Array.isArray(ring)) return null;
                      const cleanRing = ring.map((coord: any) => {
                        if (Array.isArray(coord) && coord.length >= 2 &&
                            typeof coord[0] === "number" && typeof coord[1] === "number" &&
                            !isNaN(coord[0]) && !isNaN(coord[1])) {
                          return [coord[0], coord[1]];
                        }
                        return null;
                      }).filter(c => c !== null);
                      return cleanRing.length >= 4 ? cleanRing : null;
                    }).filter(r => r !== null);
                    return cleanRings.length >= 1 ? cleanRings : null;
                  default:
                    return coords; // Pass through complex geometries
                }
              };

              const cleanedCoords = cleanCoordinates(feature.geometry.coordinates, feature.geometry.type);
              if (cleanedCoords) {
                feature.geometry.coordinates = cleanedCoords;
                return true;
              }
              return false;
            }),
          };
        }

        console.log(
          `Creating editable layer for: ${
            layer.id
          }, mode: ${editMode}, features: ${geoJsonData.features?.length || 0}`,
          "selectedIndexes:",
          selectedEditFeatureIndexes
        );

        const editableLayer = new EditableGeoJsonLayer({
          id: `${layer.id}-editable`,
          data: geoJsonData,
          mode: getEditModeClass(editMode),
          selectedFeatureIndexes: selectedEditFeatureIndexes,

          onEdit: ({ updatedData, editType, editContext }: any) => {
            console.log(
              "🔧 EditableGeoJsonLayer onEdit triggered:",
              editType,
              editContext
            );
            onEditEvent({ updatedData, editType, editContext }, layer);
          },

          // Enhanced styling for EditableGeoJsonLayer with better highlights
          getFillColor: (feature: any, { object, index }: any) => {
            // Check if this feature is selected
            const isSelected = selectedEditFeatureIndexes.includes(index);

            if (isSelected) {
              return [255, 215, 0, 180] as [number, number, number, number]; // Gold for selected
            }

            // For points, use bright blue
            if (feature.geometry?.type === "Point") {
              return [33, 150, 243, 160] as [number, number, number, number]; // Bright blue points
            }
            // LineString geometries should not have fill color (they only have stroke)
            if (feature.geometry?.type === "LineString") {
              return [0, 0, 0, 0] as [number, number, number, number]; // Transparent fill for lines
            }
            // For Polygon and MultiPolygon, use bright green
            return [52, 168, 83, 120] as [number, number, number, number]; // Bright green fills for polygons
          },

          getLineColor: (feature: any, { object, index }: any) => {
            // Check if this feature is selected
            const isSelected = selectedEditFeatureIndexes.includes(index);

            if (isSelected) {
              return [255, 215, 0, 255] as [number, number, number, number]; // Gold outline for selected
            }

            // For points, use white outline for maximum contrast
            if (feature.geometry?.type === "Point") {
              return [255, 255, 255, 255] as [number, number, number, number]; // White outline for points
            }
            // For LineString geometries, use bright orange
            if (feature.geometry?.type === "LineString") {
              return [33, 150, 243, 255] as [number, number, number, number]; // Blue for lines in edit mode
            }
            // Use white borders for better visibility during editing
            return [255, 255, 255, 255] as [number, number, number, number]; // White borders for editing
          },

          getLineWidth: (feature: any, { object, index }: any) => {
            // Check if this feature is selected
            const isSelected = selectedEditFeatureIndexes.includes(index);

            if (isSelected) {
              return 4; // Thicker line for selected features
            }

            if (feature.geometry?.type === "Point") {
              return 3; // Outline for points
            }
            if (feature.geometry?.type === "LineString") {
              return 4; // Thicker lines for LineString features
            }
            return 2; // Border width for polygons
          },

          getPointRadius: (feature: any, { object, index }: any) => {
            // Check if this feature is selected
            const isSelected = selectedEditFeatureIndexes.includes(index);

            if (isSelected) {
              return 12; // Larger radius for selected points
            }

            return 8; // Default point size
          },

          filled: true,
          stroked: true,
          pickable: true,
          autoHighlight: true,

          // Update triggers for selection highlighting
          updateTriggers: {
            getFillColor: [selectedEditFeatureIndexes],
            getLineColor: [selectedEditFeatureIndexes],
            getLineWidth: [selectedEditFeatureIndexes],
            getPointRadius: [selectedEditFeatureIndexes],
          },
        });

        // Also create a regular layer underneath for persistent visual state
        const backgroundLayer = new GeoJsonLayer({
          id: `${layer.id}-background`,
          data: geoJsonData,
          filled: true,
          stroked: true,
          extruded: false,

          getFillColor: (feature: any) => {
            // For points, use bright blue
            if (feature.geometry?.type === "Point") {
              return [33, 150, 243, 200] as [number, number, number, number]; // Bright blue points
            }
            // LineString geometries should not have fill color (they only have stroke)
            if (feature.geometry?.type === "LineString") {
              return [0, 0, 0, 0] as [number, number, number, number]; // Transparent fill for lines
            }
            // For Polygon and MultiPolygon, use bright green with transparency
            return [52, 168, 83, 150] as [number, number, number, number]; // Bright green fills for polygons
          },

          getLineColor: (feature: any) => {
            // For points, use white outline for maximum contrast
            if (feature.geometry?.type === "Point") {
              return [255, 255, 255, 255] as [number, number, number, number]; // White outline for points
            }
            // For LineString geometries, use bright orange
            if (feature.geometry?.type === "LineString") {
              return [255, 140, 0, 255] as [number, number, number, number]; // Bright orange for lines
            }
            // Use dark borders for polygon visibility
            return [0, 100, 0, 255] as [number, number, number, number]; // Dark green borders
          },

          getLineWidth: (feature: any) => {
            if (feature.geometry?.type === "Point") {
              return 2; // Outline for points
            }
            if (feature.geometry?.type === "LineString") {
              return 3; // Thicker lines for LineString features
            }
            return 2; // Border width for polygons
          },

          getPointRadius: 8,
          pickable: false, // Don't interfere with editing
          radiusScale: 1,
          lineWidthScale: 1,
        });

        currentEditableLayer = editableLayer;
        allLayers.push(backgroundLayer); // Add background layer first
        allLayers.push(editableLayer); // Add editable layer on top
      } else {
        console.log(
          `📋 Layer ${layer.id} is not in edit mode, creating regular GeoJsonLayer`
        );
        // Regular non-editable layer - use current layer data from layers state
        const currentLayer = layers.find(l => l.id === layer.id);
        const mainLayer = new GeoJsonLayer({
          id: `${layer.id}-${index}`, // Stable ID
          data: currentLayer?.data || layer.data,

          // Simplified static styling to prevent blinking
          filled: true,
          stroked: true,
          extruded: false,

          // Ensure polygons render properly
          getPolygonOffset: () => [0, -1], // Slight offset to prevent z-fighting
          wireframe: false,

          getFillColor: (feature: any) => {
            // Selected feature gets bright yellow highlight
            if (selectedDeckFeature && feature === selectedDeckFeature) {
              return [255, 215, 0, 220] as [number, number, number, number]; // Gold for selected
            }
            // Hovered feature gets purple highlight
            if (hoveredDeckFeature && feature === hoveredDeckFeature) {
              return [156, 39, 176, 180] as [number, number, number, number]; // Purple for hover
            }
            // Points get bright blue color
            if (feature.geometry?.type === "Point") {
              return [33, 150, 243, 200] as [number, number, number, number]; // Bright blue points
            }
            // LineString geometries should not have fill color (they only have stroke)
            if (feature.geometry?.type === "LineString") {
              return [0, 0, 0, 0] as [number, number, number, number]; // Transparent fill for lines
            }
            // For Polygon and MultiPolygon, use bright green
            if (
              feature.geometry?.type === "Polygon" ||
              feature.geometry?.type === "MultiPolygon"
            ) {
              return [52, 168, 83, 160] as [number, number, number, number]; // Bright green fills for polygons
            }
            return [52, 168, 83, 160] as [number, number, number, number]; // Default bright green fills
          },
          getLineColor: (feature: any) => {
            // Selected feature gets gold outline
            if (selectedDeckFeature && feature === selectedDeckFeature) {
              return [255, 215, 0, 255] as [number, number, number, number]; // Gold outline for selected
            }
            // Hovered feature gets purple outline
            if (hoveredDeckFeature && feature === hoveredDeckFeature) {
              return [156, 39, 176, 255] as [number, number, number, number]; // Purple outline for hover
            }
            // For points, use white outline for maximum contrast
            if (feature.geometry?.type === "Point") {
              return [255, 255, 255, 255] as [number, number, number, number]; // White outline for points
            }
            // For LineString geometries, use bright orange
            if (feature.geometry?.type === "LineString") {
              return [255, 140, 0, 255] as [number, number, number, number]; // Bright orange for lines
            }
            // Use dark green borders for polygon visibility
            return [0, 100, 0, 255] as [number, number, number, number]; // Dark green borders
          },
          getLineWidth: (feature: any) => {
            if (selectedDeckFeature && feature === selectedDeckFeature) {
              return 8; // Much thicker line for selected
            }
            // For points, use thicker outline; for lines/polygons use normal thickness
            if (feature.geometry?.type === "Point") {
              return 3; // Thick outline for points
            }
            // Make LineString geometries thicker for better visibility
            if (feature.geometry?.type === "LineString") {
              return 4; // Thicker lines for LineString features
            }
            return 3; // Thicker borders for polygon visibility
          },
          getPointRadius: (feature: any) => {
            if (selectedDeckFeature && feature === selectedDeckFeature) {
              return 20; // Larger point for selected
            }
            return 15; // Default point size
          },

          // Stable settings
          radiusScale: 1,
          lineWidthScale: 1,
          radiusMinPixels: 10, // Minimum point size
          radiusMaxPixels: 20, // Maximum point size
          lineWidthMinPixels: 2, // Minimum line width for better visibility
          lineWidthMaxPixels: 10, // Maximum line width to ensure lines/polygons are visible

          pickable: true,
          autoHighlight: false, // Disable auto highlighting for better performance

          // Update triggers only for selection changes
          updateTriggers: {
            getFillColor: [selectedDeckFeature, hoveredDeckFeature],
            getLineColor: [selectedDeckFeature],
            getLineWidth: [selectedDeckFeature],
            getPointRadius: [selectedDeckFeature],
          },

          // Disable transitions for better performance
          transitions: {},
        });

        allLayers.push(mainLayer);
      }
    });

    return { layers: allLayers, editableLayer: currentEditableLayer };
  }, [
    // Include layer data changes to ensure EditableGeoJsonLayer gets updated data
    layers.map((l) => l.id).join(","),
    Object.keys(layerVisibility)
      .filter((id) => layerVisibility[id])
      .join(","),
    selectedDeckFeature?.id,
    hoveredDeckFeature?.id,
    editMode,
    editableLayerId,
    selectedEditFeatureIndexes.join(","),
    layerUpdateCounter, // Force update when this counter changes
  ]);
};
