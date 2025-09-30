import React from 'react';
import {
  Fab,
  Tooltip,
} from '@mui/material';
import { Search } from '@mui/icons-material';

interface LocationSearchProps {
  drawnBounds?: [number, number, number, number] | null;
  onOpenOverpass?: () => void;
}

const LocationSearch: React.FC<LocationSearchProps> = ({ drawnBounds, onOpenOverpass }) => {
  const handleSearchClick = () => {
    if (onOpenOverpass) {
      onOpenOverpass();
    }
  };

  return (
    <Tooltip title="Search for places" placement="left">
      <Fab
        color="primary"
        size="medium"
        onClick={handleSearchClick}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
          background: 'rgba(16, 185, 129, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          '&:hover': {
            background: 'rgba(16, 185, 129, 1)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.5)',
          },
        }}
      >
        <Search />
      </Fab>
    </Tooltip>
  );
};

export default LocationSearch;