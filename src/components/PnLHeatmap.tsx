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
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_NAMES_ZH = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];
const DAY_HEADERS_EN = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_HEADERS_ZH = ["一", "二", "三", "四", "五", "六", "日"];

function getPnLColor(pnl: number, maxAbs: number): string {
  if (maxAbs === 0) return "bg-muted";
  const ratio = Math.abs(pnl) / maxAbs;

  if (pnl > 0) {
    if (ratio > 0.6) return "bg-green-600 dark:bg-green-500";
    if (ratio > 0.3) return "bg-green-400 dark:bg-green-600";
    return "bg-green-200 dark:bg-green-900";
  } else if (pnl < 0) {
    if (ratio > 0.6) return "bg-red-600 dark:bg-red-500";
    if (ratio > 0.3) return "bg-red-400 dark:bg-red-600";
    return "bg-red-200 dark:bg-red-900";
  }
  return "bg-muted";
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
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newYear > currentUTCYear || (newYear === currentUTCYear && newMonth > currentUTCMonth)) return;

    setYear(newYear);
    setMonth(newMonth);
    startTransition(async () => {
      const result = await getDailyPnLForMonth(newYear, newMonth);
      setData(result);
    });
  }

  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const pnlMap = new Map<number, number>();
  for (const d of data) {
    const day = parseInt(d.date.slice(8, 10), 10);
    pnlMap.set(day, d.pnl);
  }

  const absValues = data.map((d) => Math.abs(d.pnl)).filter((v) => v > 0);
  const maxAbs = absValues.length > 0 ? Math.max(...absValues) : 0;

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const monthTotal = data.reduce((sum, d) => sum + d.pnl, 0);
  const gainDays = data.filter((d) => d.pnl > 0).length;
  const lossDays = data.filter((d) => d.pnl < 0).length;

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30 py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 text-white">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">{t("analysis.dailyPnlCalendar")}</CardTitle>
              <p className="text-xs mt-0.5">
                <span
                  className={`font-semibold ${
                    monthTotal >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {monthTotal >= 0 ? "+" : ""}{fc(monthTotal)}
                </span>
                <span className="text-muted-foreground ml-1.5">
                  {gainDays}↑ {lossDays}↓
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)} disabled={isPending}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium min-w-[64px] text-center">
              {monthNames[month - 1]} {year}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)} disabled={isPending || isCurrentOrFuture}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-3">
        <div className={`transition-opacity duration-200 ${isPending ? "opacity-50" : ""}`}>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-[3px] mb-[3px]">
            {dayHeaders.map((d, i) => (
              <div key={i} className="text-center text-[10px] text-muted-foreground leading-none py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Compact calendar grid */}
          <div className="grid grid-cols-7 gap-[3px]">
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - startOffset + 1;
              const isValidDay = dayNum >= 1 && dayNum <= daysInMonth;

              if (!isValidDay) {
                return <div key={i} className="h-5 sm:h-6" />;
              }

              const pnl = pnlMap.get(dayNum);
              const hasData = pnl !== undefined;
              const colorClass = hasData ? getPnLColor(pnl, maxAbs) : "bg-muted/40";

              return (
                <div
                  key={i}
                  className={`h-5 sm:h-6 rounded-[3px] cursor-default transition-all hover:ring-2 hover:ring-foreground/20 hover:scale-110 ${colorClass}`}
                  onMouseEnter={() =>
                    hasData
                      ? setHoveredDay({
                          date: `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`,
                          pnl,
                        })
                      : setHoveredDay(null)
                  }
                  onMouseLeave={() => setHoveredDay(null)}
                />
              );
            })}
          </div>

          {/* Hover detail + legend row */}
          <div className="flex items-center justify-between mt-2">
            <div className="h-4">
              {hoveredDay && (
                <p className="text-xs">
                  <span className="text-muted-foreground">{hoveredDay.date}</span>
                  <span
                    className={`font-semibold ml-1.5 ${
                      hoveredDay.pnl >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {hoveredDay.pnl >= 0 ? "+" : ""}{fc(hoveredDay.pnl)}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <span>−</span>
              <div className="flex gap-[2px] mx-0.5">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-red-600 dark:bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-red-400 dark:bg-red-600" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-red-200 dark:bg-red-900" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-muted" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-green-200 dark:bg-green-900" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-green-400 dark:bg-green-600" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-green-600 dark:bg-green-500" />
              </div>
              <span>+</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
