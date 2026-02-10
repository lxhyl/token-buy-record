"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setDisplayLanguage } from "@/actions/settings";
import { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Check, Loader2, Languages } from "lucide-react";
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
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{t("settings.language")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("settings.languageDesc")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-3 sm:grid-cols-2 max-w-md">
          {LANGUAGES.map((lang) => {
            const isActive = locale === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                disabled={isPending}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                  isActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-transparent bg-muted/30 hover:border-muted-foreground/20 hover:bg-muted/50"
                )}
              >
                {isActive && (
                  <div className="absolute right-3 top-3">
                    {isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                    isActive
                      ? "bg-blue-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {lang.native}
                </div>
                <div>
                  <p className="font-semibold">{lang.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
