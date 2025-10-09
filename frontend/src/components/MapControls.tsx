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
        position: "fixed",
        top: 10,
        right: 10,
        zIndex: 1000,
        display: "flex",
        flexDirection: "row",
        gap: 0.5,
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        padding: 0.5,
        borderRadius: 2,
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      {/* Map Style Control */}
      <Tooltip title="Map Style" placement="bottom">
        <Fab
          size="small"
          onClick={handleStyleMenuOpen}
          sx={{
            width: 32,
            height: 32,
            minWidth: 32,
            minHeight: 32,
            background: "rgba(255, 255, 255, 0.95)",
            color: "#3b82f6",
            boxShadow: 1,
            "& .MuiSvgIcon-root": {
              fontSize: "1.25rem",
            },
            "&:hover": {
              background: "white",
              color: "#2563eb",
              boxShadow: 2,
              transform: "scale(1.08)",
            },
            transition: "all 0.2s ease",
          }}
        >
          <PublicIcon />
        </Fab>
      </Tooltip>

      <Menu
        anchorEl={styleMenuAnchor}
        open={Boolean(styleMenuAnchor)}
        onClose={handleStyleMenuClose}
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
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            mt: 1,
          },
        }}
      >
        {MAP_STYLES.map((style) => (
          <MenuItem
            key={style.name}
            onClick={() => handleStyleChange(style.url)}
            selected={mapStyle === style.url}
            sx={{
              "&.Mui-selected": {
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(59, 130, 246, 0.2)",
                },
              },
            }}
          >
            {style.name}
          </MenuItem>
        ))}
      </Menu>

      {/* Layers Control */}
      {allLayers.length > 0 && (
        <>
          <Tooltip title="Layer Visibility" placement="bottom">
            <Fab
              size="small"
              onClick={handleLayersMenuOpen}
              sx={{
                width: 32,
                height: 32,
                minWidth: 32,
                minHeight: 32,
                background: "rgba(255, 255, 255, 0.95)",
                color: "#3b82f6",
                boxShadow: 1,
                "& .MuiSvgIcon-root": {
                  fontSize: "1.25rem",
                },
                "&:hover": {
                  background: "white",
                  color: "#2563eb",
                  boxShadow: 2,
                  transform: "scale(1.08)",
                },
                transition: "all 0.2s ease",
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
              vertical: "bottom",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            PaperProps={{
              sx: {
                maxHeight: 300,
                minWidth: 200,
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                mt: 1,
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
