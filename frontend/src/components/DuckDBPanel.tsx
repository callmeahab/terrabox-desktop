import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import {
  Close,
  PlayArrow,
  Storage,
  TableChart,
  CloudUpload,
  Delete,
  Layers,
} from "@mui/icons-material";
import { useMapLayers } from "../hooks/useMapLayers";
import * as App from "../../wailsjs/go/main/App";

interface DuckDBPanelProps {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  embedded?: boolean;
}

interface DuckDBTable {
  table_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  loaded_at: string;
  row_count: number;
  geom_type: string;
  srid: number;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  count: number;
}

const DuckDBPanel: React.FC<DuckDBPanelProps> = ({ isOpen, onToggle, embedded = false }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState("SELECT * FROM geo_1 LIMIT 100");
  const [tables, setTables] = useState<DuckDBTable[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [layerDialogOpen, setLayerDialogOpen] = useState(false);
  const [loadingLayer, setLoadingLayer] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);

  const { layers } = useMapLayers();

  // Load tables on mount
  useEffect(() => {
    if (isOpen) {
      loadTables();
    }
  }, [isOpen]);

  const loadTables = async () => {
    try {
      const result = await App.ListDuckDBTables();
      setTables(result || []);
    } catch (err) {
      console.error("Failed to load tables:", err);
      setTables([]);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await App.ExecuteDuckDBQuery(query);
      setQueryResult(result as QueryResult);
      setActiveTab(1); // Switch to results tab
    } catch (err: any) {
      setError(err.message || "Query execution failed");
      setQueryResult(null);
    } finally {
      setLoading(false);
    }
  };

  const deleteTable = async (tableName: string) => {
    if (!confirm(`Delete table "${tableName}"?`)) {
      return;
    }

    try {
      await App.DropDuckDBTable(tableName);
      await loadTables();
    } catch (err: any) {
      setError(err.message || "Failed to delete table");
    }
  };

  const loadDataFromLayer = async () => {
    if (layers.length === 0) {
      setError("No layers available to load. Please add a layer to the map first.");
      return;
    }
    setLayerDialogOpen(true);
  };

  const importDataFile = async () => {
    setLoadingFile(true);
    setError(null);

    try {
      // Open file picker dialog for CSV/GeoJSON files
      const filePath = await App.SelectDataFile();

      if (!filePath) {
        setLoadingFile(false);
        return;
      }

      // Extract filename from path
      const fileName = filePath.split(/[/\\]/).pop() || "imported";

      // Load file into DuckDB (automatically detects CSV or GeoJSON)
      const tableName = await App.LoadDataFileToDuckDB(filePath);

      console.log(`Successfully loaded "${fileName}" as table "${tableName}"`);

      // Refresh tables list
      await loadTables();

      // Switch to tables tab to show the newly loaded table
      setActiveTab(2);
    } catch (err: any) {
      console.error("Failed to import data file:", err);
      // Only show error if it's not a cancellation
      if (err.message && !err.message.includes("cancelled")) {
        setError(err.message || "Failed to import data file");
      }
    } finally {
      setLoadingFile(false);
    }
  };

  const handleLoadLayer = async (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) {
      setError("Layer not found");
      return;
    }

    setLoadingLayer(true);
    setError(null);

    try {
      // Convert FeatureCollection to map[string]interface{} format expected by backend
      const geojsonData = layer.data as any;

      const tableName = await App.LoadGeoJSONToDuckDB(
        geojsonData,
        layer.file_name || "layer",
        layer.file_path || ""
      );

      console.log(`Successfully loaded layer "${layer.file_name}" as table "${tableName}"`);

      // Refresh tables list
      await loadTables();

      // Switch to tables tab to show the newly loaded table
      setActiveTab(2);

      // Close dialog
      setLayerDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to load layer into DuckDB:", err);
      setError(err.message || "Failed to load layer into DuckDB");
    } finally {
      setLoadingLayer(false);
    }
  };

  const visualizeResults = async () => {
    if (!queryResult || !selectedTable) {
      alert("Please select a table and run a query first");
      return;
    }

    try {
      const geojson = await App.ConvertDuckDBResultToGeoJSON(selectedTable);
      // TODO: Add this GeoJSON to the map as a new layer
      console.log("GeoJSON result:", geojson);
      alert("Visualization coming soon!");
    } catch (err: any) {
      setError(err.message || "Failed to visualize results");
    }
  };

  if (!isOpen && !embedded) return null;

  // Embedded mode: simpler render without wrapper
  if (embedded) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
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
          <Tab label="Query Editor" />
          <Tab label="Results" />
          <Tab label="Tables" />
        </Tabs>

        {/* Content (same as standalone) */}
        <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Query Editor Tab */}
          {activeTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2, flex: 1, minHeight: 0 }}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>Table</InputLabel>
                  <Select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    sx={{
                      color: "white",
                      fontSize: "0.875rem",
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.3)" },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#10b981" },
                    }}
                  >
                    {tables.map((table) => (
                      <MenuItem key={table.table_name} value={table.table_name} sx={{ fontSize: "0.875rem" }}>
                        {table.table_name} ({table.row_count} rows)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Layers sx={{ fontSize: 16 }} />}
                  onClick={loadDataFromLayer}
                  sx={{
                    color: "#10b981",
                    borderColor: "rgba(16, 185, 129, 0.5)",
                    fontSize: "0.75rem",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#10b981",
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                    },
                  }}
                >
                  Load Layer
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={loadingFile ? <CircularProgress size={16} /> : <CloudUpload sx={{ fontSize: 16 }} />}
                  onClick={importDataFile}
                  disabled={loadingFile}
                  sx={{
                    color: "#3b82f6",
                    borderColor: "rgba(59, 130, 246, 0.5)",
                    fontSize: "0.75rem",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#3b82f6",
                      backgroundColor: "rgba(59, 130, 246, 0.1)",
                    },
                  }}
                >
                  {loadingFile ? "Importing..." : "Import File"}
                </Button>
              </Box>

              <TextField
                multiline
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your SQL query here..."
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
                  onClose={() => setError(null)}
                  sx={{ backgroundColor: "rgba(244, 67, 54, 0.1)" }}
                >
                  {error}
                </Alert>
              )}

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
                  onClick={executeQuery}
                  disabled={loading}
                  sx={{
                    backgroundColor: "#10b981",
                    "&:hover": { backgroundColor: "#059669" },
                    fontSize: "0.75rem",
                    textTransform: "none",
                  }}
                >
                  {loading ? "Executing..." : "Run Query"}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<TableChart sx={{ fontSize: 16 }} />}
                  onClick={visualizeResults}
                  disabled={!queryResult}
                  sx={{
                    color: "#10b981",
                    borderColor: "rgba(16, 185, 129, 0.5)",
                    fontSize: "0.75rem",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#10b981",
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                    },
                  }}
                >
                  Visualize
                </Button>
              </Box>
            </Box>
          )}

          {/* Results Tab */}
          {activeTab === 1 && (
            <Box sx={{ p: 2, flex: 1, overflow: "auto", minHeight: 0 }}>
              {queryResult ? (
                <>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", mb: 1, display: "block" }}>
                    {queryResult.count} rows returned
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 280, backgroundColor: "rgba(30, 41, 59, 0.5)" }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          {queryResult.columns.map((col) => (
                            <TableCell
                              key={col}
                              sx={{
                                backgroundColor: "rgba(15, 23, 42, 0.9)",
                                color: "white",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                py: 0.5,
                              }}
                            >
                              {col}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {queryResult.rows.map((row, idx) => (
                          <TableRow key={idx}>
                            {queryResult.columns.map((col) => (
                              <TableCell
                                key={col}
                                sx={{
                                  color: "rgba(255,255,255,0.9)",
                                  fontSize: "0.75rem",
                                  py: 0.5,
                                  fontFamily: "monospace",
                                }}
                              >
                                {typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col] ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  No results yet. Execute a query to see results here.
                </Typography>
              )}
            </Box>
          )}

          {/* Tables Tab */}
          {activeTab === 2 && (
            <Box sx={{ p: 2, flex: 1, overflow: "auto", minHeight: 0 }}>
              {tables.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {tables.map((table) => (
                    <Paper
                      key={table.table_name}
                      sx={{
                        p: 1.5,
                        backgroundColor: "rgba(30, 41, 59, 0.5)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderRadius: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ color: "white", fontWeight: 600, fontSize: "0.875rem" }}>
                          {table.table_name}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                          <Chip
                            label={`${table.row_count} rows`}
                            size="small"
                            sx={{
                              color: "white",
                              fontSize: "0.65rem",
                              height: 20,
                              backgroundColor: "rgba(16, 185, 129, 0.2)",
                            }}
                          />
                          <Chip
                            label={table.file_type}
                            size="small"
                            sx={{
                              color: "white",
                              fontSize: "0.65rem",
                              height: 20,
                              backgroundColor: "rgba(59, 130, 246, 0.2)",
                            }}
                          />
                          <Chip
                            label={`SRID: ${table.srid}`}
                            size="small"
                            sx={{
                              color: "white",
                              fontSize: "0.65rem",
                              height: 20,
                              backgroundColor: "rgba(168, 85, 247, 0.2)",
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", mt: 0.5, display: "block", fontSize: "0.7rem" }}>
                          {table.file_name} • {new Date(table.loaded_at).toLocaleString()}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => deleteTable(table.table_name)}
                        sx={{ color: "#ef4444", p: 0.5 }}
                      >
                        <Delete sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  No tables loaded. Load a geospatial file to get started.
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {/* Layer Selection Dialog */}
        <Dialog
          open={layerDialogOpen}
          onClose={() => !loadingLayer && setLayerDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            },
          }}
        >
          <DialogTitle sx={{ color: "white", display: "flex", alignItems: "center", gap: 1 }}>
            <Layers sx={{ color: "#10b981" }} />
            Select Layer to Load into DuckDB
          </DialogTitle>
          <DialogContent>
            {layers.length === 0 ? (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", py: 2 }}>
                No layers available. Please add a layer to the map first.
              </Typography>
            ) : (
              <List sx={{ pt: 0 }}>
                {layers.map((layer) => (
                  <ListItem key={layer.id} disablePadding sx={{ mb: 1 }}>
                    <ListItemButton
                      onClick={() => handleLoadLayer(layer.id)}
                      disabled={loadingLayer}
                      sx={{
                        borderRadius: 2,
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        "&:hover": {
                          backgroundColor: "rgba(16, 185, 129, 0.1)",
                        },
                        "&.Mui-disabled": {
                          opacity: 0.5,
                        },
                      }}
                    >
                      <ListItemText
                        primary={layer.file_name || layer.id}
                        secondary={`${layer.data.features.length} features • ${layer.type}`}
                        primaryTypographyProps={{
                          sx: { color: "#ffffff", fontWeight: 500, fontSize: "0.875rem" },
                        }}
                        secondaryTypographyProps={{
                          sx: {
                            fontSize: "0.75rem",
                            color: "rgba(255, 255, 255, 0.6)",
                          },
                        }}
                      />
                      {loadingLayer && <CircularProgress size={20} sx={{ ml: 1 }} />}
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setLayerDialogOpen(false)}
              disabled={loadingLayer}
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                "&:hover": { color: "white" },
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Standalone mode
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 400,
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderBottom: "none",
        borderRadius: 0,
        boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
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
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Storage sx={{ color: "#10b981", fontSize: 18 }} />
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontSize: "0.875rem", color: "white" }}
          >
            DuckDB Spatial Query Editor
          </Typography>
          <Chip
            label="SQL"
            size="small"
            variant="outlined"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#10b981",
            }}
          />
        </Box>
        <IconButton
          size="small"
          onClick={() => onToggle(false)}
          sx={{
            color: "rgba(255, 255, 255, 0.7)",
            "&:hover": { color: "white" },
            p: 0.5,
          }}
        >
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
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
        <Tab label="Query Editor" />
        <Tab label="Results" />
        <Tab label="Tables" />
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Query Editor Tab */}
        {activeTab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2, flex: 1, minHeight: 0 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>Table</InputLabel>
                <Select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  sx={{
                    color: "white",
                    fontSize: "0.875rem",
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.3)" },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#10b981" },
                  }}
                >
                  {tables.map((table) => (
                    <MenuItem key={table.table_name} value={table.table_name} sx={{ fontSize: "0.875rem" }}>
                      {table.table_name} ({table.row_count} rows)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Layers sx={{ fontSize: 16 }} />}
                onClick={loadDataFromLayer}
                sx={{
                  color: "#10b981",
                  borderColor: "rgba(16, 185, 129, 0.5)",
                  fontSize: "0.75rem",
                  textTransform: "none",
                  "&:hover": {
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                  },
                }}
              >
                Load Layer
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={loadingFile ? <CircularProgress size={16} /> : <CloudUpload sx={{ fontSize: 16 }} />}
                onClick={importDataFile}
                disabled={loadingFile}
                sx={{
                  color: "#3b82f6",
                  borderColor: "rgba(59, 130, 246, 0.5)",
                  fontSize: "0.75rem",
                  textTransform: "none",
                  "&:hover": {
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                  },
                }}
              >
                {loadingFile ? "Importing..." : "Import File"}
              </Button>
            </Box>

            <TextField
              multiline
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
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
                onClose={() => setError(null)}
                sx={{ backgroundColor: "rgba(244, 67, 54, 0.1)" }}
              >
                {error}
              </Alert>
            )}

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
                onClick={executeQuery}
                disabled={loading}
                sx={{
                  backgroundColor: "#10b981",
                  "&:hover": { backgroundColor: "#059669" },
                  fontSize: "0.75rem",
                  textTransform: "none",
                }}
              >
                {loading ? "Executing..." : "Run Query"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<TableChart sx={{ fontSize: 16 }} />}
                onClick={visualizeResults}
                disabled={!queryResult}
                sx={{
                  color: "#10b981",
                  borderColor: "rgba(16, 185, 129, 0.5)",
                  fontSize: "0.75rem",
                  textTransform: "none",
                  "&:hover": {
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                  },
                }}
              >
                Visualize
              </Button>
            </Box>
          </Box>
        )}

        {/* Results Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 2, flex: 1, overflow: "auto", minHeight: 0 }}>
            {queryResult ? (
              <>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", mb: 1, display: "block" }}>
                  {queryResult.count} rows returned
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 280, backgroundColor: "rgba(30, 41, 59, 0.5)" }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {queryResult.columns.map((col) => (
                          <TableCell
                            key={col}
                            sx={{
                              backgroundColor: "rgba(15, 23, 42, 0.9)",
                              color: "white",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              py: 0.5,
                            }}
                          >
                            {col}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {queryResult.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          {queryResult.columns.map((col) => (
                            <TableCell
                              key={col}
                              sx={{
                                color: "rgba(255,255,255,0.9)",
                                fontSize: "0.75rem",
                                py: 0.5,
                                fontFamily: "monospace",
                              }}
                            >
                              {typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                No results yet. Execute a query to see results here.
              </Typography>
            )}
          </Box>
        )}

        {/* Tables Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 2, flex: 1, overflow: "auto", minHeight: 0 }}>
            {tables.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {tables.map((table) => (
                  <Paper
                    key={table.table_name}
                    sx={{
                      p: 1.5,
                      backgroundColor: "rgba(30, 41, 59, 0.5)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderRadius: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ color: "white", fontWeight: 600, fontSize: "0.875rem" }}>
                        {table.table_name}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                        <Chip
                          label={`${table.row_count} rows`}
                          size="small"
                          sx={{
                            color: "white",
                            fontSize: "0.65rem",
                            height: 20,
                            backgroundColor: "rgba(16, 185, 129, 0.2)",
                          }}
                        />
                        <Chip
                          label={table.file_type}
                          size="small"
                          sx={{
                            color: "white",
                            fontSize: "0.65rem",
                            height: 20,
                            backgroundColor: "rgba(59, 130, 246, 0.2)",
                          }}
                        />
                        <Chip
                          label={`SRID: ${table.srid}`}
                          size="small"
                          sx={{
                            color: "white",
                            fontSize: "0.65rem",
                            height: 20,
                            backgroundColor: "rgba(168, 85, 247, 0.2)",
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", mt: 0.5, display: "block", fontSize: "0.7rem" }}>
                        {table.file_name} • {new Date(table.loaded_at).toLocaleString()}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => deleteTable(table.table_name)}
                      sx={{ color: "#ef4444", p: 0.5 }}
                    >
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                No tables loaded. Load a geospatial file to get started.
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Layer Selection Dialog */}
      <Dialog
        open={layerDialogOpen}
        onClose={() => !loadingLayer && setLayerDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          },
        }}
      >
        <DialogTitle sx={{ color: "white", display: "flex", alignItems: "center", gap: 1 }}>
          <Layers sx={{ color: "#10b981" }} />
          Select Layer to Load into DuckDB
        </DialogTitle>
        <DialogContent>
          {layers.length === 0 ? (
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", py: 2 }}>
              No layers available. Please add a layer to the map first.
            </Typography>
          ) : (
            <List sx={{ pt: 0 }}>
              {layers.map((layer) => (
                <ListItem key={layer.id} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleLoadLayer(layer.id)}
                    disabled={loadingLayer}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      "&:hover": {
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                      },
                      "&.Mui-disabled": {
                        opacity: 0.5,
                      },
                    }}
                  >
                    <ListItemText
                      primary={layer.file_name || layer.id}
                      secondary={`${layer.data.features.length} features • ${layer.type}`}
                      primaryTypographyProps={{
                        sx: { color: "#ffffff", fontWeight: 500, fontSize: "0.875rem" },
                      }}
                      secondaryTypographyProps={{
                        sx: {
                          fontSize: "0.75rem",
                          color: "rgba(255, 255, 255, 0.6)",
                        },
                      }}
                    />
                    {loadingLayer && <CircularProgress size={20} sx={{ ml: 1 }} />}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setLayerDialogOpen(false)}
            disabled={loadingLayer}
            sx={{
              color: "rgba(255, 255, 255, 0.7)",
              "&:hover": { color: "white" },
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DuckDBPanel;
