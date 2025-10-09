import React from "react";
import { Box, Fab, Tooltip } from "@mui/material";
import {
  Save,
  Cancel,
  Download,
  FileDownload,
  Visibility,
  EditAttributes,
  Transform,
  ZoomOutMap,
  OpenWith,
  RotateRight,
  Delete,
  TouchApp,
  SelectAll,
  PanTool,
} from "@mui/icons-material";

interface EditingControlsProps {
  editMode: string;
  setEditMode: (mode: string) => void;
  editableLayerId: string | null;
  setEditableLayerId: (id: string | null) => void;
  selectedEditFeatureIndexes: number[];
  onSave?: () => void;
  onCancel?: () => void;
  onExportLayer: () => void;
  onExportSelected: () => void;
  onDelete?: () => void;
}

const EditingControls: React.FC<EditingControlsProps> = ({
  editMode,
  setEditMode,
  editableLayerId,
  setEditableLayerId,
  selectedEditFeatureIndexes,
  onSave,
  onCancel,
  onExportLayer,
  onExportSelected,
  onDelete,
}) => {
  const handleSave = () => {
    if (onSave) onSave();
    setEditMode("view");
    setEditableLayerId(null);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    setEditMode("view");
    setEditableLayerId(null);
  };

  const fabStyle = {
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    background: "rgba(255, 255, 255, 0.95)",
    color: "#FF7F50",
    boxShadow: 1,
    "& .MuiSvgIcon-root": {
      fontSize: "1.25rem",
    },
    "&:hover": {
      background: "white",
      color: "#FF6B3D",
      boxShadow: 2,
      transform: "scale(1.08)",
    },
    transition: "all 0.2s ease",
  };

  const modeFabStyle = (isActive: boolean) => ({
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    background: isActive
      ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
      : "rgba(255, 255, 255, 0.95)",
    color: isActive ? "white" : "#3b82f6",
    boxShadow: isActive ? "0 2px 8px rgba(59, 130, 246, 0.5)" : 1,
    border: isActive ? "1px solid rgba(255, 255, 255, 0.3)" : "none",
    "& .MuiSvgIcon-root": {
      fontSize: "1.25rem",
    },
    "&:hover": {
      background: isActive
        ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
        : "white",
      color: isActive ? "white" : "#2563eb",
      boxShadow: isActive ? "0 4px 12px rgba(59, 130, 246, 0.7)" : 2,
      transform: "scale(1.08)",
    },
    transition: "all 0.2s ease",
  });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        padding: 0.5,
        borderRadius: 2,
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <Tooltip title="Save Changes" placement="left">
        <Fab onClick={handleSave} size="small" sx={fabStyle}>
          <Save />
        </Fab>
      </Tooltip>

      <Tooltip title="Cancel Editing" placement="left">
        <Fab onClick={handleCancel} size="small" sx={fabStyle}>
          <Cancel />
        </Fab>
      </Tooltip>

      {selectedEditFeatureIndexes.length > 0 && (
        <Tooltip title={`Delete ${selectedEditFeatureIndexes.length} Selected Feature${selectedEditFeatureIndexes.length > 1 ? 's' : ''} (Delete key)`} placement="left">
          <Fab
            onClick={onDelete}
            size="small"
            sx={{
              width: 32,
              height: 32,
              minWidth: 32,
              minHeight: 32,
              background: "rgba(255, 255, 255, 0.95)",
              color: "#dc2626",
              boxShadow: 1,
              "& .MuiSvgIcon-root": {
                fontSize: "1.25rem",
              },
              "&:hover": {
                background: "white",
                color: "#b91c1c",
                boxShadow: 2,
                transform: "scale(1.08)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <Delete />
          </Fab>
        </Tooltip>
      )}

      <Tooltip title="Export Layer to GeoJSON" placement="left">
        <Fab
          onClick={onExportLayer}
          size="small"
          disabled={!editableLayerId}
          sx={{
            ...fabStyle,
            opacity: !editableLayerId ? 0.5 : 1,
          }}
        >
          <Download />
        </Fab>
      </Tooltip>

      {selectedEditFeatureIndexes.length > 0 && (
        <Tooltip title="Export Selected Features to GeoJSON" placement="left">
          <Fab
            onClick={onExportSelected}
            size="small"
            sx={fabStyle}
          >
            <FileDownload />
          </Fab>
        </Tooltip>
      )}

      <Tooltip title="View Mode" placement="left">
        <Fab
          onClick={() => setEditMode("view")}
          size="small"
          sx={modeFabStyle(editMode === "view")}
        >
          <Visibility />
        </Fab>
      </Tooltip>

      <Tooltip title="Select Features" placement="left">
        <Fab
          onClick={() => setEditMode("select")}
          size="small"
          sx={modeFabStyle(editMode === "select")}
        >
          <TouchApp />
        </Fab>
      </Tooltip>

      <Tooltip title="Select by Area" placement="left">
        <Fab
          onClick={() => setEditMode("selectByArea")}
          size="small"
          sx={modeFabStyle(editMode === "selectByArea")}
        >
          <SelectAll />
        </Fab>
      </Tooltip>

      <Tooltip title="Move Features" placement="left">
        <Fab
          onClick={() => setEditMode("translate")}
          size="small"
          sx={modeFabStyle(editMode === "translate")}
        >
          <PanTool />
        </Fab>
      </Tooltip>

      <Tooltip title="Modify Vertices" placement="left">
        <Fab
          onClick={() => setEditMode("modify")}
          size="small"
          sx={modeFabStyle(editMode === "modify")}
        >
          <EditAttributes />
        </Fab>
      </Tooltip>

      <Tooltip title="Transform Mode" placement="left">
        <Fab
          onClick={() => setEditMode("transform")}
          size="small"
          sx={modeFabStyle(editMode === "transform")}
        >
          <Transform />
        </Fab>
      </Tooltip>

      <Tooltip title="Scale Mode" placement="left">
        <Fab
          onClick={() => setEditMode("scale")}
          size="small"
          sx={modeFabStyle(editMode === "scale")}
        >
          <ZoomOutMap />
        </Fab>
      </Tooltip>

      <Tooltip title="Rotate Mode" placement="left">
        <Fab
          onClick={() => setEditMode("rotate")}
          size="small"
          sx={modeFabStyle(editMode === "rotate")}
        >
          <RotateRight />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default EditingControls;
