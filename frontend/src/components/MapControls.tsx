import React, { useState } from "react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Fab,
  Tooltip,
} from "@mui/material";
import {
  Layers as LayersIcon,
  Public as PublicIcon,
  Settings as SettingsIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useMapLayers, useLayerVisibility } from "../hooks/useMapLayers";

const MAP_STYLES = [
  {
    name: "Hybrid",
    url: "mapbox://styles/mapbox/mapbox-hybrid-v12",
  },
  {
    name: "Dark",
    url: "mapbox://styles/mapbox/dark-v11",
  },
  {
    name: "Light",
    url: "mapbox://styles/mapbox/light-v11",
  },
  {
    name: "Streets",
    url: "mapbox://styles/mapbox/streets-v12",
  },
  {
    name: "Satellite",
    url: "mapbox://styles/mapbox/satellite-v9",
  },
];

interface MapControlsProps {
  mapStyle: string;
  setMapStyle: (style: string) => void;
}

const MapControls: React.FC<MapControlsProps> = ({ mapStyle, setMapStyle }) => {
  const [styleMenuAnchor, setStyleMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [layersMenuAnchor, setLayersMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  const { layers, rasterLayers } = useMapLayers();
  const {
    layerVisibility,
    toggleLayerVisibility,
    allLayersVisible,
    toggleAllLayers,
  } = useLayerVisibility();

  const handleStyleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setStyleMenuAnchor(event.currentTarget);
  };

  const handleStyleMenuClose = () => {
    setStyleMenuAnchor(null);
  };

  const handleLayersMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLayersMenuAnchor(event.currentTarget);
  };

  const handleLayersMenuClose = () => {
    setLayersMenuAnchor(null);
  };

  const handleStyleChange = (styleUrl: string) => {
    setMapStyle(styleUrl);
    handleStyleMenuClose();
  };

  const allLayers = [...layers, ...rasterLayers];

  return (
    <Box
      sx={{
        position: "absolute",
        top: 16,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        zIndex: 1000,
      }}
    >
      {/* Map Style Control */}
      <Tooltip title="Map Style" placement="left">
        <Fab
          size="small"
          color="primary"
          onClick={handleStyleMenuOpen}
          sx={{
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            boxShadow: "0 8px 32px rgba(16, 185, 129, 0.3)",
            "&:hover": {
              background: "rgba(15, 23, 42, 0.6)",
              transform: "translateY(-2px)",
              boxShadow: "0 12px 40px rgba(16, 185, 129, 0.4)",
            },
          }}
        >
          <PublicIcon sx={{ color: "white" }} />
        </Fab>
      </Tooltip>

      <Menu
        anchorEl={styleMenuAnchor}
        open={Boolean(styleMenuAnchor)}
        onClose={handleStyleMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(30px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow:
              "0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        {MAP_STYLES.map((style) => (
          <MenuItem
            key={style.name}
            onClick={() => handleStyleChange(style.url)}
            selected={mapStyle === style.url}
          >
            {style.name}
          </MenuItem>
        ))}
      </Menu>

      {/* Layers Control */}
      {allLayers.length > 0 && (
        <>
          <Tooltip title="Layer Visibility" placement="left">
            <Fab
              size="small"
              color="primary"
              onClick={handleLayersMenuOpen}
              sx={{
                background: "rgba(15, 23, 42, 0.4)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                boxShadow: "0 8px 32px rgba(16, 185, 129, 0.3)",
                color: "white",
                "&:hover": {
                  background: "rgba(15, 23, 42, 0.6)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 12px 40px rgba(16, 185, 129, 0.4)",
                },
              }}
            >
              <LayersIcon />
            </Fab>
          </Tooltip>

          <Menu
            anchorEl={layersMenuAnchor}
            open={Boolean(layersMenuAnchor)}
            onClose={handleLayersMenuClose}
            anchorOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            PaperProps={{
              sx: {
                maxHeight: 300,
                minWidth: 200,
                bgcolor: "rgba(30, 30, 30, 0.9)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <MenuItem onClick={toggleAllLayers}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {allLayersVisible ? <Visibility /> : <VisibilityOff />}
                <Typography variant="body2">
                  {allLayersVisible ? "Hide All" : "Show All"}
                </Typography>
              </Box>
            </MenuItem>

            {allLayers.map((layer) => (
              <MenuItem
                key={layer.id}
                onClick={() => toggleLayerVisibility(layer.id)}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {layerVisibility[layer.id] ? (
                    <Visibility />
                  ) : (
                    <VisibilityOff />
                  )}
                  <Typography variant="body2" noWrap>
                    {layer.file_name || layer.id}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Box>
  );
};

export default MapControls;
