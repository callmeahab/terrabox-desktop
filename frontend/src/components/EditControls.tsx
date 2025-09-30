import React, { useState } from "react";
import {
  Box,
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
  RectangleOutlined,
  CircleOutlined,
  Transform,
  ZoomOutMap,
  OpenWith,
  RotateRight,
} from "@mui/icons-material";
import EditingControls from "./EditingControls";
import GeoJSONExportModal from "./GeoJSONExportModal";
import { WriteFile, SelectDirectory } from "../../wailsjs/go/main/App";

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

interface RadialMenuItem {
  icon: React.ReactElement;
  title: string;
  mode: string;
}

const RadialMenu: React.FC<{ onModeChange: (mode: string) => void }> = ({
  onModeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems: RadialMenuItem[] = [
    { icon: <NearMe />, title: "Modify Features", mode: "modify" },
    { icon: <Transform />, title: "Transform", mode: "transform" },
    { icon: <ZoomOutMap />, title: "Scale", mode: "scale" },
    { icon: <OpenWith />, title: "Translate", mode: "translate" },
    { icon: <RotateRight />, title: "Rotate", mode: "rotate" },
    { icon: <Place />, title: "Draw Points", mode: "drawPoint" },
    { icon: <Timeline />, title: "Draw Lines", mode: "drawLine" },
    { icon: <Pentagon />, title: "Draw Polygons", mode: "drawPolygon" },
    {
      icon: <RectangleOutlined />,
      title: "Draw Rectangles",
      mode: "drawRectangle",
    },
    { icon: <CircleOutlined />, title: "Draw Circles", mode: "drawCircle" },
  ];

  const baseRadius = 60; // Inner row distance
  const radiusStep = 45; // Distance between rows
  const fanAngle = Math.PI * 0.5; // 90 degrees fan spread (horizontal to vertical)
  const startAngle = -Math.PI; // Start horizontally to the left

  // Define items per row dynamically - fewer items in inner rows
  const itemsPerRowConfig = [3, 4, 5];

  // Create row assignments
  const getRowAssignments = () => {
    const assignments = [];
    let itemIndex = 0;

    for (let row = 0; row < itemsPerRowConfig.length; row++) {
      const itemsInRow = itemsPerRowConfig[row];
      for (let i = 0; i < itemsInRow && itemIndex < menuItems.length; i++) {
        assignments.push({ row, positionInRow: i, itemsInThisRow: itemsInRow });
        itemIndex++;
      }
    }

    return assignments;
  };

  const rowAssignments = getRowAssignments();

  const handleItemClick = (mode: string) => {
    onModeChange(mode);
    setIsOpen(false);
  };

  return (
    <Box sx={{ position: "relative" }}>
      {/* Center FAB */}
      <Fab
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          background: "linear-gradient(135deg, #FF7F50 0%, #FF9E80 100%)",
          color: "white",
          boxShadow: 3,
          "&:hover": {
            background: "linear-gradient(135deg, #FF8658 0%, #FFA888 100%)",
            boxShadow: 6,
          },
        }}
      >
        <Edit />
      </Fab>

      {/* Fan Menu Items in Dynamic Rows */}
      {menuItems.map((item, index) => {
        if (index >= rowAssignments.length) return null;

        const { row, positionInRow, itemsInThisRow } = rowAssignments[index];

        // Calculate angle for this item within its row
        const angleStep = fanAngle / Math.max(1, itemsInThisRow - 1);
        const angle = startAngle + positionInRow * angleStep;

        // Calculate position with row-specific radius
        const radius = baseRadius + row * radiusStep;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        // Determine tooltip placement based on position
        const tooltipPlacement =
          x < -20 ? "right" : y < -20 ? "bottom" : "left";

        return (
          <Tooltip key={index} title={item.title} placement={tooltipPlacement}>
            <Fab
              size="small"
              onClick={() => handleItemClick(item.mode)}
              sx={{
                position: "absolute",
                left: x,
                top: y,
                background: "rgba(255, 255, 255, 0.9)",
                color: "#FF7F50",
                boxShadow: 2,
                transition: "all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                opacity: isOpen ? 1 : 0,
                scale: isOpen ? 1 : 0,
                transitionDelay: isOpen ? `${index * 20}ms` : "0ms",
                "&:hover": {
                  background: "white",
                  color: "#FF7F50",
                  boxShadow: 4,
                },
              }}
            >
              {item.icon}
            </Fab>
          </Tooltip>
        );
      })}
    </Box>
  );
};

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
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [exportFilename, setExportFilename] = useState("");

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

  const openExportModal = (data: any, filename: string) => {
    setExportData(data);
    setExportFilename(filename);
    setExportModalOpen(true);
  };

  const handleSaveToFile = async (filename: string, content: string) => {
    try {
      // Let the user select a directory
      const directory = await SelectDirectory();
      if (!directory) return;

      // Construct the full file path
      const filePath = `${directory}/${filename}`;

      // Save the file using Wails
      await WriteFile(filePath, content);
      console.log("File saved successfully:", filePath);
    } catch (error) {
      console.error("Error saving file:", error);
      throw error;
    }
  };

  const handleExportLayer = () => {
    if (!editableLayerId) return;

    const layer = layers.find((l) => l.id === editableLayerId);
    if (layer && layer.data) {
      const filename = `${layer.file_name || editableLayerId}_export`;
      openExportModal(layer.data, filename);
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
        }_selected_export`;
        openExportModal(exportData, filename);
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
          bottom: 15,
          right: 15,
          zIndex: 1000,
          color: "white",
        }}
      >
        {!isEditing ? (
          <RadialMenu onModeChange={handleModeChange} />
        ) : (
          <EditingControls
            editMode={editMode}
            setEditMode={setEditMode}
            editableLayerId={editableLayerId}
            setEditableLayerId={setEditableLayerId}
            selectedEditFeatureIndexes={selectedEditFeatureIndexes}
            onSave={onSave}
            onCancel={onCancel}
            onExportLayer={handleExportLayer}
            onExportSelected={handleExportSelected}
          />
        )}
      </Box>

      {/* Edit Mode Indicator */}
      {isEditing && (
        <Paper
          sx={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            px: 1,
            py: 0.5,
            zIndex: 1000,
            backgroundColor: "rgba(255, 140, 0, 0.9)",
            color: "white",
          }}
        >
          <Typography sx={{ fontWeight: 600 }}>
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
          <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
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
            top: 200,
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

      <GeoJSONExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={exportData}
        filename={exportFilename}
        onSave={handleSaveToFile}
      />
    </>
  );
};

export default EditControls;
