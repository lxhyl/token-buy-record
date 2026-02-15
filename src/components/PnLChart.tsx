"use client";

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
  const fc = createCurrencyFormatter(currency, rates);
  const { t } = useI18n();

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

  const lastPnL = data[data.length - 1]?.pnl ?? 0;
  const isPositive = lastPnL >= 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pnl = payload[0].value as number;
      const positive = pnl >= 0;
      return (
        <div className="bg-popover text-popover-foreground rounded-xl shadow-lg border p-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="flex items-center gap-2 mt-1">
            {positive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <p
              className={`text-lg font-semibold ${
                positive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
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
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${
              isPositive
                ? "bg-gradient-to-br from-green-500 to-emerald-500"
                : "bg-gradient-to-br from-red-500 to-rose-500"
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
                isPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {fc(lastPnL)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorPnLPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPnLNeg" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="[&_text]:fill-gray-500 dark:[&_text]:fill-gray-400"
                dy={10}
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
                stroke={isPositive ? "#22c55e" : "#ef4444"}
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
