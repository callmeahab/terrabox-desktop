import React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Tooltip,
  Typography,
  IconButton,
} from "@mui/material";
import {
  PlayArrow,
  CropFree,
  Code,
  ExpandMore,
} from "@mui/icons-material";

interface PanelHeaderProps {
  drawnBounds?: [number, number, number, number] | null;
  isDrawingBounds: boolean;
  onStartDrawingBounds: () => void;
  onFinishDrawingBounds: () => void;
  onCancelDrawingBounds: () => void;
  onExecuteQuery: () => void;
  loading: boolean;
  queryValid: boolean;
  // Standalone mode props
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  showCollapseButton?: boolean;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  drawnBounds,
  isDrawingBounds,
  onStartDrawingBounds,
  onFinishDrawingBounds,
  onCancelDrawingBounds,
  onExecuteQuery,
  loading,
  queryValid,
  isOpen = true,
  onToggle,
  showCollapseButton = false,
}) => {
  const renderTitle = () => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Code color="primary" sx={{ fontSize: 20 }} />
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
  );

  const renderControls = () => (
    <>
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
        startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
        onClick={onExecuteQuery}
        disabled={loading || !queryValid}
        sx={{
          backgroundColor: "#10b981",
          "&:hover": { backgroundColor: "#059669" },
        }}
      >
        {loading ? "Executing..." : "Run Query"}
      </Button>

      {showCollapseButton && onToggle && (
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
      )}
    </>
  );

  // Collapsed state (for standalone mode)
  if (!isOpen && showCollapseButton && onToggle) {
    return (
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
          cursor: "pointer",
        }}
        onClick={() => onToggle(true)}
      >
        <Tooltip title="Open Overpass Query Editor" placement="top">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Code
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                "&:hover": { color: "white" },
                fontSize: 20,
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
      </Box>
    );
  }

  // Expanded state
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: showCollapseButton ? 1.5 : 2,
        py: showCollapseButton ? 0.5 : 1,
        minHeight: 36,
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        background: "rgba(255, 255, 255, 0.05)",
      }}
    >
      {renderTitle()}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {renderControls()}
      </Box>
    </Box>
  );
};
