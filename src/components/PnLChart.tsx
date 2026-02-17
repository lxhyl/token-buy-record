"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCurrencyFormatter } from "@/lib/utils";
import {
  SupportedCurrency,
  ExchangeRates,
  convertAmount,
} from "@/lib/currency";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { usePnLColors } from "@/components/ColorSchemeProvider";
import { lttb } from "@/lib/chart-utils";

type TimeRange = "7d" | "1m" | "all";

interface DataPoint {
  date: string;
  pnl: number;
}

interface PnLChartProps {
  data: DataPoint[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function PnLChart({ data, currency, rates }: PnLChartProps) {
  const [range, setRange] = useState<TimeRange>("all");
  const fc = createCurrencyFormatter(currency, rates);
  const { t } = useI18n();
  const c = usePnLColors();

  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    let filtered = data;
    if (range !== "all") {
      const now = new Date();
      const cutoff = new Date(now);
      if (range === "7d") cutoff.setUTCDate(cutoff.getUTCDate() - 7);
      else if (range === "1m") cutoff.setUTCDate(cutoff.getUTCDate() - 30);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      filtered = data.filter((d) => d.date >= cutoffStr);
    }

    if (range === "all" && filtered.length > 80) {
      return lttb(filtered, 80, (d) => d.pnl);
    }
    return filtered;
  }, [data, range]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <CardTitle>{t("analysis.pnlOverTime")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t("common.noData")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastPnL = chartData.length > 0 ? chartData[chartData.length - 1].pnl : 0;
  const isPositive = lastPnL >= 0;

  const ranges: { key: TimeRange; label: string }[] = [
    { key: "7d", label: t("analysis.range7D") },
    { key: "1m", label: t("analysis.range1M") },
    { key: "all", label: t("analysis.rangeAll") },
  ];

  const formatDateLabel = (value: string) => {
    const d = new Date(value + "T00:00:00Z");
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pnl = payload[0].value as number;
      const positive = pnl >= 0;
      return (
        <div className="bg-popover text-popover-foreground rounded-xl shadow-lg border p-3">
          <p className="text-sm text-muted-foreground">{formatDateLabel(label)}</p>
          <div className="flex items-center gap-2 mt-1">
            {positive ? (
              <TrendingUp className={`h-4 w-4 ${c.gainTooltipIcon}`} />
            ) : (
              <TrendingDown className={`h-4 w-4 ${c.lossTooltipIcon}`} />
            )}
            <p
              className={`text-lg font-semibold ${
                positive ? c.gainText : c.lossText
              }`}
            >
              {positive ? "+" : ""}
              {fc(pnl)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${
                isPositive ? c.gainHeaderGradient : c.lossHeaderGradient
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>
            <div>
              <CardTitle>{t("analysis.pnlOverTime")}</CardTitle>
              <p
                className={`text-sm font-semibold mt-0.5 ${
                  isPositive ? c.gainText : c.lossText
                }`}
              >
                {isPositive ? "+" : ""}
                {fc(lastPnL)}
              </p>
            </div>
          </div>
          <div className="flex rounded-lg bg-muted p-0.5">
            {ranges.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  range === r.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorPnLPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c.gainHex} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c.gainHex} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPnLNeg" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="5%" stopColor={c.lossHex} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c.lossHex} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                className="[&_text]:fill-gray-500 dark:[&_text]:fill-gray-400"
                dy={10}
                interval="preserveStartEnd"
                minTickGap={40}
                tickFormatter={(value: string) => {
                  const d = new Date(value + "T00:00:00Z");
                  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="[&_text]:fill-gray-500 dark:[&_text]:fill-gray-400"
                tickFormatter={(value) => {
                  const converted = convertAmount(value, currency, rates);
                  if (Math.abs(converted) >= 1_000_000) {
                    return `${(converted / 1_000_000).toFixed(1)}M`;
                  }
                  if (Math.abs(converted) >= 1_000) {
                    return `${(converted / 1_000).toFixed(0)}k`;
                  }
                  return `${converted.toFixed(0)}`;
                }}
                dx={-10}
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={isPositive ? c.gainHex : c.lossHex}
                strokeWidth={2}
                fill={isPositive ? "url(#colorPnLPos)" : "url(#colorPnLNeg)"}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
