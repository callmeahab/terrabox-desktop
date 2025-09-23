import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Typography,
  Box,
  Alert,
  IconButton,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { FolderOpen, Close } from '@mui/icons-material';
import { useFileManagement, useUI } from '../hooks/useMapLayers';

interface IndexingDialogProps {
  open: boolean;
  onClose: () => void;
}

interface IndexingProgress {
  id: number;
  start_time: string;
  end_time?: string;
  total_files: number;
  processed_files: number;
  status: string;
}

const IndexingDialog: React.FC<IndexingDialogProps> = ({ open, onClose }) => {
  const [selectedPath, setSelectedPath] = useState('');
  const [includeImages, setIncludeImages] = useState(false);
  const [includeCSV, setIncludeCSV] = useState(true);
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const { setIndexedFiles } = useFileManagement();
  const { setIsLoading, setErrorMessage } = useUI();

  const steps = ['Select Directory', 'Configure Options', 'Index Files'];

  const handleSelectDirectory = useCallback(async () => {
    try {
      // Import Wails directory selection function
      const { SelectDirectory } = await import('../../wailsjs/go/main/App');
      const selectedDir = await SelectDirectory();
      setSelectedPath(selectedDir);
    } catch (error) {
      console.error('Error selecting directory:', error);
      // Fallback for development
      try {
        const { GetHomeDirectory } = await import('../../wailsjs/go/main/App');
        const homeDir = await GetHomeDirectory();
        setSelectedPath(homeDir);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        setSelectedPath('/Users');
      }
    }
  }, []);

  const startIndexing = useCallback(async () => {
    if (!selectedPath) {
      setError('Please select a directory to index');
      return;
    }

    setIsIndexing(true);
    setIsLoading(true);
    setError(null);
    setActiveStep(2);

    try {
      // Import Wails indexing functions
      const { CreateIndex, CreateIndexProgress, ListIndexedFiles } = await import('../../wailsjs/go/main/App');

      // Create progress tracking
      const progressId = await CreateIndexProgress();

      // Start indexing
      await CreateIndex(selectedPath, includeImages, includeCSV);

      // Refresh the file list
      const files = await ListIndexedFiles();
      setIndexedFiles(files);

      // Success
      setIsIndexing(false);
      setIsLoading(false);
      onClose();

    } catch (error) {
      console.error('Indexing error:', error);
      setError(error instanceof Error ? error.message : 'Indexing failed');
      setIsIndexing(false);
      setIsLoading(false);
      setErrorMessage('Failed to index files. Please try again.');
    }
  }, [selectedPath, includeImages, includeCSV, setIndexedFiles, setIsLoading, setErrorMessage, onClose]);

  const handleNext = () => {
    if (activeStep === 0 && !selectedPath) {
      setError('Please select a directory');
      return;
    }
    setError(null);
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleClose = () => {
    if (!isIndexing) {
      setActiveStep(0);
      setError(null);
      setProgress(null);
      onClose();
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" gutterBottom>
              Select the directory you want to scan for geospatial files:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                fullWidth
                label="Directory Path"
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                placeholder="Select a directory to index..."
                InputProps={{
                  readOnly: true,
                }}
              />
              <Button
                variant="outlined"
                onClick={handleSelectDirectory}
                startIcon={<FolderOpen />}
                sx={{ minWidth: 120 }}
              >
                Browse
              </Button>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" gutterBottom>
              Configure indexing options:
            </Typography>
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeCSV}
                    onChange={(e) => setIncludeCSV(e.target.checked)}
                  />
                }
                label="Include CSV and Excel files"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                  />
                }
                label="Include image files (PNG, JPG, etc.)"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Supported formats: Shapefile, GeoJSON, KML, GeoTIFF, GeoPackage, LAS/LAZ, and more
            </Typography>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" gutterBottom>
              {isIndexing ? 'Indexing files...' : 'Ready to start indexing'}
            </Typography>

            {isIndexing && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Scanning directory: {selectedPath}
                </Typography>
              </Box>
            )}

            {progress && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Processed: {progress.processed_files} / {progress.total_files} files
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={progress.total_files > 0 ? (progress.processed_files / progress.total_files) * 100 : 0}
                  sx={{ mt: 1 }}
                />
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Index Geospatial Files
          <IconButton onClick={handleClose} disabled={isIndexing}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: 'center',
          padding: 2,
          gap: 1,
        }}
      >
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || isIndexing}
        >
          Back
        </Button>

        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={isIndexing}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={startIndexing}
            variant="contained"
            disabled={isIndexing || !selectedPath}
          >
            {isIndexing ? 'Indexing...' : 'Start Indexing'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default IndexingDialog;