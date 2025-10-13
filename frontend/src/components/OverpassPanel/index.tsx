import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Code,
  ViewList,
  Psychology,
} from "@mui/icons-material";
import { useMapLayers, useMapViewport } from "../../hooks/useMapLayers";
import { INITIAL_VIEW_STATE } from "../../constants/mapConfig";
import * as App from "../../../wailsjs/go/main/App";
import { OverpassPanelProps, OverpassTemplate } from "./types";
import { SAMPLE_TEMPLATES } from "./constants";
import { applyTemplateQuery, groupTemplatesByCategory, updateBboxInQuery } from "./utils";
import { useOverpassQuery } from "./useOverpassQuery";
import { TabPanel } from "./TabPanel";
import { QueryEditorTab } from "./QueryEditorTab";
import { TemplatesTab } from "./TemplatesTab";
import { AIAssistantTab } from "./AIAssistantTab";
import { PanelHeader } from "./PanelHeader";

const OverpassPanel: React.FC<OverpassPanelProps> = ({
  isOpen,
  onToggle,
  drawnBounds,
  isDrawingBounds,
  onStartDrawingBounds,
  onFinishDrawingBounds,
  onCancelDrawingBounds,
  embedded = false,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState<OverpassTemplate[]>([]);
  const [aiDescription, setAiDescription] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const queryEditorRef = useRef<HTMLTextAreaElement>(null);

  const { addLayer } = useMapLayers();
  const { viewState, setViewState } = useMapViewport();

  const {
    loading,
    error,
    aiLoading,
    setError,
    executeQuery: executeQueryHook,
    generateAIQuery: generateAIQueryHook,
  } = useOverpassQuery({
    addLayer,
    setViewState,
    viewState: viewState || INITIAL_VIEW_STATE,
    drawnBounds,
  });

  // Load templates when component mounts
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  // Update bounding box in queries when drawn geometry changes
  useEffect(() => {
    if (drawnBounds && query) {
      const updatedQuery = updateBboxInQuery(query, drawnBounds);
      if (updatedQuery !== query) {
        setQuery(updatedQuery);
      }
    }
  }, [drawnBounds, query]);

  const loadTemplates = async () => {
    try {
      console.log("Loading Overpass query templates...");
      const templateData = await App.GetOverpassQueryTemplates();
      console.log("Templates loaded:", templateData);

      if (
        templateData &&
        Array.isArray(templateData) &&
        templateData.length > 0
      ) {
        setTemplates(templateData as OverpassTemplate[]);
      } else {
        console.log("No templates from backend, using sample templates");
        setTemplates(SAMPLE_TEMPLATES);
      }
    } catch (err) {
      console.error("Failed to load templates from backend:", err);
      console.log("Using sample templates as fallback");
      setTemplates(SAMPLE_TEMPLATES);
    }
  };

  const handleExecuteQuery = useCallback(() => {
    executeQueryHook(query);
  }, [query, executeQueryHook]);

  const handleGenerateAIQuery = useCallback(async () => {
    const generatedQuery = await generateAIQueryHook(aiDescription);
    if (generatedQuery) {
      setQuery(generatedQuery);
      setTabValue(0); // Switch to Query Editor tab
    }
  }, [aiDescription, generateAIQueryHook]);

  const handleApplyTemplate = useCallback(
    (template: OverpassTemplate) => {
      const populatedQuery = applyTemplateQuery(
        template,
        viewState || INITIAL_VIEW_STATE,
        drawnBounds
      );
      setQuery(populatedQuery);
      setTabValue(0); // Switch to Query Editor tab
    },
    [viewState, drawnBounds]
  );

  // Group templates by category
  const groupedTemplates = groupTemplatesByCategory(templates);

  // Render tab content
  const renderTabContent = () => (
    <>
      <TabPanel value={tabValue} index={0}>
        <QueryEditorTab
          query={query}
          setQuery={setQuery}
          queryEditorRef={queryEditorRef}
          error={error}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <TemplatesTab
          groupedTemplates={groupedTemplates}
          onApplyTemplate={handleApplyTemplate}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <AIAssistantTab
          aiDescription={aiDescription}
          setAiDescription={setAiDescription}
          onGenerateQuery={handleGenerateAIQuery}
          aiLoading={aiLoading}
          drawnBounds={drawnBounds}
          error={error}
        />
      </TabPanel>
    </>
  );

  // Render tabs
  const renderTabs = () => (
    <Tabs
      value={tabValue}
      onChange={(e, newValue) => setTabValue(newValue)}
      sx={{
        borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
        minHeight: 36,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        "& .MuiTab-root": {
          textTransform: "none",
          fontWeight: 500,
          minHeight: 36,
          fontSize: "0.8rem",
          py: 0.5,
          color: "rgba(255, 255, 255, 0.7)",
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
        icon={<Code sx={{ fontSize: 18 }} />}
        label="Query Editor"
        iconPosition="start"
      />
      <Tab
        icon={<ViewList sx={{ fontSize: 18 }} />}
        label="Templates"
        iconPosition="start"
      />
      <Tab
        icon={<Psychology sx={{ fontSize: 18 }} />}
        label="AI Assistant"
        iconPosition="start"
      />
    </Tabs>
  );

  // Embedded mode: just render the content
  if (embedded) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <PanelHeader
          drawnBounds={drawnBounds}
          isDrawingBounds={isDrawingBounds}
          onStartDrawingBounds={onStartDrawingBounds}
          onFinishDrawingBounds={onFinishDrawingBounds}
          onCancelDrawingBounds={onCancelDrawingBounds}
          onExecuteQuery={handleExecuteQuery}
          loading={loading}
          queryValid={query.trim().length > 0}
        />

        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {renderTabs()}
          {renderTabContent()}
        </Box>
      </Box>
    );
  }

  // Standalone mode: render with Paper wrapper
  return (
    <Paper
      ref={panelRef}
      sx={{
        position: "fixed",
        bottom: isOpen ? 0 : -365,
        left: 0,
        right: 0,
        height: 400,
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
      <PanelHeader
        drawnBounds={drawnBounds}
        isDrawingBounds={isDrawingBounds}
        onStartDrawingBounds={onStartDrawingBounds}
        onFinishDrawingBounds={onFinishDrawingBounds}
        onCancelDrawingBounds={onCancelDrawingBounds}
        onExecuteQuery={handleExecuteQuery}
        loading={loading}
        queryValid={query.trim().length > 0}
        isOpen={isOpen}
        onToggle={onToggle}
        showCollapseButton={true}
      />

      {/* Content Area */}
      {isOpen && (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {renderTabs()}
          {renderTabContent()}
        </Box>
      )}
    </Paper>
  );
};

export default OverpassPanel;
