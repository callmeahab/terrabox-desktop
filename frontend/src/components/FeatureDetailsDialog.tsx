import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  Chip,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";

interface FeatureDetailsDialogProps {
  feature: any;
  open: boolean;
  onClose: () => void;
}

const FeatureDetailsDialog: React.FC<FeatureDetailsDialogProps> = ({
  feature,
  open,
  onClose,
}) => {
  if (!feature) return null;

  const renderValue = (value: any) => {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          maxHeight: "80vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        Feature Details
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          maxHeight: "60vh",
          overflow: "auto",
        }}
      >
        {/* Feature Type */}
        {feature.geometry?.type && (
          <Paper
            sx={{
              p: 2,
              my: 2,
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Geometry Type
            </Typography>
            <Chip
              label={feature.geometry.type}
              variant="outlined"
              sx={{ color: "#10b981" }}
            />
          </Paper>
        )}

        {/* Feature Properties */}
        {feature.properties && Object.keys(feature.properties).length > 0 && (
          <Paper
            sx={{
              p: 2,
              mb: 2,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Properties
            </Typography>
            {Object.entries(feature.properties).map(([key, value], index) => (
              <Paper
                key={index}
                sx={{
                  p: 1.5,
                  mb: 1,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#10b981", fontWeight: 600, mb: 0.5 }}
                >
                  {key}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {renderValue(value)}
                </Typography>
              </Paper>
            ))}
          </Paper>
        )}

        {/* Geometry Coordinates */}
        {feature.geometry?.coordinates && (
          <Paper
            sx={{
              p: 2,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Coordinates
            </Typography>
            <Paper
              sx={{
                p: 1.5,
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 1,
                maxHeight: 200,
                overflow: "auto",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  whiteSpace: "pre",
                  textWrap: "stable",
                }}
              >
                {JSON.stringify(feature.geometry.coordinates)}
              </Typography>
            </Paper>
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeatureDetailsDialog;
