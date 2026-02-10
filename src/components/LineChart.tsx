"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

interface DataPoint {
  date: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  title?: string;
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function PortfolioLineChart({
  data,
  title = "Portfolio Value Over Time",
  currency,
  rates,
}: LineChartProps) {
  const fc = createCurrencyFormatter(currency, rates);
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground rounded-xl shadow-lg border p-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-foreground mt-1">
            {fc(payload[0].value)}
          </p>
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
          <CardTitle>{title}</CardTitle>
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
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="[&_line]:stroke-gray-200 dark:[&_line]:stroke-gray-700"
                stroke="currentColor"
                vertical={false}
              />
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
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
