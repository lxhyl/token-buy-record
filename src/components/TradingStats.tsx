"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCurrencyFormatter } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { Activity } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

interface ChartDataPoint {
  date: string;
  invested: number;
  value: number;
}

interface TradingStatsProps {
  chartData: ChartDataPoint[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function TradingStats({ chartData, currency, rates }: TradingStatsProps) {
  const fc = createCurrencyFormatter(currency, rates);
  const { t } = useI18n();

  const stats = useMemo(() => {
    if (chartData.length < 2) return null;

    const dailyPnLs: { date: string; pnl: number }[] = [];
    for (let i = 1; i < chartData.length; i++) {
      const prevNet = chartData[i - 1].value - chartData[i - 1].invested;
      const currNet = chartData[i].value - chartData[i].invested;
      dailyPnLs.push({ date: chartData[i].date, pnl: currNet - prevNet });
    }

    let gainDays = 0;
    let lossDays = 0;
    let totalGains = 0;
    let totalLosses = 0;
    let bestDay = dailyPnLs[0];
    let worstDay = dailyPnLs[0];
    let avgPnL = 0;

    // Streaks
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;

    // Max drawdown
    let peak = chartData[0].value;
    let maxDrawdown = 0;

    for (let i = 0; i < dailyPnLs.length; i++) {
      const { pnl } = dailyPnLs[i];
      avgPnL += pnl;

      if (pnl > 0) {
        gainDays++;
        totalGains += pnl;
        currentWinStreak++;
        currentLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      } else if (pnl < 0) {
        lossDays++;
        totalLosses += Math.abs(pnl);
        currentLossStreak++;
        currentWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }

      if (pnl > bestDay.pnl) bestDay = dailyPnLs[i];
      if (pnl < worstDay.pnl) worstDay = dailyPnLs[i];

      // Drawdown uses the value series (i+1 because dailyPnLs starts at index 1 of chartData)
      const currentValue = chartData[i + 1].value;
      if (currentValue > peak) peak = currentValue;
      const drawdown = peak - currentValue;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    avgPnL = avgPnL / dailyPnLs.length;
    const winRate = dailyPnLs.length > 0 ? (gainDays / dailyPnLs.length) * 100 : 0;
    const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? Infinity : 0;

    return {
      winRate,
      gainDays,
      lossDays,
      bestDay,
      worstDay,
      avgPnL,
      maxDrawdown,
      profitFactor,
      longestWinStreak,
      longestLossStreak,
    };
  }, [chartData]);

  if (!stats) {
    return null;
  }

  function formatDate(dateStr: string): string {
    const [, m, d] = dateStr.split("-");
    return `${parseInt(m)}/${parseInt(d)}`;
  }

  const statRows: { label: string; value: string; color?: string }[] = [
    {
      label: t("analysis.bestDay"),
      value: `${formatDate(stats.bestDay.date)}  +${fc(stats.bestDay.pnl)}`,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: t("analysis.worstDay"),
      value: `${formatDate(stats.worstDay.date)}  ${fc(stats.worstDay.pnl)}`,
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: t("analysis.avgDailyPnl"),
      value: `${stats.avgPnL >= 0 ? "+" : ""}${fc(stats.avgPnL)}`,
      color: stats.avgPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
    },
    {
      label: t("analysis.maxDrawdown"),
      value: `-${fc(stats.maxDrawdown)}`,
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: t("analysis.profitFactor"),
      value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2),
      color: stats.profitFactor >= 1 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="border-b bg-muted/30 py-3 px-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <Activity className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm">{t("analysis.tradingStats")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 py-4">
        {/* Win Rate */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">{t("analysis.winRate")}</span>
            <span className="text-xs text-muted-foreground">
              {stats.gainDays} {t("analysis.gain")} / {stats.lossDays} {t("analysis.loss")}
            </span>
          </div>
          <div className="text-2xl font-bold mb-2">{stats.winRate.toFixed(1)}%</div>
          <div className="flex h-2 rounded-full overflow-hidden bg-red-500/20 dark:bg-red-500/30">
            <div
              className="bg-green-500 rounded-full transition-all"
              style={{ width: `${stats.winRate}%` }}
            />
          </div>
        </div>

        {/* Stat rows */}
        <div className="space-y-3">
          {statRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className={`text-sm font-medium tabular-nums ${row.color ?? ""}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Streaks */}
        <div className="border-t mt-4 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("analysis.longestWinStreak")}</span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {stats.longestWinStreak} {t("analysis.days")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("analysis.longestLossStreak")}</span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              {stats.longestLossStreak} {t("analysis.days")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
