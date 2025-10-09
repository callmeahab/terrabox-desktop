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

interface LayerStyle {
  fillColor: string;
  strokeColor: string;
  fillOpacity: number;
  strokeOpacity: number;
  strokeWidth: number;
  pointRadius: number;
}

interface CategoryStyle {
  id: string;
  property: string;
  value: any;
  operator: "equals" | "contains" | "greater" | "less" | "between";
  label: string;
  style: LayerStyle;
  enabled: boolean;
}

interface LayerStyleConfig {
  layerId: string;
  defaultStyle: LayerStyle;
  categorizedStyles: CategoryStyle[];
  stylingMode: "default" | "categorized";
}

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
  isSelectingExtrudePoints?: boolean;
  layerStyleConfigs?: Record<string, LayerStyleConfig>;
  basicTool?: string;
  selectedFeaturesForMove?: { layerId: string | null; indexes: number[] };
  onBasicMoveEdit?: (info: any) => void;
}

// Helper function to convert hex color to RGB array
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [52, 168, 83]; // Default green
};

// Helper function to get custom style from feature
const getCustomStyle = (feature: any) => {
  return feature?.properties?._style || null;
};

// Helper function to evaluate category condition
const matchesCategory = (feature: any, category: CategoryStyle): boolean => {
  if (!feature?.properties) return false;

  const propertyValue = feature.properties[category.property];
  if (propertyValue === undefined) return false;

  switch (category.operator) {
    case "equals":
      return String(propertyValue) === String(category.value);
    case "contains":
      return String(propertyValue).includes(String(category.value));
    case "greater":
      return Number(propertyValue) > Number(category.value);
    case "less":
      return Number(propertyValue) < Number(category.value);
    default:
      return false;
  }
};

