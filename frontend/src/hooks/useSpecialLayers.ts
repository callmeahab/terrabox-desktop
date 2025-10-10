import { useMemo } from "react";
import { GeoJsonLayer } from "@deck.gl/layers";
import {
  EditableGeoJsonLayer,
  ViewMode,
} from "@deck.gl-community/editable-layers";
import { FeatureCollection } from "geojson";
import { IVectorLayer } from "../types/interfaces";
import { checkFeatureInBounds } from "../utils/mapUtils";

interface UseSpecialLayersProps {
  // Bounds drawing state
  isDrawingBounds: boolean;
  boundsFeatureCollection: any;
  boundsDrawingMode: any;
  setBoundsFeatureCollection: (data: any) => void;
  setDrawnBounds: (bounds: [number, number, number, number] | null) => void;
  setBoundsDrawingMode: (mode: any) => void;
  handleFinishDrawingBounds: () => void;
  drawnBounds: [number, number, number, number] | null;

  // Selection drawing state
  basicTool: string;
  editMode: string;
  selectionFeatureCollection: any;
  selectionDrawingMode: any;
  setSelectionFeatureCollection: (data: any) => void;
  setSelectionDrawingMode: (mode: any) => void;
  setSelectedFeaturesForMove: (selection: {
    layerId: string | null;
    indexes: number[];
  }) => void;
  setBasicTool: (tool: string) => void;
  layers: IVectorLayer[];

  // Extrude points state
  isSelectingExtrudePoints: boolean;
  selectedExtrudePoints: number[];
  editableLayerId: string | null;
  selectedEditFeatureIndexes: number[];

  // Geometry features state
  isSelectingForGeometryTool: boolean;
  selectedGeometryFeatures: any[];
}

