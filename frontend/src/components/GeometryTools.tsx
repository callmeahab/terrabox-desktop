import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Fab,
  TextField,
  Typography,
  Stack,
  Tooltip,
  Chip,
  Paper,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
} from "@mui/material";
import {
  ZoomOutMap,
  CallMerge,
  CallMade,
  ContentCut,
  Crop,
  Timeline,
  CenterFocusStrong,
  Calculate,
  GridOn,
  ExpandMore,
} from "@mui/icons-material";
import * as turf from "@turf/turf";

interface GeometryToolsProps {
  layers: any[];
  editableLayerId: string | null;
  onApplyOperation: (resultFeatures: any[]) => void;
  onSelectionModeChange: (
    isSelecting: boolean,
    toolType: string | null
  ) => void;
  selectedFeatures: any[];
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  onPointSelectionModeChange?: (enabled: boolean) => void;
  selectedPoints?: number[];
  onPointsChange?: (points: number[]) => void;
}

type ToolType =
  | "buffer"
  | "extrude"
  | "union"
  | "intersect"
  | "difference"
  | "simplify"
  | "convexHull"
  | "centroid"
  | "dissolve"
  | "clip"
  | "area"
  | "length";

const GeometryTools: React.FC<GeometryToolsProps> = ({
  layers,
  editableLayerId,
  onApplyOperation,
  onSelectionModeChange,
  selectedFeatures,
  isOpen,
  onToggle,
  onPointSelectionModeChange,
  selectedPoints = [],
  onPointsChange,
}) => {
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [panelPosition, setPanelPosition] = useState({ x: 320, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Tool-specific parameters
  const [bufferDistance, setBufferDistance] = useState<number>(100);
  const [bufferUnit, setBufferUnit] = useState<
    "meters" | "kilometers" | "miles"
  >("meters");
  const [simplifyTolerance, setSimplifyTolerance] = useState<number>(0.01);
  const [simplifyHighQuality, setSimplifyHighQuality] = useState<boolean>(true);

  // Extrude tool specific
  const [extrudeDistance, setExtrudeDistance] = useState<number>(100);
  const [extrudeUnit, setExtrudeUnit] = useState<
    "meters" | "kilometers" | "miles"
  >("meters");
  const [isSelectingPoints, setIsSelectingPoints] = useState<boolean>(false);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".drag-handle")) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panelPosition.x,
        y: e.clientY - panelPosition.y,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPanelPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Close panel when clicking outside (only if not actively selecting features)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        anchorEl &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('button[aria-label="Geo Tools"]')
      ) {
        // Only close if we're not in active selection mode
        if (!isOpen || !selectedTool) {
          handleClose();
        }
      }
    };

    if (anchorEl) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [anchorEl, isOpen, selectedTool]);

  const handleToolSelect = (
    tool: ToolType,
    event: React.MouseEvent<HTMLElement>
  ) => {
    setSelectedTool(tool);
    setAnchorEl(event.currentTarget);
    onToggle(true);
    onSelectionModeChange(true, tool);
  };

  const handleClose = () => {
    setAnchorEl(null);
    onToggle(false);
    setSelectedTool(null);
    onSelectionModeChange(false, null);
  };

  const handleApplyOperation = () => {
    console.log("Apply operation called:", {
      selectedTool,
      selectedFeaturesCount: selectedFeatures?.length,
      selectedFeatures,
    });

    if (!selectedFeatures || selectedFeatures.length === 0) {
      console.warn("No features selected for operation");
      alert("No features selected. Please select features on the map.");
      return;
    }

    try {
      let result: any[] = [];

      switch (selectedTool) {
        case "buffer":
          result = selectedFeatures.map((feature) => {
            const buffered = turf.buffer(feature, bufferDistance, {
              units: bufferUnit,
            });
            return buffered
              ? { ...feature, geometry: buffered.geometry }
              : feature;
          });
          break;

        case "extrude":
          if (selectedPoints.length === 0) {
            alert("Please select points to extrude");
            return;
          }

          result = selectedFeatures.map((feature) => {
            if (!feature.geometry || feature.geometry.type !== "Polygon") {
              return feature;
            }

            const coordinates = JSON.parse(
              JSON.stringify(feature.geometry.coordinates)
            );
            const ring = coordinates[0];

            let extrusionBearing: number;

            if (selectedPoints.length === 1) {
              const pointIndex = selectedPoints[0];
              if (!ring[pointIndex]) return feature;

              const numPoints = ring.length - 1;
              const prevIndex =
                pointIndex === 0 ? numPoints - 1 : pointIndex - 1;
              const nextIndex = (pointIndex + 1) % numPoints;

              const currentPoint = turf.point(ring[pointIndex]);
              const prevPoint = turf.point(ring[prevIndex]);
              const nextPoint = turf.point(ring[nextIndex]);

              const bearingToPrev = turf.bearing(currentPoint, prevPoint);
              const bearingToNext = turf.bearing(currentPoint, nextPoint);

              let avgBearing = (bearingToPrev + bearingToNext) / 2;
              const perpBearing = avgBearing + 90;

              const testPoint = turf.destination(
                currentPoint,
                0.001,
                perpBearing,
                {
                  units: "kilometers",
                }
              );
              const isInside = turf.booleanPointInPolygon(testPoint, feature);

              extrusionBearing = isInside ? perpBearing + 180 : perpBearing;
            } else {
              const sortedPoints = [...selectedPoints].sort((a, b) => a - b);
              const firstPoint = turf.point(ring[sortedPoints[0]]);
              const lastPoint = turf.point(
                ring[sortedPoints[sortedPoints.length - 1]]
              );

              const edgeBearing = turf.bearing(firstPoint, lastPoint);
              let perpBearing = edgeBearing + 90;

              while (perpBearing > 180) perpBearing -= 360;
              while (perpBearing < -180) perpBearing += 360;

              const midIndex =
                sortedPoints[Math.floor(sortedPoints.length / 2)];
              const midPoint = turf.point(ring[midIndex]);
              const testPoint = turf.destination(midPoint, 0.001, perpBearing, {
                units: "kilometers",
              });
              const isInside = turf.booleanPointInPolygon(testPoint, feature);

              extrusionBearing = isInside ? perpBearing + 180 : perpBearing;

              while (extrusionBearing > 180) extrusionBearing -= 360;
              while (extrusionBearing < -180) extrusionBearing += 360;
            }

            selectedPoints.forEach((pointIndex) => {
              if (!ring[pointIndex]) return;

              const currentPoint = turf.point(ring[pointIndex]);
              const destination = turf.destination(
                currentPoint,
                extrudeDistance,
                extrusionBearing,
                { units: extrudeUnit }
              );

              ring[pointIndex] = destination.geometry.coordinates;

              if (pointIndex === 0) {
                ring[ring.length - 1] = destination.geometry.coordinates;
              }
            });

            return {
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: coordinates,
              },
            };
          });
          break;

        case "union":
          if (selectedFeatures.length < 2) {
            alert("Union requires at least 2 polygons");
            return;
          }
          try {
            let unionResult = selectedFeatures[0];
            for (let i = 1; i < selectedFeatures.length; i++) {
              unionResult = turf.union(
                turf.featureCollection([unionResult, selectedFeatures[i]])
              );
            }
            result = unionResult ? [unionResult] : selectedFeatures;
          } catch (error) {
            console.error("Union failed:", error);
            alert(
              "Union operation failed. Make sure all features are valid polygons."
            );
            return;
          }
          break;

        case "intersect":
          if (selectedFeatures.length !== 2) {
            alert("Intersect requires exactly 2 polygons");
            return;
          }
          const intersection = turf.intersect(
            turf.featureCollection([selectedFeatures[0], selectedFeatures[1]])
          );
          result = intersection ? [intersection] : [];
          if (result.length === 0) {
            alert("No intersection found between selected polygons");
          }
          break;

        case "difference":
          if (selectedFeatures.length !== 2) {
            alert("Difference requires exactly 2 polygons (first - second)");
            return;
          }
          const diff = turf.difference(
            turf.featureCollection([selectedFeatures[0], selectedFeatures[1]])
          );
          result = diff ? [diff] : [];
          break;

        case "simplify":
          result = selectedFeatures.map((feature) => {
            const simplified = turf.simplify(feature, {
              tolerance: simplifyTolerance,
              highQuality: simplifyHighQuality,
            });
            return simplified || feature;
          });
          break;

        case "convexHull":
          const allCoords: any[] = [];
          selectedFeatures.forEach((feature) => {
            if (feature.geometry.type === "Point") {
              allCoords.push(feature.geometry.coordinates);
            } else if (feature.geometry.type === "Polygon") {
              allCoords.push(...feature.geometry.coordinates[0]);
            } else if (feature.geometry.type === "LineString") {
              allCoords.push(...feature.geometry.coordinates);
            }
          });

          if (allCoords.length < 3) {
            alert("Convex hull requires at least 3 points");
            return;
          }

          const points = turf.featureCollection(
            allCoords.map((coord) => turf.point(coord))
          );
          const hull = turf.convex(points);
          result = hull ? [hull] : [];
          break;

        case "centroid":
          result = selectedFeatures.map((feature) => {
            const center = turf.centroid(feature);
            return {
              ...center,
              properties: {
                ...feature.properties,
                original_type: feature.geometry.type,
              },
            };
          });
          break;

        case "dissolve":
          // Dissolve merges all overlapping/touching polygons
          if (selectedFeatures.length < 2) {
            alert("Dissolve requires at least 2 features");
            return;
          }
          try {
            let dissolved = selectedFeatures[0];
            for (let i = 1; i < selectedFeatures.length; i++) {
              try {
                const unionResult = turf.union(
                  turf.featureCollection([dissolved, selectedFeatures[i]])
                );
                if (unionResult) dissolved = unionResult;
              } catch (e) {
                console.warn("Could not merge feature", i, e);
              }
            }
            result = [dissolved];
          } catch (error) {
            console.error("Dissolve failed:", error);
            alert("Dissolve operation failed");
            return;
          }
          break;

        case "area":
          const areas = selectedFeatures.map((feature) => {
            const areaInMeters = turf.area(feature);
            const areaInKm = areaInMeters / 1000000;
            return {
              ...feature,
              properties: {
                ...feature.properties,
                area_m2: areaInMeters.toFixed(2),
                area_km2: areaInKm.toFixed(4),
              },
            };
          });
          console.log(
            "Area calculations:",
            areas.map((f) => f.properties)
          );
          alert(
            areas
              .map(
                (f, i) =>
                  `Feature ${i + 1}: ${f.properties.area_m2} m² (${
                    f.properties.area_km2
                  } km²)`
              )
              .join("\n")
          );
          result = areas;
          break;

        case "length":
          const lengths = selectedFeatures.map((feature) => {
            const lengthInKm = turf.length(feature, { units: "kilometers" });
            const lengthInM = lengthInKm * 1000;
            return {
              ...feature,
              properties: {
                ...feature.properties,
                length_m: lengthInM.toFixed(2),
                length_km: lengthInKm.toFixed(4),
              },
            };
          });
          console.log(
            "Length calculations:",
            lengths.map((f) => f.properties)
          );
          alert(
            lengths
              .map(
                (f, i) =>
                  `Feature ${i + 1}: ${f.properties.length_m} m (${
                    f.properties.length_km
                  } km)`
              )
              .join("\n")
          );
          result = lengths;
          break;

        default:
          console.warn("Unknown tool:", selectedTool);
          return;
      }

      onApplyOperation(result);
      handleClose();
    } catch (error) {
      console.error("Error applying operation:", error);
      alert(
        `Operation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  interface ToolConfig {
    icon: React.ReactElement;
    label: string;
    color: string;
    minFeatures?: number;
    maxFeatures?: number;
  }

  const getToolConfig = (tool: ToolType): ToolConfig => {
    const configs: Record<ToolType, ToolConfig> = {
      buffer: {
        icon: <ZoomOutMap />,
        label: "Buffer",
        color: "#2196f3",
        minFeatures: 1,
      },
      extrude: {
        icon: <CallMade />,
        label: "Extrude",
        color: "#9c27b0",
        minFeatures: 1,
        maxFeatures: 1,
      },
      union: {
        icon: <CallMerge />,
        label: "Union",
        color: "#2196f3",
        minFeatures: 2,
      },
      intersect: {
        icon: <Crop />,
        label: "Intersect",
        color: "#2196f3",
        minFeatures: 2,
        maxFeatures: 2,
      },
      difference: {
        icon: <ContentCut />,
        label: "Difference",
        color: "#9c27b0",
        minFeatures: 2,
        maxFeatures: 2,
      },
      simplify: {
        icon: <Timeline />,
        label: "Simplify",
        color: "#2196f3",
        minFeatures: 1,
      },
      convexHull: {
        icon: <GridOn />,
        label: "Convex Hull",
        color: "#2196f3",
        minFeatures: 1,
      },
      centroid: {
        icon: <CenterFocusStrong />,
        label: "Centroid",
        color: "#2196f3",
        minFeatures: 1,
      },
      dissolve: {
        icon: <CallMerge />,
        label: "Dissolve",
        color: "#2196f3",
        minFeatures: 2,
      },
      clip: {
        icon: <Crop />,
        label: "Clip",
        color: "#2196f3",
        minFeatures: 2,
        maxFeatures: 2,
      },
      area: {
        icon: <Calculate />,
        label: "Area",
        color: "#2196f3",
        minFeatures: 1,
      },
      length: {
        icon: <Timeline />,
        label: "Length",
        color: "#2196f3",
        minFeatures: 1,
      },
    };
    return configs[tool];
  };

  const renderToolParameters = () => {
    switch (selectedTool) {
      case "buffer":
        return (
          <>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="Distance"
                type="number"
                value={bufferDistance}
                onChange={(e) => setBufferDistance(Number(e.target.value))}
                size="small"
                sx={{ flex: 1 }}
                inputProps={{ min: 0, step: 10 }}
              />
              <ToggleButtonGroup
                value={bufferUnit}
                exclusive
                onChange={(e, newUnit) => newUnit && setBufferUnit(newUnit)}
                size="small"
              >
                <ToggleButton value="meters">m</ToggleButton>
                <ToggleButton value="kilometers">km</ToggleButton>
                <ToggleButton value="miles">mi</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </>
        );

      case "simplify":
        return (
          <>
            <TextField
              label="Tolerance"
              type="number"
              value={simplifyTolerance}
              onChange={(e) => setSimplifyTolerance(Number(e.target.value))}
              size="small"
              fullWidth
              inputProps={{ min: 0.001, max: 1, step: 0.001 }}
              helperText="Lower = more detail, Higher = simpler"
            />
            <ToggleButtonGroup
              value={simplifyHighQuality ? "high" : "low"}
              exclusive
              onChange={(e, val) => setSimplifyHighQuality(val === "high")}
              size="small"
              fullWidth
            >
              <ToggleButton value="low">Fast</ToggleButton>
              <ToggleButton value="high">High Quality</ToggleButton>
            </ToggleButtonGroup>
          </>
        );

      case "extrude":
        return (
          <>
            <Box>
              <Button
                variant={isSelectingPoints ? "contained" : "outlined"}
                color="secondary"
                fullWidth
                onClick={() => {
                  const newState = !isSelectingPoints;
                  setIsSelectingPoints(newState);
                  if (onPointSelectionModeChange) {
                    onPointSelectionModeChange(newState);
                  }
                  if (!newState && onPointsChange) {
                    onPointsChange([]);
                  }
                }}
                sx={{ mb: 1 }}
              >
                {isSelectingPoints
                  ? "Point Selection Active"
                  : "Select Points to Extrude"}
              </Button>
              {selectedPoints.length > 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {selectedPoints.length} point
                  {selectedPoints.length > 1 ? "s" : ""} selected
                </Alert>
              )}
              {isSelectingPoints && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  Click on polygon vertices to select points for extrusion
                </Typography>
              )}
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: -1 }}
            >
              {selectedPoints.length === 1
                ? "Point will extrude perpendicular to adjacent edges"
                : selectedPoints.length > 1
                ? "Selected points will move together perpendicular to the edge"
                : "Select points to extrude"}
            </Typography>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="Distance"
                type="number"
                value={extrudeDistance}
                onChange={(e) => setExtrudeDistance(Number(e.target.value))}
                size="small"
                sx={{ flex: 1 }}
                inputProps={{ min: 0, step: 10 }}
              />
              <ToggleButtonGroup
                value={extrudeUnit}
                exclusive
                onChange={(e, newUnit) => newUnit && setExtrudeUnit(newUnit)}
                size="small"
              >
                <ToggleButton value="meters">m</ToggleButton>
                <ToggleButton value="kilometers">km</ToggleButton>
                <ToggleButton value="miles">mi</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </>
        );

      default:
        return null;
    }
  };

  const canApply = () => {
    if (!selectedTool) return false;
    const config = getToolConfig(selectedTool);
    const count = selectedFeatures.length;

    if (config.minFeatures && count < config.minFeatures) return false;
    if (config.maxFeatures && count > config.maxFeatures) return false;

    return true;
  };

  const getSelectionHint = () => {
    if (!selectedTool) return "";
    const config = getToolConfig(selectedTool);

    if (
      config.minFeatures &&
      config.maxFeatures &&
      config.minFeatures === config.maxFeatures
    ) {
      return `Select exactly ${config.minFeatures} feature${
        config.minFeatures > 1 ? "s" : ""
      }`;
    }
    if (config.minFeatures) {
      return `Select at least ${config.minFeatures} feature${
        config.minFeatures > 1 ? "s" : ""
      }`;
    }
    return "Select features";
  };

  return (
    <>
      {/* Tool Buttons - Horizontal Row */}
      <Box
        sx={{
          position: "fixed",
          top: 10,
          left: 50,
          zIndex: 1000,
          display: "flex",
          gap: 0.5,
          flexWrap: "wrap",
          maxWidth: "calc(50vw - 20px)",
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          padding: 0.5,
          borderRadius: 2,
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        {(
          [
            "buffer",
            "extrude",
            "union",
            "intersect",
            "difference",
            "simplify",
            "convexHull",
            "centroid",
            "dissolve",
            "area",
            "length",
          ] as ToolType[]
        ).map((tool) => {
          const config = getToolConfig(tool);
          const isActive = selectedTool === tool;

          return (
            <Tooltip key={tool} title={config.label} placement="bottom">
              <Box sx={{ position: "relative" }}>
                <Fab
                  size="small"
                  onClick={(e) => {
                    if (isActive) {
                      // Deselect if clicking active tool
                      setSelectedTool(null);
                      setAnchorEl(null);
                      onToggle(false);
                      onSelectionModeChange(false, null);
                    } else {
                      // Select new tool
                      handleToolSelect(tool, e);
                    }
                  }}
                  sx={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    minHeight: 32,
                    background: isActive
                      ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                      : "rgba(255, 255, 255, 0.95)",
                    color: isActive ? "white" : config.color,
                    boxShadow: isActive
                      ? "0 2px 8px rgba(59, 130, 246, 0.5)"
                      : 1,
                    border: isActive
                      ? "1px solid rgba(255, 255, 255, 0.3)"
                      : "none",
                    "& .MuiSvgIcon-root": {
                      fontSize: "1.25rem",
                    },
                    "&:hover": {
                      background: isActive
                        ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                        : "white",
                      color: isActive ? "white" : config.color,
                      boxShadow: isActive
                        ? "0 4px 12px rgba(59, 130, 246, 0.7)"
                        : 2,
                      transform: "scale(1.08)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  {config.icon}
                </Fab>
                {isActive && selectedFeatures.length > 0 && (
                  <Chip
                    label={selectedFeatures.length}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      height: 16,
                      minWidth: 16,
                      fontSize: "0.65rem",
                      backgroundColor: "#ef4444",
                      color: "white",
                      fontWeight: 600,
                      "& .MuiChip-label": {
                        px: 0.5,
                      },
                    }}
                  />
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Tool Configuration Panel - Only when tool selected */}
      {selectedTool && Boolean(anchorEl) && (
        <Paper
          ref={panelRef}
          onMouseDown={handleMouseDown}
          sx={{
            position: "fixed",
            left: panelPosition.x,
            top: panelPosition.y,
            zIndex: 1300,
            minWidth: 350,
            maxWidth: 450,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            cursor: isDragging ? "grabbing" : "default",
          }}
        >
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {/* Draggable Header */}
              <Box
                className="drag-handle"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  cursor: "grab",
                  "&:active": { cursor: "grabbing" },
                  pb: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {getToolConfig(selectedTool).icon}
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, flex: 1 }}
                >
                  {getToolConfig(selectedTool).label}
                </Typography>
                <Chip
                  label={`${selectedFeatures.length} selected`}
                  size="small"
                  color={canApply() ? "success" : "default"}
                  variant="outlined"
                />
              </Box>

              {/* Selection Status */}
              {!canApply() && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  {getSelectionHint()}
                </Alert>
              )}

              {/* Tool Parameters */}
              {renderToolParameters()}

              {/* Action Buttons */}
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleApplyOperation}
                  fullWidth
                  disabled={!canApply()}
                >
                  Apply
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSelectedTool(null);
                    setAnchorEl(null);
                    onToggle(false);
                    onSelectionModeChange(false, null);
                  }}
                >
                  Close
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default GeometryTools;
