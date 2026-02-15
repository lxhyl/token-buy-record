"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createCurrencyFormatter } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { getDailyPnLForMonth } from "@/actions/historical-prices";

interface DayData {
  date: string;
  pnl: number;
}

interface PnLHeatmapProps {
  initialData: DayData[];
  initialYear: number;
  initialMonth: number;
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_NAMES_ZH = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
];
const DAY_HEADERS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_HEADERS_ZH = ["一", "二", "三", "四", "五", "六", "日"];

function getPnLColor(pnl: number, maxAbs: number): string {
  if (maxAbs === 0) return "bg-muted";
  const ratio = Math.abs(pnl) / maxAbs;

  if (pnl > 0) {
    if (ratio > 0.6) return "bg-green-600 dark:bg-green-500 text-white";
    if (ratio > 0.3) return "bg-green-400 dark:bg-green-600 text-white";
    return "bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200";
  } else if (pnl < 0) {
    if (ratio > 0.6) return "bg-red-600 dark:bg-red-500 text-white";
    if (ratio > 0.3) return "bg-red-400 dark:bg-red-600 text-white";
    return "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200";
  }
  return "bg-muted text-muted-foreground";
}

export function PnLHeatmap({
  initialData,
  initialYear,
  initialMonth,
  currency,
  rates,
}: PnLHeatmapProps) {
  const [data, setData] = useState<DayData[]>(initialData);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [isPending, startTransition] = useTransition();
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const fc = createCurrencyFormatter(currency, rates);
  const { t, locale } = useI18n();

  const monthNames = locale === "zh" ? MONTH_NAMES_ZH : MONTH_NAMES_EN;
  const dayHeaders = locale === "zh" ? DAY_HEADERS_ZH : DAY_HEADERS_EN;

  const nowUTC = new Date();
  const currentUTCYear = nowUTC.getUTCFullYear();
  const currentUTCMonth = nowUTC.getUTCMonth() + 1;
  const isCurrentOrFuture =
    year > currentUTCYear || (year === currentUTCYear && month >= currentUTCMonth);

  function navigateMonth(direction: -1 | 1) {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }

    // Don't navigate past current month
    if (
      newYear > currentUTCYear ||
      (newYear === currentUTCYear && newMonth > currentUTCMonth)
    ) {
      return;
    }

    setYear(newYear);
    setMonth(newMonth);

    startTransition(async () => {
      const result = await getDailyPnLForMonth(newYear, newMonth);
      setData(result);
    });
  }

  // Build calendar grid
  // First day of month: 0=Sun, 1=Mon, ... 6=Sat
  // We want Monday as first column: Mon=0, Tue=1, ... Sun=6
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  // Convert to Monday-based: Mon=0, Tue=1, ... Sun=6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Create date->pnl map
  const pnlMap = new Map<number, number>();
  for (const d of data) {
    const day = parseInt(d.date.slice(8, 10), 10);
    pnlMap.set(day, d.pnl);
  }

  // Calculate max absolute P&L for color scaling
  const absValues = data.map((d) => Math.abs(d.pnl)).filter((v) => v > 0);
  const maxAbs = absValues.length > 0 ? Math.max(...absValues) : 0;

  // Build grid: total cells = startOffset + daysInMonth, rounded up to full weeks
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  // Monthly totals
  const monthTotal = data.reduce((sum, d) => sum + d.pnl, 0);
  const gainDays = data.filter((d) => d.pnl > 0).length;
  const lossDays = data.filter((d) => d.pnl < 0).length;

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t("analysis.dailyPnlCalendar")}</CardTitle>
              <p
                className={`text-sm font-semibold mt-0.5 ${
                  monthTotal >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {monthTotal >= 0 ? "+" : ""}
                {fc(monthTotal)}
                <span className="text-muted-foreground font-normal ml-2">
                  {gainDays} {t("analysis.gain")} / {lossDays} {t("analysis.loss")}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateMonth(-1)}
              disabled={isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[month - 1]} {year}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateMonth(1)}
              disabled={isPending || isCurrentOrFuture}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div
          className={`transition-opacity duration-200 ${isPending ? "opacity-50" : ""}`}
        >
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayHeaders.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - startOffset + 1;
              const isValidDay = dayNum >= 1 && dayNum <= daysInMonth;

              if (!isValidDay) {
                return <div key={i} className="aspect-square" />;
              }

              const pnl = pnlMap.get(dayNum);
              const hasData = pnl !== undefined;
              const colorClass = hasData
                ? getPnLColor(pnl, maxAbs)
                : "bg-muted/50";

              return (
                <div
                  key={i}
                  className={`aspect-square rounded-md flex flex-col items-center justify-center relative cursor-default transition-transform hover:scale-105 ${colorClass}`}
                  onMouseEnter={() =>
                    hasData
                      ? setHoveredDay({
                          date: `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`,
                          pnl,
                        })
                      : setHoveredDay(null)
                  }
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <span className="text-xs font-medium">{dayNum}</span>
                  {hasData && pnl !== 0 && (
                    <span className="text-[9px] leading-tight font-medium hidden sm:block">
                      {pnl > 0 ? "+" : ""}
                      {Math.abs(pnl) >= 1000
                        ? `${(pnl / 1000).toFixed(1)}k`
                        : Math.abs(pnl) >= 1
                          ? pnl.toFixed(0)
                          : pnl.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tooltip */}
          {hoveredDay && (
            <div className="mt-3 text-center">
              <span className="text-sm text-muted-foreground">
                {hoveredDay.date}
              </span>
              <span
                className={`text-sm font-semibold ml-2 ${
                  hoveredDay.pnl >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {hoveredDay.pnl >= 0 ? "+" : ""}
                {fc(hoveredDay.pnl)}
              </span>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
            <span>{t("analysis.loss")}</span>
            <div className="flex gap-0.5 mx-1">
              <div className="w-3 h-3 rounded-sm bg-red-600 dark:bg-red-500" />
              <div className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-600" />
              <div className="w-3 h-3 rounded-sm bg-red-200 dark:bg-red-900" />
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
              <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600" />
              <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
            </div>
            <span>{t("analysis.gain")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
