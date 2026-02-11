"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDisplayCurrency } from "@/actions/settings";
import {
  SupportedCurrency,
  CURRENCY_CONFIG,
  ExchangeRates,
} from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { TranslationKey } from "@/lib/i18n";

interface CurrencySettingsProps {
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

const CURRENCIES: SupportedCurrency[] = ["USD", "CNY", "HKD"];
const CURRENCY_NAME_KEYS: Record<SupportedCurrency, TranslationKey> = {
  USD: "currency.usdName",
  CNY: "currency.cnyName",
  HKD: "currency.hkdName",
};

export function CurrencySettings({ currency, rates }: CurrencySettingsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { t, tInterpolate } = useI18n();

  const handleSelect = (selected: SupportedCurrency) => {
    if (selected === currency) return;
    startTransition(async () => {
      await setDisplayCurrency(selected);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{t("settings.displayCurrency")}</p>
        <p className="text-xs text-muted-foreground">
          {t("settings.displayCurrencyDesc")}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {CURRENCIES.map((code) => {
          const config = CURRENCY_CONFIG[code];
          const isActive = currency === code;
          const rate = rates[code] ?? 1;
          const nameKey = CURRENCY_NAME_KEYS[code];

          return (
            <button
              key={code}
              onClick={() => handleSelect(code)}
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
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {config.symbol}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{t(nameKey)}</p>
                {code !== "USD" && (
                  <p className="text-xs text-muted-foreground leading-tight">
                    {tInterpolate("currency.rateHint", { rate: rate.toFixed(2), code })}
                  </p>
                )}
              </div>
              {isActive && (
                <div className="ml-auto shrink-0">
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