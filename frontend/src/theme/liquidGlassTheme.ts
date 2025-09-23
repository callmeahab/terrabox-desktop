import { createTheme } from "@mui/material";

export const liquidGlassTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#10b981", // Seafoam Green
    },
    secondary: {
      main: "#3b82f6", // Ocean Blue
    },
    background: {
      default: "#0f172a", // Midnight Blue
      paper: "rgba(15, 23, 42, 0.8)", // Semi-transparent version
    },
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 16,
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
          color: "#ffffff",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          background: "rgba(16, 185, 129, 0.1)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          color: "#10b981",
          fontWeight: 600,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          background: "transparent",
          color: "#ffffff",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          background: "rgba(255, 255, 255, 0.05)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: 12,
          textTransform: "none",
          fontWeight: 500,
          color: "#ffffff",
          "&:hover": {
            background: "rgba(255, 255, 255, 0.2)",
            transform: "translateY(-1px)",
            boxShadow: "0 8px 25px rgba(16, 185, 129, 0.3)",
          },
        },
        contained: {
          background: "rgba(16, 185, 129, 0.2)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          "&:hover": {
            background: "rgba(16, 185, 129, 0.3)",
            transform: "translateY(-1px)",
            boxShadow: "0 8px 25px rgba(16, 185, 129, 0.4)",
          },
        },
        outlined: {
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          "&:hover": {
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          background: "rgba(16, 185, 129, 0.2)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          boxShadow: "0 8px 32px rgba(16, 185, 129, 0.3)",
          color: "white",
          "&:hover": {
            background: "rgba(16, 185, 129, 0.3)",
            transform: "translateY(-2px)",
            boxShadow: "0 12px 40px rgba(16, 185, 129, 0.4)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          color: "#ffffff",
        },
        outlined: {
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          color: "#10b981",
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: "2px 0",
          "&:hover": {
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(10px)",
          },
          "&.Mui-selected": {
            background: "rgba(16, 185, 129, 0.2)",
            "&:hover": {
              background: "rgba(16, 185, 129, 0.3)",
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(20px)",
          border: "none",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          background: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: 12,
          color: "#ffffff",
          "& .MuiAlert-icon": {
            color: "inherit",
          },
        },
        standardError: {
          background: "rgba(220, 38, 38, 0.9)",
          border: "1px solid rgba(220, 38, 38, 0.5)",
          color: "#ffffff",
          "& .MuiAlert-icon": {
            color: "#fca5a5",
          },
        },
        standardWarning: {
          background: "rgba(245, 158, 11, 0.9)",
          border: "1px solid rgba(245, 158, 11, 0.5)",
          color: "#ffffff",
          "& .MuiAlert-icon": {
            color: "#fcd34d",
          },
        },
        standardSuccess: {
          background: "rgba(16, 185, 129, 0.9)",
          border: "1px solid rgba(16, 185, 129, 0.5)",
          color: "#ffffff",
          "& .MuiAlert-icon": {
            color: "#6ee7b7",
          },
        },
        standardInfo: {
          background: "rgba(59, 130, 246, 0.9)",
          border: "1px solid rgba(59, 130, 246, 0.5)",
          color: "#ffffff",
          "& .MuiAlert-icon": {
            color: "#93c5fd",
          },
        },
      },
    },
  },
});
