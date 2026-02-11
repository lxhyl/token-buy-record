"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  /** @deprecated use setPreference instead */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  theme: "light",
  setPreference: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === "system" ? getSystemTheme() : pref;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [theme, setTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemePreference | null;
    if (stored === "dark" || stored === "light" || stored === "system") {
      setPreferenceState(stored);
      setTheme(resolveTheme(stored));
    } else {
      // Legacy: no stored preference, default to system
      setPreferenceState("system");
      setTheme(getSystemTheme());
    }
    setMounted(true);
  }, []);

  // Listen for system theme changes when preference is "system"
  useEffect(() => {
    if (!mounted || preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mounted, preference]);

  // Apply theme class to document
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", preference);
  }, [theme, preference, mounted]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    setTheme(resolveTheme(pref));
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(theme === "light" ? "dark" : "light");
  }, [theme, setPreference]);

  return (
    <ThemeContext.Provider value={{ preference, theme, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
