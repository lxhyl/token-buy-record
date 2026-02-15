"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCurrencyFormatter } from "@/lib/utils";
import {
  SupportedCurrency,
  ExchangeRates,
  convertAmount,
} from "@/lib/currency";
import { TrendingUp } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

interface DataPoint {
  date: string;
  invested: number;
  value: number;
}

interface HistoricalValueChartProps {
  data: DataPoint[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function HistoricalValueChart({
  data,
  currency,
  rates,
}: HistoricalValueChartProps) {
  const fc = createCurrencyFormatter(currency, rates);
  const { t } = useI18n();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <CardTitle>{t("analysis.historicalValue")}</CardTitle>
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length >= 2) {
      const invested = payload.find((p: any) => p.dataKey === "invested")?.value ?? 0;
      const value = payload.find((p: any) => p.dataKey === "value")?.value ?? 0;
      const gainLoss = value - invested;
      const gainLossPercent = invested !== 0 ? (gainLoss / invested) * 100 : 0;
      const isPositive = gainLoss >= 0;

      return (
        <div className="bg-popover text-popover-foreground rounded-xl shadow-lg border p-3 min-w-[180px]">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-blue-500 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                {t("analysis.invested")}
              </span>
              <span className="text-sm font-medium">{fc(invested)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-emerald-500 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                {t("analysis.marketValue")}
              </span>
              <span className="text-sm font-medium">{fc(value)}</span>
            </div>
            <div className="border-t pt-1 mt-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  {t("analysis.gainLoss")}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {fc(gainLoss)} ({isPositive ? "+" : ""}
                  {gainLossPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <TrendingUp className="h-5 w-5" />
          </div>
          <CardTitle>{t("analysis.historicalValue")}</CardTitle>
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
                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value: string) => {
                  if (value === "invested") return t("analysis.invested");
                  if (value === "value") return t("analysis.marketValue");
                  return value;
                }}
                iconType="circle"
                wrapperStyle={{ fontSize: "13px" }}
              />
              <Area
                type="monotone"
                dataKey="invested"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorInvested)"
                name="invested"
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorValue)"
                name="value"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
