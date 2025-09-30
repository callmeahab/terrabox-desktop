import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  Button,
  Typography,
  TextField,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Code,
  PlayArrow,
  AutoAwesome,
  Close,
  ViewList,
  Psychology,
  CropFree,
  Map as MapIcon,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import * as turf from "@turf/turf";
import { useMapLayers, useMapViewport } from "../hooks/useMapLayers";
import { INITIAL_VIEW_STATE } from "../constants/mapConfig";
import { main } from "../../wailsjs/go/models";
import * as App from "../../wailsjs/go/main/App";
import { FeatureCollection } from "geojson";

interface OverpassTemplate {
  name: string;
  description: string;
  category: string;
  query: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      style={{
        height: "100%",
        overflow: "hidden",
        display: value === index ? "flex" : "none",
        flexDirection: "column",
      }}
      {...other}
    >
      {value === index && (
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          {children}
        </Box>
      )}
    </div>
  );
}

interface OverpassPanelProps {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  drawnBounds?: [number, number, number, number] | null;
  isDrawingBounds: boolean;
  onStartDrawingBounds: () => void;
  onFinishDrawingBounds: () => void;
  onCancelDrawingBounds: () => void;
}

const OverpassPanel: React.FC<OverpassPanelProps> = ({
  isOpen,
  onToggle,
  drawnBounds,
  isDrawingBounds,
  onStartDrawingBounds,
  onFinishDrawingBounds,
  onCancelDrawingBounds,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<OverpassTemplate[]>([]);

  // Fallback sample templates
  const sampleTemplates: OverpassTemplate[] = [
    {
      name: "Restaurants",
      description: "Find all restaurants in the area",
      category: "Food & Dining",
      query: `[out:json][timeout:25];
(
  node["amenity"="restaurant"]({{bbox}});
  way["amenity"="restaurant"]({{bbox}});
  relation["amenity"="restaurant"]({{bbox}});
);
out geom;`,
    },
    {
      name: "Cafes and Coffee Shops",
      description: "Find cafes and coffee shops",
      category: "Food & Dining",
      query: `[out:json][timeout:25];
(
  node["amenity"="cafe"]({{bbox}});
  way["amenity"="cafe"]({{bbox}});
  relation["amenity"="cafe"]({{bbox}});
);
out geom;`,
    },
    {
      name: "Parks and Green Spaces",
      description: "Find parks, gardens, and recreational areas",
      category: "Recreation",
      query: `[out:json][timeout:25];
(
  node["leisure"~"^(park|garden|playground)$"]({{bbox}});
  way["leisure"~"^(park|garden|playground)$"]({{bbox}});
  relation["leisure"~"^(park|garden|playground)$"]({{bbox}});
);
out geom;`,
    },
    {
      name: "Administrative Boundaries",
      description: "Find administrative boundaries and borders",
      category: "Boundaries",
      query: `[out:json][timeout:25];
(
  relation["boundary"="administrative"]({{bbox}});
);
out geom;`,
    },
    {
      name: "Coastlines and Water Bodies",
      description: "Find coastlines, rivers, and water features",
      category: "Geography",
      query: `[out:json][timeout:25];
(
  way["natural"="coastline"]({{bbox}});
  way["waterway"]({{bbox}});
  way["natural"="water"]({{bbox}});
  relation["natural"="water"]({{bbox}});
);
out geom;`,
    },
    {
      name: "Roads and Highways",
      description: "Find major roads and highways",
      category: "Transportation",
      query: `[out:json][timeout:25];
(
  way["highway"~"^(motorway|trunk|primary|secondary)$"]({{bbox}});
);
out geom;`,
    },
  ];
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const queryEditorRef = useRef<HTMLTextAreaElement>(null);
  const { addLayer } = useMapLayers();
  const { viewState, setViewState } = useMapViewport();

  // Load templates when component mounts
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  // Update bounding box in queries when drawn geometry changes
  useEffect(() => {
    if (drawnBounds && query) {
      // Convert drawnBounds [west, south, east, north] to Overpass format (south, west, north, east)
      const bbox = `${drawnBounds[1]},${drawnBounds[0]},${drawnBounds[3]},${drawnBounds[2]}`;

      // Look for existing bbox patterns in the query and replace them
      // Pattern matches coordinates in parentheses like (51.7,-0.1,51.8,0.1)
      const bboxPattern = /\([\d\.\-,\s]+\)/g;
      const matches = query.match(bboxPattern);

      if (matches && matches.length > 0) {
        // Replace all bbox coordinate patterns with the new bbox
        const updatedQuery = query.replace(bboxPattern, `(${bbox})`);

        if (updatedQuery !== query) {
          setQuery(updatedQuery);
        }
      }
    }
  }, [drawnBounds, query]);

  const loadTemplates = async () => {
    try {
      console.log("Loading Overpass query templates...");
      const templateData = await App.GetOverpassQueryTemplates();
      console.log("Templates loaded:", templateData);

      if (
        templateData &&
        Array.isArray(templateData) &&
        templateData.length > 0
      ) {
        setTemplates(templateData as OverpassTemplate[]);
      } else {
        console.log("No templates from backend, using sample templates");
        setTemplates(sampleTemplates);
      }
    } catch (err) {
      console.error("Failed to load templates from backend:", err);
      console.log("Using sample templates as fallback");
      setTemplates(sampleTemplates);
    }
  };

  const calculateBounds = (geojsonData: any) => {
    if (!geojsonData?.features || geojsonData.features.length === 0)
      return null;

    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;

    geojsonData.features.forEach((feature: any) => {
      if (feature.geometry) {
        const processCoordinates = (coords: any) => {
          if (typeof coords[0] === "number") {
            const [lng, lat] = coords;
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          } else {
            coords.forEach((coord: any) => processCoordinates(coord));
          }
        };

        if (feature.geometry.type === "Point") {
          processCoordinates(feature.geometry.coordinates);
        } else if (feature.geometry.type === "LineString") {
          feature.geometry.coordinates.forEach((coord: any) =>
            processCoordinates(coord)
          );
        } else if (feature.geometry.type === "Polygon") {
          feature.geometry.coordinates.forEach((ring: any) => {
            ring.forEach((coord: any) => processCoordinates(coord));
          });
        } else if (feature.geometry.type === "MultiPolygon") {
          feature.geometry.coordinates.forEach((polygon: any) => {
            polygon.forEach((ring: any) => {
              ring.forEach((coord: any) => processCoordinates(coord));
            });
          });
        }
      }
    });

    if (minLng === Infinity) return null;
    return { minLng, maxLng, minLat, maxLat };
  };

  const zoomToBounds = (bounds: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  }) => {
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const zoom = Math.max(
      Math.log2(360 / Math.abs(bounds.maxLng - bounds.minLng)) - 1,
      Math.log2(180 / Math.abs(bounds.maxLat - bounds.minLat)) - 1
    );

    setViewState({
      ...INITIAL_VIEW_STATE,
      longitude: centerLng,
      latitude: centerLat,
      zoom: Math.min(zoom, 15),
    });
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response: main.OverpassResponse = await App.QueryOverpassAPI(query);
      if (!response || response.success === false) {
        setError(
          'Query returned no features. Try:\n1. Use [out:json] instead of [out:xml]\n2. Check if the coordinates are correct\n3. Try broader search terms\n4. Include relations: rel["leisure"="park"]'
        );
        return;
      }

      // Check if features exist
      if (!response.data?.features || response.data.features.length === 0) {
        setError(
          'Query returned no features. Try:\n1. Use [out:json] instead of [out:xml]\n2. Check if the coordinates are correct\n3. Try broader search terms\n4. Include relations: rel["leisure"="park"]'
        );
        return;
      }

      const layerName = `Overpass Query - ${new Date().toLocaleTimeString()}`;
      const newLayer = {
        id: `overpass-${Date.now()}`,
        data: response.data as FeatureCollection,
        file_name: layerName,
        file_path: "",
        color: [52, 168, 83] as number[],
        type: "overpass",
        labelField: "name",
      } as const;

      addLayer(newLayer);

      // Calculate bounds and zoom to data
      const bounds = calculateBounds(response.data);
      if (bounds) {
        zoomToBounds(bounds);
      }

      console.log("Overpass query executed successfully");
    } catch (err) {
      console.error("Failed to execute query:", err);
      setError(err instanceof Error ? err.message : "Failed to execute query");
    } finally {
      setLoading(false);
    }
  };

  const generateAIQuery = async () => {
    if (!aiDescription.trim()) {
      setError("Please enter a description for what you want to find");
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      const currentViewState = viewState || INITIAL_VIEW_STATE;
      let bboxArray: number[];

      if (drawnBounds) {
        // Use custom drawn bounds: [west, south, east, north]
        bboxArray = drawnBounds;
      } else {
        // Create circular bounds around current view
        const center = turf.point([
          currentViewState.longitude,
          currentViewState.latitude,
        ]);
        const radius = 10;
        const circle = turf.circle(center, radius, { units: "miles" });
        bboxArray = turf.bbox(circle);
      }

      // Convert to Overpass format: (south, west, north, east)
      const bbox = `${bboxArray[1]},${bboxArray[0]},${bboxArray[3]},${bboxArray[2]}`;

      console.log(
        "Generating AI query with description and bbox:",
        aiDescription,
        bboxArray
      );

      let generatedQuery: string;

      try {
        // Use numeric bbox array as required by backend API
        const numericBbox = drawnBounds ? drawnBounds : bboxArray;
        generatedQuery = await App.GenerateOverpassQuery(
          aiDescription,
          numericBbox
        );
        console.log("AI query response:", generatedQuery);

        // Validate that the response is not empty or malformed
        if (
          !generatedQuery ||
          typeof generatedQuery !== "string" ||
          generatedQuery.trim().length === 0
        ) {
          throw new Error("Empty or invalid response from AI service");
        }
      } catch (aiError) {
        console.warn(
          "Backend AI generation failed, using template-based fallback:",
          aiError
        );

        // Show user that we're falling back to templates
        setError(
          "AI generation temporarily unavailable. Using template-based fallback."
        );

        // Simple template-based fallback
        const lowerDesc = aiDescription.toLowerCase();
        if (lowerDesc.includes("restaurant") || lowerDesc.includes("food")) {
          generatedQuery =
            sampleTemplates.find((t) => t.name === "Restaurants")?.query || "";
        } else if (lowerDesc.includes("cafe") || lowerDesc.includes("coffee")) {
          generatedQuery =
            sampleTemplates.find((t) => t.name === "Cafes and Coffee Shops")
              ?.query || "";
        } else if (lowerDesc.includes("park") || lowerDesc.includes("green")) {
          generatedQuery =
            sampleTemplates.find((t) => t.name === "Parks and Green Spaces")
              ?.query || "";
        } else if (
          lowerDesc.includes("boundary") ||
          lowerDesc.includes("border")
        ) {
          generatedQuery =
            sampleTemplates.find((t) => t.name === "Administrative Boundaries")
              ?.query || "";
        } else if (
          lowerDesc.includes("water") ||
          lowerDesc.includes("coast") ||
          lowerDesc.includes("river")
        ) {
          generatedQuery =
            sampleTemplates.find(
              (t) => t.name === "Coastlines and Water Bodies"
            )?.query || "";
        } else if (
          lowerDesc.includes("road") ||
          lowerDesc.includes("highway")
        ) {
          generatedQuery =
            sampleTemplates.find((t) => t.name === "Roads and Highways")
              ?.query || "";
        } else {
          // Default to restaurants as fallback
          generatedQuery =
            sampleTemplates.find((t) => t.name === "Restaurants")?.query || "";
        }

        if (generatedQuery) {
          generatedQuery = generatedQuery.replace(/{{bbox}}/g, bbox);
          console.log("Using template-based fallback query");
        }
      }

      if (generatedQuery && generatedQuery.trim()) {
        setQuery(generatedQuery);
        setTabValue(0); // Switch to Query Editor tab
        console.log("Successfully generated and applied AI query");

        // Clear any previous error since we succeeded (even with fallback)
        setTimeout(() => setError(null), 3000); // Clear fallback message after 3 seconds
      } else {
        setError(
          "Failed to generate query. Please try using the Templates tab instead."
        );
      }
    } catch (err) {
      console.error("Failed to generate AI query:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate query. Please check the console for details."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const insertAtCursor = (text: string) => {
    if (queryEditorRef.current) {
      const textarea = queryEditorRef.current;
      const start = textarea.selectionStart ?? query.length;
      const end = textarea.selectionEnd ?? query.length;
      const newQuery = query.substring(0, start) + text + query.substring(end);
      setQuery(newQuery);

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    }
  };

  const applyTemplate = (template: OverpassTemplate) => {
    const currentViewState = viewState || INITIAL_VIEW_STATE;
    let bbox: string;

    if (drawnBounds) {
      // Use custom drawn bounds: [west, south, east, north] -> (south, west, north, east)
      bbox = `${drawnBounds[1]},${drawnBounds[0]},${drawnBounds[3]},${drawnBounds[2]}`;
    } else {
      // Generate bbox from current view
      const center = turf.point([
        currentViewState.longitude,
        currentViewState.latitude,
      ]);
      const radius = 10;
      const circle = turf.circle(center, radius, { units: "miles" });
      const bboxArray = turf.bbox(circle);
      bbox = `${bboxArray[1]},${bboxArray[0]},${bboxArray[3]},${bboxArray[2]}`;
    }

    const populatedQuery = template.query.replace(/{{bbox}}/g, bbox);
    setQuery(populatedQuery);
    setTabValue(0); // Switch to Query Editor tab
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((groups, template) => {
    const category = template.category || "Other";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(template);
    return groups;
  }, {} as Record<string, OverpassTemplate[]>);

  return (
    <Paper
      ref={panelRef}
      sx={{
        position: "fixed",
        bottom: isOpen ? 0 : -365,
        left: 0,
        right: 0,
        height: 400,
        background: isOpen
          ? "rgba(15, 23, 42, 0.85)"
          : "rgba(15, 23, 42, 0.95)",
        backdropFilter: isOpen ? "blur(10px)" : "blur(5px)",
        border: isOpen ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
        borderBottom: "none",
        borderRadius: 0,
        boxShadow: isOpen
          ? "0 -8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
          : "none",
        display: "flex",
        flexDirection: "column",
        zIndex: 1200,
        overflow: "hidden",
        transition: "bottom 0.3s ease",
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.5,
          minHeight: 36,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          background: "rgba(255, 255, 255, 0.05)",
          cursor: !isOpen ? "pointer" : "default",
        }}
        onClick={() => !isOpen && onToggle(true)}
      >
        {isOpen ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Code color="primary" />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, fontSize: "0.875rem" }}
                >
                  Overpass Query Editor
                </Typography>
                <Chip
                  label="OSM Data"
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    background: "rgba(52, 168, 83, 0.1)",
                    border: "1px solid rgba(52, 168, 83, 0.3)",
                    color: "#34a853",
                  }}
                />
              </Box>
            </Box>
          </>
        ) : (
          <Tooltip title="Open Overpass Query Editor" placement="top">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Code
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  "&:hover": { color: "white" },
                  cursor: "pointer",
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
                Overpass Query Editor
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Controls */}
        {isOpen && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {drawnBounds && (
              <Chip
                label="🎯 Using Custom Drawn Area"
                size="small"
                onDelete={onCancelDrawingBounds}
                sx={{
                  backgroundColor: "rgba(156, 39, 176, 0.2)",
                  color: "#AB47BC",
                }}
              />
            )}

            {isDrawingBounds ? (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={onFinishDrawingBounds}
                  sx={{
                    backgroundColor: "#10b981",
                    "&:hover": { backgroundColor: "#059669" },
                  }}
                >
                  Use This Area
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onCancelDrawingBounds}
                  sx={{
                    borderColor: "rgba(239, 68, 68, 0.5)",
                    color: "#ef4444",
                  }}
                >
                  Cancel
                </Button>
              </Box>
            ) : (
              <Tooltip title="Draw custom query bounds">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CropFree />}
                  onClick={onStartDrawingBounds}
                  sx={{
                    borderColor: "rgba(156, 39, 176, 0.5)",
                    color: "#AB47BC",
                    "&:hover": {
                      borderColor: "#AB47BC",
                      backgroundColor: "rgba(156, 39, 176, 0.1)",
                    },
                  }}
                >
                  Draw Query Area
                </Button>
              </Tooltip>
            )}

            <Button
              variant="contained"
              size="small"
              startIcon={
                loading ? <CircularProgress size={16} /> : <PlayArrow />
              }
              onClick={executeQuery}
              disabled={loading || !query.trim()}
              sx={{
                backgroundColor: "#10b981",
                "&:hover": { backgroundColor: "#059669" },
              }}
            >
              {loading ? "Executing..." : "Run Query"}
            </Button>

            <IconButton
              size="small"
              onClick={() => onToggle(false)}
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                "&:hover": { color: "white" },
                p: 0.5,
              }}
            >
              <ExpandMore sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Content Area */}
      {isOpen && (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
              minHeight: 36,
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                minHeight: 36,
                fontSize: "0.8rem",
                py: 0.5,
                color: "rgba(255, 255, 255, 0.7)",
                "&.Mui-selected": {
                  color: "#10b981",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#10b981",
                height: 3,
              },
            }}
          >
            <Tab
              icon={<Code sx={{ fontSize: 18 }} />}
              label="Query Editor"
              iconPosition="start"
            />
            <Tab
              icon={<ViewList sx={{ fontSize: 18 }} />}
              label="Templates"
              iconPosition="start"
            />
            <Tab
              icon={<Psychology sx={{ fontSize: 18 }} />}
              label="AI Assistant"
              iconPosition="start"
            />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Box
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Query Helper Buttons */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                <Button
                  size="small"
                  onClick={() => insertAtCursor('node["amenity"](bbox)')}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                  variant="outlined"
                >
                  + Node
                </Button>
                <Button
                  size="small"
                  onClick={() => insertAtCursor('way["highway"](bbox)')}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                  variant="outlined"
                >
                  + Way
                </Button>
                <Button
                  size="small"
                  onClick={() => insertAtCursor('relation["type"](bbox)')}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                  variant="outlined"
                >
                  + Relation
                </Button>
                <Button
                  size="small"
                  onClick={() => insertAtCursor("out center meta;")}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                  variant="outlined"
                >
                  + Output
                </Button>
              </Box>

              <TextField
                inputRef={queryEditorRef}
                multiline
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your Overpass API query here..."
                variant="outlined"
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    fontFamily: "Monaco, 'Menlo', 'Ubuntu Mono', monospace",
                    fontSize: "12px",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    height: "100%",
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
                  "& .MuiInputBase-input": {
                    color: "#ffffff",
                    height: "100% !important",
                  },
                  "& .MuiInputBase-root": {
                    height: "100%",
                  },
                }}
              />

              {error && (
                <Alert
                  severity="error"
                  sx={{ backgroundColor: "rgba(244, 67, 54, 0.1)" }}
                >
                  {error}
                </Alert>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 2, flex: 1, overflow: "auto", minHeight: 0 }}>
              {Object.entries(groupedTemplates).length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    flexDirection: "column",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ color: "rgba(255, 255, 255, 0.5)", mb: 1 }}
                  >
                    Loading templates...
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255, 255, 255, 0.3)" }}
                  >
                    Please wait while we fetch the available query templates.
                  </Typography>
                </Box>
              ) : (
                Object.entries(groupedTemplates).map(
                  ([category, categoryTemplates]) => (
                    <Box key={category} sx={{ mb: 3 }}>
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, color: "#10b981", fontWeight: 600 }}
                      >
                        {category}
                      </Typography>
                      <List dense>
                        {categoryTemplates.map((template, index) => (
                          <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                              onClick={() => applyTemplate(template)}
                              sx={{
                                borderRadius: 2,
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                "&:hover": {
                                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                                },
                              }}
                            >
                              <ListItemText
                                primary={template.name}
                                secondary={template.description}
                                primaryTypographyProps={{
                                  sx: { color: "#ffffff", fontWeight: 500 },
                                }}
                                secondaryTypographyProps={{
                                  sx: {
                                    fontSize: "0.875rem",
                                    color: "rgba(255, 255, 255, 0.7)",
                                  },
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )
                )
              )}
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                flex: 1,
                minHeight: 0,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  mb: 2,
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "0.8rem",
                }}
              >
                Describe what you want to find and AI will generate an Overpass
                query for you.
              </Typography>

              {drawnBounds && (
                <Alert
                  severity="info"
                  icon={<MapIcon />}
                  sx={{
                    mb: 3,
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    "& .MuiAlert-icon": {
                      color: "#10b981",
                    },
                  }}
                >
                  Using custom drawn bounds
                </Alert>
              )}

              <TextField
                fullWidth
                multiline
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    generateAIQuery();
                  }
                }}
                placeholder="e.g., Find all restaurants and cafes in the current area"
                variant="outlined"
                sx={{
                  mb: 3,
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    fontFamily: "Monaco, 'Menlo', 'Ubuntu Mono', monospace",
                    fontSize: "12px",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    height: "100%",
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
                  "& .MuiInputBase-input": {
                    color: "#ffffff",
                    height: "100% !important",
                  },
                  "& .MuiInputBase-root": {
                    height: "100%",
                  },
                }}
              />

              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Button
                  variant="contained"
                  startIcon={
                    aiLoading ? <CircularProgress size={16} /> : <AutoAwesome />
                  }
                  onClick={generateAIQuery}
                  disabled={aiLoading || !aiDescription.trim()}
                  sx={{
                    backgroundColor: "#10b981",
                    width: 170,
                    "&:hover": { backgroundColor: "#059669" },
                  }}
                >
                  {aiLoading ? "Generating..." : "Generate Query"}
                </Button>
              </Box>

              {/* Example Prompts */}
              <Box sx={{ mt: 2, flexShrink: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    fontSize: "0.8rem",
                    color: "rgba(255, 255, 255, 0.9)",
                  }}
                >
                  Examples:
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  {[
                    "Find all restaurants and cafes",
                    "Show me parks and green spaces",
                    "Get public transportation stops",
                    "Find schools and universities",
                    "Show administrative boundaries",
                    "Get coastlines and water bodies",
                  ].map((example, index) => (
                    <Button
                      key={index}
                      size="small"
                      variant="text"
                      onClick={() => setAiDescription(example)}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.7rem",
                        p: 0.5,
                        minWidth: "auto",
                        color: "rgba(255, 255, 255, 0.6)",
                        "&:hover": { color: "#10b981" },
                      }}
                    >
                      {example}
                    </Button>
                  ))}
                </Box>
              </Box>

              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mt: 3,
                    backgroundColor: "rgba(244, 67, 54, 0.1)",
                    border: "1px solid rgba(244, 67, 54, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  {error}
                </Alert>
              )}
            </Box>
          </TabPanel>
        </Box>
      )}
    </Paper>
  );
};

export default OverpassPanel;
