import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Fab,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  Code,
  PlayArrow,
  AutoAwesome,
  Help,
  Save,
  FolderOpen,
  Close,
  ViewList,
  Psychology,
} from "@mui/icons-material";
import * as turf from "@turf/turf";
import { useMapLayers, useMapViewport } from "../hooks/useMapLayers";
import { INITIAL_VIEW_STATE } from "../constants/mapConfig";
import { main } from "../../wailsjs/go/models";
import * as App from "../../wailsjs/go/main/App";
import { FeatureCollection } from "geojson";

// Extend the Window interface to include the Wails go object
declare global {
  interface Window {
    go: {
      main: {
        App: typeof App;
      };
    };
  }
}

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
      id={`overpass-tabpanel-${index}`}
      aria-labelledby={`overpass-tab-${index}`}
      style={{
        height: value === index ? "100%" : "auto",
        overflow: value === index ? "hidden" : "auto",
        display: "flex",
        flexDirection: "column"
      }}
      {...other}
    >
      {value === index && <Box sx={{ p: 0, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>{children}</Box>}
    </div>
  );
}

interface OverpassEditorProps {
  open: boolean;
  onClose: () => void;
}

const OverpassEditor: React.FC<OverpassEditorProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<OverpassTemplate[]>([]);
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const queryEditorRef = useRef<HTMLTextAreaElement>(null);
  const { addLayer } = useMapLayers();
  const { viewState, setViewState } = useMapViewport();

  // Helper function to calculate bounds from GeoJSON data
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
            // Single coordinate pair
            const [lng, lat] = coords;
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          } else {
            // Array of coordinates
            coords.forEach((coord: any) => processCoordinates(coord));
          }
        };

        if (feature.geometry.type === "Point") {
          processCoordinates(feature.geometry.coordinates);
        } else if (
          feature.geometry.type === "LineString" ||
          feature.geometry.type === "MultiPoint"
        ) {
          feature.geometry.coordinates.forEach((coord: any) =>
            processCoordinates(coord)
          );
        } else if (
          feature.geometry.type === "Polygon" ||
          feature.geometry.type === "MultiLineString"
        ) {
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

  // Helper function to zoom to bounds
  const zoomToBounds = (bounds: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  }) => {
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;

    // Calculate zoom level based on bounds size
    const lngSpan = bounds.maxLng - bounds.minLng;
    const latSpan = bounds.maxLat - bounds.minLat;
    const maxSpan = Math.max(lngSpan, latSpan);

    // Rough zoom calculation (adjust for better fit)
    let zoom = 10;
    if (maxSpan < 0.01) zoom = 15;
    else if (maxSpan < 0.05) zoom = 13;
    else if (maxSpan < 0.1) zoom = 12;
    else if (maxSpan < 0.5) zoom = 10;
    else if (maxSpan < 1) zoom = 9;
    else zoom = 8;

    // Update the viewport to zoom to the loaded data
    const newViewState = {
      longitude: centerLng,
      latitude: centerLat,
      zoom: zoom,
      pitch: viewState?.pitch || 0,
      bearing: viewState?.bearing || 0,
    };

    setViewState(newViewState);
    console.log("Zooming to loaded data:", newViewState);
  };

  // Load templates when component mounts
  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      const templateData = await App.GetOverpassQueryTemplates();
      setTemplates((templateData || []) as OverpassTemplate[]);
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

      if (response.success && response.data) {
        // Debug: Log the response data to see what we're getting
        console.log("Overpass API response:", response);
        console.log("Response data:", response.data);
        console.log("Data type:", typeof response.data);
        console.log(
          "Data features count:",
          response.data?.features?.length || "No features array"
        );

        // If no features, provide helpful suggestions
        if (!response.data?.features || response.data.features.length === 0) {
          setError(
            'Query returned no features. Try:\n1. Use [out:json] instead of [out:xml]\n2. Check if the coordinates are correct\n3. Try broader search terms\n4. Include relations: rel["leisure"="park"]'
          );
          return;
        }

        // Add the data as a new layer
        const layerName = `Overpass Query - ${new Date().toLocaleTimeString()}`;
        const newLayer = {
          id: `overpass-${Date.now()}`,
          file_name: layerName,
          file_path: "", // Virtual layer from Overpass API
          type: "overpass",
          data: response.data as FeatureCollection,
          color: [52, 168, 83], // Green color for Overpass data
          labelField: "name", // Default label field for OSM data
        };

        addLayer(newLayer);

        // Calculate bounds and zoom to the loaded data
        const bounds = calculateBounds(response.data);
        if (bounds) {
          zoomToBounds(bounds);
        }

        // Show success message
        setError(null);

        // Close the dialog after successful execution
        onClose();
      } else {
        console.log("Query execution failed or returned no data:", response);
        if (response.success === false) {
          setError(`Overpass API error: ${response.error || "Unknown error"}`);
        } else {
          setError(
            "Query returned no data - check if your query parameters match existing OSM data in this area"
          );
        }
      }
    } catch (err) {
      setError(`Error executing query: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const generateAIQuery = async () => {
    if (!aiDescription.trim()) {
      setError("Please enter a description for the AI to generate a query");
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      // Create a 30-mile radius around the current map center using Turf.js
      const currentViewState = viewState || INITIAL_VIEW_STATE;
      const center = turf.point([
        currentViewState.longitude,
        currentViewState.latitude,
      ]);
      const radius = 10; // miles
      const circle = turf.circle(center, radius, { units: "miles" });
      const bbox = turf.bbox(circle);

      const generatedQuery: string = await App.GenerateOverpassQuery(
        aiDescription,
        bbox
      );

      if (generatedQuery) {
        // Set the generated query in the editor
        setQuery(generatedQuery);

        // Clear the AI description
        setAiDescription("");

        // Switch to the Query Editor tab
        setTabValue(0);

        // Show success message
        setError(null);
      } else {
        setError(
          "Failed to generate query. Please try describing your request differently."
        );
      }
    } catch (err) {
      setError(`Error generating AI query: ${err}`);
    } finally {
      setAiLoading(false);
    }
  };

  const loadTemplate = (template: OverpassTemplate) => {
    // Replace {{bbox}} placeholder with 30-mile radius around current map center
    const currentViewState = viewState || INITIAL_VIEW_STATE;
    const center = turf.point([
      currentViewState.longitude,
      currentViewState.latitude,
    ]);
    const radius = 10; // miles
    const circle = turf.circle(center, radius, { units: "miles" });
    const bboxArray = turf.bbox(circle);

    // Format bbox as string for template replacement (south,west,north,east)
    const bbox = bboxArray.join(",");

    const processedQuery = template.query.replace(/\{\{bbox\}\}/g, bbox);
    setQuery(processedQuery);
    setTabValue(0); // Switch to editor tab
  };

  const insertAtCursor = (text: string) => {
    if (queryEditorRef.current) {
      const textarea = queryEditorRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newQuery = query.substring(0, start) + text + query.substring(end);
      setQuery(newQuery);

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const groupedTemplates = templates.reduce((groups, template) => {
    const category = template.category || "other";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(template);
    return groups;
  }, {} as Record<string, OverpassTemplate[]>);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "80vh",
            background: "rgba(15, 23, 42, 0.3)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "rgba(255, 255, 255, 0.05)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Code color="primary" />
            <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
              Overpass Turbo Query Editor
            </Typography>
            <Chip
              label="OSM Data"
              size="small"
              variant="outlined"
              sx={{
                background: "rgba(52, 168, 83, 0.1)",
                border: "1px solid rgba(52, 168, 83, 0.3)",
                color: "#34a853",
              }}
            />
            <IconButton onClick={onClose} sx={{ ml: "auto" }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              flexShrink: 0,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
              },
            }}
          >
            <Tab icon={<Code />} label="Query Editor" />
            <Tab icon={<ViewList />} label="Templates" />
            <Tab icon={<Psychology />} label="AI Assistant" />
          </Tabs>

          <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <TabPanel value={tabValue} index={0}>
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  p: 2,
                  overflow: "auto",
                }}
              >
                <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    size="small"
                    onClick={() => insertAtCursor('node["amenity"](bbox)')}
                    sx={{ textTransform: "none" }}
                  >
                    + Node
                  </Button>
                  <Button
                    size="small"
                    onClick={() => insertAtCursor('way["highway"](bbox)')}
                    sx={{ textTransform: "none" }}
                  >
                    + Way
                  </Button>
                  <Button
                    size="small"
                    onClick={() => insertAtCursor('relation["type"](bbox)')}
                    sx={{ textTransform: "none" }}
                  >
                    + Relation
                  </Button>
                  <Button
                    size="small"
                    onClick={() => insertAtCursor("out center meta;")}
                    sx={{ textTransform: "none" }}
                  >
                    + Output
                  </Button>
                </Box>

                <TextField
                  multiline
                  fullWidth
                  minRows={10}
                  maxRows={20}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your Overpass QL query here..."
                  inputRef={queryEditorRef}
                  sx={{
                    flex: 1,
                    "& .MuiInputBase-root": {
                      fontFamily: "monospace",
                      fontSize: "0.9rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      backdropFilter: "blur(10px)",
                      height: "100%",
                      alignItems: "flex-start",
                    },
                    "& .MuiInputBase-input": {
                      overflow: "auto !important",
                      resize: "none",
                    },
                  }}
                />

                {error && (
                  <Alert
                    severity="error"
                    sx={{
                      mt: 2,
                      maxHeight: 200,
                      overflow: "auto",
                      "& .MuiAlert-message": {
                        maxHeight: 160,
                        overflow: "auto",
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                      },
                    }}
                  >
                    {error}
                  </Alert>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ height: "100%", overflow: "auto", p: 2, maxHeight: "60vh" }}>
                <Typography variant="h6" gutterBottom>
                  Query Templates
                </Typography>

                {Object.entries(groupedTemplates).map(
                  ([category, categoryTemplates]) => (
                    <Box key={category} sx={{ mb: 3 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          textTransform: "capitalize",
                          fontWeight: 600,
                          mb: 1,
                          color: "primary.main",
                        }}
                      >
                        {category}
                      </Typography>

                      <List dense>
                        {categoryTemplates.map((template, index) => (
                          <ListItem key={index} disablePadding>
                            <ListItemButton
                              onClick={() => loadTemplate(template)}
                              sx={{
                                borderRadius: 2,
                                mb: 1,
                                background: "rgba(255, 255, 255, 0.03)",
                                "&:hover": {
                                  background: "rgba(255, 255, 255, 0.08)",
                                },
                              }}
                            >
                              <ListItemText
                                primary={template.name}
                                secondary={template.description}
                                primaryTypographyProps={{
                                  fontWeight: 500,
                                  fontSize: "0.9rem",
                                }}
                                secondaryTypographyProps={{
                                  fontSize: "0.8rem",
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box
                sx={{
                  height: "100%",
                  p: 2,
                  overflow: "auto",
                  maxHeight: "60vh",
                }}
              >
                <Typography variant="h6" gutterBottom>
                  AI Query Assistant
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Describe what you want to find and AI will generate an
                  Overpass query for you. The query will be placed in the Query
                  Editor tab where you can review and execute it.
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="e.g., Find all restaurants and cafes in the current area"
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="contained"
                  startIcon={
                    aiLoading ? <CircularProgress size={16} /> : <AutoAwesome />
                  }
                  onClick={generateAIQuery}
                  disabled={aiLoading || !aiDescription.trim()}
                  fullWidth
                >
                  {aiLoading ? "Generating..." : "Generate Query"}
                </Button>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Examples:
                  </Typography>
                  <List dense>
                    {[
                      "Find all schools and universities",
                      "Show me parks and green spaces",
                      "Get all restaurants and food places",
                      "Find public transportation stops",
                      "Show all shops and stores",
                    ].map((example, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemButton
                          onClick={() => setAiDescription(example)}
                          sx={{ borderRadius: 1 }}
                        >
                          <ListItemText
                            primary={example}
                            primaryTypographyProps={{ fontSize: "0.85rem" }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {error && (
                  <Alert
                    severity="error"
                    sx={{
                      mt: 2,
                      maxHeight: 200,
                      overflow: "auto",
                      "& .MuiAlert-message": {
                        maxHeight: 160,
                        overflow: "auto",
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                      },
                    }}
                  >
                    {error}
                  </Alert>
                )}
              </Box>
            </TabPanel>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(10px)",
            justifyContent: "center",
            padding: 2,
            gap: 1,
          }}
        >
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
            onClick={executeQuery}
            disabled={loading || !query.trim() || tabValue !== 0}
          >
            {loading ? "Executing..." : "Execute Query"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OverpassEditor;
