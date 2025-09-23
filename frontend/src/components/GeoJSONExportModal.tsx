import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

interface GeoJSONExportModalProps {
  open: boolean;
  onClose: () => void;
  data: any;
  filename: string;
  onSave?: (filePath: string, content: string) => Promise<void>;
}

const GeoJSONExportModal: React.FC<GeoJSONExportModalProps> = ({
  open,
  onClose,
  data,
  filename,
  onSave,
}) => {
  const [customFilename, setCustomFilename] = useState(filename);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const geoJsonString = useMemo(() => {
    if (!data) return '';
    return JSON.stringify(data, null, 2);
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return { features: 0, size: '0 KB' };

    const featureCount = data.features ? data.features.length : 0;
    const sizeInBytes = new Blob([geoJsonString]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);

    return {
      features: featureCount,
      size: `${sizeInKB} KB`,
    };
  }, [data, geoJsonString]);

  const handleCopy = () => {
    navigator.clipboard.writeText(geoJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([geoJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = customFilename.endsWith('.geojson') ? customFilename : `${customFilename}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleSaveToFile = async () => {
    if (!onSave) {
      handleDownload();
      return;
    }

    setSaving(true);
    try {
      const finalFilename = customFilename.endsWith('.geojson')
        ? customFilename
        : `${customFilename}.geojson`;

      await onSave(finalFilename, geoJsonString);
      onClose();
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CodeIcon sx={{ color: '#10b981' }} />
          <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
            Export GeoJSON
          </Typography>
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            label="Filename"
            variant="outlined"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    .geojson
                  </Typography>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(16, 185, 129, 0.5)',
                },
              },
            }}
          />
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip
            icon={<CodeIcon />}
            label={`${stats.features} features`}
            size="small"
            sx={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          />
          <Chip
            label={stats.size}
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          />
        </Stack>

        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              GeoJSON Preview
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  color: copied ? '#10b981' : 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  },
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: 'text.primary',
              maxHeight: 400,
              overflowY: 'auto',
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                width: 8,
                height: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              },
            }}
          >
            {geoJsonString}
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleDownload}
          variant="outlined"
          startIcon={<DownloadIcon />}
          sx={{
            borderColor: 'rgba(16, 185, 129, 0.5)',
            color: '#10b981',
            '&:hover': {
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
            },
          }}
        >
          Download
        </Button>
        <Button
          onClick={handleSaveToFile}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={saving}
          sx={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            },
          }}
        >
          {onSave ? 'Save to Project' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GeoJSONExportModal;