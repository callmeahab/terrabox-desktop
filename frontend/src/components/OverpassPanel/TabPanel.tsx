import React from "react";
import { Box } from "@mui/material";
import { TabPanelProps } from "./types";

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  index,
  ...other
}) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      style={{
        height: "100%",
        overflow: "hidden",
        display: value === index ? "flex" : "none",
        flexDirection: "column",
      }}
      {...other}
    >
      {value === index && (
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          {children}
        </Box>
      )}
    </div>
  );
};
