import React, { useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  IconButton,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Paper,
  Divider,
  Fab,
  Slider,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  FormControl,
  InputLabel,
  Select,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Delete,
  Save,
  FileDownload,
  Undo,
  Redo,
  MoreVert,
  Edit,
  ContentCopy,
  ZoomIn,
  Layers,
  Close,
  Palette,
  Add,
  ExpandMore,
  Category,
  FormatPaint,
} from "@mui/icons-material";
import { IVectorLayer } from "../types/interfaces";
import { useMapLayers, useLayerVisibility } from "../hooks/useMapLayers";
import { FeatureCollection } from "geojson";

export interface LayerStyle {
  fillColor: string;
  strokeColor: string;
  fillOpacity: number;
  strokeOpacity: number;
  strokeWidth: number;
  pointRadius: number;
}

export interface CategoryStyle {
  id: string;
  property: string;
  value: any;
  operator: "equals" | "contains" | "greater" | "less" | "between";
  label: string;
  style: LayerStyle;
  enabled: boolean;
}

export interface LayerStyleConfig {
  layerId: string;
  defaultStyle: LayerStyle;
  categorizedStyles: CategoryStyle[];
  stylingMode: "default" | "categorized";
}

const DEFAULT_LAYER_STYLE: LayerStyle = {
  fillColor: "#34a853",
  strokeColor: "#006428",
  fillOpacity: 0.6,
  strokeOpacity: 1.0,
  strokeWidth: 2,
  pointRadius: 18,
};

const PRESET_COLORS = [
  { name: "Green", fill: "#34a853", stroke: "#006428" },
  { name: "Blue", fill: "#2196f3", stroke: "#0d47a1" },
  { name: "Red", fill: "#ef5350", stroke: "#b71c1c" },
  { name: "Yellow", fill: "#ffd740", stroke: "#f57f17" },
  { name: "Purple", fill: "#9c27b0", stroke: "#4a148c" },
  { name: "Orange", fill: "#ff9800", stroke: "#e65100" },
  { name: "Teal", fill: "#26a69a", stroke: "#00695c" },
  { name: "Pink", fill: "#ec407a", stroke: "#ad1457" },
];

interface LayerManagerProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onZoomToBounds?: (bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  }) => void;
  onStyleUpdate?: (config: LayerStyleConfig) => void;
  layerStyleConfigs?: Record<string, LayerStyleConfig>;
}

