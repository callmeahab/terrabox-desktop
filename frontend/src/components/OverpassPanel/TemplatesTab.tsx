import React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { OverpassTemplate } from "./types";

interface TemplatesTabProps {
  groupedTemplates: Record<string, OverpassTemplate[]>;
  onApplyTemplate: (template: OverpassTemplate) => void;
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({
  groupedTemplates,
  onApplyTemplate,
}) => {
  return (
    <Box sx={{ p: 2, flex: 1, overflow: "auto", minHeight: 0 }}>
      {Object.entries(groupedTemplates).length === 0 ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: "rgba(255, 255, 255, 0.5)", mb: 1 }}
          >
            Loading templates...
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255, 255, 255, 0.3)" }}
          >
            Please wait while we fetch the available query templates.
          </Typography>
        </Box>
      ) : (
        Object.entries(groupedTemplates).map(
          ([category, categoryTemplates]) => (
            <Box key={category} sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{ mb: 2, color: "#10b981", fontWeight: 600 }}
              >
                {category}
              </Typography>
              <List dense>
                {categoryTemplates.map((template, index) => (
                  <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                    <ListItemButton
                      onClick={() => onApplyTemplate(template)}
                      sx={{
                        borderRadius: 2,
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        "&:hover": {
                          backgroundColor: "rgba(16, 185, 129, 0.1)",
                        },
                      }}
                    >
                      <ListItemText
                        primary={template.name}
                        secondary={template.description}
                        primaryTypographyProps={{
                          sx: { color: "#ffffff", fontWeight: 500 },
                        }}
                        secondaryTypographyProps={{
                          sx: {
                            fontSize: "0.875rem",
                            color: "rgba(255, 255, 255, 0.7)",
                          },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )
        )
      )}
    </Box>
  );
};