export function useSpecialLayers({
  isDrawingBounds,
  boundsFeatureCollection,
  boundsDrawingMode,
  setBoundsFeatureCollection,
  setDrawnBounds,
  setBoundsDrawingMode,
  handleFinishDrawingBounds,
  drawnBounds,
  basicTool,
  editMode,
  selectionFeatureCollection,
  selectionDrawingMode,
  setSelectionFeatureCollection,
  setSelectionDrawingMode,
  setSelectedFeaturesForMove,
  setBasicTool,
  layers,
  isSelectingExtrudePoints,
  selectedExtrudePoints,
  editableLayerId,
  selectedEditFeatureIndexes,
  isSelectingForGeometryTool,
  selectedGeometryFeatures,
}: UseSpecialLayersProps) {
  // Bounds drawing layer
  const boundsDrawingLayer = useMemo(() => {
    if (!isDrawingBounds) {
      return null;
    }

    return new EditableGeoJsonLayer({
      id: "bounds-drawing-layer",
      data: boundsFeatureCollection,
      mode: boundsDrawingMode,
      selectedFeatureIndexes: [],
      onEdit: ({ updatedData, editType, editContext }) => {
        console.log("Edit event:", editType, editContext);
        setBoundsFeatureCollection(updatedData);

        // When rectangle drawing is completed
        if (editType === "addFeature" && updatedData.features.length > 0) {
          const feature = updatedData.features[updatedData.features.length - 1];
          if (
            feature.geometry.type === "Polygon" &&
            feature.geometry.coordinates[0]
          ) {
            const coords = feature.geometry.coordinates[0];

            // Calculate bounds from polygon coordinates
            let minLng = Infinity,
              maxLng = -Infinity;
            let minLat = Infinity,
              maxLat = -Infinity;

            coords.forEach(([lng, lat]: [number, number]) => {
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
            });

            setDrawnBounds([minLng, minLat, maxLng, maxLat]);

            // Switch to view mode to end drawing
            setBoundsDrawingMode(new ViewMode());

            // Auto-finish drawing after rectangle is created
            setTimeout(() => {
              handleFinishDrawingBounds();
            }, 100);
          }
        }
      },
      pickable: true,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 3,
      getFillColor: [156, 39, 176, 50], // Purple with transparency
      getLineColor: [156, 39, 176, 255], // Solid purple outline
      getLineWidth: 3,
    });
  }, [
    isDrawingBounds,
    boundsFeatureCollection,
    boundsDrawingMode,
    setBoundsFeatureCollection,
    setDrawnBounds,
    setBoundsDrawingMode,
    handleFinishDrawingBounds,
  ]);

  // Visualization layer for drawn bounds (when not actively drawing)
  const boundsVisualizationLayer = useMemo(() => {
    if (!drawnBounds || isDrawingBounds) {
      return null;
    }

    const [west, south, east, north] = drawnBounds;

    const boundsGeoJSON: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Query Bounds" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [west, north],
                [east, north],
                [east, south],
                [west, south],
                [west, north],
              ],
            ],
          },
        },
      ],
    };

    return new GeoJsonLayer({
      id: "bounds-visualization-layer",
      data: boundsGeoJSON,
      pickable: false,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 3,
      getFillColor: [156, 39, 176, 30], // Purple with transparency
      getLineColor: [156, 39, 176, 200], // Solid purple outline
      getLineWidth: 2,
    });
  }, [drawnBounds, isDrawingBounds]);

  // Selection drawing layer using EditableGeoJsonLayer
  const selectionDrawingLayer = useMemo(() => {
    if (basicTool !== "selectByArea" || editMode !== "view") {
      return null;
    }

    return new EditableGeoJsonLayer({
      id: "selection-drawing-layer",
      data: selectionFeatureCollection,
      mode: selectionDrawingMode,
      selectedFeatureIndexes: [],
      onEdit: ({ updatedData, editType, editContext }) => {
        console.log("📦 Selection edit event:", editType, editContext);
        setSelectionFeatureCollection(updatedData);

        // When rectangle drawing is completed
        if (editType === "addFeature" && updatedData.features.length > 0) {
          const feature = updatedData.features[updatedData.features.length - 1];
          if (
            feature.geometry.type === "Polygon" &&
            feature.geometry.coordinates[0]
          ) {
            const coords = feature.geometry.coordinates[0];

            // Calculate bounds from polygon coordinates
            let minLng = Infinity,
              maxLng = -Infinity;
            let minLat = Infinity,
              maxLat = -Infinity;

            coords.forEach(([lng, lat]: [number, number]) => {
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
            });

            // Find all features within the selection box
            const selectedByLayer: Record<string, number[]> = {};

            layers.forEach((layer) => {
              if (!layer.data?.features) return;

              const selectedIndexes: number[] = [];
              layer.data.features.forEach((feature: any, index: number) => {
                if (!feature.geometry?.coordinates) return;

                // Check if feature is within bounds
                const isInBounds = checkFeatureInBounds(
                  feature,
                  minLng,
                  minLat,
                  maxLng,
                  maxLat
                );

                if (isInBounds) {
                  selectedIndexes.push(index);
                }
              });

              if (selectedIndexes.length > 0) {
                selectedByLayer[layer.id] = selectedIndexes;
              }
            });

            // Select features from the first layer that has selections
            const layersWithSelections = Object.keys(selectedByLayer);
            if (layersWithSelections.length > 0) {
              const firstLayerId = layersWithSelections[0];
              setSelectedFeaturesForMove({
                layerId: firstLayerId,
                indexes: selectedByLayer[firstLayerId],
              });
              console.log(
                `📦 Selected ${selectedByLayer[firstLayerId].length} features from layer ${firstLayerId}`
              );
            }

            // Clear the selection rectangle and switch back to ViewMode
            setSelectionDrawingMode(new ViewMode());
            setTimeout(() => {
              setSelectionFeatureCollection({
                type: "FeatureCollection",
                features: [],
              });
              // Switch back to select tool after drawing
              setBasicTool("select");
            }, 100);
          }
        }
      },
      pickable: true,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 3,
      getFillColor: [59, 130, 246, 50], // Blue with transparency
      getLineColor: [59, 130, 246, 255], // Solid blue outline
      getLineWidth: 3,
    });
  }, [
    basicTool,
    editMode,
    selectionFeatureCollection,
    selectionDrawingMode,
    layers,
    setSelectionFeatureCollection,
    setSelectionDrawingMode,
    setSelectedFeaturesForMove,
    setBasicTool,
  ]);

  // Create selected extrude points layer
  const selectedPointsLayer = useMemo(() => {
    if (
      !isSelectingExtrudePoints ||
      selectedExtrudePoints.length === 0 ||
      !editableLayerId
    ) {
      return null;
    }

    const layer = layers.find((l) => l.id === editableLayerId);
    if (!layer || selectedEditFeatureIndexes.length === 0) return null;

    const feature = layer.data?.features?.[selectedEditFeatureIndexes[0]];
    if (!feature || feature.geometry?.type !== "Polygon") return null;

    const coordinates = feature.geometry.coordinates[0];
    const selectedCoords = selectedExtrudePoints
      .filter((idx) => idx < coordinates.length)
      .map((idx) => coordinates[idx]);

    if (selectedCoords.length === 0) return null;

    return new GeoJsonLayer({
      id: "selected-extrude-points",
      data: {
        type: "FeatureCollection",
        features: selectedCoords.map((coord) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: coord,
          },
          properties: {},
        })),
      },
      pointRadiusMinPixels: 8,
      pointRadiusMaxPixels: 8,
      getFillColor: [156, 39, 176, 255], // Purple color matching extrude tool
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 2,
      stroked: true,
      filled: true,
      pickable: false,
    });
  }, [
    isSelectingExtrudePoints,
    selectedExtrudePoints,
    editableLayerId,
    layers,
    selectedEditFeatureIndexes,
  ]);

  // Create selected geometry features layer for visual feedback
  const selectedGeometryFeaturesLayer = useMemo(() => {
    if (!isSelectingForGeometryTool || selectedGeometryFeatures.length === 0) {
      return null;
    }

    return new GeoJsonLayer({
      id: "selected-geometry-features",
      data: {
        type: "FeatureCollection",
        features: selectedGeometryFeatures,
      },
      filled: true,
      stroked: true,
      getFillColor: [255, 215, 0, 100], // Gold transparent fill
      getLineColor: [255, 215, 0, 255], // Gold outline
      getLineWidth: 4,
      pickable: false,
      pointRadiusMinPixels: 12,
      pointRadiusMaxPixels: 12,
    });
  }, [isSelectingForGeometryTool, selectedGeometryFeatures]);

  return {
    boundsDrawingLayer,
    boundsVisualizationLayer,
    selectionDrawingLayer,
    selectedPointsLayer,
    selectedGeometryFeaturesLayer,
  };
}
