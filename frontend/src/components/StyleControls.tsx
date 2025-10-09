import React, { useState, useEffect } from "react";
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
  Chip,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Collapse,
} from "@mui/material";
import {
  Palette,
  Close,
  FormatColorFill,
  BorderColor,
  LineWeight,
  Opacity,
  RadioButtonUnchecked,
  CheckCircle,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";

interface StyleControlsProps {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  selectedFeatureCount: number;
  currentStyle: FeatureStyle;
  onStyleChange: (style: FeatureStyle) => void;
  onApplyStyle: () => void;
}

export interface FeatureStyle {
  fillColor: string;
  strokeColor: string;
  fillOpacity: number;
  strokeOpacity: number;
  strokeWidth: number;
  pointRadius: number;
}

const DEFAULT_STYLE: FeatureStyle = {
  fillColor: "#34a853",
  strokeColor: "#006428",
  fillOpacity: 0.6,
  strokeOpacity: 1.0,
  strokeWidth: 2,
  pointRadius: 18,
};

const PRESETS = [
  {
    name: "Green",
    icon: "🟢",
    style: {
      fillColor: "#34a853",
      strokeColor: "#006428",
      fillOpacity: 0.6,
      strokeOpacity: 1.0,
      strokeWidth: 2,
      pointRadius: 18,
    },
  },
  {
    name: "Blue",
    icon: "🔵",
    style: {
      fillColor: "#2196f3",
      strokeColor: "#0d47a1",
      fillOpacity: 0.6,
      strokeOpacity: 1.0,
      strokeWidth: 2,
      pointRadius: 18,
    },
  },
  {
    name: "Red",
    icon: "🔴",
    style: {
      fillColor: "#ef5350",
      strokeColor: "#b71c1c",
      fillOpacity: 0.6,
      strokeOpacity: 1.0,
      strokeWidth: 2,
      pointRadius: 18,
    },
  },
  {
    name: "Yellow",
    icon: "🟡",
    style: {
      fillColor: "#ffd740",
      strokeColor: "#f57f17",
      fillOpacity: 0.7,
      strokeOpacity: 1.0,
      strokeWidth: 2,
      pointRadius: 18,
    },
  },
  {
    name: "Purple",
    icon: "🟣",
    style: {
      fillColor: "#9c27b0",
      strokeColor: "#4a148c",
      fillOpacity: 0.6,
      strokeOpacity: 1.0,
      strokeWidth: 2,
      pointRadius: 18,
    },
  },
  {
    name: "Orange",
    icon: "🟠",
    style: {
      fillColor: "#ff9800",
      strokeColor: "#e65100",
      fillOpacity: 0.6,
      strokeOpacity: 1.0,
      strokeWidth: 2,
      pointRadius: 18,
    },
  },
];

const StyleControls: React.FC<StyleControlsProps> = ({
  isOpen,
  onToggle,
  selectedFeatureCount,
  currentStyle,
  onStyleChange,
  onApplyStyle,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    fill: true,
    stroke: true,
    point: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handlePresetClick = (preset: (typeof PRESETS)[0]) => {
    onStyleChange(preset.style);
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  };

  return (
    <>
      {/* Floating Style Button */}
      {!isOpen && (
        <Box
          sx={{
            position: "fixed",
            top: 15,
            right: 125,
            zIndex: 1000,
          }}
        >
          <Tooltip
            title="Style Controls (Customize Colors & Appearance)"
            placement="left"
          >
            <IconButton
              onClick={() => onToggle(true)}
              sx={{
                width: 40,
                height: 40,
                background: "linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)",
                color: "white",
                boxShadow: "0 4px 12px rgba(156, 39, 176, 0.5)",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%)",
                  boxShadow: "0 6px 20px rgba(156, 39, 176, 0.7)",
                  transform: "scale(1.05)",
                },
                transition: "all 0.2s ease",
              }}
            >
              <Palette />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Style Panel */}
      {isOpen && (
        <Paper
          sx={{
            position: "fixed",
            bottom: 15,
            right: 80,
            zIndex: 1100,
            width: 350,
            maxHeight: "80vh",
            overflow: "auto",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 2,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              background: "linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Palette />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Style Controls
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => onToggle(false)}
                sx={{ color: "white" }}
              >
                <Close />
              </IconButton>
            </Box>
            {selectedFeatureCount > 0 && (
              <Chip
                label={`${selectedFeatureCount} feature${
                  selectedFeatureCount > 1 ? "s" : ""
                } selected`}
                size="small"
                sx={{
                  mt: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                }}
              />
            )}
          </Box>

          <Box sx={{ p: 2 }}>
            {/* Presets */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: "rgba(255, 255, 255, 0.9)" }}
              >
                Quick Presets
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 1,
                }}
              >
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outlined"
                    onClick={() => handlePresetClick(preset)}
                    sx={{
                      p: 1,
                      minWidth: 0,
                      flexDirection: "column",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "white",
                      "&:hover": {
                        border: "1px solid rgba(255, 255, 255, 0.4)",
                        background: "rgba(255, 255, 255, 0.05)",
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: "1.5rem", mb: 0.5 }}>
                      {preset.icon}
                    </Typography>
                    <Typography variant="caption">{preset.name}</Typography>
                  </Button>
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.1)" }} />

            {/* Fill Color */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                  cursor: "pointer",
                }}
                onClick={() => toggleSection("fill")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FormatColorFill sx={{ fontSize: 18, color: "#10b981" }} />
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "rgba(255, 255, 255, 0.9)" }}
                  >
                    Fill
                  </Typography>
                </Box>
                {expandedSections.fill ? <ExpandLess /> : <ExpandMore />}
              </Box>
              <Collapse in={expandedSections.fill}>
                <Stack spacing={2}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      Color
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <input
                        type="color"
                        value={currentStyle.fillColor}
                        onChange={(e) =>
                          onStyleChange({
                            ...currentStyle,
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
                        value={currentStyle.fillColor}
                        onChange={(e) =>
                          onStyleChange({
                            ...currentStyle,
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
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      Opacity: {Math.round(currentStyle.fillOpacity * 100)}%
                    </Typography>
                    <Slider
                      value={currentStyle.fillOpacity}
                      onChange={(_, value) =>
                        onStyleChange({
                          ...currentStyle,
                          fillOpacity: value as number,
                        })
                      }
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) =>
                        `${Math.round(value * 100)}%`
                      }
                      sx={{
                        color: "#10b981",
                        "& .MuiSlider-thumb": {
                          backgroundColor: "#10b981",
                        },
                      }}
                    />
                  </Box>
                </Stack>
              </Collapse>
            </Box>

            <Divider sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.1)" }} />

            {/* Stroke */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                  cursor: "pointer",
                }}
                onClick={() => toggleSection("stroke")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <BorderColor sx={{ fontSize: 18, color: "#10b981" }} />
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "rgba(255, 255, 255, 0.9)" }}
                  >
                    Stroke
                  </Typography>
                </Box>
                {expandedSections.stroke ? <ExpandLess /> : <ExpandMore />}
              </Box>
              <Collapse in={expandedSections.stroke}>
                <Stack spacing={2}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      Color
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <input
                        type="color"
                        value={currentStyle.strokeColor}
                        onChange={(e) =>
                          onStyleChange({
                            ...currentStyle,
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
                        value={currentStyle.strokeColor}
                        onChange={(e) =>
                          onStyleChange({
                            ...currentStyle,
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
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      Width: {currentStyle.strokeWidth}px
                    </Typography>
                    <Slider
                      value={currentStyle.strokeWidth}
                      onChange={(_, value) =>
                        onStyleChange({
                          ...currentStyle,
                          strokeWidth: value as number,
                        })
                      }
                      min={1}
                      max={20}
                      step={1}
                      valueLabelDisplay="auto"
                      sx={{
                        color: "#10b981",
                        "& .MuiSlider-thumb": {
                          backgroundColor: "#10b981",
                        },
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      Opacity: {Math.round(currentStyle.strokeOpacity * 100)}%
                    </Typography>
                    <Slider
                      value={currentStyle.strokeOpacity}
                      onChange={(_, value) =>
                        onStyleChange({
                          ...currentStyle,
                          strokeOpacity: value as number,
                        })
                      }
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) =>
                        `${Math.round(value * 100)}%`
                      }
                      sx={{
                        color: "#10b981",
                        "& .MuiSlider-thumb": {
                          backgroundColor: "#10b981",
                        },
                      }}
                    />
                  </Box>
                </Stack>
              </Collapse>
            </Box>

            <Divider sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.1)" }} />

            {/* Point Size */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                  cursor: "pointer",
                }}
                onClick={() => toggleSection("point")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <RadioButtonUnchecked
                    sx={{ fontSize: 18, color: "#10b981" }}
                  />
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "rgba(255, 255, 255, 0.9)" }}
                  >
                    Point Size
                  </Typography>
                </Box>
                {expandedSections.point ? <ExpandLess /> : <ExpandMore />}
              </Box>
              <Collapse in={expandedSections.point}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                  >
                    Radius: {currentStyle.pointRadius}px
                  </Typography>
                  <Slider
                    value={currentStyle.pointRadius}
                    onChange={(_, value) =>
                      onStyleChange({
                        ...currentStyle,
                        pointRadius: value as number,
                      })
                    }
                    min={5}
                    max={50}
                    step={1}
                    valueLabelDisplay="auto"
                    sx={{
                      color: "#10b981",
                      "& .MuiSlider-thumb": {
                        backgroundColor: "#10b981",
                      },
                    }}
                  />
                </Box>
              </Collapse>
            </Box>

            {/* Apply Button */}
            <Button
              fullWidth
              variant="contained"
              onClick={onApplyStyle}
              disabled={selectedFeatureCount === 0}
              sx={{
                mt: 2,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #059669 0%, #047857 100%)",
                },
                "&:disabled": {
                  background: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              {selectedFeatureCount > 0
                ? `Apply to ${selectedFeatureCount} Feature${
                    selectedFeatureCount > 1 ? "s" : ""
                  }`
                : "Select Features to Style"}
            </Button>

            {/* Preview */}
            <Box
              sx={{
                mt: 2,
                p: 2,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  mb: 1,
                  display: "block",
                }}
              >
                Preview
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 3,
                  p: 2,
                }}
              >
                {/* Polygon Preview */}
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    backgroundColor: currentStyle.fillColor,
                    opacity: currentStyle.fillOpacity,
                    border: `${currentStyle.strokeWidth}px solid ${currentStyle.strokeColor}`,
                    borderRadius: 1,
                  }}
                />
                {/* Point Preview */}
                <Box
                  sx={{
                    width: currentStyle.pointRadius * 2,
                    height: currentStyle.pointRadius * 2,
                    backgroundColor: currentStyle.fillColor,
                    opacity: currentStyle.fillOpacity,
                    border: `${currentStyle.strokeWidth}px solid ${currentStyle.strokeColor}`,
                    borderRadius: "50%",
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default StyleControls;
export { DEFAULT_STYLE };
