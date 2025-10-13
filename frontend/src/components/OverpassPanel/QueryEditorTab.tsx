import React from "react";
import { Box, Button, TextField, Alert } from "@mui/material";
import { insertTextAtCursor } from "./utils";

interface QueryEditorTabProps {
  query: string;
  setQuery: (query: string) => void;
  queryEditorRef: React.RefObject<HTMLTextAreaElement | null>;
  error: string | null;
}

export const QueryEditorTab: React.FC<QueryEditorTabProps> = ({
  query,
  setQuery,
  queryEditorRef,
  error,
}) => {
  const insertAtCursor = (text: string) => {
    if (queryEditorRef.current) {
      const { newText, newCursorPosition } = insertTextAtCursor(
        queryEditorRef.current,
        query,
        text
      );
      setQuery(newText);

      // Set cursor position after inserted text
      setTimeout(() => {
        if (queryEditorRef.current) {
          queryEditorRef.current.focus();
          queryEditorRef.current.setSelectionRange(
            newCursorPosition,
            newCursorPosition
          );
        }
      }, 0);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Query Helper Buttons */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
        <Button
          size="small"
          onClick={() => insertAtCursor('node["amenity"](bbox)')}
          sx={{ textTransform: "none", fontSize: "0.75rem" }}
          variant="outlined"
        >
          + Node
        </Button>
        <Button
          size="small"
          onClick={() => insertAtCursor('way["highway"](bbox)')}
          sx={{ textTransform: "none", fontSize: "0.75rem" }}
          variant="outlined"
        >
          + Way
        </Button>
        <Button
          size="small"
          onClick={() => insertAtCursor('relation["type"](bbox)')}
          sx={{ textTransform: "none", fontSize: "0.75rem" }}
          variant="outlined"
        >
          + Relation
        </Button>
        <Button
          size="small"
          onClick={() => insertAtCursor("out center meta;")}
          sx={{ textTransform: "none", fontSize: "0.75rem" }}
          variant="outlined"
        >
          + Output
        </Button>
      </Box>

      <TextField
        inputRef={queryEditorRef}
        multiline
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter your Overpass API query here..."
        variant="outlined"
        sx={{
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

      {error && (
        <Alert
          severity="error"
          sx={{ backgroundColor: "rgba(244, 67, 54, 0.1)" }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};
