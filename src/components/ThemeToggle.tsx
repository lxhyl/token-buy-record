"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/I18nProvider";
import { TranslationKey } from "@/lib/i18n";

const THEMES: { key: "light" | "dark"; labelKey: TranslationKey; descKey: TranslationKey; icon: typeof Sun }[] = [
  { key: "light", labelKey: "settings.light", descKey: "settings.lightDesc", icon: Sun },
  { key: "dark", labelKey: "settings.dark", descKey: "settings.darkDesc", icon: Moon },
];

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{t("settings.appearance")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("settings.appearanceDesc")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-3 sm:grid-cols-2 max-w-md">
          {THEMES.map(({ key, labelKey, descKey, icon: Icon }) => {
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
                  <p className="font-semibold">{t(labelKey)}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(descKey)}
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