// Helper function to get layer-level style for a feature
const getLayerStyle = (feature: any, layerId: string, layerStyleConfigs?: Record<string, LayerStyleConfig>): LayerStyle | null => {
  if (!layerStyleConfigs || !layerStyleConfigs[layerId]) return null;

  const config = layerStyleConfigs[layerId];

  // If using categorized styling, try to match categories first
  if (config.stylingMode === "categorized" && config.categorizedStyles.length > 0) {
    const matchedCategory = config.categorizedStyles.find(
      (cat) => cat.enabled && matchesCategory(feature, cat)
    );
    if (matchedCategory) {
      return matchedCategory.style;
    }
  }

  // Fall back to default style
  return config.defaultStyle;
};

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
  isSelectingExtrudePoints = false,
  layerStyleConfigs,
  basicTool = "view",
  selectedFeaturesForMove = { layerId: null, indexes: [] },
  onBasicMoveEdit,
}: UseDeckLayersProps) => {
  return useMemo(() => {
    const allLayers: any[] = [];
    let currentEditableLayer: any = null;
    const visibleLayers = layers.filter(
      (layer) => layerVisibility[layer.id] !== false
    );

    // When selecting extrude points, use ViewMode to prevent modify mode from deleting vertices
    const effectiveEditMode = isSelectingExtrudePoints ? "view" : editMode;

    visibleLayers.forEach((layer, index) => {
      const baseColor = layer.color || [33, 150, 243];

      // Check if this layer is in edit mode
      const isEditableLayer =
        editableLayerId === layer.id && effectiveEditMode !== "view";

      // Check if this layer is being used for basic move tool
      const isBasicMoveLayer =
        basicTool === "move" &&
        editMode === "view" &&
        selectedFeaturesForMove.layerId === layer.id &&
        selectedFeaturesForMove.indexes.length > 0;

      if (isEditableLayer) {
        console.log(
          `🎯 Layer ${layer.id} is in edit mode, creating both regular and EditableGeoJsonLayer`
        );
        // Create an editable layer
        // Get the most current data from layers state
        const currentLayer = layers.find((l) => l.id === layer.id);
        let geoJsonData =
          currentLayer?.data?.type === "FeatureCollection"
            ? currentLayer.data
            : ({ type: "FeatureCollection", features: [] } as any);

        console.log(
          `🔄 Using current layer data for ${layer.id}, features: ${
            geoJsonData.features?.length || 0
          }`
        );

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
                    if (
                      coords.length >= 2 &&
                      typeof coords[0] === "number" &&
                      typeof coords[1] === "number" &&
                      !isNaN(coords[0]) &&
                      !isNaN(coords[1])
                    ) {
                      return [coords[0], coords[1]];
                    }
                    return null;
                  case "LineString":
                    const cleanLine = coords
                      .map((coord: any) => {
                        if (
                          Array.isArray(coord) &&
                          coord.length >= 2 &&
                          typeof coord[0] === "number" &&
                          typeof coord[1] === "number" &&
                          !isNaN(coord[0]) &&
                          !isNaN(coord[1])
                        ) {
                          return [coord[0], coord[1]];
                        }
                        return null;
                      })
                      .filter((c) => c !== null);
                    return cleanLine.length >= 2 ? cleanLine : null;
                  case "Polygon":
                    const cleanRings = coords
                      .map((ring: any) => {
                        if (!Array.isArray(ring)) return null;
                        const cleanRing = ring
                          .map((coord: any) => {
                            if (
                              Array.isArray(coord) &&
                              coord.length >= 2 &&
                              typeof coord[0] === "number" &&
                              typeof coord[1] === "number" &&
                              !isNaN(coord[0]) &&
                              !isNaN(coord[1])
                            ) {
                              return [coord[0], coord[1]];
                            }
                            return null;
                          })
                          .filter((c) => c !== null);
                        return cleanRing.length >= 4 ? cleanRing : null;
                      })
                      .filter((r) => r !== null);
                    return cleanRings.length >= 1 ? cleanRings : null;
                  default:
                    return coords; // Pass through complex geometries
                }
              };

              const cleanedCoords = cleanCoordinates(
                feature.geometry.coordinates,
                feature.geometry.type
              );
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
          }, mode: ${effectiveEditMode}, features: ${geoJsonData.features?.length || 0}`,
          "selectedIndexes:",
          selectedEditFeatureIndexes
        );

        const editableLayer = new EditableGeoJsonLayer({
          id: `${layer.id}-editable`,
          data: geoJsonData,
          mode: getEditModeClass(effectiveEditMode),
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

            // Check for custom style
            const customStyle = getCustomStyle(feature);
            if (customStyle?.fillColor && customStyle?.fillOpacity !== undefined) {
              const rgb = hexToRgb(customStyle.fillColor);
              return [...rgb, Math.round(customStyle.fillOpacity * 255)] as [number, number, number, number];
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

            // Check for custom style
            const customStyle = getCustomStyle(feature);
            if (customStyle?.strokeColor && customStyle?.strokeOpacity !== undefined) {
              const rgb = hexToRgb(customStyle.strokeColor);
              return [...rgb, Math.round(customStyle.strokeOpacity * 255)] as [number, number, number, number];
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

          getLineWidth: (feature: any) => {
            // For EditableGeoJsonLayer, we need to find the feature index manually
            // since the second parameter signature isn't compatible
            const featureIndex =
              geoJsonData.features?.findIndex((f: any) => f === feature) ?? -1;
            const isSelected =
              selectedEditFeatureIndexes.includes(featureIndex);

            if (isSelected) {
              return 4; // Thicker line for selected features
            }

            // Check for custom style
            const customStyle = getCustomStyle(feature);
            if (customStyle?.strokeWidth !== undefined) {
              return customStyle.strokeWidth;
            }

            if (feature.geometry?.type === "Point") {
              return 3; // Outline for points
            }
            if (feature.geometry?.type === "LineString") {
              return 4; // Thicker lines for LineString features
            }
            return 2; // Border width for polygons
          },

          getRadius: (feature: any) => {
            const featureIndex =
              geoJsonData.features?.findIndex((f: any) => f === feature) ?? -1;
            const isSelected =
              selectedEditFeatureIndexes.includes(featureIndex);

            if (isSelected) {
              return 25; // Larger point for selected features
            }

            // Check for custom style
            const customStyle = getCustomStyle(feature);
            if (customStyle?.pointRadius !== undefined) {
              return customStyle.pointRadius;
            }

            return 18; // Larger default point size
          },

          filled: true,
          stroked: true,
          pickable: true,
          autoHighlight: true,

          // Point sizing settings (EditableGeoJsonLayer expects older prop names)
          pointRadiusMinPixels: 15,
          pointRadiusMaxPixels: 35,

          // Update triggers for selection highlighting and style changes
          updateTriggers: {
            getFillColor: [selectedEditFeatureIndexes, layerStyleConfigs],
            getLineColor: [selectedEditFeatureIndexes, layerStyleConfigs],
            getLineWidth: [selectedEditFeatureIndexes, layerStyleConfigs],
            getRadius: [selectedEditFeatureIndexes, layerStyleConfigs],
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
            // Check for custom style
            const customStyle = getCustomStyle(feature);
            if (customStyle?.fillColor && customStyle?.fillOpacity !== undefined) {
              const rgb = hexToRgb(customStyle.fillColor);
              return [...rgb, Math.round(customStyle.fillOpacity * 255)] as [number, number, number, number];
            }

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
            // Check for custom style
            const customStyle = getCustomStyle(feature);
            if (customStyle?.strokeColor && customStyle?.strokeOpacity !== undefined) {
              const rgb = hexToRgb(customStyle.strokeColor);
              return [...rgb, Math.round(customStyle.strokeOpacity * 255)] as [number, number, number, number];
            }

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
            // Check for custom style
            const customStyle = getCustomStyle(feature);
            if (customStyle?.strokeWidth !== undefined) {
              return customStyle.strokeWidth;
            }

            if (feature.geometry?.type === "Point") {
              return 2; // Outline for points
            }
            if (feature.geometry?.type === "LineString") {
              return 3; // Thicker lines for LineString features
            }
            return 2; // Border width for polygons
          },

          getRadius: (feature: any) => {
            // Check for custom style
            const customStyle = getCustomStyle(feature);
            if (customStyle?.pointRadius !== undefined) {
              return customStyle.pointRadius;
            }
            return 12;
          },
          pickable: false, // Don't interfere with editing
          radiusScale: 1,
          lineWidthScale: 1,
        });

        currentEditableLayer = editableLayer;
        allLayers.push(backgroundLayer); // Add background layer first
        allLayers.push(editableLayer); // Add editable layer on top
      } else if (isBasicMoveLayer) {
        // Create an editable layer for basic move tool
        console.log(
          `🚚 Layer ${layer.id} is in basic move mode, creating EditableGeoJsonLayer with TranslateMode`
        );

        const currentLayer = layers.find((l) => l.id === layer.id);
        let geoJsonData =
          currentLayer?.data?.type === "FeatureCollection"
            ? currentLayer.data
            : ({ type: "FeatureCollection", features: [] } as any);

        console.log(
          `🔄 Using current layer data for ${layer.id}, features: ${
            geoJsonData.features?.length || 0
          }`
        );

        const moveEditableLayer = new EditableGeoJsonLayer({
          id: `${layer.id}-basic-move`,
          data: geoJsonData,
          mode: TranslateMode,
          selectedFeatureIndexes: selectedFeaturesForMove.indexes,

          onEdit: ({ updatedData, editType, editContext }: any) => {
            console.log(
              "🔧 Basic move EditableGeoJsonLayer onEdit triggered:",
              editType
            );
            if (onBasicMoveEdit) {
              onBasicMoveEdit({ updatedData, editType, editContext });
            }
          },

          // Enhanced styling for selected features
          getFillColor: (feature: any, { object, index }: any) => {
            const isSelected = selectedFeaturesForMove.indexes.includes(index);

            if (isSelected) {
              return [59, 130, 246, 180] as [number, number, number, number]; // Blue for selected in basic move
            }

            // For unselected features, use default colors
            if (feature.geometry?.type === "Point") {
              return [33, 150, 243, 160] as [number, number, number, number];
            }
            if (feature.geometry?.type === "LineString") {
              return [0, 0, 0, 0] as [number, number, number, number];
            }
            return [52, 168, 83, 120] as [number, number, number, number];
          },

          getLineColor: (feature: any, { object, index }: any) => {
            const isSelected = selectedFeaturesForMove.indexes.includes(index);

            if (isSelected) {
              return [59, 130, 246, 255] as [number, number, number, number]; // Blue outline for selected
            }

            if (feature.geometry?.type === "Point") {
              return [255, 255, 255, 255] as [number, number, number, number];
            }
            if (feature.geometry?.type === "LineString") {
              return [33, 150, 243, 255] as [number, number, number, number];
            }
            return [255, 255, 255, 255] as [number, number, number, number];
          },

          getLineWidth: (feature: any) => {
            const featureIndex =
              geoJsonData.features?.findIndex((f: any) => f === feature) ?? -1;
            const isSelected =
              selectedFeaturesForMove.indexes.includes(featureIndex);

            if (isSelected) {
              return 4;
            }

            if (feature.geometry?.type === "Point") {
              return 3;
            }
            if (feature.geometry?.type === "LineString") {
              return 4;
            }
            return 2;
          },

          getRadius: (feature: any) => {
            const featureIndex =
              geoJsonData.features?.findIndex((f: any) => f === feature) ?? -1;
            const isSelected =
              selectedFeaturesForMove.indexes.includes(featureIndex);

            if (isSelected) {
              return 25;
            }

            return 18;
          },

          filled: true,
          stroked: true,
          pickable: true,
          autoHighlight: true,

          pointRadiusMinPixels: 15,
          pointRadiusMaxPixels: 35,

          updateTriggers: {
            getFillColor: [selectedFeaturesForMove.indexes],
            getLineColor: [selectedFeaturesForMove.indexes],
            getLineWidth: [selectedFeaturesForMove.indexes],
            getRadius: [selectedFeaturesForMove.indexes],
          },
        });

        currentEditableLayer = moveEditableLayer;
        allLayers.push(moveEditableLayer);
      } else {
        console.log(
          `📋 Layer ${layer.id} is not in edit mode, creating regular GeoJsonLayer`
        );
        // Regular non-editable layer - use current layer data from layers state
        const currentLayer = layers.find((l) => l.id === layer.id);
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

          getFillColor: (feature: any, { index }: any) => {
            // Check if this feature is selected in basic tool mode
            if (
              (basicTool === "select" || basicTool === "move") &&
              selectedFeaturesForMove.layerId === layer.id &&
              selectedFeaturesForMove.indexes.includes(index)
            ) {
              return [59, 130, 246, 180] as [number, number, number, number]; // Blue for selected in basic tools
            }

            // Selected feature gets bright yellow highlight
            if (selectedDeckFeature && feature === selectedDeckFeature) {
              return [255, 215, 0, 220] as [number, number, number, number]; // Gold for selected
            }
            // Hovered feature gets purple highlight
            if (hoveredDeckFeature && feature === hoveredDeckFeature) {
              return [156, 39, 176, 180] as [number, number, number, number]; // Purple for hover
            }

            // Check for individual feature style first
            const customStyle = getCustomStyle(feature);
            if (customStyle?.fillColor && customStyle?.fillOpacity !== undefined) {
              const rgb = hexToRgb(customStyle.fillColor);
              return [...rgb, Math.round(customStyle.fillOpacity * 255)] as [number, number, number, number];
            }

            // Check for layer-level or category-based style
            const layerStyle = getLayerStyle(feature, layer.id, layerStyleConfigs);
            if (layerStyle?.fillColor && layerStyle?.fillOpacity !== undefined) {
              const rgb = hexToRgb(layerStyle.fillColor);
              return [...rgb, Math.round(layerStyle.fillOpacity * 255)] as [number, number, number, number];
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
          getLineColor: (feature: any, { index }: any) => {
            // Check if this feature is selected in basic tool mode
            if (
              (basicTool === "select" || basicTool === "move") &&
              selectedFeaturesForMove.layerId === layer.id &&
              selectedFeaturesForMove.indexes.includes(index)
            ) {
              return [59, 130, 246, 255] as [number, number, number, number]; // Blue outline for selected in basic tools
            }

            // Selected feature gets gold outline
            if (selectedDeckFeature && feature === selectedDeckFeature) {
              return [255, 215, 0, 255] as [number, number, number, number]; // Gold outline for selected
            }
            // Hovered feature gets purple outline
            if (hoveredDeckFeature && feature === hoveredDeckFeature) {
              return [156, 39, 176, 255] as [number, number, number, number]; // Purple outline for hover
            }

            // Check for individual feature style first
            const customStyle = getCustomStyle(feature);
            if (customStyle?.strokeColor && customStyle?.strokeOpacity !== undefined) {
              const rgb = hexToRgb(customStyle.strokeColor);
              return [...rgb, Math.round(customStyle.strokeOpacity * 255)] as [number, number, number, number];
            }

            // Check for layer-level or category-based style
            const layerStyle = getLayerStyle(feature, layer.id, layerStyleConfigs);
            if (layerStyle?.strokeColor && layerStyle?.strokeOpacity !== undefined) {
              const rgb = hexToRgb(layerStyle.strokeColor);
              return [...rgb, Math.round(layerStyle.strokeOpacity * 255)] as [number, number, number, number];
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
          getLineWidth: (feature: any, { index }: any) => {
            // Check if this feature is selected in basic tool mode
            if (
              (basicTool === "select" || basicTool === "move") &&
              selectedFeaturesForMove.layerId === layer.id &&
              selectedFeaturesForMove.indexes.includes(index)
            ) {
              return 6; // Thicker line for selected in basic tools
            }

            if (selectedDeckFeature && feature === selectedDeckFeature) {
              return 8; // Much thicker line for selected
            }

            // Check for individual feature style first
            const customStyle = getCustomStyle(feature);
            if (customStyle?.strokeWidth !== undefined) {
              return customStyle.strokeWidth;
            }

            // Check for layer-level or category-based style
            const layerStyle = getLayerStyle(feature, layer.id, layerStyleConfigs);
            if (layerStyle?.strokeWidth !== undefined) {
              return layerStyle.strokeWidth;
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
          getRadius: (feature: any, { index }: any) => {
            // Check if this feature is selected in basic tool mode
            if (
              (basicTool === "select" || basicTool === "move") &&
              selectedFeaturesForMove.layerId === layer.id &&
              selectedFeaturesForMove.indexes.includes(index)
            ) {
              return 28; // Larger point for selected in basic tools
            }

            if (selectedDeckFeature && feature === selectedDeckFeature) {
              return 25; // Larger point for selected
            }

            // Check for individual feature style first
            const customStyle = getCustomStyle(feature);
            if (customStyle?.pointRadius !== undefined) {
              return customStyle.pointRadius;
            }

            // Check for layer-level or category-based style
            const layerStyle = getLayerStyle(feature, layer.id, layerStyleConfigs);
            if (layerStyle?.pointRadius !== undefined) {
              return layerStyle.pointRadius;
            }

            return 18; // Larger default point size
          },

          // Stable settings
          radiusScale: 1,
          lineWidthScale: 1,
          radiusMinPixels: 15, // Larger minimum point size for better visibility when zoomed out
          radiusMaxPixels: 35, // Larger maximum point size
          lineWidthMinPixels: 2, // Minimum line width for better visibility
          lineWidthMaxPixels: 10, // Maximum line width to ensure lines/polygons are visible

          pickable: true,
          autoHighlight: false, // Disable auto highlighting for better performance

          // Update triggers for selection changes and style changes
          updateTriggers: {
            getFillColor: [selectedDeckFeature, hoveredDeckFeature, layerStyleConfigs, selectedFeaturesForMove.indexes.join(","), basicTool],
            getLineColor: [selectedDeckFeature, layerStyleConfigs, selectedFeaturesForMove.indexes.join(","), basicTool],
            getLineWidth: [selectedDeckFeature, layerStyleConfigs, selectedFeaturesForMove.indexes.join(","), basicTool],
            getRadius: [selectedDeckFeature, layerStyleConfigs, selectedFeaturesForMove.indexes.join(","), basicTool],
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
    isSelectingExtrudePoints, // Update when extrude point selection mode changes
    layerStyleConfigs, // Update when layer styles change
    basicTool, // Update when basic tool changes
    selectedFeaturesForMove.layerId, // Update when selected layer changes
    selectedFeaturesForMove.indexes.join(","), // Update when selected features change
  ]);
};
