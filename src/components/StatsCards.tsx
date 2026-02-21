"use client";

import { PortfolioSummary } from "@/lib/calculations";
import { createCurrencyFormatter, formatPercent } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Wallet, Target, Coins } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { usePnLColors } from "@/components/ColorSchemeProvider";

interface StatsCardsProps {
  summary: PortfolioSummary;
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function StatsCards({ summary, currency, rates }: StatsCardsProps) {
  const fc = createCurrencyFormatter(currency, rates);
  const { t } = useI18n();
  const c = usePnLColors();

  const cards = [
    {
      title: t("stats.totalInvested"),
      value: fc(summary.totalInvested),
      icon: DollarSign,
      gradient: "from-blue-500 to-blue-600",
      shadowColor: "shadow-blue-500/25",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: t("stats.currentValue"),
      value: fc(summary.totalCurrentValue),
      icon: PiggyBank,
      gradient: "from-teal-500 to-cyan-500",
      shadowColor: "shadow-teal-500/25",
      bgLight: "bg-teal-50 dark:bg-teal-950/40",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      title: t("stats.unrealizedPnL"),
      value: `${summary.totalUnrealizedPnL >= 0 ? "+" : ""}${fc(summary.totalUnrealizedPnL)}`,
      subtitle: `${summary.totalPnLPercent >= 0 ? "+" : ""}${formatPercent(summary.totalPnLPercent)}`,
      icon: summary.totalUnrealizedPnL >= 0 ? TrendingUp : TrendingDown,
      gradient: summary.totalUnrealizedPnL >= 0 ? c.gainGradient : c.lossGradient,
      shadowColor: summary.totalUnrealizedPnL >= 0 ? c.gainShadow : c.lossShadow,
      bgLight: summary.totalUnrealizedPnL >= 0 ? c.gainBgLight : c.lossBgLight,
      iconColor: summary.totalUnrealizedPnL >= 0 ? c.gainIcon : c.lossIcon,
      valueColor: summary.totalUnrealizedPnL >= 0 ? c.gainIcon : c.lossIcon,
    },
    {
      title: t("stats.realizedPnL"),
      value: `${summary.totalRealizedPnL >= 0 ? "+" : ""}${fc(summary.totalRealizedPnL)}`,
      icon: Target,
      gradient: summary.totalRealizedPnL >= 0
        ? "from-amber-500 to-orange-500"
        : c.lossGradient,
      shadowColor: summary.totalRealizedPnL >= 0
        ? "shadow-amber-500/25"
        : c.lossShadow,
      bgLight: summary.totalRealizedPnL >= 0 ? "bg-amber-50 dark:bg-amber-950/40" : c.lossBgLight,
      iconColor: summary.totalRealizedPnL >= 0 ? "text-amber-600 dark:text-amber-400" : c.lossIcon,
      valueColor: summary.totalRealizedPnL >= 0 ? "text-amber-600 dark:text-amber-400" : c.lossIcon,
    },
    ...(summary.totalDepositInterest > 0
      ? [
          {
            title: t("stats.totalIncome"),
            value: `+${fc(summary.totalDepositInterest)}`,
            icon: Coins,
            gradient: "from-amber-500 to-yellow-500",
            shadowColor: "shadow-amber-500/25",
            bgLight: "bg-amber-50 dark:bg-amber-950/40",
            iconColor: "text-amber-600 dark:text-amber-400",
            valueColor: "text-amber-600 dark:text-amber-400",
          },
        ]
      : []),
  ];

  return (
    <div className={`grid grid-cols-2 gap-3 md:gap-4 ${cards.length > 4 ? "md:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4"}`}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="group relative overflow-hidden rounded-xl bg-card p-4 md:p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Background decoration */}
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${card.bgLight} opacity-50 transition-transform group-hover:scale-150`} />

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </span>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bgLight}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>

              <div className={`text-lg md:text-2xl font-bold tracking-tight font-num ${card.valueColor || "text-foreground"}`}>
                {card.value}
              </div>

              {card.subtitle && (
                <p className={`mt-1 text-sm font-medium font-num ${card.valueColor}`}>
                  {card.subtitle}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
