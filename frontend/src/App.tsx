import React, {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  IconButton,
  Tooltip,
  Fab,
} from "@mui/material";
import { Layers, Close, CloudUpload } from "@mui/icons-material";
import { GeoJsonLayer } from "@deck.gl/layers";
import {
  EditableGeoJsonLayer,
  DrawRectangleMode,
  ViewMode,
} from "@deck.gl-community/editable-layers";

import { listIndexedFiles } from "./utils/utils";
import { IVectorLayer } from "./types/interfaces";
import { FeatureCollection } from "geojson";
import MapControls from "./components/MapControls";
import FilePanel from "./components/FilePanel";
import EditControls from "./components/EditControls";
import BasicEditingTools from "./components/BasicEditingTools";
import GeometryTools from "./components/GeometryTools";
import OverpassPanel from "./components/OverpassPanel";
import FeatureDetailsPanel from "./components/FeatureDetailsDialog";
import MapRenderer from "./components/MapRenderer";
import StyleControls, {
  FeatureStyle,
  DEFAULT_STYLE,
} from "./components/StyleControls";
import LayerStylePanel, {
  LayerStyleConfig,
} from "./components/LayerStylePanel";
import { liquidGlassTheme } from "./theme/liquidGlassTheme";
import { useDeckLayers } from "./hooks/useDeckLayers";
import {
  INITIAL_VIEW_STATE,
  MAPBOX_ACCESS_TOKEN,
  MAP_STYLES,
} from "./constants/mapConfig";
import {
  useMapLayers,
  useUI,
  useFileManagement,
  useLayerVisibility,
  useFeatureSelection,
} from "./hooks/useMapLayers";
import "./App.css";

