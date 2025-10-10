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
import LayerManager, {
  LayerStyleConfig,
} from "./components/LayerManager";
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
import { useEditingState } from "./hooks/useEditingState";
import { useDrawingState } from "./hooks/useDrawingState";
import { useDeckEventHandlers } from "./hooks/useDeckEventHandlers";
import { useFileDropHandler } from "./hooks/useFileDropHandler";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useSpecialLayers } from "./hooks/useSpecialLayers";
import {
  calculateBoundsFromGeojson,
  calculateZoomTarget,
} from "./utils/mapUtils";
import "./App.css";

function App() {
  // Zustand hooks - Existing
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

  // Zustand hooks - New editing state
  const {
    editMode,
    setEditMode,
    editableLayerId,
    setEditableLayerId,
    selectedEditFeatureIndexes,
    setSelectedEditFeatureIndexes,
    basicTool,
    setBasicTool,
    selectedFeaturesForMove,
    setSelectedFeaturesForMove,
    dragDistance,
    setDragDistance,
    dragStartPosition,
    setDragStartPosition,
    layerUpdateCounter,
    incrementLayerUpdateCounter,
  } = useEditingState();

  // Zustand hooks - New drawing state
  const {
    isDrawingBounds,
    setIsDrawingBounds,
    drawnBounds,
    setDrawnBounds,
    boundsFeatureCollection,
    setBoundsFeatureCollection,
    boundsDrawingMode,
    setBoundsDrawingMode,
    selectionFeatureCollection,
    setSelectionFeatureCollection,
    selectionDrawingMode,
    setSelectionDrawingMode,
    geometryToolsOpen,
    setGeometryToolsOpen,
    isSelectingForGeometryTool,
    setIsSelectingForGeometryTool,
    activeGeometryTool,
    setActiveGeometryTool,
    selectedGeometryFeatures,
    setSelectedGeometryFeatures,
    selectedExtrudePoints,
    setSelectedExtrudePoints,
    isSelectingExtrudePoints,
    setIsSelectingExtrudePoints,
    startBoundsDrawing,
    finishBoundsDrawing,
    cancelBoundsDrawing,
  } = useDrawingState();

  // Deck.gl event handlers
  const {
    handleDeckFeatureClick,
    handleDeckFeatureHover,
    handleEditEvent,
    handleBasicMoveEdit,
  } = useDeckEventHandlers({ layers, setLayers });

  // Local state for map style and UI panels
  const [mapStyle, setMapStyle] = React.useState<string>(MAP_STYLES[0].url);
  const [zoomTarget, setZoomTarget] = React.useState<{
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  } | null>(null);
  const [featureDetailsPanelOpen, setFeatureDetailsPanelOpen] =
    React.useState<boolean>(false);
  const [isOverpassPanelOpen, setIsOverpassPanelOpen] =
    React.useState<boolean>(false);
  const [styleControlsOpen, setStyleControlsOpen] =
    React.useState<boolean>(false);
  const [currentStyle, setCurrentStyle] =
    React.useState<FeatureStyle>(DEFAULT_STYLE);
  const [layerStyleConfigs, setLayerStyleConfigs] = React.useState<
    Record<string, LayerStyleConfig>
  >({});
  const [layerManagerOpen, setLayerManagerOpen] = React.useState<boolean>(false);

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

  // Zoom to bounds helper
  const zoomToBounds = useCallback(
    (bounds: {
      minLng: number;
      minLat: number;
      maxLng: number;
      maxLat: number;
    }) => {
      const newZoomTarget = calculateZoomTarget(bounds);
      setZoomTarget(newZoomTarget);
      console.log(
        `📍 Zooming to bounds: lng=${newZoomTarget.longitude.toFixed(
          4
        )}, lat=${newZoomTarget.latitude.toFixed(4)}, zoom=${newZoomTarget.zoom}`
      );
    },
    []
  );

  // File drop handling
  const {
    isGlobalDragOver,
    handleDragOver: handleGlobalDragOver,
    handleDragLeave: handleGlobalDragLeave,
    handleDrop: handleGlobalDrop,
  } = useFileDropHandler({
    layers,
    addLayer,
    setIsLoading,
    setErrorMessage,
    zoomToBounds,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    featureDetailsPanelOpen,
    setFeatureDetailsPanelOpen,
    setSelectedFeature,
    selectedFeaturesForMove,
    setSelectedFeaturesForMove,
    editMode,
    editableLayerId,
    selectedEditFeatureIndexes,
    setSelectedEditFeatureIndexes,
    layers,
    setLayers,
    incrementLayerUpdateCounter,
  });

  // Handle selection drawing mode changes
  useEffect(() => {
    if (basicTool === "selectByArea" && editMode === "view") {
      // Start selection drawing
      setSelectionDrawingMode(new DrawRectangleMode());
      setSelectionFeatureCollection({ type: "FeatureCollection", features: [] });
      console.log("📦 Started selection drawing mode");
    } else {
      // Stop selection drawing
      setSelectionDrawingMode(new ViewMode());
      setSelectionFeatureCollection({ type: "FeatureCollection", features: [] });
    }
  }, [basicTool, editMode]);

  // Open feature details panel when a feature is selected in view mode
  useEffect(() => {
    if (selectedFeature && basicTool === "view" && editMode === "view") {
      setFeatureDetailsPanelOpen(true);
    } else if (!selectedFeature) {
      setFeatureDetailsPanelOpen(false);
    }
  }, [selectedFeature, basicTool, editMode]);

  const handleStyleChange = (newStyle: string) => {
    setMapStyle(newStyle);
  };

  const handlePanelToggle = (isOpen: boolean) => {
    setIsPanelOpen(isOpen);
  };

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
        incrementLayerUpdateCounter();
        setSelectedFeaturesForMove({ layerId: null, indexes: [] });
        console.log(
          `🗑️ Deleted ${selectedFeaturesForMove.indexes.length} feature(s) via basic tools`
        );
      }
    }
  }, [selectedFeaturesForMove, layers, setLayers, incrementLayerUpdateCounter]);

  // Mouse handlers - no longer needed for selection (handled by deck.gl)
  const handleMapMouseDown = useCallback((event: any) => {
    // Reserved for future use
  }, []);

  const handleMapMouseMove = useCallback((event: any) => {
    // Reserved for future use
  }, []);

  const handleMapMouseUp = useCallback((event: any) => {
    // Reserved for future use
  }, []);

  const handlePanelWidthChange = (width: number) => {
    setPanelWidth(width);
  };

  // Bounds drawing handlers (wrapping Zustand store methods)
  const handleStartDrawingBounds = () => {
    startBoundsDrawing();
    // Exit any current edit mode
    setEditMode("view");
    setEditableLayerId(null);
  };

  const handleFinishDrawingBounds = () => {
    finishBoundsDrawing();
    console.log("✅ Finished drawing bounds");
  };

  const handleCancelDrawingBounds = () => {
    cancelBoundsDrawing();
    console.log("❌ Cancelled bounds drawing");
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
      ["transform", "scale", "translate", "rotate"].includes(newMode)
    ) {
      setCursor("auto"); // Transformation modes start with auto cursor
    } else {
      setCursor("crosshair"); // Drawing modes get crosshair cursor
    }

    console.log(`Edit mode changed to: ${newMode}`);
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

  // Special layers (bounds, selection, etc.)
  const {
    boundsDrawingLayer,
    boundsVisualizationLayer,
    selectionDrawingLayer,
    selectedPointsLayer,
    selectedGeometryFeaturesLayer,
  } = useSpecialLayers({
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
  });

  // Combine all layers
  const allLayers = useMemo(() => {
    const combinedLayers = [...deckLayersToRender];

    // Add bounds drawing or visualization layer
    if (boundsDrawingLayer) {
      combinedLayers.push(boundsDrawingLayer);
    } else if (boundsVisualizationLayer) {
      combinedLayers.push(boundsVisualizationLayer);
    }

    // Add selection drawing layer
    if (selectionDrawingLayer) {
      combinedLayers.push(selectionDrawingLayer);
    }

    // Add selected extrude points layer
    if (selectedPointsLayer) {
      combinedLayers.push(selectedPointsLayer);
    }

    // Add selected geometry features layer
    if (selectedGeometryFeaturesLayer) {
      combinedLayers.push(selectedGeometryFeaturesLayer);
    }

    return combinedLayers;
  }, [
    deckLayersToRender,
    boundsDrawingLayer,
    boundsVisualizationLayer,
    selectionDrawingLayer,
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
            isMovingFeatures={
              basicTool === "move" &&
              editMode === "view" &&
              selectedFeaturesForMove.indexes.length > 0
            }
          />

          <MapControls mapStyle={mapStyle} setMapStyle={handleStyleChange} />

          {/* Layer Manager */}
          <LayerManager
            isOpen={layerManagerOpen}
            onToggle={setLayerManagerOpen}
            onZoomToBounds={zoomToBounds}
            onStyleUpdate={(config) => {
              setLayerStyleConfigs({
                ...layerStyleConfigs,
                [config.layerId]: config,
              });
              incrementLayerUpdateCounter();
              console.log(`🎨 Applied layer style configuration to ${config.layerId}`);
            }}
            layerStyleConfigs={layerStyleConfigs}
          />

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
              incrementLayerUpdateCounter();
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
                  incrementLayerUpdateCounter();
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
              incrementLayerUpdateCounter();
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
                incrementLayerUpdateCounter();
                console.log(
                  `🎨 Applied style to ${selectedEditFeatureIndexes.length} feature(s)`
                );
              }}
            />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
