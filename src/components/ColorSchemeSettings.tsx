"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setColorScheme, ColorScheme } from "@/actions/settings";
import { useColorScheme } from "@/components/ColorSchemeProvider";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/I18nProvider";
import { TranslationKey } from "@/lib/i18n";
import { TrendingUp, TrendingDown } from "lucide-react";

const SCHEMES: {
  key: ColorScheme;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  gainColor: string;
  lossColor: string;
}[] = [
  {
    key: "us",
    labelKey: "settings.colorSchemeUS",
    descKey: "settings.colorSchemeUSDesc",
    gainColor: "text-green-500",
    lossColor: "text-red-500",
  },
  {
    key: "cn",
    labelKey: "settings.colorSchemeCN",
    descKey: "settings.colorSchemeCNDesc",
    gainColor: "text-red-500",
    lossColor: "text-green-500",
  },
];

export function ColorSchemeSettings() {
  const current = useColorScheme();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { t } = useI18n();

  function handleChange(scheme: ColorScheme) {
    if (scheme === current) return;
    startTransition(async () => {
      await setColorScheme(scheme);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{t("settings.colorScheme")}</p>
        <p className="text-xs text-muted-foreground">{t("settings.colorSchemeDesc")}</p>
      </div>
      <div className={`grid gap-2 sm:grid-cols-2 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
        {SCHEMES.map(({ key, labelKey, descKey, gainColor, lossColor }) => {
          const isActive = current === key;
          return (
            <button
              key={key}
              onClick={() => handleChange(key)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer",
                isActive
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-transparent hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md gap-0",
                  isActive ? "bg-primary/10" : "bg-muted"
                )}
              >
                <TrendingUp className={`h-3.5 w-3.5 ${gainColor}`} />
                <TrendingDown className={`h-3.5 w-3.5 ${lossColor}`} />
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