function App() {
  // Zustand hooks
  const { layers, setLayers, addLayer, selectedLayer, setSelectedLayer } =
    useMapLayers();
  const {
    cursor,
    setCursor,
    isPanelOpen,
    setIsPanelOpen,
    panelWidth,
    setPanelWidth,
    isLoading,
    setIsLoading,
    errorMessage,
    setErrorMessage,
  } = useUI();
  const {
    selectedFiles,
    setSelectedFiles,
    indexedFiles,
    setIndexedFiles,
    filePath,
    setFilePath,
  } = useFileManagement();
  const {
    layerVisibility,
    toggleLayerVisibility,
    allLayersVisible,
    toggleAllLayers,
  } = useLayerVisibility();
  const {
    selectedFeature,
    setSelectedFeature,
    hoveredFeature,
    setHoveredFeature,
  } = useFeatureSelection();

  // Local state for editing and map style
  const [mapStyle, setMapStyle] = React.useState<string>(MAP_STYLES[0].url);
  const [zoomTarget, setZoomTarget] = React.useState<{
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  } | null>(null);
  const [editMode, setEditMode] = React.useState<string>("view");
  const [editableLayerId, setEditableLayerId] = React.useState<string | null>(
    null
  );
  const [selectedEditFeatureIndexes, setSelectedEditFeatureIndexes] =
    React.useState<number[]>([]);
  const [layerUpdateCounter, setLayerUpdateCounter] = React.useState<number>(0);
  const [dragDistance, setDragDistance] = React.useState<number | null>(null);
  const [dragStartPosition, setDragStartPosition] = React.useState<
    [number, number] | null
  >(null);
  const [isDrawingBounds, setIsDrawingBounds] = React.useState<boolean>(false);
  const [featureDetailsPanelOpen, setFeatureDetailsPanelOpen] =
    React.useState<boolean>(false);
  const [geometryToolsOpen, setGeometryToolsOpen] =
    React.useState<boolean>(false);
  const [isSelectingForGeometryTool, setIsSelectingForGeometryTool] =
    React.useState<boolean>(false);
  const [activeGeometryTool, setActiveGeometryTool] = React.useState<
    string | null
  >(null);
  const [selectedGeometryFeatures, setSelectedGeometryFeatures] =
    React.useState<any[]>([]);
  const [selectedExtrudePoints, setSelectedExtrudePoints] = React.useState<
    number[]
  >([]);
  const [isSelectingExtrudePoints, setIsSelectingExtrudePoints] =
    React.useState<boolean>(false);
  const [drawnBounds, setDrawnBounds] = React.useState<
    [number, number, number, number] | null
  >(null);
  const [drawingStartCoord, setDrawingStartCoord] = React.useState<
    [number, number] | null
  >(null);
  const [isMouseDown, setIsMouseDown] = React.useState<boolean>(false);
  const [isOverpassPanelOpen, setIsOverpassPanelOpen] =
    React.useState<boolean>(false);
  const [styleControlsOpen, setStyleControlsOpen] =
    React.useState<boolean>(false);
  const [currentStyle, setCurrentStyle] =
    React.useState<FeatureStyle>(DEFAULT_STYLE);
  const [layerStylePanelOpen, setLayerStylePanelOpen] =
    React.useState<boolean>(false);
  const [layerStyleConfigs, setLayerStyleConfigs] = React.useState<
    Record<string, LayerStyleConfig>
  >({});
  const [selectedLayerForStyling, setSelectedLayerForStyling] = React.useState<
    string | null
  >(null);
  const [isGlobalDragOver, setIsGlobalDragOver] =
    React.useState<boolean>(false);
  const [isDrawingSelection, setIsDrawingSelection] =
    React.useState<boolean>(false);
  const [selectionBox, setSelectionBox] = React.useState<
    [number, number, number, number] | null
  >(null);
  const [basicTool, setBasicTool] = React.useState<string>("view");
  const [selectedFeaturesForMove, setSelectedFeaturesForMove] = React.useState<{
    layerId: string | null;
    indexes: number[];
  }>({ layerId: null, indexes: [] });
  const [isDrawingBasicSelection, setIsDrawingBasicSelection] =
    React.useState<boolean>(false);
  const [basicSelectionBox, setBasicSelectionBox] = React.useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // Throttle layer updates to improve performance during dragging
  const layerUpdateThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // Track view state changes (minimal handler for deck.gl)
  const handleViewStateChange = (evt: any) => {
    // Can be used for logging or other side effects if needed
    // console.log('View state changed:', evt.viewState);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (layerUpdateThrottleRef.current) {
        clearTimeout(layerUpdateThrottleRef.current);
      }
    };
  }, []);

  const handleStyleChange = (newStyle: string) => {
    setMapStyle(newStyle);
  };

  const handlePanelToggle = (isOpen: boolean) => {
    setIsPanelOpen(isOpen);
  };

  const handleDeckFeatureClick = useCallback(
    (info: any, event: any) => {
      // Handle bounds drawing mode
      if (isDrawingBounds) {
        // Bounds drawing is handled by mouse events
        return;
      }

      // Handle selection box drawing mode
      if (isDrawingSelection) {
        // Selection box drawing is handled by dedicated layer
        return;
      }

      // Handle basic tool rectangle selection - don't process clicks during drawing
      if (basicTool === "selectByArea" && editMode === "view") {
        // Rectangle selection is handled by mouse down/move/up events
        return;
      }

      // Handle basic tool modes (always active)
      if (basicTool === "view" && editMode === "view") {
        // View mode - open feature details
        if (info.object) {
          setSelectedFeature(info.object);
          setFeatureDetailsPanelOpen(true);
          console.log("Feature clicked:", info);
        } else {
          setSelectedFeature(null);
          setFeatureDetailsPanelOpen(false);
        }
        return;
      }

      if (basicTool === "select" && editMode === "view") {
        // Select mode - select/deselect features
        if (info.object && info.index !== undefined && info.layer) {
          const clickedLayerId = info.layer.id.replace(/-\d+$/, ""); // Remove the index suffix from layer ID
          const isShiftPressed = event.srcEvent?.shiftKey;

          setSelectedFeaturesForMove((prev) => {
            // If clicking on a different layer, start fresh selection
            if (
              prev.layerId &&
              prev.layerId !== clickedLayerId &&
              !isShiftPressed
            ) {
              return { layerId: clickedLayerId, indexes: [info.index] };
            }

            if (isShiftPressed && prev.layerId === clickedLayerId) {
              // Multi-select with Shift (same layer only)
              if (prev.indexes.includes(info.index)) {
                return {
                  layerId: prev.indexes.length > 1 ? clickedLayerId : null,
                  indexes: prev.indexes.filter((i) => i !== info.index),
                };
              } else {
                return {
                  layerId: clickedLayerId,
                  indexes: [...prev.indexes, info.index],
                };
              }
            } else {
              // Single select (replace selection)
              if (
                prev.indexes.length === 1 &&
                prev.indexes[0] === info.index &&
                prev.layerId === clickedLayerId
              ) {
                return { layerId: null, indexes: [] };
              } else {
                return { layerId: clickedLayerId, indexes: [info.index] };
              }
            }
          });

          console.log(
            `👆 Selected feature at index: ${info.index} from layer: ${clickedLayerId}`
          );
        } else {
          // Clicked empty area - clear selection
          setSelectedFeaturesForMove({ layerId: null, indexes: [] });
        }
        return;
      }

      // Handle simple select mode in edit mode
      if (editMode === "select" && editableLayerId) {
        if (info.object && info.index !== undefined) {
          const isShiftPressed = event.srcEvent?.shiftKey;

          setSelectedEditFeatureIndexes((prev) => {
            if (isShiftPressed) {
              // Multi-select with Shift
              if (prev.includes(info.index)) {
                // Deselect if already selected
                return prev.filter((i) => i !== info.index);
              } else {
                // Add to selection
                return [...prev, info.index];
              }
            } else {
              // Single select (replace selection)
              if (prev.length === 1 && prev[0] === info.index) {
                // Deselect if clicking the same feature
                return [];
              } else {
                return [info.index];
              }
            }
          });

          console.log(`👆 Selected feature at index: ${info.index}`);
        } else {
          // Clicked empty area - clear selection
          setSelectedEditFeatureIndexes([]);
        }
        return;
      }

      // Handle point selection for extrude tool
      if (
        isSelectingExtrudePoints &&
        editableLayerId &&
        selectedEditFeatureIndexes.length > 0
      ) {
        const layer = layers.find((l) => l.id === editableLayerId);
        if (!layer) return;

        const feature = layer.data?.features?.[selectedEditFeatureIndexes[0]];
        if (!feature || feature.geometry?.type !== "Polygon") return;

        // Find the closest vertex to the click point
        const clickCoord = info.coordinate;
        if (!clickCoord) return;

        const coordinates = feature.geometry.coordinates[0]; // Outer ring

        let closestIndex = -1;
        let minDistance = Infinity;
        const SELECTION_THRESHOLD = 0.01; // degrees (~1.1km at equator)

        coordinates.forEach((coord: number[], index: number) => {
          const dx = coord[0] - clickCoord[0];
          const dy = coord[1] - clickCoord[1];
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });

        // Only select if within threshold
        if (closestIndex >= 0 && minDistance < SELECTION_THRESHOLD) {
          // Toggle point selection
          setSelectedExtrudePoints((prev) => {
            if (prev.includes(closestIndex)) {
              return prev.filter((i) => i !== closestIndex);
            } else {
              return [...prev, closestIndex];
            }
          });
          console.log(
            "Selected vertex index:",
            closestIndex,
            "at distance:",
            minDistance
          );
        } else {
          console.log(
            "Click too far from any vertex. Closest distance:",
            minDistance
          );
        }
        return;
      }

      // Handle feature selection for geometry tools
      if (isSelectingForGeometryTool && info.object) {
        setSelectedGeometryFeatures((prev) => {
          // Check if feature already selected
          const isAlreadySelected = prev.some((f) => f === info.object);
          if (isAlreadySelected) {
            // Deselect
            return prev.filter((f) => f !== info.object);
          } else {
            // Select
            return [...prev, info.object];
          }
        });
        console.log("Geometry tool feature selection:", info.object);
        return;
      }

      if (editMode !== "view") {
        // Handle feature selection in edit mode
        if (info.object && info.index !== undefined) {
          console.log("🎯 Selecting feature for editing at index:", info.index);
          setSelectedEditFeatureIndexes([info.index]);
        } else {
          setSelectedEditFeatureIndexes([]);
        }
        return;
      }

      if (info.object) {
        setSelectedFeature(info.object);
        setFeatureDetailsPanelOpen(true);
        console.log("Feature clicked:", info);
      } else {
        setSelectedFeature(null);
        setFeatureDetailsPanelOpen(false);
      }
    },
    [
      basicTool,
      editMode,
      isDrawingBounds,
      isDrawingSelection,
      isSelectingExtrudePoints,
      isSelectingForGeometryTool,
      editableLayerId,
      layers,
      selectedEditFeatureIndexes,
      setSelectedFeature,
      setFeatureDetailsPanelOpen,
    ]
  );

  // Handle delete for basic tools
  const handleBasicDelete = useCallback(() => {
    if (
      !selectedFeaturesForMove.layerId ||
      selectedFeaturesForMove.indexes.length === 0
    ) {
      return;
    }

    const confirmDelete = window.confirm(
      `Delete ${selectedFeaturesForMove.indexes.length} selected feature${
        selectedFeaturesForMove.indexes.length > 1 ? "s" : ""
      }?`
    );

    if (confirmDelete) {
      const layer = layers.find(
        (l) => l.id === selectedFeaturesForMove.layerId
      );
      if (layer && layer.data) {
        const updatedData = { ...layer.data };
        const newFeatures = updatedData.features.filter(
          (_: any, index: number) =>
            !selectedFeaturesForMove.indexes.includes(index)
        );
        updatedData.features = newFeatures;

        const updatedLayers = layers.map((l) => {
          if (l.id === selectedFeaturesForMove.layerId) {
            return { ...l, data: updatedData };
          }
          return l;
        });

        setLayers(updatedLayers);
        setLayerUpdateCounter((prev) => prev + 1);
        setSelectedFeaturesForMove({ layerId: null, indexes: [] });
        console.log(
          `🗑️ Deleted ${selectedFeaturesForMove.indexes.length} feature(s) via basic tools`
        );
      }
    }
  }, [selectedFeaturesForMove, layers, setLayers, setLayerUpdateCounter]);

  // Mouse handlers for rectangle selection in basic tools
  const handleMapMouseDown = useCallback(
    (event: any) => {
      if (basicTool === "selectByArea" && editMode === "view") {
        const { x, y } = event.point || { x: event.offsetX, y: event.offsetY };
        setIsDrawingBasicSelection(true);
        setBasicSelectionBox({ startX: x, startY: y, endX: x, endY: y });
      }
    },
    [basicTool, editMode]
  );

  const handleMapMouseMove = useCallback(
    (event: any) => {
      if (isDrawingBasicSelection && basicSelectionBox) {
        const { x, y } = event.point || { x: event.offsetX, y: event.offsetY };
        setBasicSelectionBox((prev) =>
          prev ? { ...prev, endX: x, endY: y } : null
        );
      }
    },
    [isDrawingBasicSelection, basicSelectionBox]
  );

  const handleMapMouseUp = useCallback(
    (event: any) => {
      if (isDrawingBasicSelection && basicSelectionBox) {
        setIsDrawingBasicSelection(false);

        // Get viewport to convert screen coordinates to lng/lat
        const { viewport } = event;
        if (!viewport) {
          setBasicSelectionBox(null);
          return;
        }

        // Convert screen coordinates to lng/lat
        const [minLng, minLat] = viewport.unproject([
          Math.min(basicSelectionBox.startX, basicSelectionBox.endX),
          Math.max(basicSelectionBox.startY, basicSelectionBox.endY),
        ]);
        const [maxLng, maxLat] = viewport.unproject([
          Math.max(basicSelectionBox.startX, basicSelectionBox.endX),
          Math.min(basicSelectionBox.startY, basicSelectionBox.endY),
        ]);

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

        setBasicSelectionBox(null);
      }
    },
    [isDrawingBasicSelection, basicSelectionBox, layers]
  );

  // Helper function to check if a feature is within bounds
  const checkFeatureInBounds = (
    feature: any,
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number
  ): boolean => {
    const coords = feature.geometry.coordinates;
    const type = feature.geometry.type;

    const isPointInBounds = (coord: number[]): boolean => {
      const [lng, lat] = coord;
      return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
    };

    const checkCoords = (coordinates: any): boolean => {
      if (type === "Point") {
        return isPointInBounds(coordinates);
      } else if (type === "LineString") {
        return coordinates.some((coord: number[]) => isPointInBounds(coord));
      } else if (type === "Polygon") {
        return coordinates[0].some((coord: number[]) => isPointInBounds(coord));
      } else if (type === "MultiPoint") {
        return coordinates.some((coord: number[]) => isPointInBounds(coord));
      } else if (type === "MultiLineString") {
        return coordinates.some((line: number[][]) =>
          line.some((coord: number[]) => isPointInBounds(coord))
        );
      } else if (type === "MultiPolygon") {
        return coordinates.some((polygon: number[][][]) =>
          polygon[0].some((coord: number[]) => isPointInBounds(coord))
        );
      }
      return false;
    };

    return checkCoords(coords);
  };

  const handleDeckFeatureHover = useCallback(
    (info: any, event: any) => {
      if (info.object) {
        setHoveredFeature(info.object);
        // Set cursor based on basic tool mode first (if not in edit mode)
        if (editMode === "view") {
          if (basicTool === "view") {
            setCursor("pointer"); // Pointer for viewing features
          } else if (basicTool === "select") {
            setCursor("pointer"); // Pointer for selecting features
          } else if (basicTool === "selectByArea") {
            setCursor("crosshair"); // Crosshair for area selection
          } else if (basicTool === "move") {
            setCursor("grab"); // Grab cursor for moving features
          } else {
            setCursor("pointer"); // Default pointer for viewing
          }
        } else if (editMode === "modify") {
          setCursor("move"); // Move cursor for modifying features
        } else if (
          editMode === "transform" ||
          editMode === "scale" ||
          editMode === "translate" ||
          editMode === "rotate"
        ) {
          setCursor("grab"); // Grab cursor for transformation modes
        } else {
          setCursor("crosshair"); // Crosshair for drawing modes (drawPoint, drawLine, drawPolygon, drawRectangle, drawCircle)
        }
      } else {
        setHoveredFeature(null);
        // Default cursor based on edit mode and basic tool
        if (editMode === "view") {
          if (basicTool === "selectByArea") {
            setCursor("crosshair"); // Keep crosshair for area selection
          } else if (
            basicTool === "move" &&
            selectedFeaturesForMove.indexes.length > 0
          ) {
            setCursor("auto"); // Keep auto when not hovering in move mode
          } else {
            setCursor("auto");
          }
        } else if (editMode === "modify") {
          setCursor("auto");
        } else if (
          editMode === "transform" ||
          editMode === "scale" ||
          editMode === "translate" ||
          editMode === "rotate"
        ) {
          setCursor("auto"); // Default cursor for transformation modes when not hovering
        } else {
          setCursor("crosshair"); // Keep crosshair for drawing modes (drawPoint, drawLine, drawPolygon, drawRectangle, drawCircle) even when not hovering
        }
      }
    },
    [
      editMode,
      basicTool,
      selectedFeaturesForMove.indexes.length,
      setHoveredFeature,
      setCursor,
    ]
  );

  const handlePanelWidthChange = (width: number) => {
    setPanelWidth(width);
  };

  // Calculate bounds from GeoJSON data
  const calculateBoundsFromGeojson = useCallback(
    (
      geojsonData: FeatureCollection
    ): {
      minLng: number;
      minLat: number;
      maxLng: number;
      maxLat: number;
    } | null => {
      if (
        !geojsonData ||
        !geojsonData.features ||
        geojsonData.features.length === 0
      ) {
        return null;
      }

      let minLng = Infinity,
        minLat = Infinity,
        maxLng = -Infinity,
        maxLat = -Infinity;

      const processCoordinates = (coords: any): void => {
        if (Array.isArray(coords) && coords.length > 0) {
          if (typeof coords[0] === "number") {
            // This is a coordinate pair [lng, lat]
            const [lng, lat] = coords;
            if (
              !isNaN(lng) &&
              !isNaN(lat) &&
              lng >= -180 &&
              lng <= 180 &&
              lat >= -90 &&
              lat <= 90
            ) {
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
            }
          } else {
            // This is an array of coordinates or arrays
            coords.forEach(processCoordinates);
          }
        }
      };

      geojsonData.features.forEach((feature: any) => {
        if (feature.geometry && feature.geometry.coordinates) {
          processCoordinates(feature.geometry.coordinates);
        }
      });

      if (minLng === Infinity) return null;

      // Add some padding
      const lngPadding = Math.min((maxLng - minLng) * 0.1, 10);
      const latPadding = Math.min((maxLat - minLat) * 0.1, 10);

      return {
        minLng: Math.max(minLng - lngPadding, -180),
        minLat: Math.max(minLat - latPadding, -90),
        maxLng: Math.min(maxLng + lngPadding, 180),
        maxLat: Math.min(maxLat + latPadding, 90),
      };
    },
    []
  );

  // Zoom to bounds
  const zoomToBounds = useCallback(
    (bounds: {
      minLng: number;
      minLat: number;
      maxLng: number;
      maxLat: number;
    }) => {
      const centerLng = (bounds.minLng + bounds.maxLng) / 2;
      const centerLat = (bounds.minLat + bounds.maxLat) / 2;

      // Calculate zoom level based on bounds
      const lngDiff = bounds.maxLng - bounds.minLng;
      const latDiff = bounds.maxLat - bounds.minLat;
      const maxDiff = Math.max(lngDiff, latDiff);

      let zoom = 10;
      if (maxDiff < 0.01) zoom = 16;
      else if (maxDiff < 0.1) zoom = 13;
      else if (maxDiff < 1) zoom = 10;
      else if (maxDiff < 10) zoom = 7;
      else if (maxDiff < 50) zoom = 5;
      else zoom = 3;

      // Clamp zoom between reasonable values
      zoom = Math.min(Math.max(zoom, 0), 18);

      // Trigger zoom animation via MapRenderer
      setZoomTarget({
        longitude: centerLng,
        latitude: centerLat,
        zoom: zoom,
        pitch: 0,
        bearing: 0,
      });

      console.log(
        `📍 Zooming to bounds: lng=${centerLng.toFixed(
          4
        )}, lat=${centerLat.toFixed(4)}, zoom=${zoom}`
      );
    },
    []
  );

  // Global drag and drop handlers
  const handleGlobalDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsGlobalDragOver(true);
  }, []);

  const handleGlobalDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set to false if we're leaving the window entirely
    if (event.currentTarget === event.target) {
      setIsGlobalDragOver(false);
    }
  }, []);

  const handleGlobalDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsGlobalDragOver(false);

      const files = Array.from(event.dataTransfer.files);
      const supportedExtensions = [
        "geojson",
        "json",
        "csv",
        "kml",
        "shp",
        "kmz",
      ];

      setIsLoading(true);

      try {
        for (const file of files) {
          const ext = file.name.toLowerCase().split(".").pop();
          if (ext && supportedExtensions.includes(ext)) {
            try {
              console.log("Loading dropped file:", file.name);

              // Read file content
              const arrayBuffer = await file.arrayBuffer();

              // Create a temporary file path using blob URL
              const blob = new Blob([arrayBuffer], { type: file.type });
              const url = URL.createObjectURL(blob);

              // Use the backend to process the file if it's a complex format
              // For now, we'll use the LoadGeospatialFile Go function for shapefiles
              let geojsonData: any;

              if (ext === "shp") {
                // For shapefiles, we need to use the backend
                // Create a temporary file to pass to the backend
                const { LoadGeospatialFile } = await import(
                  "../wailsjs/go/main/App"
                );

                // For dropped files, we need to save them temporarily or process them client-side
                // Let's process them client-side for now
                const { load } = await import("@loaders.gl/core");
                const { ShapefileLoader } = await import(
                  "@loaders.gl/shapefile"
                );
                geojsonData = await load(arrayBuffer, ShapefileLoader);
              } else if (ext === "kmz") {
                const JSZip = (await import("jszip")).default;
                const { KMLLoader } = await import("@loaders.gl/kml");
                const { load } = await import("@loaders.gl/core");

                const zip = await JSZip.loadAsync(arrayBuffer);
                const kmlFiles = Object.keys(zip.files).filter(
                  (name) =>
                    name.toLowerCase().endsWith(".kml") && !zip.files[name].dir
                );

                if (kmlFiles.length > 0) {
                  const kmlContent = await zip.files[kmlFiles[0]].async("text");
                  geojsonData = await load(kmlContent, KMLLoader);
                } else {
                  throw new Error("No KML files found in KMZ archive");
                }
              } else if (ext === "kml") {
                const { KMLLoader } = await import("@loaders.gl/kml");
                const { load } = await import("@loaders.gl/core");
                const text = new TextDecoder().decode(arrayBuffer);
                geojsonData = await load(text, KMLLoader);
              } else if (ext === "geojson" || ext === "json") {
                const text = new TextDecoder().decode(arrayBuffer);
                geojsonData = JSON.parse(text);
              } else if (ext === "csv") {
                // Parse CSV
                const text = new TextDecoder().decode(arrayBuffer);
                const lines = text.trim().split("\n");
                if (lines.length < 2) {
                  throw new Error(
                    "CSV file must have at least a header and one data row"
                  );
                }

                const headers = lines[0]
                  .split(",")
                  .map((h) => h.trim().toLowerCase());
                const features: any[] = [];

                const latIndex = headers.findIndex(
                  (h) =>
                    h.includes("lat") || h.includes("y") || h === "latitude"
                );
                const lngIndex = headers.findIndex(
                  (h) =>
                    h.includes("lng") ||
                    h.includes("lon") ||
                    h.includes("x") ||
                    h === "longitude"
                );

                if (latIndex === -1 || lngIndex === -1) {
                  throw new Error(
                    "CSV file must contain latitude and longitude columns"
                  );
                }

                for (let i = 1; i < lines.length; i++) {
                  const values = lines[i].split(",").map((v) => v.trim());
                  if (values.length !== headers.length) continue;

                  const lat = parseFloat(values[latIndex]);
                  const lng = parseFloat(values[lngIndex]);

                  if (
                    !isNaN(lng) &&
                    !isNaN(lat) &&
                    lng >= -180 &&
                    lng <= 180 &&
                    lat >= -90 &&
                    lat <= 90
                  ) {
                    const properties: any = {};
                    headers.forEach((header, index) => {
                      if (index !== latIndex && index !== lngIndex) {
                        properties[header] = values[index];
                      }
                    });

                    features.push({
                      type: "Feature",
                      geometry: {
                        type: "Point",
                        coordinates: [lng, lat],
                      },
                      properties,
                    });
                  }
                }

                geojsonData = {
                  type: "FeatureCollection",
                  features,
                };
              }

              if (geojsonData && geojsonData.features) {
                // Generate a layer color
                const colors = [
                  [33, 150, 243],
                  [255, 152, 0],
                  [76, 175, 80],
                  [233, 30, 99],
                  [156, 39, 176],
                  [255, 235, 59],
                  [121, 85, 72],
                  [96, 125, 139],
                ];
                const colorIndex = layers.length % colors.length;

                const newLayer: IVectorLayer = {
                  id: `layer_${Date.now()}_${Math.random()}`,
                  data: geojsonData as FeatureCollection,
                  file_name: file.name,
                  file_path: url,
                  color: colors[colorIndex] as [number, number, number],
                  type: "vector",
                  labelField: "",
                  showLabels: false,
                };

                addLayer(newLayer);
                console.log(`✅ Successfully loaded: ${file.name}`);

                // Calculate bounds and zoom to the layer
                const bounds = calculateBoundsFromGeojson(
                  geojsonData as FeatureCollection
                );
                if (bounds) {
                  zoomToBounds(bounds);
                }
              }
            } catch (error) {
              console.error(`Error loading file ${file.name}:`, error);
              setErrorMessage(`Failed to load ${file.name}: ${error}`);
            }
          } else {
            console.warn(`Unsupported file format: ${file.name}`);
            setErrorMessage(
              `Unsupported file format: ${file.name}. Supported formats: GeoJSON, KML, KMZ, Shapefile, CSV`
            );
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [layers, addLayer, setIsLoading, setErrorMessage]
  );

  // Bounds drawing handlers
  const handleStartDrawingBounds = () => {
    setIsDrawingBounds(true);
    setDrawnBounds(null);
    setBoundsFeatureCollection({ type: "FeatureCollection", features: [] });
    setBoundsDrawingMode(new DrawRectangleMode());
    // Exit any current edit mode
    setEditMode("view");
    setEditableLayerId(null);
  };

  const handleFinishDrawingBounds = () => {
    setIsDrawingBounds(false);
    // The bounds will remain in drawnBounds state for use in queries
  };

  const handleCancelDrawingBounds = () => {
    setIsDrawingBounds(false);
    setDrawnBounds(null);
    setBoundsFeatureCollection({ type: "FeatureCollection", features: [] });
    setBoundsDrawingMode(new DrawRectangleMode());
  };

  useEffect(() => {
    // Load indexed files on component mount
    listIndexedFiles()
      .then((files) => {
        setIndexedFiles(files || []);
      })
      .catch((error) => {
        console.error("Failed to load indexed files:", error);
        setIndexedFiles([]);
      });
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to close feature details or cancel selection
      if (event.key === "Escape") {
        if (featureDetailsPanelOpen) {
          setFeatureDetailsPanelOpen(false);
          setSelectedFeature(null);
        } else if (selectedFeaturesForMove.indexes.length > 0) {
          // Clear basic tool selections
          setSelectedFeaturesForMove({ layerId: null, indexes: [] });
        } else if (selectedEditFeatureIndexes.length > 0) {
          setSelectedEditFeatureIndexes([]);
        }
        return;
      }

      // Delete key to remove selected features (only in edit mode)
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        editMode !== "view" &&
        editableLayerId &&
        selectedEditFeatureIndexes.length > 0
      ) {
        event.preventDefault();

        // Confirm deletion
        const confirmDelete = window.confirm(
          `Delete ${selectedEditFeatureIndexes.length} selected feature${
            selectedEditFeatureIndexes.length > 1 ? "s" : ""
          }?`
        );

        if (confirmDelete) {
          const layer = layers.find((l) => l.id === editableLayerId);
          if (layer && layer.data) {
            const updatedData = { ...layer.data };
            const newFeatures = updatedData.features.filter(
              (_: any, index: number) =>
                !selectedEditFeatureIndexes.includes(index)
            );
            updatedData.features = newFeatures;

            const updatedLayers = layers.map((l) => {
              if (l.id === editableLayerId) {
                return { ...l, data: updatedData };
              }
              return l;
            });

            setLayers(updatedLayers);
            setLayerUpdateCounter((prev) => prev + 1);
            setSelectedEditFeatureIndexes([]);
            console.log(
              `🗑️ Deleted ${selectedEditFeatureIndexes.length} feature(s)`
            );
          }
        }
        return;
      }

      // Arrow key nudging for precise positioning (only in translate mode with selection)
      if (
        editMode === "translate" &&
        editableLayerId &&
        selectedEditFeatureIndexes.length > 0 &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();

        const nudgeDistance = event.shiftKey ? 0.001 : 0.0001; // Shift for larger nudge
        let dx = 0,
          dy = 0;

        switch (event.key) {
          case "ArrowUp":
            dy = nudgeDistance;
            break;
          case "ArrowDown":
            dy = -nudgeDistance;
            break;
          case "ArrowLeft":
            dx = -nudgeDistance;
            break;
          case "ArrowRight":
            dx = nudgeDistance;
            break;
        }

        const layer = layers.find((l) => l.id === editableLayerId);
        if (layer && layer.data) {
          const updatedData = JSON.parse(JSON.stringify(layer.data));

          selectedEditFeatureIndexes.forEach((index) => {
            const feature = updatedData.features[index];
            if (!feature) return;

            const nudgeCoordinates = (coords: any): any => {
              if (typeof coords[0] === "number") {
                return [coords[0] + dx, coords[1] + dy];
              }
              return coords.map(nudgeCoordinates);
            };

            if (feature.geometry && feature.geometry.coordinates) {
              feature.geometry.coordinates = nudgeCoordinates(
                feature.geometry.coordinates
              );
            }
          });

          const updatedLayers = layers.map((l) => {
            if (l.id === editableLayerId) {
              return { ...l, data: updatedData };
            }
            return l;
          });

          setLayers(updatedLayers);
          setLayerUpdateCounter((prev) => prev + 1);
          console.log(`⬆️ Nudged feature(s) by ${nudgeDistance} degrees`);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    featureDetailsPanelOpen,
    editMode,
    editableLayerId,
    selectedEditFeatureIndexes,
    selectedFeaturesForMove.indexes.length,
    layers,
    setLayers,
    setLayerUpdateCounter,
    setSelectedFeature,
  ]);

  // Handle edit events
  const handleEditEvent = (info: any, layer: IVectorLayer) => {
    const { editType, updatedData, selectedFeatureIndexes, data, editContext } =
      info;

    // Calculate drag distance for movePosition events
    if (editType === "movePosition" && editContext?.position) {
      const currentPos = editContext.position as [number, number];

      if (!dragStartPosition) {
        // First move - set start position
        setDragStartPosition(currentPos);
        setDragDistance(0);
      } else {
        // Calculate distance from start position using Haversine formula for geographic coordinates
        const [lon1, lat1] = dragStartPosition;
        const [lon2, lat2] = currentPos;

        const R = 6371000; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distance = R * c; // Distance in meters
        setDragDistance(distance);
      }
    }

    // Reset drag tracking when finishing move or changing modes
    if (
      editType === "finishMovePosition" ||
      editType === "select" ||
      editType === "deselect"
    ) {
      setDragStartPosition(null);
      setDragDistance(null);
    }

    // Update layer data for completed operations and discrete actions
    const shouldUpdateLayerData =
      editType === "addFeature" ||
      editType === "removeFeature" ||
      editType === "finishMovePosition" ||
      editType === "movePosition" ||
      editType === "translated" ||
      editType === "scaled" ||
      editType === "rotated" ||
      editType === "addPosition" ||
      editType === "removePosition" ||
      editType === "extruded" ||
      editType === "split" ||
      editType === "edit";

    if (shouldUpdateLayerData && updatedData) {
      const updatedLayers = layers.map((l) => {
        if (l.id === layer.id) {
          return { ...l, data: updatedData };
        }
        return l;
      });
      setLayers(updatedLayers);
      console.log(`📝 Layer data updated for ${editType}`);

      // Throttle layer updates during dragging for better performance
      if (editType === "movePosition") {
        if (layerUpdateThrottleRef.current) {
          clearTimeout(layerUpdateThrottleRef.current);
        }
        layerUpdateThrottleRef.current = setTimeout(() => {
          setLayerUpdateCounter((prev) => prev + 1);
        }, 100); // Update every 100ms during drag
      } else {
        // Immediate update for non-drag operations
        setLayerUpdateCounter((prev) => prev + 1);
      }
    }

    // Handle feature selection for modify mode
    if (
      editType === "select" ||
      editType === "deselect" ||
      editContext?.selectedFeatureIndexes !== undefined
    ) {
      const newSelectedIndexes =
        editContext?.selectedFeatureIndexes || selectedFeatureIndexes || [];
      setSelectedEditFeatureIndexes(newSelectedIndexes);
      console.log("🎯 Selected feature indexes updated:", newSelectedIndexes);
    }

    // Update selected feature indexes for proper selection handling
    if (selectedFeatureIndexes !== undefined) {
      setSelectedEditFeatureIndexes(selectedFeatureIndexes);
    }

    console.log(`Edit event: ${editType}`, info);
  };

  // Handle edit mode change
  const handleEditModeChange = (newMode: string) => {
    setEditMode(newMode);

    // Reset selected feature indexes when changing modes
    setSelectedEditFeatureIndexes([]);

    // Update cursor based on new edit mode
    if (newMode === "view") {
      setCursor("auto");
    } else if (newMode === "modify") {
      setCursor("auto");
    } else if (
      newMode === "transform" ||
      newMode === "scale" ||
      newMode === "translate" ||
      newMode === "rotate"
    ) {
      setCursor("auto"); // Transformation modes start with auto cursor
    } else {
      setCursor("crosshair"); // Drawing modes get crosshair cursor
    }

    console.log(`Edit mode changed to: ${newMode}`);
  };

  // Handle edit events for basic move tool
  const handleBasicMoveEdit = (info: any) => {
    const { editType, updatedData } = info;

    if (!selectedFeaturesForMove.layerId) return;

    // Update layer data when features are moved
    if (editType === "finishMovePosition" && updatedData) {
      const updatedLayers = layers.map((l) => {
        if (l.id === selectedFeaturesForMove.layerId) {
          return { ...l, data: updatedData };
        }
        return l;
      });
      setLayers(updatedLayers);
      setLayerUpdateCounter((prev) => prev + 1);
      console.log(
        `🚚 Moved ${selectedFeaturesForMove.indexes.length} feature(s)`
      );
    }
  };

  // Use the custom hook for deck layers
  const { layers: deckLayersToRender, editableLayer } = useDeckLayers({
    layers,
    layerVisibility,
    selectedDeckFeature: selectedFeature,
    hoveredDeckFeature: hoveredFeature,
    editMode,
    editableLayerId,
    selectedEditFeatureIndexes,
    onEditEvent: handleEditEvent,
    layerUpdateCounter,
    isSelectingExtrudePoints,
    layerStyleConfigs,
    basicTool,
    selectedFeaturesForMove,
    onBasicMoveEdit: handleBasicMoveEdit,
  });

  // Bounds drawing data for EditableGeoJsonLayer
  const [boundsFeatureCollection, setBoundsFeatureCollection] = useState<any>({
    type: "FeatureCollection",
    features: [],
  });
  const [boundsDrawingMode, setBoundsDrawingMode] = useState<any>(
    new DrawRectangleMode()
  );

  // Add bounds drawing layer
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
  }, [isDrawingBounds, boundsFeatureCollection, boundsDrawingMode]);

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

  // Combine all layers
  const allLayers = useMemo(() => {
    const layers = [...deckLayersToRender];

    // Add bounds drawing or visualization layer
    if (boundsDrawingLayer) {
      layers.push(boundsDrawingLayer);
    } else if (boundsVisualizationLayer) {
      layers.push(boundsVisualizationLayer);
    }

    // Add selected extrude points layer
    if (selectedPointsLayer) {
      layers.push(selectedPointsLayer);
    }

    // Add selected geometry features layer
    if (selectedGeometryFeaturesLayer) {
      layers.push(selectedGeometryFeaturesLayer);
    }

    return layers;
  }, [
    deckLayersToRender,
    boundsDrawingLayer,
    boundsVisualizationLayer,
    selectedPointsLayer,
    selectedGeometryFeaturesLayer,
  ]);

  return (
    <ThemeProvider theme={liquidGlassTheme}>
      <CssBaseline />
      <Box
        onDragOver={handleGlobalDragOver}
        onDragLeave={handleGlobalDragLeave}
        onDrop={handleGlobalDrop}
        sx={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          background: "transparent",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.1) 0%, rgba(30, 58, 138, 0.05) 50%, rgba(6, 78, 59, 0.1) 100%)",
            backdropFilter: "blur(0.5px)",
            zIndex: -1,
          },
        }}
      >
        <Box
          sx={{
            flex: 1,
            position: "relative",
            marginLeft: isPanelOpen ? `${panelWidth}px` : "40px",
            marginBottom: isOverpassPanelOpen ? "400px" : "35px",
            transition: "margin-left 0.3s ease, margin-bottom 0.3s ease",
          }}
        >
          <MapRenderer
            mapStyle={mapStyle}
            mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
            deckLayers={allLayers}
            cursor={cursor}
            zoomTarget={zoomTarget}
            onDeckFeatureClick={handleDeckFeatureClick}
            onDeckFeatureHover={handleDeckFeatureHover}
            onViewStateChange={handleViewStateChange}
            editableLayer={editableLayer}
            onMouseDown={handleMapMouseDown}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
          />

          {/* Selection Rectangle Overlay */}
          {isDrawingBasicSelection && basicSelectionBox && (
            <Box
              sx={{
                position: "absolute",
                left: Math.min(
                  basicSelectionBox.startX,
                  basicSelectionBox.endX
                ),
                top: Math.min(basicSelectionBox.startY, basicSelectionBox.endY),
                width: Math.abs(
                  basicSelectionBox.endX - basicSelectionBox.startX
                ),
                height: Math.abs(
                  basicSelectionBox.endY - basicSelectionBox.startY
                ),
                border: "2px solid rgba(59, 130, 246, 0.8)",
                background: "rgba(59, 130, 246, 0.1)",
                pointerEvents: "none",
                zIndex: 999,
              }}
            />
          )}

          <MapControls mapStyle={mapStyle} setMapStyle={handleStyleChange} />

          {/* Simple drawing notification */}
          {isDrawingBounds && (
            <Snackbar
              open={true}
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
              sx={{ mt: 2 }}
            >
              <Alert
                severity="info"
                sx={{
                  backgroundColor: "rgba(156, 39, 176, 0.95)",
                  color: "white",
                  "& .MuiAlert-icon": {
                    color: "white",
                  },
                }}
              >
                Click and drag to draw query bounds
              </Alert>
            </Snackbar>
          )}

          {/* Selection by area notification */}
          {basicTool === "selectByArea" && editMode === "view" && (
            <Snackbar
              open={true}
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
              sx={{ mt: 2 }}
            >
              <Alert
                severity="info"
                sx={{
                  backgroundColor: "rgba(59, 130, 246, 0.95)",
                  color: "white",
                  "& .MuiAlert-icon": {
                    color: "white",
                  },
                }}
              >
                Click and drag to select features in area
              </Alert>
            </Snackbar>
          )}

          {/* Geometry Tools */}
          <GeometryTools
            layers={layers}
            editableLayerId={editableLayerId}
            selectedFeatures={selectedGeometryFeatures}
            selectedPoints={selectedExtrudePoints}
            onPointsChange={setSelectedExtrudePoints}
            onPointSelectionModeChange={(enabled) => {
              setIsSelectingExtrudePoints(enabled);
              if (!enabled) {
                setSelectedExtrudePoints([]);
              }
            }}
            onApplyOperation={(resultFeatures) => {
              console.log("onApplyOperation called with:", resultFeatures);
              console.log("editableLayerId:", editableLayerId);
              console.log(
                "selectedGeometryFeatures:",
                selectedGeometryFeatures
              );

              // Find which layer the selected features belong to
              let targetLayerId = editableLayerId;

              if (!targetLayerId && selectedGeometryFeatures.length > 0) {
                // Try to find the layer that contains the first selected feature
                for (const layer of layers) {
                  if (layer.data?.features) {
                    const hasFeature = layer.data.features.some((f: any) => {
                      return selectedGeometryFeatures.some(
                        (sf) => JSON.stringify(f) === JSON.stringify(sf)
                      );
                    });
                    if (hasFeature) {
                      targetLayerId = layer.id;
                      console.log("Found target layer:", targetLayerId);
                      break;
                    }
                  }
                }
              }

              if (!targetLayerId) {
                console.warn("No target layer found");
                alert(
                  "Please select an editable layer first using the Edit Controls"
                );
                return;
              }

              const layer = layers.find((l) => l.id === targetLayerId);
              if (!layer) {
                console.warn("Target layer not found");
                return;
              }

              // Replace selected features with result features
              const updatedData = { ...layer.data };
              const newFeatures = [...updatedData.features];

              // Remove original features that were selected
              const selectedIds = new Set(
                selectedGeometryFeatures.map((f) => f.id || JSON.stringify(f))
              );
              const filteredFeatures = newFeatures.filter(
                (f) => !selectedIds.has(f.id || JSON.stringify(f))
              );

              // Add result features
              updatedData.features = [...filteredFeatures, ...resultFeatures];

              console.log("Updating layer with new features:", {
                originalCount: newFeatures.length,
                filteredCount: filteredFeatures.length,
                resultCount: resultFeatures.length,
                finalCount: updatedData.features.length,
              });

              const updatedLayers = layers.map((l) => {
                if (l.id === targetLayerId) {
                  return { ...l, data: updatedData };
                }
                return l;
              });

              setLayers(updatedLayers);
              setLayerUpdateCounter((prev) => prev + 1);
              setSelectedGeometryFeatures([]);
            }}
            onSelectionModeChange={(isSelecting, toolType) => {
              setIsSelectingForGeometryTool(isSelecting);
              setActiveGeometryTool(toolType);
              if (!isSelecting) {
                setSelectedGeometryFeatures([]);
              }
            }}
            isOpen={geometryToolsOpen}
            onToggle={setGeometryToolsOpen}
          />

          {/* Basic Editing Tools (Always visible) */}
          <BasicEditingTools
            activeTool={basicTool}
            onToolChange={setBasicTool}
            selectedCount={selectedFeaturesForMove.indexes.length}
            onDelete={handleBasicDelete}
          />

          {/* Edit Controls */}
          <EditControls
            editMode={editMode}
            setEditMode={handleEditModeChange}
            editableLayerId={editableLayerId}
            setEditableLayerId={setEditableLayerId}
            layers={layers}
            selectedEditFeatureIndexes={selectedEditFeatureIndexes}
            onSave={async () => {
              // Save edited OSM data
              if (editableLayerId) {
                const layer = layers.find((l) => l.id === editableLayerId);
                if (layer && layer.data) {
                  try {
                    // @ts-ignore - Wails runtime
                    const result = await window.go.main.App.SaveEditedOSMData(
                      layer.data,
                      layer.file_name.replace("Overpass Query - ", "edited_")
                    );
                    console.log("Saved edited OSM data successfully");
                  } catch (error) {
                    console.error("Failed to save OSM data:", error);
                  }
                }
              }
            }}
            onCancel={() => {
              // Reset edit mode
              setEditMode("view");
              setEditableLayerId(null);
              console.log("Cancelled editing");
            }}
            onDelete={() => {
              // Confirm deletion
              const confirmDelete = window.confirm(
                `Delete ${selectedEditFeatureIndexes.length} selected feature${
                  selectedEditFeatureIndexes.length > 1 ? "s" : ""
                }?`
              );

              if (confirmDelete && editableLayerId) {
                const layer = layers.find((l) => l.id === editableLayerId);
                if (layer && layer.data) {
                  const updatedData = { ...layer.data };
                  const newFeatures = updatedData.features.filter(
                    (_: any, index: number) =>
                      !selectedEditFeatureIndexes.includes(index)
                  );
                  updatedData.features = newFeatures;

                  const updatedLayers = layers.map((l) => {
                    if (l.id === editableLayerId) {
                      return { ...l, data: updatedData };
                    }
                    return l;
                  });

                  setLayers(updatedLayers);
                  setLayerUpdateCounter((prev) => prev + 1);
                  setSelectedEditFeatureIndexes([]);
                  console.log(
                    `🗑️ Deleted ${selectedEditFeatureIndexes.length} feature(s) via button`
                  );
                }
              }
            }}
          />

          {/* File Panel */}
          <FilePanel
            open={isPanelOpen}
            onToggle={setIsPanelOpen}
            width={panelWidth}
            drawnBounds={drawnBounds}
            onZoomToBounds={zoomToBounds}
            onCalculateBounds={calculateBoundsFromGeojson}
          />

          {/* Overpass Panel */}
          <OverpassPanel
            isOpen={isOverpassPanelOpen}
            onToggle={setIsOverpassPanelOpen}
            drawnBounds={drawnBounds}
            isDrawingBounds={isDrawingBounds}
            onStartDrawingBounds={handleStartDrawingBounds}
            onFinishDrawingBounds={handleFinishDrawingBounds}
            onCancelDrawingBounds={handleCancelDrawingBounds}
          />

          {/* Global drag and drop overlay */}
          {isGlobalDragOver && (
            <Box
              sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(16, 185, 129, 0.1)",
                backdropFilter: "blur(4px)",
                border: "4px dashed #10b981",
                zIndex: 2000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Box
                sx={{
                  background: "rgba(15, 23, 42, 0.95)",
                  backdropFilter: "blur(20px)",
                  border: "2px solid #10b981",
                  borderRadius: 4,
                  p: 4,
                  textAlign: "center",
                  boxShadow: "0 8px 32px rgba(16, 185, 129, 0.3)",
                }}
              >
                <CloudUpload sx={{ fontSize: 64, color: "#10b981", mb: 2 }} />
                <Typography
                  variant="h5"
                  sx={{ color: "#10b981", fontWeight: 600, mb: 1 }}
                >
                  Drop files to load
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255, 255, 255, 0.8)" }}
                >
                  Supports: GeoJSON, CSV, KML, KMZ, Shapefile
                </Typography>
              </Box>
            </Box>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <Box
              sx={{
                position: "fixed",
                bottom: 16,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "white",
                p: 2,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                gap: 2,
                zIndex: 1000,
                boxShadow:
                  "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              <CircularProgress
                size={20}
                sx={{
                  color: "#10b981",
                  "& .MuiCircularProgress-circle": {
                    strokeLinecap: "round",
                  },
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Processing file(s)...
              </Typography>
            </Box>
          )}

          {/* Error message */}
          <Snackbar
            open={!!errorMessage}
            autoHideDuration={6000}
            onClose={() => setErrorMessage(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => setErrorMessage(null)}
              severity="error"
              sx={{ width: "100%" }}
            >
              {errorMessage}
            </Alert>
          </Snackbar>

          {/* Drag Distance Display */}
          {dragDistance !== null && (
            <Box
              sx={{
                position: "fixed",
                bottom: 35,
                right: 90,
                background: "rgba(15, 23, 42, 0.9)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "white",
                p: 2,
                borderRadius: 3,
                zIndex: 1000,
                boxShadow:
                  "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Distance moved:{" "}
                {dragDistance < 1
                  ? `${(dragDistance * 1000).toFixed(1)} mm`
                  : dragDistance < 1000
                  ? `${dragDistance.toFixed(1)} m`
                  : `${(dragDistance / 1000).toFixed(2)} km`}
              </Typography>
            </Box>
          )}

          {/* Feature Details Panel */}
          <FeatureDetailsPanel
            feature={selectedFeature}
            isOpen={featureDetailsPanelOpen}
            isEditable={layers.length > 0 && selectedFeature !== null}
            onToggle={(isOpen) => {
              setFeatureDetailsPanelOpen(isOpen);
              if (!isOpen) {
                setSelectedFeature(null);
              }
            }}
            onFeatureUpdate={(updatedFeature) => {
              // Find which layer contains this feature
              let targetLayer: IVectorLayer | null = null;
              let featureIndex = -1;

              for (const layer of layers) {
                if (layer.data?.features) {
                  const index = layer.data.features.findIndex(
                    (f: any) => f === selectedFeature
                  );
                  if (index >= 0) {
                    targetLayer = layer;
                    featureIndex = index;
                    break;
                  }
                }
              }

              if (!targetLayer || featureIndex < 0) {
                console.warn("Could not find layer containing the feature");
                return;
              }

              // Update the feature in its layer
              const updatedData = { ...targetLayer.data };
              updatedData.features[featureIndex] = updatedFeature;

              const updatedLayers = layers.map((l) => {
                if (l.id === targetLayer!.id) {
                  return { ...l, data: updatedData };
                }
                return l;
              });

              setLayers(updatedLayers);
              setLayerUpdateCounter((prev) => prev + 1);
              setSelectedFeature(updatedFeature);
              console.log(
                `✏️ Updated feature attributes in layer: ${targetLayer.file_name}`
              );
            }}
          />

          {/* Style Controls */}
          {editMode !== "view" && editableLayerId && (
            <StyleControls
              isOpen={styleControlsOpen}
              onToggle={setStyleControlsOpen}
              selectedFeatureCount={selectedEditFeatureIndexes.length}
              currentStyle={currentStyle}
              onStyleChange={setCurrentStyle}
              onApplyStyle={() => {
                if (!editableLayerId || selectedEditFeatureIndexes.length === 0)
                  return;

                const layer = layers.find((l) => l.id === editableLayerId);
                if (!layer || !layer.data) return;

                const updatedData = { ...layer.data };

                // Apply style to selected features
                selectedEditFeatureIndexes.forEach((index) => {
                  const feature = updatedData.features[index];
                  if (feature) {
                    // Store style in feature properties
                    feature.properties = {
                      ...feature.properties,
                      _style: {
                        fillColor: currentStyle.fillColor,
                        strokeColor: currentStyle.strokeColor,
                        fillOpacity: currentStyle.fillOpacity,
                        strokeOpacity: currentStyle.strokeOpacity,
                        strokeWidth: currentStyle.strokeWidth,
                        pointRadius: currentStyle.pointRadius,
                      },
                    };
                  }
                });

                const updatedLayers = layers.map((l) => {
                  if (l.id === editableLayerId) {
                    return { ...l, data: updatedData };
                  }
                  return l;
                });

                setLayers(updatedLayers);
                setLayerUpdateCounter((prev) => prev + 1);
                console.log(
                  `🎨 Applied style to ${selectedEditFeatureIndexes.length} feature(s)`
                );
              }}
            />
          )}

          {/* Layer Style Panel */}
          {layerStylePanelOpen && layers.length > 0 && (
            <LayerStylePanel
              layers={layers}
              selectedLayer={selectedLayerForStyling || layers[0]?.id}
              onLayerSelect={(layerId) => setSelectedLayerForStyling(layerId)}
              onStyleUpdate={(config) => {
                setLayerStyleConfigs({
                  ...layerStyleConfigs,
                  [config.layerId]: config,
                });
                setLayerUpdateCounter((prev) => prev + 1);
                console.log(
                  `🎨 Applied layer style configuration to ${config.layerId}`
                );
              }}
              currentConfig={
                selectedLayerForStyling
                  ? layerStyleConfigs[selectedLayerForStyling] || null
                  : null
              }
            />
          )}

          {/* Layer Style Toggle Button */}
          {!layerStylePanelOpen && layers.length > 0 && (
            <Box
              sx={{
                position: "fixed",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1000,
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                padding: 0.5,
                borderRadius: 2,
                border: "1px solid rgba(255, 255, 255, 0.2)",
                animation: "fadeInBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                "@keyframes fadeInBounce": {
                  "0%": {
                    opacity: 0,
                    transform: "translateX(-50%) scale(0.8)",
                  },
                  "100%": {
                    opacity: 1,
                    transform: "translateX(-50%) scale(1)",
                  },
                },
              }}
            >
              <Tooltip title="Layer Styling & Categories" placement="bottom">
                <Fab
                  size="small"
                  onClick={() => {
                    setLayerStylePanelOpen(true);
                    if (!selectedLayerForStyling && layers.length > 0) {
                      setSelectedLayerForStyling(layers[0].id);
                    }
                  }}
                  sx={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    minHeight: 32,
                    background: "rgba(255, 255, 255, 0.95)",
                    color: "#9c27b0",
                    boxShadow: 1,
                    "& .MuiSvgIcon-root": {
                      fontSize: "1.25rem",
                    },
                    "&:hover": {
                      background: "white",
                      color: "#7b1fa2",
                      boxShadow: 2,
                      transform: "scale(1.08)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <Layers />
                </Fab>
              </Tooltip>
            </Box>
          )}

          {/* Close Layer Style Panel Button */}
          {layerStylePanelOpen && (
            <Box
              sx={{
                position: "fixed",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1000,
                backdropFilter: "blur(10px)",
                padding: 0.5,
                animation: "fadeInSlideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                "@keyframes fadeInSlideDown": {
                  "0%": {
                    opacity: 0,
                    transform: "translateX(-50%) translateY(-10px)",
                  },
                  "100%": {
                    opacity: 1,
                    transform: "translateX(-50%) translateY(0)",
                  },
                },
              }}
            >
              <IconButton
                onClick={() => setLayerStylePanelOpen(false)}
                sx={{
                  width: 40,
                  height: 40,
                  background: "rgba(15, 23, 42, 0.95)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  "&:hover": {
                    background: "rgba(30, 41, 59, 0.95)",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                <Close />
              </IconButton>
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
