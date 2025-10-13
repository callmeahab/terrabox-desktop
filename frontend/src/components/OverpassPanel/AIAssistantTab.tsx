import React from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { AutoAwesome, Map as MapIcon } from "@mui/icons-material";
import { AI_EXAMPLE_PROMPTS } from "./constants";

interface AIAssistantTabProps {
  aiDescription: string;
  setAiDescription: (description: string) => void;
  onGenerateQuery: () => void;
  aiLoading: boolean;
  drawnBounds?: [number, number, number, number] | null;
  error: string | null;
}

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
  aiDescription,
  setAiDescription,
  onGenerateQuery,
  aiLoading,
  drawnBounds,
  error,
}) => {
  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
        minHeight: 0,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          mb: 2,
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: "0.8rem",
        }}
      >
        Describe what you want to find and AI will generate an Overpass query
        for you.
      </Typography>

      {drawnBounds && (
        <Alert
          severity="info"
          icon={<MapIcon />}
          sx={{
            mb: 3,
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            "& .MuiAlert-icon": {
              color: "#10b981",
            },
          }}
        >
          Using custom drawn bounds
        </Alert>
      )}

      <TextField
        fullWidth
        multiline
        value={aiDescription}
        onChange={(e) => setAiDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            onGenerateQuery();
          }
        }}
        placeholder="e.g., Find all restaurants and cafes in the current area"
        variant="outlined"
        sx={{
          mb: 3,
          flex: 1,
          "& .MuiOutlinedInput-root": {
            fontFamily: "Monaco, 'Menlo', 'Ubuntu Mono', monospace",
            fontSize: "12px",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            height: "100%",
            "& fieldset": {
              borderColor: "rgba(255, 255, 255, 0.2)",
            },
            "&:hover fieldset": {
              borderColor: "rgba(255, 255, 255, 0.3)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#10b981",
            },
          },
          "& .MuiInputBase-input": {
            color: "#ffffff",
            height: "100% !important",
          },
          "& .MuiInputBase-root": {
            height: "100%",
          },
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          startIcon={
            aiLoading ? <CircularProgress size={16} /> : <AutoAwesome />
          }
          onClick={onGenerateQuery}
          disabled={aiLoading || !aiDescription.trim()}
          sx={{
            backgroundColor: "#10b981",
            width: 170,
            "&:hover": { backgroundColor: "#059669" },
          }}
        >
          {aiLoading ? "Generating..." : "Generate Query"}
        </Button>
      </Box>

      {/* Example Prompts */}
      <Box sx={{ mt: 2, flexShrink: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{
            mb: 1,
            fontSize: "0.8rem",
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          Examples:
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 1,
          }}
        >
          {AI_EXAMPLE_PROMPTS.map((example, index) => (
            <Button
              key={index}
              size="small"
              variant="text"
              onClick={() => setAiDescription(example)}
              sx={{
                textTransform: "none",
                fontSize: "0.7rem",
                p: 0.5,
                minWidth: "auto",
                color: "rgba(255, 255, 255, 0.6)",
                "&:hover": { color: "#10b981" },
              }}
            >
              {example}
            </Button>
          ))}
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mt: 3,
            backgroundColor: "rgba(244, 67, 54, 0.1)",
            border: "1px solid rgba(244, 67, 54, 0.3)",
            flexShrink: 0,
          }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};
