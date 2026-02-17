"use client";

import { createContext, useContext } from "react";
import type { ColorScheme } from "@/actions/settings";

const ColorSchemeContext = createContext<ColorScheme>("us");

export function ColorSchemeProvider({
  scheme,
  children,
}: {
  scheme: ColorScheme;
  children: React.ReactNode;
}) {
  return (
    <ColorSchemeContext.Provider value={scheme}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme() {
  return useContext(ColorSchemeContext);
}

/**
 * Returns gain/loss color classes based on the user's color scheme.
 * US: green = gain, red = loss (default)
 * CN: red = gain, green = loss
 */
export function usePnLColors() {
  const scheme = useColorScheme();
  const isCN = scheme === "cn";

  return {
    // Text colors for positive values
    gainText: isCN
      ? "text-red-600 dark:text-red-400"
      : "text-green-600 dark:text-green-400",
    // Text colors for negative values
    lossText: isCN
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400",
    // Emerald variant for gain (used in pills/badges)
    gainPill: isCN
      ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    lossPill: isCN
      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
      : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300",
    // Background light colors (for icon backgrounds, decorations)
    gainBgLight: isCN
      ? "bg-red-50 dark:bg-red-950/40"
      : "bg-emerald-50 dark:bg-emerald-950/40",
    lossBgLight: isCN
      ? "bg-emerald-50 dark:bg-emerald-950/40"
      : "bg-red-50 dark:bg-red-950/40",
    // Icon colors
    gainIcon: isCN
      ? "text-red-600 dark:text-red-400"
      : "text-emerald-600 dark:text-emerald-400",
    lossIcon: isCN
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400",
    // Gradient classes
    gainGradient: isCN
      ? "from-red-500 to-rose-500"
      : "from-emerald-500 to-teal-500",
    lossGradient: isCN
      ? "from-emerald-500 to-teal-500"
      : "from-red-500 to-rose-500",
    // Hex colors for charts (Recharts)
    gainHex: isCN ? "#ef4444" : "#22c55e",
    lossHex: isCN ? "#22c55e" : "#ef4444",
    // Shadow colors
    gainShadow: isCN ? "shadow-red-500/25" : "shadow-emerald-500/25",
    lossShadow: isCN ? "shadow-emerald-500/25" : "shadow-red-500/25",
    // Calendar cell backgrounds
    gainCellBg: isCN
      ? "bg-red-500/15 dark:bg-red-500/20"
      : "bg-emerald-500/15 dark:bg-emerald-500/20",
    lossCellBg: isCN
      ? "bg-emerald-500/15 dark:bg-emerald-500/20"
      : "bg-red-500/15 dark:bg-red-500/20",
    // Win rate bar
    gainBar: isCN ? "bg-red-500" : "bg-green-500",
    lossBarBg: isCN ? "bg-green-500/20 dark:bg-green-500/30" : "bg-red-500/20 dark:bg-red-500/30",
    // Header gradient for icons
    gainHeaderGradient: isCN
      ? "bg-gradient-to-br from-red-500 to-rose-500"
      : "bg-gradient-to-br from-green-500 to-emerald-500",
    lossHeaderGradient: isCN
      ? "bg-gradient-to-br from-green-500 to-emerald-500"
      : "bg-gradient-to-br from-red-500 to-rose-500",
    // Streak text colors
    winStreakText: isCN
      ? "text-red-600 dark:text-red-400"
      : "text-green-600 dark:text-green-400",
    lossStreakText: isCN
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400",
    // Tooltip icon
    gainTooltipIcon: isCN ? "text-red-500" : "text-green-500",
    lossTooltipIcon: isCN ? "text-green-500" : "text-red-500",
  };
}
