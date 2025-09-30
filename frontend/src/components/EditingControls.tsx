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
    background: "linear-gradient(135deg, #FF7F50 0%, #FF9E80 100%)",
    color: "white",
    boxShadow: 3,
    "&:hover": {
      background: "linear-gradient(135deg, #FF8658 0%, #FFA888 100%)",
      boxShadow: 6,
    },
  };

  const modeFabStyle = (isActive: boolean) => ({
    backgroundColor: isActive ? "primary.main" : "background.paper",
    color: isActive ? "white" : "text.primary",
    "&:hover": {
      backgroundColor: isActive ? "primary.dark" : "grey.200",
    },
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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

      <Tooltip title="Export Layer to GeoJSON" placement="left">
        <Fab
          onClick={onExportLayer}
          size="small"
          disabled={!editableLayerId}
          sx={fabStyle}
        >
          <Download />
        </Fab>
      </Tooltip>

      {selectedEditFeatureIndexes.length > 0 && (
        <Tooltip title="Export Selected Features to GeoJSON" placement="left">
          <Fab
            color="secondary"
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

      <Tooltip title="Modify Mode" placement="left">
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

      <Tooltip title="Translate Mode" placement="left">
        <Fab
          onClick={() => setEditMode("translate")}
          size="small"
          sx={modeFabStyle(editMode === "translate")}
        >
          <OpenWith />
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
