import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Close, Info, Edit, Save, Cancel, Add, Delete, ContentCopy } from "@mui/icons-material";

interface FeatureDetailsPanelProps {
  feature: any;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  onFeatureUpdate?: (updatedFeature: any) => void;
  isEditable?: boolean;
}

const FeatureDetailsPanel: React.FC<FeatureDetailsPanelProps> = ({
  feature,
  isOpen,
  onToggle,
  onFeatureUpdate,
  isEditable = false,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editedProperties, setEditedProperties] = useState<Record<string, any>>({});
  const [newPropertyKey, setNewPropertyKey] = useState("");
  const [newPropertyValue, setNewPropertyValue] = useState("");

  // Initialize edited properties when feature changes and reset edit mode
  React.useEffect(() => {
    if (feature?.properties) {
      setEditedProperties({ ...feature.properties });
    }
    // Reset edit mode when switching to a different feature
    setIsEditingMode(false);
    setNewPropertyKey("");
    setNewPropertyValue("");
  }, [feature]);

  const renderValue = (value: any) => {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const handleSaveChanges = () => {
    if (onFeatureUpdate && feature) {
      const updatedFeature = {
        ...feature,
        properties: editedProperties,
      };
      onFeatureUpdate(updatedFeature);
      setIsEditingMode(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedProperties({ ...feature.properties });
    setIsEditingMode(false);
  };

  const handleAddProperty = () => {
    if (newPropertyKey.trim()) {
      setEditedProperties({
        ...editedProperties,
        [newPropertyKey.trim()]: newPropertyValue,
      });
      setNewPropertyKey("");
      setNewPropertyValue("");
    }
  };

  const handleDeleteProperty = (key: string) => {
    const { [key]: _, ...rest } = editedProperties;
    setEditedProperties(rest);
  };

  const handlePropertyChange = (key: string, value: string) => {
    setEditedProperties({
      ...editedProperties,
      [key]: value,
    });
  };

  const hasFeatureData = feature && (feature.properties || feature.geometry);

  return (
    <Paper
      ref={panelRef}
      sx={{
        position: "fixed",
        top: 0,
        left: isOpen ? 0 : -395,
        bottom: 0,
        width: 400,
        background: isOpen
          ? "rgba(15, 23, 42, 0.85)"
          : "rgba(15, 23, 42, 0.95)",
        backdropFilter: isOpen ? "blur(10px)" : "blur(5px)",
        border: isOpen ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
        borderLeft: "none",
        borderRadius: 0,
        boxShadow: isOpen
          ? "8px 0 32px rgba(0, 0, 0, 0.5), inset -1px 0 0 rgba(255, 255, 255, 0.1)"
          : "none",
        display: "flex",
        flexDirection: "column",
        zIndex: 1200,
        overflow: "hidden",
        transition: "left 0.3s ease",
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Info color="primary" />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, fontSize: "0.875rem" }}
                >
                  Feature Details
                </Typography>
                {hasFeatureData && (
                  <Chip
                    label={feature.geometry?.type || "Feature"}
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
                )}
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {isEditable && hasFeatureData && (
                <Tooltip title={isEditingMode ? "Stop Editing Properties" : "Edit Properties"}>
                  <IconButton
                    size="small"
                    onClick={() => setIsEditingMode(!isEditingMode)}
                    sx={{
                      color: isEditingMode ? "#10b981" : "rgba(255, 255, 255, 0.7)",
                      background: isEditingMode ? "rgba(16, 185, 129, 0.15)" : "transparent",
                      "&:hover": {
                        color: "#10b981",
                        background: "rgba(16, 185, 129, 0.2)",
                      },
                      p: 0.5,
                      border: isEditingMode ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <Edit sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton
                size="small"
                onClick={() => {
                  onToggle(false);
                  setIsEditingMode(false); // Reset edit mode when closing
                }}
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  "&:hover": { color: "white" },
                  p: 0.5,
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </>
        ) : (
          <Tooltip title="Open Feature Details" placement="right">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Info
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
                Feature Details
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Content Area */}
      {isOpen && (
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            p: 2,
          }}
        >
          {!hasFeatureData ? (
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
                No Feature Selected
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "rgba(255, 255, 255, 0.3)", textAlign: "center" }}
              >
                Click on a feature on the map to view its details here.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Feature Type */}
              {feature.geometry?.type && (
                <Paper
                  sx={{
                    p: 2,
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 0.5 }}
                    >
                      Geometry Type
                    </Typography>
                    <Chip
                      label={feature.geometry.type}
                      variant="filled"
                      sx={{
                        color: "white",
                        background: "#10b981",
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  {feature.id && (
                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="caption"
                        sx={{ color: "rgba(255, 255, 255, 0.5)", display: "block" }}
                      >
                        Feature ID
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                        }}
                      >
                        {feature.id}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Feature Properties */}
              {feature.properties &&
                Object.keys(editedProperties).length > 0 && (
                  <Paper
                    sx={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      overflow: "hidden",
                    }}
                  >
                    <Box sx={{ p: 2, pb: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{ color: "white" }}
                        >
                          Properties ({Object.keys(editedProperties).length})
                        </Typography>
                        {isEditingMode && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Save />}
                              onClick={handleSaveChanges}
                              sx={{
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                "&:hover": {
                                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                                },
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Cancel />}
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </Stack>
                        )}
                      </Box>
                      {!isEditingMode && isEditable && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255, 255, 255, 0.5)",
                            display: "block",
                            fontStyle: "italic",
                          }}
                        >
                          Click the edit icon above to modify properties
                        </Typography>
                      )}
                    </Box>

                    <TableContainer sx={{ maxHeight: 400 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                background: "rgba(16, 185, 129, 0.2)",
                                color: "#10b981",
                                fontWeight: 600,
                                width: "35%",
                                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                              }}
                            >
                              Key
                            </TableCell>
                            <TableCell
                              sx={{
                                background: "rgba(16, 185, 129, 0.2)",
                                color: "#10b981",
                                fontWeight: 600,
                                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                              }}
                            >
                              Value
                            </TableCell>
                            {isEditingMode && (
                              <TableCell
                                align="right"
                                sx={{
                                  background: "rgba(16, 185, 129, 0.2)",
                                  color: "#10b981",
                                  fontWeight: 600,
                                  width: "60px",
                                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                }}
                              >
                                Actions
                              </TableCell>
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(editedProperties).map(([key, value], index) => (
                            <TableRow
                              key={index}
                              sx={{
                                "&:hover": {
                                  background: "rgba(255, 255, 255, 0.03)",
                                },
                                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                              }}
                            >
                              <TableCell
                                sx={{
                                  color: "#10b981",
                                  fontWeight: 500,
                                  fontFamily: "monospace",
                                  fontSize: "0.85rem",
                                  verticalAlign: "top",
                                  py: 1,
                                }}
                              >
                                {key}
                              </TableCell>
                              <TableCell
                                sx={{
                                  color: "rgba(255, 255, 255, 0.9)",
                                  fontFamily: "monospace",
                                  fontSize: "0.85rem",
                                  py: 1,
                                }}
                              >
                                {isEditingMode ? (
                                  <TextField
                                    fullWidth
                                    multiline
                                    size="small"
                                    value={renderValue(value)}
                                    onChange={(e) => handlePropertyChange(key, e.target.value)}
                                    sx={{
                                      "& .MuiInputBase-root": {
                                        fontFamily: "monospace",
                                        fontSize: "0.85rem",
                                        color: "rgba(255, 255, 255, 0.9)",
                                        background: "rgba(0, 0, 0, 0.2)",
                                        padding: "4px 8px",
                                      },
                                      "& .MuiOutlinedInput-notchedOutline": {
                                        borderColor: "rgba(255, 255, 255, 0.1)",
                                      },
                                    }}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      wordBreak: "break-word",
                                      whiteSpace: "pre-wrap",
                                      maxHeight: "100px",
                                      overflow: "auto",
                                    }}
                                  >
                                    {renderValue(value)}
                                  </Box>
                                )}
                              </TableCell>
                              {isEditingMode && (
                                <TableCell align="right" sx={{ py: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteProperty(key)}
                                    sx={{
                                      color: "#ef4444",
                                      "&:hover": {
                                        color: "#dc2626",
                                        background: "rgba(239, 68, 68, 0.1)",
                                      },
                                    }}
                                  >
                                    <Delete sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {isEditingMode && (
                      <Box
                        sx={{
                          p: 2,
                          pt: 1.5,
                          mt: 1,
                          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                          background: "rgba(16, 185, 129, 0.05)",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ color: "#10b981", fontWeight: 600, mb: 1.5 }}
                        >
                          Add New Property
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <TextField
                            size="small"
                            label="Key"
                            value={newPropertyKey}
                            onChange={(e) => setNewPropertyKey(e.target.value)}
                            sx={{
                              flex: 1,
                              "& .MuiInputBase-root": {
                                color: "rgba(255, 255, 255, 0.9)",
                                background: "rgba(0, 0, 0, 0.2)",
                              },
                              "& .MuiInputLabel-root": {
                                color: "rgba(255, 255, 255, 0.7)",
                              },
                            }}
                          />
                          <TextField
                            size="small"
                            label="Value"
                            value={newPropertyValue}
                            onChange={(e) => setNewPropertyValue(e.target.value)}
                            sx={{
                              flex: 1,
                              "& .MuiInputBase-root": {
                                color: "rgba(255, 255, 255, 0.9)",
                                background: "rgba(0, 0, 0, 0.2)",
                              },
                              "& .MuiInputLabel-root": {
                                color: "rgba(255, 255, 255, 0.7)",
                              },
                            }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Add />}
                            onClick={handleAddProperty}
                            disabled={!newPropertyKey.trim()}
                            sx={{
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              "&:hover": {
                                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                              },
                            }}
                          >
                            Add
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                )}

              {/* Geometry Coordinates */}
              {feature.geometry?.coordinates && (
                <Paper
                  sx={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    overflow: "hidden",
                  }}
                >
                  <Box sx={{ p: 2, pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h6" sx={{ color: "white" }}>
                      Coordinates
                    </Typography>
                    <Tooltip title="Copy to clipboard">
                      <IconButton
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify(feature.geometry.coordinates, null, 2)
                          );
                        }}
                        sx={{
                          color: "rgba(255, 255, 255, 0.7)",
                          "&:hover": {
                            color: "#10b981",
                            background: "rgba(16, 185, 129, 0.1)",
                          },
                        }}
                      >
                        <ContentCopy sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      pt: 1,
                      background: "rgba(0, 0, 0, 0.3)",
                      maxHeight: 200,
                      overflow: "auto",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        whiteSpace: "pre",
                        color: "rgba(255, 255, 255, 0.8)",
                      }}
                    >
                      {JSON.stringify(feature.geometry.coordinates, null, 2)}
                    </Typography>
                  </Box>
                </Paper>
              )}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default FeatureDetailsPanel;