const LayerManager: React.FC<LayerManagerProps> = ({
  isOpen,
  onToggle,
  onZoomToBounds,
  onStyleUpdate,
  layerStyleConfigs = {},
}) => {
  const { layers, setLayers, selectedLayer, setSelectedLayer } = useMapLayers();
  const { layerVisibility, toggleLayerVisibility } = useLayerVisibility();

  const [activeTab, setActiveTab] = useState<number>(0); // 0: Layers, 1: Styling

  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    layer: IVectorLayer | null;
  } | null>(null);

  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    layer: IVectorLayer | null;
    newName: string;
  }>({ open: false, layer: null, newName: "" });

  const [historyIndex, setHistoryIndex] = useState(-1);
  const [layerHistory, setLayerHistory] = useState<IVectorLayer[][]>([]);

  // Styling state
  const [selectedLayerForStyling, setSelectedLayerForStyling] = useState<
    string | null
  >(null);
  const [stylingMode, setStylingMode] = useState<"default" | "categorized">(
    "default"
  );
  const [defaultStyle, setDefaultStyle] =
    useState<LayerStyle>(DEFAULT_LAYER_STYLE);
  const [categories, setCategories] = useState<CategoryStyle[]>([]);

  // Save current state to history
  const saveToHistory = () => {
    const newHistory = layerHistory.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(layers)));
    setLayerHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setLayers(JSON.parse(JSON.stringify(layerHistory[newIndex])));
    }
  };

  // Redo functionality
  const handleRedo = () => {
    if (historyIndex < layerHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setLayers(JSON.parse(JSON.stringify(layerHistory[newIndex])));
    }
  };

  const handleContextMenu = (event: React.MouseEvent, layer: IVectorLayer) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      layer,
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleExportGeoJSON = async (layer: IVectorLayer) => {
    try {
      const geojsonStr = JSON.stringify(layer.data, null, 2);
      const fileName = `${layer.file_name.replace(/\.[^/.]+$/, "")}_export.geojson`;

      // Try using Wails file save dialog first
      // @ts-ignore - Wails runtime
      if (window.go?.main?.App?.SaveFile) {
        try {
          // @ts-ignore
          const result = await window.go.main.App.SaveFile(fileName, geojsonStr);
          console.log(`✅ Exported layer via Wails: ${layer.file_name}`, result);
          alert(`✅ Exported ${fileName}`);
          return;
        } catch (wailsError) {
          console.warn("Wails save failed, falling back to browser download:", wailsError);
        }
      }

      // Fallback to browser download
      const blob = new Blob([geojsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      // Clean up after a delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      console.log(`✅ Exported layer: ${layer.file_name}`);
      alert(`✅ Exported ${fileName}\n\nCheck your Downloads folder.`);
    } catch (error) {
      console.error("Error exporting GeoJSON:", error);
      alert(`❌ Error exporting layer: ${error}`);
    }
  };

  const handleSaveLayer = async (layer: IVectorLayer) => {
    try {
      // @ts-ignore - Wails runtime
      if (window.go?.main?.App?.SaveEditedOSMData) {
        // @ts-ignore
        await window.go.main.App.SaveEditedOSMData(layer.data, layer.file_name);
        console.log(`✅ Saved layer: ${layer.file_name}`);
        alert(`✅ Saved ${layer.file_name}\n\nChanges have been written to disk.`);
      } else {
        // Fallback to export
        console.log("Wails API not available, falling back to export");
        await handleExportGeoJSON(layer);
      }
    } catch (error) {
      console.error("Error saving layer:", error);
      alert(`❌ Error saving layer: ${error}`);
    }
  };

  const handleDeleteLayer = (layerId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this layer?"
    );
    if (confirmDelete) {
      saveToHistory();
      const layerIndex = layers.findIndex((l) => l.id === layerId);
      const updatedLayers = layers.filter((l) => l.id !== layerId);
      setLayers(updatedLayers);
      if (selectedLayer === layerIndex) {
        setSelectedLayer(-1);
      } else if (selectedLayer > layerIndex) {
        // Adjust index if deleting a layer before the selected one
        setSelectedLayer(selectedLayer - 1);
      }
      console.log(`🗑️ Deleted layer: ${layerId}`);
    }
  };

  const handleDuplicateLayer = (layer: IVectorLayer) => {
    saveToHistory();
    const duplicatedLayer: IVectorLayer = {
      ...layer,
      id: `${layer.id}_copy_${Date.now()}`,
      file_name: `${layer.file_name} (copy)`,
    };
    setLayers([...layers, duplicatedLayer]);
    console.log(`📋 Duplicated layer: ${layer.file_name}`);
  };

  const handleRenameLayer = (layer: IVectorLayer) => {
    setRenameDialog({
      open: true,
      layer,
      newName: layer.file_name,
    });
    handleContextMenuClose();
  };

  const handleRenameConfirm = () => {
    if (renameDialog.layer && renameDialog.newName.trim()) {
      saveToHistory();
      const updatedLayers = layers.map((l) =>
        l.id === renameDialog.layer!.id
          ? { ...l, file_name: renameDialog.newName.trim() }
          : l
      );
      setLayers(updatedLayers);
      setRenameDialog({ open: false, layer: null, newName: "" });
      console.log(`✏️ Renamed layer to: ${renameDialog.newName}`);
    }
  };

  const calculateLayerBounds = (layer: IVectorLayer) => {
    if (
      !layer.data ||
      !layer.data.features ||
      layer.data.features.length === 0
    ) {
      return null;
    }

    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;

    layer.data.features.forEach((feature: any) => {
      if (feature.geometry) {
        const flattenCoordinates = (coords: any[]): void => {
          if (Array.isArray(coords) && coords.length > 0) {
            if (typeof coords[0] === "number") {
              const [lng, lat] = coords;
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
            } else {
              coords.forEach(flattenCoordinates);
            }
          }
        };
        flattenCoordinates(feature.geometry.coordinates);
      }
    });

    if (minLng === Infinity) return null;

    const lngPadding = Math.min((maxLng - minLng) * 0.1, 10);
    const latPadding = Math.min((maxLat - minLat) * 0.1, 10);

    return {
      minLng: Math.max(minLng - lngPadding, -180),
      minLat: Math.max(minLat - latPadding, -90),
      maxLng: Math.min(maxLng + lngPadding, 180),
      maxLat: Math.min(maxLat + latPadding, 90),
    };
  };

  const handleZoomToLayer = (layer: IVectorLayer) => {
    const bounds = calculateLayerBounds(layer);
    if (bounds && onZoomToBounds) {
      onZoomToBounds(bounds);
      console.log(`🔍 Zooming to layer: ${layer.file_name}`);
    }
  };

  // Styling functions
  const getAvailableProperties = (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer?.data?.features || layer.data.features.length === 0) return [];

    const properties = new Set<string>();
    layer.data.features.forEach((feature: any) => {
      if (feature.properties) {
        Object.keys(feature.properties).forEach((key) => {
          if (key !== "_style") properties.add(key);
        });
      }
    });

    return Array.from(properties);
  };

  const handleAddCategory = () => {
    if (!selectedLayerForStyling) return;
    const properties = getAvailableProperties(selectedLayerForStyling);
    if (properties.length === 0) return;

    const newCategory: CategoryStyle = {
      id: `cat_${Date.now()}`,
      property: properties[0],
      value: "",
      operator: "equals",
      label: `Category ${categories.length + 1}`,
      style: { ...DEFAULT_LAYER_STYLE },
      enabled: true,
    };

    setCategories([...categories, newCategory]);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter((c) => c.id !== id));
  };

  const handleCategoryChange = (
    id: string,
    updates: Partial<CategoryStyle>
  ) => {
    setCategories(
      categories.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleApplyStyles = () => {
    if (!selectedLayerForStyling || !onStyleUpdate) return;

    const config: LayerStyleConfig = {
      layerId: selectedLayerForStyling,
      defaultStyle,
      categorizedStyles: categories,
      stylingMode,
    };

    onStyleUpdate(config);
    console.log("✨ Applied styles to layer:", selectedLayerForStyling);
  };

  const getFeatureCount = (layer: IVectorLayer): number => {
    return layer.data?.features?.length || 0;
  };

  if (!isOpen) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 10,
          right: 60,
          zIndex: 1000,
          display: "flex",
          flexDirection: "row",
          gap: 0.5,
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          padding: 0.5,
          borderRadius: 2,
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        {" "}
        <Tooltip title="Layer Manager" placement="left">
          <Fab
            size="small"
            onClick={() => onToggle(true)}
            sx={{
              width: 32,
              height: 32,
              minWidth: 32,
              minHeight: 32,
              background: "rgba(255, 255, 255, 0.95)",
              color: "#3b82f6",
              boxShadow: 1,
              "& .MuiSvgIcon-root": {
                fontSize: "1.25rem",
              },
              "&:hover": {
                background: "white",
                color: "#2563eb",
                boxShadow: 2,
                transform: "scale(1.08)",
              },
              transition: "all 0.2s ease",
              zIndex: 1000,
            }}
          >
            <Layers />
          </Fab>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        position: "fixed",
        top: 60,
        right: 16,
        width: 400,
        maxHeight: "calc(100vh - 140px)",
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          pb: 0,
          background: "rgba(255, 255, 255, 0.05)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Layers sx={{ color: "#10b981" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Layer Manager
          </Typography>
          <Chip
            label={`${layers.length} ${
              layers.length === 1 ? "layer" : "layers"
            }`}
            size="small"
            sx={{
              background: "rgba(16, 185, 129, 0.2)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          />
        </Box>
        <IconButton
          size="small"
          onClick={() => onToggle(false)}
          sx={{
            color: "rgba(255, 255, 255, 0.7)",
            "&:hover": { color: "white" },
          }}
        >
          <Close />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          sx={{
            minHeight: 40,
            "& .MuiTab-root": {
              minHeight: 40,
              color: "rgba(255, 255, 255, 0.6)",
              "&.Mui-selected": {
                color: "#10b981",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#10b981",
            },
          }}
        >
          <Tab label="Layers" icon={<Layers />} iconPosition="start" />
          <Tab label="Styling" icon={<Palette />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Actions Bar - Only for Layers tab */}
      {activeTab === 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            p: 1,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <Tooltip title="Undo">
            <span>
              <IconButton
                size="small"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                sx={{
                  color:
                    historyIndex <= 0 ? "rgba(255, 255, 255, 0.3)" : "#10b981",
                  "&:hover": { background: "rgba(16, 185, 129, 0.1)" },
                }}
              >
                <Undo fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo">
            <span>
              <IconButton
                size="small"
                onClick={handleRedo}
                disabled={historyIndex >= layerHistory.length - 1}
                sx={{
                  color:
                    historyIndex >= layerHistory.length - 1
                      ? "rgba(255, 255, 255, 0.3)"
                      : "#10b981",
                  "&:hover": { background: "rgba(16, 185, 129, 0.1)" },
                }}
              >
                <Redo fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title="Save Selected Layer">
            <span>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Save clicked, selectedLayer:", selectedLayer);
                  const layer = layers[selectedLayer];
                  console.log("Layer to save:", layer);
                  if (layer) {
                    handleSaveLayer(layer);
                  } else {
                    console.warn("No layer selected or layer not found");
                  }
                }}
                disabled={selectedLayer < 0 || !layers[selectedLayer]}
                sx={{
                  color:
                    selectedLayer < 0 || !layers[selectedLayer]
                      ? "rgba(255, 255, 255, 0.3)"
                      : "#f59e0b",
                  "&:hover": { background: "rgba(245, 158, 11, 0.1)" },
                }}
              >
                <Save fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export Selected Layer">
            <span>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Export clicked, selectedLayer:", selectedLayer);
                  const layer = layers[selectedLayer];
                  console.log("Layer to export:", layer);
                  if (layer) {
                    handleExportGeoJSON(layer);
                  } else {
                    console.warn("No layer selected or layer not found");
                  }
                }}
                disabled={selectedLayer < 0 || !layers[selectedLayer]}
                sx={{
                  color:
                    selectedLayer < 0 || !layers[selectedLayer]
                      ? "rgba(255, 255, 255, 0.3)"
                      : "#3b82f6",
                  "&:hover": { background: "rgba(59, 130, 246, 0.1)" },
                }}
              >
                <FileDownload fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )}

      {/* Layers Tab Content */}
      {activeTab === 0 && (
        <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
          {layers.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              <Layers sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
              <Typography variant="body2">No layers loaded</Typography>
              <Typography variant="caption">
                Import or create layers to get started
              </Typography>
            </Box>
          ) : (
            <List dense sx={{ p: 0 }}>
              {layers.map((layer, index) => (
                <ListItem
                  key={layer.id}
                  onContextMenu={(e) => handleContextMenu(e, layer)}
                  sx={{
                    px: 1.5,
                    py: 1,
                    mb: 0.5,
                    borderRadius: 1,
                    backgroundColor:
                      selectedLayer === index
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(255, 255, 255, 0.03)",
                    border: "1px solid",
                    borderColor:
                      selectedLayer === index
                        ? "rgba(16, 185, 129, 0.4)"
                        : "rgba(255, 255, 255, 0.1)",
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor:
                        selectedLayer === index
                          ? "rgba(16, 185, 129, 0.25)"
                          : "rgba(255, 255, 255, 0.05)",
                      borderColor: "rgba(16, 185, 129, 0.3)",
                    },
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => {
                    setSelectedLayer(index === selectedLayer ? -1 : index);
                    // Zoom to layer when clicked
                    handleZoomToLayer(layer);
                  }}
                >
                  <Box sx={{ display: "flex", width: "100%", gap: 1 }}>
                    {/* Color indicator */}
                    <Box
                      sx={{
                        width: 4,
                        borderRadius: 1,
                        background: layer.color
                          ? `rgb(${layer.color[0]}, ${layer.color[1]}, ${layer.color[2]})`
                          : "#10b981",
                        flexShrink: 0,
                      }}
                    />

                    {/* Layer info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {layer.file_name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "rgba(255, 255, 255, 0.6)" }}
                      >
                        {getFeatureCount(layer)} features
                      </Typography>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                      <Tooltip
                        title={
                          layerVisibility[layer.id] !== false ? "Hide" : "Show"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(layer.id);
                          }}
                          sx={{
                            color:
                              layerVisibility[layer.id] !== false
                                ? "#10b981"
                                : "rgba(255, 255, 255, 0.3)",
                            "&:hover": {
                              background: "rgba(16, 185, 129, 0.1)",
                            },
                          }}
                        >
                          {layerVisibility[layer.id] !== false ? (
                            <Visibility fontSize="small" />
                          ) : (
                            <VisibilityOff fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More actions">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e, layer);
                          }}
                          sx={{
                            color: "rgba(255, 255, 255, 0.7)",
                            "&:hover": {
                              background: "rgba(255, 255, 255, 0.1)",
                            },
                          }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* Styling Tab Content */}
      {activeTab === 1 && (
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          {layers.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              <Palette sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
              <Typography variant="body2">No layers available</Typography>
              <Typography variant="caption">
                Import layers to configure styles
              </Typography>
            </Box>
          ) : (
            <>
              {/* Layer Selector */}
              <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                  Select Layer
                </InputLabel>
                <Select
                  value={selectedLayerForStyling || ""}
                  onChange={(e) => {
                    setSelectedLayerForStyling(e.target.value);
                    // Load existing config if available
                    const config = layerStyleConfigs[e.target.value];
                    if (config) {
                      setStylingMode(config.stylingMode);
                      setDefaultStyle(config.defaultStyle);
                      setCategories(config.categorizedStyles);
                    }
                  }}
                  sx={{
                    color: "white",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255, 255, 255, 0.3)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255, 255, 255, 0.5)",
                    },
                  }}
                >
                  {layers.map((layer) => (
                    <MenuItem key={layer.id} value={layer.id}>
                      {layer.file_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedLayerForStyling && (
                <>
                  {/* Styling Mode Toggle */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 1 }}
                    >
                      Styling Mode
                    </Typography>
                    <ToggleButtonGroup
                      value={stylingMode}
                      exclusive
                      onChange={(_, value) => value && setStylingMode(value)}
                      fullWidth
                      size="small"
                    >
                      <ToggleButton value="default">
                        <FormatPaint sx={{ mr: 1, fontSize: 18 }} />
                        Default
                      </ToggleButton>
                      <ToggleButton value="categorized">
                        <Category sx={{ mr: 1, fontSize: 18 }} />
                        Categorized
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <Divider
                    sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.1)" }}
                  />

                  {/* Default Style */}
                  {stylingMode === "default" && (
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 2 }}
                      >
                        Layer Style
                      </Typography>

                      {/* Color Presets */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255, 255, 255, 0.7)",
                            mb: 1,
                            display: "block",
                          }}
                        >
                          Quick Colors
                        </Typography>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 1,
                          }}
                        >
                          {PRESET_COLORS.map((preset) => (
                            <Button
                              key={preset.name}
                              onClick={() =>
                                setDefaultStyle({
                                  ...defaultStyle,
                                  fillColor: preset.fill,
                                  strokeColor: preset.stroke,
                                })
                              }
                              sx={{
                                minWidth: 0,
                                p: 1,
                                background: preset.fill,
                                border: `2px solid ${preset.stroke}`,
                                "&:hover": {
                                  background: preset.fill,
                                  transform: "scale(1.1)",
                                },
                              }}
                            />
                          ))}
                        </Box>
                      </Box>

                      {/* Fill Color */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255, 255, 255, 0.7)",
                            mb: 0.5,
                            display: "block",
                          }}
                        >
                          Fill Color
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <input
                            type="color"
                            value={defaultStyle.fillColor}
                            onChange={(e) =>
                              setDefaultStyle({
                                ...defaultStyle,
                                fillColor: e.target.value,
                              })
                            }
                            style={{
                              width: "50px",
                              height: "36px",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          />
                          <TextField
                            size="small"
                            value={defaultStyle.fillColor}
                            onChange={(e) =>
                              setDefaultStyle({
                                ...defaultStyle,
                                fillColor: e.target.value,
                              })
                            }
                            sx={{
                              flex: 1,
                              "& .MuiInputBase-root": {
                                color: "white",
                                fontFamily: "monospace",
                              },
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Fill Opacity */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                        >
                          Fill Opacity:{" "}
                          {Math.round(defaultStyle.fillOpacity * 100)}%
                        </Typography>
                        <Slider
                          value={defaultStyle.fillOpacity}
                          onChange={(_, value) =>
                            setDefaultStyle({
                              ...defaultStyle,
                              fillOpacity: value as number,
                            })
                          }
                          min={0}
                          max={1}
                          step={0.01}
                          sx={{ color: "#10b981" }}
                        />
                      </Box>

                      {/* Stroke Color */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255, 255, 255, 0.7)",
                            mb: 0.5,
                            display: "block",
                          }}
                        >
                          Stroke Color
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <input
                            type="color"
                            value={defaultStyle.strokeColor}
                            onChange={(e) =>
                              setDefaultStyle({
                                ...defaultStyle,
                                strokeColor: e.target.value,
                              })
                            }
                            style={{
                              width: "50px",
                              height: "36px",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          />
                          <TextField
                            size="small"
                            value={defaultStyle.strokeColor}
                            onChange={(e) =>
                              setDefaultStyle({
                                ...defaultStyle,
                                strokeColor: e.target.value,
                              })
                            }
                            sx={{
                              flex: 1,
                              "& .MuiInputBase-root": {
                                color: "white",
                                fontFamily: "monospace",
                              },
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Stroke Width */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                        >
                          Stroke Width: {defaultStyle.strokeWidth}px
                        </Typography>
                        <Slider
                          value={defaultStyle.strokeWidth}
                          onChange={(_, value) =>
                            setDefaultStyle({
                              ...defaultStyle,
                              strokeWidth: value as number,
                            })
                          }
                          min={1}
                          max={20}
                          step={1}
                          sx={{ color: "#10b981" }}
                        />
                      </Box>

                      {/* Point Radius */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                        >
                          Point Size: {defaultStyle.pointRadius}px
                        </Typography>
                        <Slider
                          value={defaultStyle.pointRadius}
                          onChange={(_, value) =>
                            setDefaultStyle({
                              ...defaultStyle,
                              pointRadius: value as number,
                            })
                          }
                          min={5}
                          max={50}
                          step={1}
                          sx={{ color: "#10b981" }}
                        />
                      </Box>
                    </Box>
                  )}

                  {/* Categorized Style - Simplified version for brevity */}
                  {stylingMode === "categorized" && (
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255, 255, 255, 0.6)",
                          fontStyle: "italic",
                        }}
                      >
                        Categorized styling coming soon. Use default styling for
                        now.
                      </Typography>
                    </Box>
                  )}

                  {/* Apply Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleApplyStyles}
                    sx={{
                      mt: 3,
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #059669 0%, #047857 100%)",
                      },
                    }}
                  >
                    Apply to Layer
                  </Button>
                </>
              )}
            </>
          )}
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: {
            bgcolor: "rgba(30, 30, 30, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (contextMenu?.layer) {
              handleZoomToLayer(contextMenu.layer);
            }
            handleContextMenuClose();
          }}
        >
          <ZoomIn sx={{ mr: 1, fontSize: 20 }} />
          Zoom to Layer
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenu?.layer) {
              handleRenameLayer(contextMenu.layer);
            }
          }}
        >
          <Edit sx={{ mr: 1, fontSize: 20 }} />
          Rename
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenu?.layer) {
              handleDuplicateLayer(contextMenu.layer);
            }
            handleContextMenuClose();
          }}
        >
          <ContentCopy sx={{ mr: 1, fontSize: 20 }} />
          Duplicate
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenu?.layer) {
              handleExportGeoJSON(contextMenu.layer);
            }
            handleContextMenuClose();
          }}
        >
          <FileDownload sx={{ mr: 1, fontSize: 20 }} />
          Export GeoJSON
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenu?.layer) {
              handleSaveLayer(contextMenu.layer);
            }
            handleContextMenuClose();
          }}
        >
          <Save sx={{ mr: 1, fontSize: 20 }} />
          Save
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (contextMenu?.layer) {
              handleDeleteLayer(contextMenu.layer.id);
            }
            handleContextMenuClose();
          }}
          sx={{ color: "#ef4444" }}
        >
          <Delete sx={{ mr: 1, fontSize: 20 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialog.open}
        onClose={() =>
          setRenameDialog({ open: false, layer: null, newName: "" })
        }
        PaperProps={{
          sx: {
            bgcolor: "rgba(30, 30, 30, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <DialogTitle>Rename Layer</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Layer Name"
            value={renameDialog.newName}
            onChange={(e) =>
              setRenameDialog({ ...renameDialog, newName: e.target.value })
            }
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleRenameConfirm();
              }
            }}
            sx={{
              mt: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.2)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.3)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#10b981",
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setRenameDialog({ open: false, layer: null, newName: "" })
            }
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameConfirm}
            variant="contained"
            disabled={!renameDialog.newName.trim()}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default LayerManager;
export { DEFAULT_LAYER_STYLE };
