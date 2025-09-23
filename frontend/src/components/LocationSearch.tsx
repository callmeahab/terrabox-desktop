import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  InputAdornment,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Search, LocationOn } from '@mui/icons-material';
import { useSearch } from '../hooks/useMapLayers';
import OverpassEditor from './OverpassEditor';

interface SearchResult {
  place_name: string;
  center: [number, number];
  place_type: string[];
  context?: Array<{ text: string }>;
}

const LocationSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showQueryEditor, setShowQueryEditor] = useState(false);

  const { setSearchData } = useSearch();

  const searchLocations = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, you would call a geocoding service
      // For now, we'll create mock results
      const mockResults: SearchResult[] = [
        {
          place_name: `${searchQuery}, Mock Location`,
          center: [-105.4 + Math.random() * 2, 40.8 + Math.random() * 2],
          place_type: ['place'],
          context: [{ text: 'Mock State' }, { text: 'Mock Country' }],
        },
        {
          place_name: `${searchQuery} Street, Mock City`,
          center: [-105.4 + Math.random() * 2, 40.8 + Math.random() * 2],
          place_type: ['address'],
          context: [{ text: 'Mock City' }, { text: 'Mock State' }],
        },
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setResults(mockResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchLocations(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleResultSelect = (result: SearchResult) => {
    setQuery(result.place_name);
    setShowResults(false);

    // Create a GeoJSON feature for the selected location
    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: result.center,
      },
      properties: {
        name: result.place_name,
        type: result.place_type[0],
      },
    };

    setSearchData({
      type: 'FeatureCollection',
      features: [feature],
    });
  };

  const handleInputClick = () => {
    // Open the Overpass query editor when clicking on the search field
    setShowQueryEditor(true);
  };

  const handleInputFocus = () => {
    if (results.length > 0) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for result selection
    setTimeout(() => setShowResults(false), 200);
  };


  return (
    <>
      <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: { xs: '90%', sm: 400 },
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="Search for places..."
        value={query}
        onChange={handleInputChange}
        onClick={handleInputClick}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
          endAdornment: loading && (
            <InputAdornment position="end">
              <CircularProgress size={20} />
            </InputAdornment>
          ),
          sx: {
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused': {
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(16, 185, 129, 0.3)',
            },
          },
        }}
      />

      {showResults && results.length > 0 && (
        <Paper
          sx={{
            mt: 1,
            maxHeight: 300,
            overflow: 'auto',
            borderRadius: 3,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <List disablePadding>
            {results.map((result, index) => (
              <ListItem
                key={index}
                onClick={() => handleResultSelect(result)}
                divider={index < results.length - 1}
                sx={{
                  cursor: 'pointer',
                  py: 1,
                  px: 2,
                  minHeight: 'auto',
                  '&:hover': {
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    backdropFilter: 'blur(10px)',
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    overflow: 'hidden'
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      mr: 1,
                      fontWeight: 500,
                    }}
                  >
                    {result.place_name}
                  </Typography>
                  <Chip
                    label={result.place_type[0]}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      flexShrink: 0,
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                    }}
                  />
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      </Box>

      <OverpassEditor
        open={showQueryEditor}
        onClose={() => setShowQueryEditor(false)}
      />
    </>
  );
};

export default LocationSearch;