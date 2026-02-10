"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setDisplayCurrency } from "@/actions/settings";
import {
  SupportedCurrency,
  CURRENCY_CONFIG,
  ExchangeRates,
} from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Check, Loader2, Globe } from "lucide-react";

interface CurrencySettingsProps {
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

const CURRENCIES: SupportedCurrency[] = ["USD", "CNY", "HKD"];

export function CurrencySettings({ currency, rates }: CurrencySettingsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSelect = (selected: SupportedCurrency) => {
    if (selected === currency) return;
    startTransition(async () => {
      await setDisplayCurrency(selected);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Display Currency</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose the currency for displaying values. Prices are stored in
              USD and converted at current exchange rates.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {CURRENCIES.map((code) => {
            const config = CURRENCY_CONFIG[code];
            const isActive = currency === code;
            const rate = rates[code] ?? 1;

            return (
              <button
                key={code}
                onClick={() => handleSelect(code)}
                disabled={isPending}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
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
                <span className="text-2xl font-bold">{config.symbol}</span>
                <div>
                  <p className="font-semibold">{config.name}</p>
                  <p className="text-sm text-muted-foreground">{config.code}</p>
                </div>
                {code !== "USD" && (
                  <p className="text-xs text-muted-foreground">
                    1 USD = {rate.toFixed(2)} {code}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
