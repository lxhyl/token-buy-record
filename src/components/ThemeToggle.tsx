"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  { key: "light" as const, label: "Light", icon: Sun },
  { key: "dark" as const, label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Appearance</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose between light and dark mode
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-3 sm:grid-cols-2 max-w-md">
          {THEMES.map(({ key, label, icon: Icon }) => {
            const isActive = theme === key;
            return (
              <button
                key={key}
                onClick={() => {
                  if (theme !== key) toggleTheme();
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                  isActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-transparent bg-muted/30 hover:border-muted-foreground/20 hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    isActive
                      ? "bg-blue-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-muted-foreground">
                    {key === "light" ? "Default theme" : "Easy on the eyes"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
