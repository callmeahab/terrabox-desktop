import React, { useState } from "react";
import {
  Box,
  Fab,
  Tooltip,
  Paper,
  Typography,
  Button,
  Stack,
} from "@mui/material";
import {
  CropFree,
  Close,
  Check,
  RectangleOutlined,
} from "@mui/icons-material";

interface DrawBoundsControlProps {
  isDrawingBounds: boolean;
  onStartDrawing: () => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  drawnBounds: [number, number, number, number] | null; // [west, south, east, north]
}

const DrawBoundsControl: React.FC<DrawBoundsControlProps> = ({
  isDrawingBounds,
  onStartDrawing,
  onFinishDrawing,
  onCancelDrawing,
  drawnBounds,
}) => {
  return (
    <>
      {/* Draw Bounds Toggle Button */}
      {!isDrawingBounds && (
        <Tooltip title="Draw Custom Query Bounds" placement="left">
          <Fab
            color="secondary"
            size="medium"
            onClick={onStartDrawing}
            sx={{
              position: "absolute",
              bottom: 120,
              right: 20,
              zIndex: 1000,
              background: "linear-gradient(135deg, #9C27B0 0%, #673AB7 100%)",
              color: "white",
              "&:hover": {
                background: "linear-gradient(135deg, #AB47BC 0%, #7986CB 100%)",
                boxShadow: 6,
              },
            }}
          >
            <CropFree />
          </Fab>
        </Tooltip>
      )}

      {/* Drawing Mode Instructions */}
      {isDrawingBounds && (
        <Paper
          sx={{
            position: "absolute",
            top: 20,
            right: 20,
            padding: 2,
            zIndex: 1100,
            background: "linear-gradient(135deg, rgba(156, 39, 176, 0.95), rgba(103, 58, 183, 0.95))",
            backdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            borderRadius: 2,
            minWidth: 300,
            maxWidth: 350,
            color: "white",
            pointerEvents: "auto",
          }}
        >
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <RectangleOutlined sx={{ fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Draw Query Bounds
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ opacity: 0.9, display: "block" }}>
              Click and drag on the map to draw a rectangular area.
            </Typography>

            <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Check sx={{ fontSize: 16 }} />}
                onClick={onFinishDrawing}
                disabled={!drawnBounds}
                sx={{
                  backgroundColor: "white",
                  color: "#9C27B0",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  py: 0.5,
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                  },
                  "&:disabled": {
                    backgroundColor: "rgba(255, 255, 255, 0.3)",
                    color: "rgba(156, 39, 176, 0.5)",
                  },
                }}
              >
                Use Area
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<Close sx={{ fontSize: 16 }} />}
                onClick={onCancelDrawing}
                sx={{
                  borderColor: "white",
                  color: "white",
                  fontSize: "0.875rem",
                  py: 0.5,
                  "&:hover": {
                    borderColor: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                Cancel
              </Button>
            </Box>

            {drawnBounds && (
              <Box sx={{ mt: 1, p: 1, backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: "0.7rem" }}>
                  Bounds: [{drawnBounds[1].toFixed(4)}, {drawnBounds[0].toFixed(4)}, {drawnBounds[3].toFixed(4)}, {drawnBounds[2].toFixed(4)}]
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      )}
    </>
  );
};

export default DrawBoundsControl;