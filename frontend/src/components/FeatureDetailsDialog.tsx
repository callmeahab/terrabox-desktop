import React, { useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Close, Info } from "@mui/icons-material";

interface FeatureDetailsPanelProps {
  feature: any;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
}

const FeatureDetailsPanel: React.FC<FeatureDetailsPanelProps> = ({
  feature,
  isOpen,
  onToggle,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const renderValue = (value: any) => {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
                  }}
                >
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ color: "#10b981" }}
                  >
                    Geometry Type
                  </Typography>
                  <Chip
                    label={feature.geometry.type}
                    variant="outlined"
                    sx={{ color: "#10b981", borderColor: "#10b981" }}
                  />
                </Paper>
              )}

              {/* Feature Properties */}
              {feature.properties &&
                Object.keys(feature.properties).length > 0 && (
                  <Paper
                    sx={{
                      p: 2,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ color: "white" }}
                    >
                      Properties
                    </Typography>
                    {Object.entries(feature.properties).map(
                      ([key, value], index) => (
                        <Paper
                          key={index}
                          sx={{
                            p: 1.5,
                            mb: 1,
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: 1,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ color: "#10b981", fontWeight: 600, mb: 0.5 }}
                          >
                            {key}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                              color: "rgba(255, 255, 255, 0.9)",
                            }}
                          >
                            {renderValue(value)}
                          </Typography>
                        </Paper>
                      )
                    )}
                  </Paper>
                )}

              {/* Geometry Coordinates */}
              {feature.geometry?.coordinates && (
                <Paper
                  sx={{
                    p: 2,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
                    Coordinates
                  </Typography>
                  <Paper
                    sx={{
                      p: 1.5,
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 1,
                      maxHeight: 200,
                      overflow: "auto",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        whiteSpace: "pre",
                        textWrap: "stable",
                        color: "rgba(255, 255, 255, 0.8)",
                      }}
                    >
                      {JSON.stringify(feature.geometry.coordinates, null, 2)}
                    </Typography>
                  </Paper>
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
