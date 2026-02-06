import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortfolioSummary } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react";

interface StatsCardsProps {
  summary: PortfolioSummary;
}

export function StatsCards({ summary }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalInvested)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalCurrentValue)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
          {summary.totalUnrealizedPnL >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              summary.totalUnrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {summary.totalUnrealizedPnL >= 0 ? "+" : ""}
            {formatCurrency(summary.totalUnrealizedPnL)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.totalPnLPercent >= 0 ? "+" : ""}
            {formatPercent(summary.totalPnLPercent)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Realized P&L</CardTitle>
          {summary.totalRealizedPnL >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              summary.totalRealizedPnL >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {summary.totalRealizedPnL >= 0 ? "+" : ""}
            {formatCurrency(summary.totalRealizedPnL)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
