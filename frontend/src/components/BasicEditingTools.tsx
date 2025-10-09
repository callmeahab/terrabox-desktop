import React from "react";
import { Box, Fab, Tooltip, ButtonGroup } from "@mui/material";
import {
  TouchApp,
  PanTool,
  Info,
  SelectAll,
  Delete,
} from "@mui/icons-material";

interface BasicEditingToolsProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  selectedCount: number;
  onDelete?: () => void;
}

const BasicEditingTools: React.FC<BasicEditingToolsProps> = ({
  activeTool,
  onToolChange,
  selectedCount,
  onDelete,
}) => {
  const getToolStyle = (tool: string) => ({
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    background:
      activeTool === tool
        ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
        : "rgba(255, 255, 255, 0.95)",
    color: activeTool === tool ? "white" : "#3b82f6",
    boxShadow: activeTool === tool ? "0 2px 8px rgba(59, 130, 246, 0.5)" : 1,
    border: activeTool === tool ? "1px solid rgba(255, 255, 255, 0.3)" : "none",
    "& .MuiSvgIcon-root": {
      fontSize: "1.25rem",
    },
    "&:hover": {
      background:
        activeTool === tool
          ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
          : "white",
      color: activeTool === tool ? "white" : "#2563eb",
      boxShadow: activeTool === tool ? "0 4px 12px rgba(59, 130, 246, 0.7)" : 2,
      transform: "scale(1.08)",
    },
    transition: "all 0.2s ease",
  });

  return (
    <Box
      sx={{
        position: "fixed",
        top: 10,
        right: 95,
        zIndex: 1000,
        display: "flex",
        flexDirection: "row",
        gap: 0.5,
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        padding: 0.5,
        borderRadius: 2,
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <Tooltip title="View Details (Click features)" placement="bottom">
        <Fab
          onClick={() => onToolChange("view")}
          sx={getToolStyle("view")}
          size="small"
        >
          <Info />
        </Fab>
      </Tooltip>

      <Tooltip title="Select Features (Click to select)" placement="bottom">
        <Fab
          onClick={() => onToolChange("select")}
          sx={getToolStyle("select")}
          size="small"
        >
          <TouchApp />
        </Fab>
      </Tooltip>

      <Tooltip title="Select by Area (Draw rectangle)" placement="bottom">
        <Fab
          onClick={() => onToolChange("selectByArea")}
          sx={getToolStyle("selectByArea")}
          size="small"
        >
          <SelectAll />
        </Fab>
      </Tooltip>

      <Tooltip title="Move Features (Drag to move)" placement="bottom">
        <Fab
          onClick={() => onToolChange("move")}
          sx={getToolStyle("move")}
          size="small"
        >
          <PanTool />
        </Fab>
      </Tooltip>

      {selectedCount > 0 && onDelete && (
        <Tooltip
          title={`Delete ${selectedCount} selected feature${
            selectedCount > 1 ? "s" : ""
          }`}
          placement="bottom"
        >
          <Fab
            onClick={onDelete}
            size="small"
            sx={{
              width: 32,
              height: 32,
              minWidth: 32,
              minHeight: 32,
              background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
              color: "white",
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.5)",
              "& .MuiSvgIcon-root": {
                fontSize: "1.25rem",
              },
              "&:hover": {
                background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.7)",
                transform: "scale(1.08)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <Delete />
          </Fab>
        </Tooltip>
      )}
    </Box>
  );
};

export default BasicEditingTools;
