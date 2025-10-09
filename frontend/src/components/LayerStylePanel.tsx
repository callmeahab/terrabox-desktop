import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Slider,
  IconButton,
  Tooltip,
  Stack,
  Button,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  Palette,
  Close,
  Add,
  Delete,
  ExpandMore,
  Layers,
  Category,
  FormatPaint,
} from "@mui/icons-material";

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

interface LayerStylePanelProps {
  layers: any[];
  selectedLayer: string | null;
  onLayerSelect: (layerId: string) => void;
  onStyleUpdate: (config: LayerStyleConfig) => void;
  currentConfig: LayerStyleConfig | null;
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

const LayerStylePanel: React.FC<LayerStylePanelProps> = ({
  layers,
  selectedLayer,
  onLayerSelect,
  onStyleUpdate,
  currentConfig,
}) => {
  const [stylingMode, setStylingMode] = useState<"default" | "categorized">(
    currentConfig?.stylingMode || "default"
  );
  const [defaultStyle, setDefaultStyle] = useState<LayerStyle>(
    currentConfig?.defaultStyle || DEFAULT_LAYER_STYLE
  );
  const [categories, setCategories] = useState<CategoryStyle[]>(
    currentConfig?.categorizedStyles || []
  );

  // Get available properties from selected layer
  const getAvailableProperties = () => {
    if (!selectedLayer) return [];
    const layer = layers.find((l) => l.id === selectedLayer);
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
    const properties = getAvailableProperties();
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
    if (!selectedLayer) return;

    const config: LayerStyleConfig = {
      layerId: selectedLayer,
      defaultStyle,
      categorizedStyles: categories,
      stylingMode,
    };

    onStyleUpdate(config);
  };

  const selectedLayerData = layers.find((l) => l.id === selectedLayer);
  const properties = getAvailableProperties();

  return (
    <Paper
      sx={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        top: 60,
        width: 380,
        maxHeight: "calc(100vh - 120px)",
        overflow: "auto",
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: 2,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        zIndex: 1100,
        animation: "slideDownFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "@keyframes slideDownFadeIn": {
          "0%": {
            opacity: 0,
            transform: "translateX(-50%) translateY(-20px) scale(0.95)",
          },
          "100%": {
            opacity: 1,
            transform: "translateX(-50%) translateY(0) scale(1)",
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          background: "linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)",
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Layers />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Layer Styling
          </Typography>
        </Box>

        {/* Layer Selector */}
        <FormControl size="small" fullWidth>
          <Select
            value={selectedLayer || ""}
            onChange={(e) => onLayerSelect(e.target.value)}
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
      </Box>

      {selectedLayer && (
        <Box sx={{ p: 2 }}>
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

          <Divider sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.1)" }} />

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
                  Fill Opacity: {Math.round(defaultStyle.fillOpacity * 100)}%
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

          {/* Categorized Style */}
          {stylingMode === "categorized" && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ color: "rgba(255, 255, 255, 0.9)" }}
                >
                  Categories ({categories.filter((c) => c.enabled).length}{" "}
                  active)
                </Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={handleAddCategory}
                  disabled={properties.length === 0}
                  sx={{
                    color: "#10b981",
                    borderColor: "#10b981",
                    "&:hover": {
                      borderColor: "#059669",
                      background: "rgba(16, 185, 129, 0.1)",
                    },
                  }}
                  variant="outlined"
                >
                  Add Category
                </Button>
              </Box>

              {properties.length === 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontStyle: "italic",
                  }}
                >
                  No properties available for categorization
                </Typography>
              )}

              {/* Category List */}
              <Stack spacing={1}>
                {categories.map((category, index) => (
                  <Accordion
                    key={category.id}
                    sx={{
                      background: "rgba(255, 255, 255, 0.05)",
                      "&:before": { display: "none" },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMore sx={{ color: "white" }} />}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flex: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            background: category.style.fillColor,
                            border: `2px solid ${category.style.strokeColor}`,
                            borderRadius: 1,
                          }}
                        />
                        <Typography sx={{ color: "white", fontSize: "0.9rem" }}>
                          {category.label}
                        </Typography>
                        <Chip
                          size="small"
                          label={category.enabled ? "ON" : "OFF"}
                          sx={{
                            ml: "auto",
                            mr: 1,
                            backgroundColor: category.enabled
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(255, 255, 255, 0.1)",
                            color: category.enabled
                              ? "#10b981"
                              : "rgba(255, 255, 255, 0.5)",
                          }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        {/* Label */}
                        <TextField
                          size="small"
                          label="Label"
                          value={category.label}
                          onChange={(e) =>
                            handleCategoryChange(category.id, {
                              label: e.target.value,
                            })
                          }
                          fullWidth
                          sx={{
                            "& .MuiInputBase-root": { color: "white" },
                            "& .MuiInputLabel-root": {
                              color: "rgba(255, 255, 255, 0.7)",
                            },
                          }}
                        />

                        {/* Property */}
                        <FormControl size="small" fullWidth>
                          <InputLabel
                            sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                          >
                            Property
                          </InputLabel>
                          <Select
                            value={category.property}
                            onChange={(e) =>
                              handleCategoryChange(category.id, {
                                property: e.target.value,
                              })
                            }
                            sx={{ color: "white" }}
                          >
                            {properties.map((prop) => (
                              <MenuItem key={prop} value={prop}>
                                {prop}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Operator */}
                        <FormControl size="small" fullWidth>
                          <InputLabel
                            sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                          >
                            Condition
                          </InputLabel>
                          <Select
                            value={category.operator}
                            onChange={(e) =>
                              handleCategoryChange(category.id, {
                                operator: e.target.value as any,
                              })
                            }
                            sx={{ color: "white" }}
                          >
                            <MenuItem value="equals">Equals</MenuItem>
                            <MenuItem value="contains">Contains</MenuItem>
                            <MenuItem value="greater">Greater than</MenuItem>
                            <MenuItem value="less">Less than</MenuItem>
                          </Select>
                        </FormControl>

                        {/* Value */}
                        <TextField
                          size="small"
                          label="Value"
                          value={category.value}
                          onChange={(e) =>
                            handleCategoryChange(category.id, {
                              value: e.target.value,
                            })
                          }
                          fullWidth
                          sx={{
                            "& .MuiInputBase-root": { color: "white" },
                            "& .MuiInputLabel-root": {
                              color: "rgba(255, 255, 255, 0.7)",
                            },
                          }}
                        />

                        {/* Colors */}
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: "rgba(255, 255, 255, 0.7)",
                                display: "block",
                                mb: 0.5,
                              }}
                            >
                              Fill
                            </Typography>
                            <input
                              type="color"
                              value={category.style.fillColor}
                              onChange={(e) =>
                                handleCategoryChange(category.id, {
                                  style: {
                                    ...category.style,
                                    fillColor: e.target.value,
                                  },
                                })
                              }
                              style={{
                                width: "100%",
                                height: "36px",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: "rgba(255, 255, 255, 0.7)",
                                display: "block",
                                mb: 0.5,
                              }}
                            >
                              Stroke
                            </Typography>
                            <input
                              type="color"
                              value={category.style.strokeColor}
                              onChange={(e) =>
                                handleCategoryChange(category.id, {
                                  style: {
                                    ...category.style,
                                    strokeColor: e.target.value,
                                  },
                                })
                              }
                              style={{
                                width: "100%",
                                height: "36px",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            />
                          </Box>
                        </Box>

                        {/* Actions */}
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            size="small"
                            variant={
                              category.enabled ? "outlined" : "contained"
                            }
                            onClick={() =>
                              handleCategoryChange(category.id, {
                                enabled: !category.enabled,
                              })
                            }
                            fullWidth
                          >
                            {category.enabled ? "Disable" : "Enable"}
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCategory(category.id)}
                            sx={{
                              color: "#ef4444",
                              border: "1px solid #ef4444",
                              "&:hover": {
                                background: "rgba(239, 68, 68, 0.1)",
                              },
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Box>
          )}

          {/* Apply Button */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleApplyStyles}
            sx={{
              mt: 3,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              },
            }}
          >
            Apply to Layer
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default LayerStylePanel;
export { DEFAULT_LAYER_STYLE };
