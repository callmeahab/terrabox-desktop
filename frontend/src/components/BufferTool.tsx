import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  IconButton,
} from "@mui/material";
import { ZoomOutMap, ExpandMore } from "@mui/icons-material";
import buffer from "@turf/buffer";

interface BufferToolProps {
  selectedFeatures: any[];
  layerData: any;
  onApplyBuffer: (bufferedFeatures: any) => void;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
}

const BufferTool: React.FC<BufferToolProps> = ({
  selectedFeatures,
  layerData,
  onApplyBuffer,
  isOpen,
  onToggle,
}) => {
  const [bufferDistance, setBufferDistance] = useState<number>(100);
  const [bufferUnit, setBufferUnit] = useState<
    "meters" | "kilometers" | "miles"
  >("meters");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleBufferApply = () => {
    if (!selectedFeatures || selectedFeatures.length === 0) return;

    try {
      const bufferedFeatures = selectedFeatures.map((feature) => {
        if (!feature.geometry) return feature;

        const buffered = buffer(feature, bufferDistance, {
          units: bufferUnit,
        });

        return {
          ...feature,
          geometry: buffered?.geometry || feature.geometry,
        };
      });

      onApplyBuffer(bufferedFeatures);
    } catch (error) {
      console.error("Error applying buffer:", error);
    }
  };

  const hasSelectedFeatures = selectedFeatures && selectedFeatures.length > 0;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (hasSelectedFeatures) {
      setAnchorEl(event.currentTarget);
      onToggle(true);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    onToggle(false);
  };

  return (
    <>
      <Tooltip
        title={
          hasSelectedFeatures
            ? "Open Buffer Tool"
            : "Select features in edit mode to use buffer tool"
        }
        placement="right"
      >
        <span>
          <Button
            variant="contained"
            startIcon={<ZoomOutMap />}
            endIcon={<ExpandMore />}
            onClick={handleClick}
            disabled={!hasSelectedFeatures}
            size="small"
            sx={{
              position: "fixed",
              top: 20,
              left: 60,
              zIndex: 1000,
              background: hasSelectedFeatures
                ? "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)"
                : "rgba(158, 158, 158, 0.8)",
              color: "white",
              boxShadow: hasSelectedFeatures ? 3 : 1,
              "&:hover": {
                background: hasSelectedFeatures
                  ? "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)"
                  : "rgba(158, 158, 158, 0.8)",
                boxShadow: hasSelectedFeatures ? 6 : 1,
              },
              "&.Mui-disabled": {
                color: "rgba(255, 255, 255, 0.6)",
              },
              textTransform: "none",
              fontSize: "0.875rem",
            }}
          >
            Buffer
            {hasSelectedFeatures && (
              <Chip
                label={selectedFeatures.length}
                size="small"
                sx={{
                  ml: 1,
                  height: 20,
                  fontSize: "0.7rem",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                }}
              />
            )}
          </Button>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 350,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ZoomOutMap color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Buffer Tool
              </Typography>
              <Chip
                label={`${selectedFeatures.length} selected`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="Distance"
                type="number"
                value={bufferDistance}
                onChange={(e) => setBufferDistance(Number(e.target.value))}
                size="small"
                sx={{ flex: 1 }}
                inputProps={{
                  min: 0,
                  step: 10,
                }}
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

            <Button
              variant="contained"
              onClick={() => {
                handleBufferApply();
                handleClose();
              }}
              fullWidth
              color="primary"
            >
              Apply Buffer
            </Button>
          </Stack>
        </Box>
      </Menu>
    </>
  );
};

export default BufferTool;
