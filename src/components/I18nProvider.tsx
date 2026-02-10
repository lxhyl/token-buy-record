"use client";

import { createContext, useContext } from "react";
import { Locale, DEFAULT_LOCALE, TranslationKey, t as translate, tInterpolate as translateInterpolate } from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  tInterpolate: (key: TranslationKey, params: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: (key) => translate(DEFAULT_LOCALE, key),
  tInterpolate: (key, params) => translateInterpolate(DEFAULT_LOCALE, key, params),
});

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value: I18nContextValue = {
    locale,
    t: (key) => translate(locale, key),
    tInterpolate: (key, params) => translateInterpolate(locale, key, params),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
