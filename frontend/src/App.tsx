import React, { useCallback, useEffect, useRef } from "react";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Fab,
  Tooltip,
  Typography,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";

import { listIndexedFiles } from "./utils/utils";
import { IVectorLayer } from "./types/interfaces";
import MapControls from "./components/MapControls";
import FilePanel from "./components/FilePanel";
import LocationSearch from "./components/LocationSearch";
import EditControls from "./components/EditControls";
import FeatureDetailsDialog from "./components/FeatureDetailsDialog";
import MapRenderer from "./components/MapRenderer";
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
  useMapViewportSetter,
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
  const { setViewState } = useMapViewportSetter();
  // Local state for editing and map style
  const [mapStyle, setMapStyle] = React.useState<string>(MAP_STYLES[0].url);
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

  // Throttle viewport updates to improve performance
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  // Throttle layer updates to improve performance during dragging
  const layerUpdateThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // Track view state changes to store current viewport for external components
  const handleViewStateChange = (evt: any) => {
    // Throttle viewport updates to reduce performance impact
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }

    throttleRef.current = setTimeout(() => {
      // Store current viewport in Zustand store for external components that need map state
      setViewState(evt.viewState);
      // console.log('View state changed:', evt.viewState);
    }, 100); // Update every 100ms at most
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
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
        console.log("Feature clicked:", info);
      } else {
        setSelectedFeature(null);
      }
    },
    [editMode, setSelectedFeature, setSelectedEditFeatureIndexes]
  );

  const handleDeckFeatureHover = useCallback(
    (info: any, event: any) => {
      if (info.object) {
        setHoveredFeature(info.object);
        // Set cursor based on edit mode
        if (editMode === "view") {
          setCursor("pointer"); // Pointer for viewing/selecting features
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
        // Default cursor based on edit mode
        if (editMode === "view") {
          setCursor("auto");
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
    [editMode, setHoveredFeature, setCursor]
  );

  const handlePanelWidthChange = (width: number) => {
    setPanelWidth(width);
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

  // Handle escape key to close feature details
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedFeature) {
        setSelectedFeature(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedFeature, setSelectedFeature]);

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
  });

  return (
    <ThemeProvider theme={liquidGlassTheme}>
      <CssBaseline />
      <Box
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
        <Box sx={{ flex: 1, position: "relative" }}>
          <MapRenderer
            mapStyle={mapStyle}
            mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
            deckLayers={deckLayersToRender}
            cursor={cursor}
            onDeckFeatureClick={handleDeckFeatureClick}
            onDeckFeatureHover={handleDeckFeatureHover}
            onViewStateChange={handleViewStateChange}
            editableLayer={editableLayer}
          />

          <MapControls mapStyle={mapStyle} setMapStyle={handleStyleChange} />

          {/* Location Search */}
          <LocationSearch />

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
          />

          {/* File Panel Toggle Button */}
          {!isPanelOpen && (
            <Tooltip title="Open File Panel" placement="right">
              <Fab
                color="primary"
                size="small"
                onClick={() => handlePanelToggle(true)}
                sx={{
                  color: "white",
                  position: "absolute",
                  top: 16,
                  left: 16,
                  zIndex: 1000,
                }}
              >
                <MenuIcon />
              </Fab>
            </Tooltip>
          )}

          {/* File Panel */}
          <FilePanel
            open={isPanelOpen}
            onClose={() => handlePanelToggle(false)}
            width={panelWidth}
          />

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

          {/* Feature Details Dialog */}
          <FeatureDetailsDialog
            feature={selectedFeature}
            open={!!selectedFeature}
            onClose={() => setSelectedFeature(null)}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
