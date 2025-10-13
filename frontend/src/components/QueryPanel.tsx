import React, { useState } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Typography,
} from "@mui/material";
import {
  Public,
  Storage,
  ExpandMore,
} from "@mui/icons-material";
import OverpassPanel from "./OverpassPanel";
import DuckDBPanel from "./DuckDBPanel";

interface QueryPanelProps {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  drawnBounds: [number, number, number, number] | null;
  isDrawingBounds: boolean;
  onStartDrawingBounds: () => void;
  onFinishDrawingBounds: () => void;
  onCancelDrawingBounds: () => void;
}

type QueryTab = "overpass" | "duckdb";

const QueryPanel: React.FC<QueryPanelProps> = ({
  isOpen,
  onToggle,
  drawnBounds,
  isDrawingBounds,
  onStartDrawingBounds,
  onFinishDrawingBounds,
  onCancelDrawingBounds,
}) => {
  const [activeTab, setActiveTab] = useState<QueryTab>("overpass");

  const handleTabChange = (event: React.SyntheticEvent, newValue: QueryTab) => {
    setActiveTab(newValue);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: isOpen ? 0 : -365,
        left: 0,
        right: 0,
        height: "400px",
        background: isOpen
          ? "rgba(15, 23, 42, 0.85)"
          : "rgba(15, 23, 42, 0.95)",
        backdropFilter: isOpen ? "blur(10px)" : "blur(5px)",
        border: isOpen ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
        borderBottom: "none",
        borderRadius: 0,
        boxShadow: isOpen
          ? "0 -8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
          : "none",
        display: "flex",
        flexDirection: "column",
        zIndex: 1200,
        overflow: "hidden",
        transition: "bottom 0.3s ease",
      }}
    >
      {/* Compact Header Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.5,
          minHeight: 36,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          background: "rgba(255, 255, 255, 0.05)",
          cursor: !isOpen ? "pointer" : "default",
        }}
        onClick={() => !isOpen && onToggle(true)}
      >
        {isOpen ? (
          <>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                minHeight: 36,
                "& .MuiTab-root": {
                  color: "rgba(255, 255, 255, 0.7)",
                  minHeight: 36,
                  textTransform: "none",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  py: 0.5,
                  px: 1.5,
                  "&.Mui-selected": {
                    color: "#10b981",
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#10b981",
                  height: 3,
                },
              }}
            >
              <Tab
                value="overpass"
                label="Overpass Query"
                icon={<Public sx={{ fontSize: 16 }} />}
                iconPosition="start"
              />
              <Tab
                value="duckdb"
                label="DuckDB Query"
                icon={<Storage sx={{ fontSize: 16 }} />}
                iconPosition="start"
              />
            </Tabs>

            <IconButton
              size="small"
              onClick={() => onToggle(false)}
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                "&:hover": { color: "white" },
                p: 0.5,
              }}
            >
              <ExpandMore sx={{ fontSize: 18 }} />
            </IconButton>
          </>
        ) : (
          <Tooltip title="Open Query Panel" placement="top">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Storage
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: 18,
                  "&:hover": { color: "white" },
                  cursor: "pointer",
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
                Query Panel
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Tab content */}
      {isOpen && <Box sx={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "overpass" && (
          <OverpassPanel
            isOpen={true}
            onToggle={() => {}} // Controlled by parent
            drawnBounds={drawnBounds}
            isDrawingBounds={isDrawingBounds}
            onStartDrawingBounds={onStartDrawingBounds}
            onFinishDrawingBounds={onFinishDrawingBounds}
            onCancelDrawingBounds={onCancelDrawingBounds}
            embedded={true}
          />
        )}
        {activeTab === "duckdb" && (
          <DuckDBPanel
            isOpen={true}
            onToggle={() => {}} // Controlled by parent
            embedded={true}
          />
        )}
      </Box>}
    </Box>
  );
};

export default QueryPanel;
