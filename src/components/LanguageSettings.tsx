"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDisplayLanguage } from "@/actions/settings";
import { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

interface LanguageSettingsProps {
  locale: Locale;
}

const LANGUAGES: { code: Locale; label: string; native: string }[] = [
  { code: "en", label: "English", native: "EN" },
  { code: "zh", label: "中文", native: "中文" },
];

export function LanguageSettings({ locale }: LanguageSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { t } = useI18n();

  const handleSelect = (selected: Locale) => {
    if (selected === locale) return;
    startTransition(async () => {
      await setDisplayLanguage(selected);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{t("settings.language")}</p>
        <p className="text-xs text-muted-foreground">{t("settings.languageDesc")}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 max-w-sm">
        {LANGUAGES.map((lang) => {
          const isActive = locale === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              disabled={isPending}
              className={cn(
                "relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer",
                isActive
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-transparent hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {lang.native}
              </div>
              <p className="text-sm font-medium">{lang.label}</p>
              {isActive && (
                <div className="ml-auto">
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
