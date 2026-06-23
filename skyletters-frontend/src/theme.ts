import { createTheme, type Theme } from "@mui/material/styles";

export type ThemeMode = "light" | "dark";

// Tema oscuro (por defecto) y tema claro estilo Siigo (verde-teal).
export function buildTheme(mode: ThemeMode): Theme {
  if (mode === "light") {
    return createTheme({
      palette: {
        mode: "light",
        primary: { main: "#00C389", dark: "#00A876", light: "#33CFA1", contrastText: "#FFFFFF" },
        secondary: { main: "#2D7FF9", contrastText: "#FFFFFF" },
        success: { main: "#1FB877" },
        error: { main: "#E5484D" },
        warning: { main: "#F59E0B" },
        info: { main: "#2D7FF9" },
        background: { default: "#F4F6F8", paper: "#FFFFFF" },
        text: { primary: "#1A2233", secondary: "#64748B", disabled: "#94A3B8" },
        divider: "#E3E8EE",
      },
      shape: { borderRadius: 8 },
      typography: {
        fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: 13,
      },
    });
  }
  return createTheme({
    palette: {
      mode: "dark",
      primary: { main: "#60a5fa" },
      background: { default: "#0f172a", paper: "#1e293b" },
      divider: "#334155",
      text: { primary: "#e2e8f0", secondary: "#a3b1c6" },
      error: { main: "#f87171" },
      success: { main: "#4ade80" },
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: 13,
    },
  });
}
