import React, { memo } from 'react';
import Map from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { INITIAL_VIEW_STATE } from '../constants/mapConfig';

interface MapRendererProps {
  mapStyle: string;
  mapboxAccessToken: string;
  deckLayers: any[];
  cursor: string;
  onDeckFeatureClick: (info: any, event: any) => void;
  onDeckFeatureHover: (info: any, event: any) => void;
  onViewStateChange?: (viewState: any) => void;
  editableLayer?: any; // Add support for editable layer cursor
}

const MapRenderer: React.FC<MapRendererProps> = memo(({
  mapStyle,
  mapboxAccessToken,
  deckLayers,
  cursor,
  onDeckFeatureClick,
  onDeckFeatureHover,
  onViewStateChange,
  editableLayer,
}) => {
  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      onViewStateChange={onViewStateChange}
      controller={{
        doubleClickZoom: false, // Disable double-click zoom for editing
      }}
      layers={deckLayers}
      getCursor={editableLayer ? editableLayer.getCursor?.bind(editableLayer) : () => cursor}
      onClick={onDeckFeatureClick}
      onHover={onDeckFeatureHover}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <Map
        mapboxAccessToken={mapboxAccessToken}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
      />
    </DeckGL>
  );
});

MapRenderer.displayName = 'MapRenderer';

export default MapRenderer;