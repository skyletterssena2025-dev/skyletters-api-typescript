import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ThemeMode } from "../theme";

interface ThemeModeApi {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeApi>({ mode: "dark", toggle: () => {} });

const KEY = "sky_theme";

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem(KEY) as ThemeMode) || "dark",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(KEY, mode);
  }, [mode]);

  return (
    <ThemeModeContext.Provider
      value={{ mode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) }}
    >
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeApi {
  return useContext(ThemeModeContext);
}
