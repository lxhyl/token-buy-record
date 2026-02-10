"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";

export function LandingLanguageToggle() {
  const router = useRouter();
  const { locale } = useI18n();

  const toggle = () => {
    const next = locale === "en" ? "zh" : "en";
    document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    router.refresh();
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );
}
