"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createCurrencyFormatter } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates, convertAmount } from "@/lib/currency";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { usePnLColors } from "@/components/ColorSchemeProvider";
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

const DAY_HEADERS_EN = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_HEADERS_ZH = ["日", "一", "二", "三", "四", "五", "六"];

function formatPnL(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";
  if (abs >= 10000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  if (abs >= 100) return `${sign}${abs.toFixed(1)}`;
  return `${sign}${abs.toFixed(2)}`;
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
  const fc = createCurrencyFormatter(currency, rates);
  const { t, locale } = useI18n();
  const c = usePnLColors();

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

  // Sunday-first calendar (matching Binance)
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Sun
  const startOffset = firstDayOfMonth; // Sunday = 0 offset
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const pnlMap = new Map<number, number>();
  for (const d of data) {
    const day = parseInt(d.date.slice(8, 10), 10);
    pnlMap.set(day, convertAmount(d.pnl, currency, rates));
  }

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const monthTotal = data.reduce((sum, d) => sum + d.pnl, 0);
  const gainDays = data.filter((d) => d.pnl > 0).length;
  const lossDays = data.filter((d) => d.pnl < 0).length;

  return (
    <Card className="w-full">
      <CardHeader className="border-b bg-muted/30 py-3 px-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
            <CalendarDays className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm">{t("analysis.dailyPnlCalendar")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 py-4">
        <div className={`transition-opacity duration-200 ${isPending ? "opacity-50" : ""}`}>
          {/* Monthly summary */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground">
              {t("analysis.monthPnl")}
              <span className="ml-1.5">
                {gainDays} {t("analysis.gain")} / {lossDays} {t("analysis.loss")}
              </span>
            </p>
            <p
              className={`text-2xl font-bold font-num mt-0.5 ${
                monthTotal >= 0 ? c.gainText : c.lossText
              }`}
            >
              {monthTotal >= 0 ? "+" : ""}{fc(monthTotal)}
            </p>

          </div>

          {/* Month selector */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)} disabled={isPending}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium font-num">
              {year}-{String(month).padStart(2, "0")}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)} disabled={isPending || isCurrentOrFuture}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-1">
            {dayHeaders.map((d, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - startOffset + 1;
              const isValidDay = dayNum >= 1 && dayNum <= daysInMonth;

              if (!isValidDay) {
                return <div key={i} />;
              }

              const pnl = pnlMap.get(dayNum);
              const hasData = pnl !== undefined;

              // Cell background
              let bgClass = "";
              if (hasData) {
                if (pnl > 0) bgClass = c.gainCellBg;
                else if (pnl < 0) bgClass = c.lossCellBg;
              }

              return (
                <div
                  key={i}
                  className={`rounded-lg py-1.5 px-1 flex flex-col items-center justify-center ${bgClass}`}
                >
                  <span className="text-sm font-medium font-num leading-tight">{dayNum}</span>
                  {hasData && pnl !== 0 && (
                    <span
                      className={`text-[10px] sm:text-[11px] font-medium font-num leading-tight mt-0.5 ${
                        pnl > 0 ? c.gainText : c.lossText
                      }`}
                    >
                      {formatPnL(pnl)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
