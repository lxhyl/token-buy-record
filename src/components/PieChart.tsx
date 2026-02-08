"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCurrencyFormatter, formatPercent } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { PieChart as PieIcon } from "lucide-react";

interface AllocationData {
  name: string;
  value: number;
  percentage: number;
}

interface PieChartProps {
  data: AllocationData[];
  title?: string;
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#6366f1",
  "#14b8a6",
];

const GRADIENTS = [
  { start: "#3b82f6", end: "#1d4ed8" },
  { start: "#8b5cf6", end: "#6d28d9" },
  { start: "#ec4899", end: "#be185d" },
  { start: "#f59e0b", end: "#d97706" },
  { start: "#10b981", end: "#047857" },
];

export function AllocationPieChart({
  data,
  title = "Portfolio Allocation",
  currency,
  rates,
}: PieChartProps) {
  const fc = createCurrencyFormatter(currency, rates);
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <PieIcon className="h-5 w-5" />
            </div>
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <PieIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white rounded-xl shadow-lg border p-3 min-w-[150px]">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {fc(data.value)}
          </p>
          <p className="text-sm font-medium text-primary mt-0.5">
            {formatPercent(data.percentage)}
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <PieIcon className="h-5 w-5" />
          </div>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <defs>
                {GRADIENTS.map((gradient, index) => (
                  <linearGradient
                    key={index}
                    id={`gradient-${index}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={gradient.start} />
                    <stop offset="100%" stopColor={gradient.end} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#gradient-${index % GRADIENTS.length})`}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">
                {formatPercent(item.percentage)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
