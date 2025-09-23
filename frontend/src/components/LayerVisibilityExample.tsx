import React from 'react';
import { List, ListItem, ListItemText, Switch, Typography } from '@mui/material';
import { useMapLayers, useLayerVisibility } from '../hooks/useMapLayers';

// This component demonstrates the performance benefits of Zustand
// It only subscribes to layer visibility state and won't re-render
// when other unrelated state changes (like cursor, loading, etc.)

const LayerVisibilityExample: React.FC = () => {
  const { layers } = useMapLayers();
  const { layerVisibility, toggleLayerVisibility, allLayersVisible, toggleAllLayers } = useLayerVisibility();

  return (
    <div>
      <Typography variant="h6">Layer Visibility (Zustand Demo)</Typography>

      {/* Toggle all layers */}
      <ListItem>
        <ListItemText primary="All Layers" />
        <Switch
          checked={allLayersVisible}
          onChange={toggleAllLayers}
        />
      </ListItem>

      {/* Individual layer toggles */}
      {layers.map((layer) => (
        <ListItem key={layer.id}>
          <ListItemText
            primary={layer.file_name || layer.id}
            secondary={layer.type}
          />
          <Switch
            checked={layerVisibility[layer.id] !== false}
            onChange={() => toggleLayerVisibility(layer.id)}
          />
        </ListItem>
      ))}
    </div>
  );
};

export default LayerVisibilityExample;