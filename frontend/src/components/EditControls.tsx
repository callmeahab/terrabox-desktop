import React from "react";
import {
  Box,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
  Fab,
  ButtonGroup,
  Button,
  Paper,
  Typography,
} from "@mui/material";
import {
  Edit,
  NearMe,
  Timeline,
  Pentagon,
  Place,
  Save,
  Cancel,
  Visibility,
  Delete,
  EditAttributes,
  Transform,
  ZoomOutMap,
  OpenWith,
  RotateRight,
  CropFree,
  RectangleOutlined,
  CircleOutlined,
  Download,
  FileDownload,
} from "@mui/icons-material";

interface EditControlsProps {
  editMode: string;
  setEditMode: (mode: string) => void;
  editableLayerId: string | null;
  setEditableLayerId: (id: string | null) => void;
  layers: any[];
  selectedEditFeatureIndexes: number[];
  onSave?: () => void;
  onCancel?: () => void;
}

const EditControls: React.FC<EditControlsProps> = ({
  editMode,
  setEditMode,
  editableLayerId,
  setEditableLayerId,
  layers,
  selectedEditFeatureIndexes,
  onSave,
  onCancel,
}) => {
  const editableLayers = layers.filter(
    (l) => l.data && l.data.type === "FeatureCollection"
  );
  const isEditing = editMode !== "view";

  const handleModeChange = (newMode: string) => {
    console.log(
      "🎛️ Edit mode changing to:",
      newMode,
      "current editableLayerId:",
      editableLayerId,
      "available layers:",
      editableLayers.length
    );

    setEditMode(newMode);

    // If switching to an edit mode and no layer is selected, select the first editable layer
    if (newMode !== "view" && !editableLayerId && editableLayers.length > 0) {
      console.log(
        "🎯 Setting editable layer:",
        editableLayers[0].id,
        editableLayers[0]
      );
      setEditableLayerId(editableLayers[0].id);
    }
  };

  const handleCancel = () => {
    setEditMode("view");
    setEditableLayerId(null);
    if (onCancel) onCancel();
  };

  const handleSave = () => {
    if (onSave) onSave();
    setEditMode("view");
    setEditableLayerId(null);
  };

  const downloadGeoJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportLayer = () => {
    if (!editableLayerId) return;

    const layer = layers.find((l) => l.id === editableLayerId);
    if (layer && layer.data) {
      const filename = `${layer.file_name || editableLayerId}_export.geojson`;
      downloadGeoJSON(layer.data, filename);
    }
  };

  const handleExportSelected = () => {
    if (!editableLayerId || selectedEditFeatureIndexes.length === 0) return;

    const layer = layers.find((l) => l.id === editableLayerId);
    if (layer && layer.data && layer.data.features) {
      const selectedFeatures = selectedEditFeatureIndexes
        .map((index) => layer.data.features[index])
        .filter(Boolean);

      if (selectedFeatures.length > 0) {
        const exportData = {
          type: "FeatureCollection",
          features: selectedFeatures,
        };
        const filename = `${
          layer.file_name || editableLayerId
        }_selected_export.geojson`;
        downloadGeoJSON(exportData, filename);
      }
    }
  };

  if (editableLayers.length === 0) {
    return null;
  }

  return (
    <>
      {/* Edit Mode Controls */}
      <Box
        sx={{
          position: "absolute",
          bottom: 30,
          right: 20,
          zIndex: 1000,
          color: "white",
        }}
      >
        {!isEditing ? (
          <SpeedDial
            ariaLabel="Edit tools"
            icon={<SpeedDialIcon icon={<Edit sx={{ color: "white" }} />} />}
            direction="up"
            FabProps={{
              sx: {
                background: "linear-gradient(135deg, #FF7F50 0%, #FF9E80 100%)",
                color: "white",
                boxShadow: 3,
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #FF8658 0%, #FFA888 100%)",
                  boxShadow: 6,
                },
              },
            }}
          >
            <SpeedDialAction
              icon={<NearMe />}
              tooltipTitle="Modify Features"
              onClick={() => handleModeChange("modify")}
            />
            <SpeedDialAction
              icon={<Transform />}
              tooltipTitle="Transform (Scale/Rotate/Move)"
              onClick={() => handleModeChange("transform")}
            />
            <SpeedDialAction
              icon={<ZoomOutMap />}
              tooltipTitle="Scale Features"
              onClick={() => handleModeChange("scale")}
            />
            <SpeedDialAction
              icon={<OpenWith />}
              tooltipTitle="Translate/Move Features"
              onClick={() => handleModeChange("translate")}
            />
            <SpeedDialAction
              icon={<RotateRight />}
              tooltipTitle="Rotate Features"
              onClick={() => handleModeChange("rotate")}
            />
            <SpeedDialAction
              icon={<Place />}
              tooltipTitle="Draw Points"
              onClick={() => handleModeChange("drawPoint")}
            />
            <SpeedDialAction
              icon={<Timeline />}
              tooltipTitle="Draw Lines"
              onClick={() => handleModeChange("drawLine")}
            />
            <SpeedDialAction
              icon={<Pentagon />}
              tooltipTitle="Draw Polygons"
              onClick={() => handleModeChange("drawPolygon")}
            />
            <SpeedDialAction
              icon={<RectangleOutlined />}
              tooltipTitle="Draw Rectangles"
              onClick={() => handleModeChange("drawRectangle")}
            />
            <SpeedDialAction
              icon={<CircleOutlined />}
              tooltipTitle="Draw Circles"
              onClick={() => handleModeChange("drawCircle")}
            />
          </SpeedDial>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Tooltip title="Save Changes" placement="left">
              <Fab onClick={handleSave} size="medium">
                <Save />
              </Fab>
            </Tooltip>
            <Tooltip title="Cancel Editing" placement="left">
              <Fab onClick={handleCancel} size="medium">
                <Cancel />
              </Fab>
            </Tooltip>
            <Tooltip title="Export Layer to GeoJSON" placement="left">
              <Fab
                onClick={handleExportLayer}
                size="medium"
                disabled={!editableLayerId}
              >
                <Download />
              </Fab>
            </Tooltip>
            {selectedEditFeatureIndexes.length > 0 && (
              <Tooltip
                title="Export Selected Features to GeoJSON"
                placement="left"
              >
                <Fab
                  color="secondary"
                  onClick={handleExportSelected}
                  size="medium"
                >
                  <FileDownload />
                </Fab>
              </Tooltip>
            )}
            <Tooltip title="View Mode" placement="left">
              <Fab
                onClick={() => setEditMode("view")}
                size="medium"
                sx={{
                  backgroundColor:
                    editMode === "view" ? "primary.main" : "background.paper",
                }}
              >
                <Visibility />
              </Fab>
            </Tooltip>
            <Tooltip title="Modify Mode" placement="left">
              <Fab
                onClick={() => setEditMode("modify")}
                size="medium"
                sx={{
                  backgroundColor:
                    editMode === "modify" ? "primary.main" : "background.paper",
                }}
              >
                <EditAttributes />
              </Fab>
            </Tooltip>
            <Tooltip title="Transform Mode" placement="left">
              <Fab
                onClick={() => setEditMode("transform")}
                size="medium"
                sx={{
                  backgroundColor:
                    editMode === "transform"
                      ? "primary.main"
                      : "background.paper",
                }}
              >
                <Transform />
              </Fab>
            </Tooltip>
            <Tooltip title="Scale Mode" placement="left">
              <Fab
                onClick={() => setEditMode("scale")}
                size="medium"
                sx={{
                  backgroundColor:
                    editMode === "scale" ? "primary.main" : "background.paper",
                }}
              >
                <ZoomOutMap />
              </Fab>
            </Tooltip>
            <Tooltip title="Translate Mode" placement="left">
              <Fab
                onClick={() => setEditMode("translate")}
                size="medium"
                sx={{
                  backgroundColor:
                    editMode === "translate"
                      ? "primary.main"
                      : "background.paper",
                }}
              >
                <OpenWith />
              </Fab>
            </Tooltip>
            <Tooltip title="Rotate Mode" placement="left">
              <Fab
                onClick={() => setEditMode("rotate")}
                size="medium"
                sx={{
                  backgroundColor:
                    editMode === "rotate" ? "primary.main" : "background.paper",
                }}
              >
                <RotateRight />
              </Fab>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Edit Mode Indicator */}
      {isEditing && (
        <Paper
          sx={{
            position: "absolute",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            padding: 2,
            zIndex: 1000,
            backgroundColor: "rgba(255, 140, 0, 0.9)",
            color: "white",
          }}
        >
          <Typography variant="h6">
            {editMode === "modify" && "Modify Mode"}
            {editMode === "transform" && "Transform Mode"}
            {editMode === "scale" && "Scale Mode"}
            {editMode === "translate" && "Translate Mode"}
            {editMode === "rotate" && "Rotate Mode"}
            {editMode === "drawPoint" && "Draw Points"}
            {editMode === "drawLine" && "Draw Lines"}
            {editMode === "drawPolygon" && "Draw Polygons"}
            {editMode === "drawRectangle" && "Draw Rectangles"}
            {editMode === "drawCircle" && "Draw Circles"}
          </Typography>
          <Typography variant="caption">
            {editMode === "modify" &&
              "Click features to select, drag vertices to modify"}
            {editMode === "transform" &&
              "Select features and use handles to scale, rotate, or move"}
            {editMode === "scale" &&
              "Click and drag to scale selected features"}
            {editMode === "translate" &&
              "Click and drag to move selected features"}
            {editMode === "rotate" &&
              "Click and drag to rotate selected features"}
            {editMode === "drawPoint" && "Click to place points"}
            {editMode === "drawLine" &&
              "Click to add line vertices, double-click to finish"}
            {editMode === "drawPolygon" &&
              "Click to add vertices, double-click to close polygon"}
            {editMode === "drawRectangle" &&
              "Click and drag to draw rectangles"}
            {editMode === "drawCircle" &&
              "Click center, then drag to set radius"}
          </Typography>
        </Paper>
      )}

      {/* Layer Selector for Editing */}
      {isEditing && editableLayers.length > 1 && (
        <Paper
          sx={{
            position: "absolute",
            top: 160,
            right: 20,
            padding: 2,
            zIndex: 1000,
            minWidth: 200,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Edit Layer:
          </Typography>
          <ButtonGroup orientation="vertical" size="small" fullWidth>
            {editableLayers.map((layer) => (
              <Button
                key={layer.id}
                variant={
                  editableLayerId === layer.id ? "contained" : "outlined"
                }
                onClick={() => setEditableLayerId(layer.id)}
              >
                {layer.file_name}
              </Button>
            ))}
          </ButtonGroup>
        </Paper>
      )}
    </>
  );
};

export default EditControls;
