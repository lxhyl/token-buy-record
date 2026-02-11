"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/I18nProvider";
import { TranslationKey } from "@/lib/i18n";

type ThemePref = "light" | "dark" | "system";

const THEMES: { key: ThemePref; labelKey: TranslationKey; descKey: TranslationKey; icon: typeof Sun }[] = [
  { key: "light", labelKey: "settings.light", descKey: "settings.lightDesc", icon: Sun },
  { key: "dark", labelKey: "settings.dark", descKey: "settings.darkDesc", icon: Moon },
  { key: "system", labelKey: "settings.system", descKey: "settings.systemDesc", icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{t("settings.appearance")}</p>
        <p className="text-xs text-muted-foreground">{t("settings.appearanceDesc")}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {THEMES.map(({ key, labelKey, descKey, icon: Icon }) => {
          const isActive = preference === key;
          return (
            <button
              key={key}
              onClick={() => setPreference(key)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer",
                isActive
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-transparent hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{t(labelKey)}</p>
                <p className="text-xs text-muted-foreground leading-tight">{t(descKey)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}