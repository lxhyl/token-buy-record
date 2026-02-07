import { getTransactions, getLatestPrices } from "@/actions/transactions";
import {
  calculateHoldings,
  calculatePortfolioSummary,
  calculateAllocationData,
  analyzeTradePatterns,
} from "@/lib/calculations";
import { StatsCards } from "@/components/StatsCards";
import { AllocationPieChart } from "@/components/PieChart";
import { PortfolioLineChart } from "@/components/LineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const transactions = await getTransactions();
  const currentPrices = await getLatestPrices();

  const holdings = calculateHoldings(transactions, currentPrices);
  const summary = calculatePortfolioSummary(holdings);
  const allocationData = calculateAllocationData(holdings);
  const tradeAnalysis = analyzeTradePatterns(transactions);

  const sortedTransactions = [...transactions].sort(
    (a, b) =>
      new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );

  const portfolioHistory: { date: string; value: number }[] = [];
  let runningValue = 0;

  sortedTransactions.forEach((t) => {
    const amount = parseFloat(t.totalAmount);
    if (t.tradeType === "buy") {
      runningValue += amount;
    } else {
      runningValue -= amount * 0.5;
    }

    const dateStr = new Date(t.tradeDate).toLocaleDateString();
    const existing = portfolioHistory.find((h) => h.date === dateStr);
    if (existing) {
      existing.value = runningValue;
    } else {
      portfolioHistory.push({ date: dateStr, value: runningValue });
    }
  });

  const sortedByPnL = [...holdings].sort(
    (a, b) => b.unrealizedPnL - a.unrealizedPnL
  );
  const sortedByPnLPercent = [...holdings].sort(
    (a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent
  );

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Analysis</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Detailed portfolio analysis and insights
        </p>
      </div>

      <StatsCards summary={summary} />

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <AllocationPieChart data={allocationData} />
        <PortfolioLineChart data={portfolioHistory} />
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">P&L Ranking (by Amount)</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedByPnL.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No holdings to analyze
              </p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedByPnL.slice(0, 10).map((h, index) => (
                    <TableRow key={h.symbol}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{h.symbol}</TableCell>
                      <TableCell
                        className={`text-right ${
                          h.unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {h.unrealizedPnL >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {formatCurrency(Math.abs(h.unrealizedPnL))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">P&L Ranking (by Percentage)</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedByPnLPercent.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No holdings to analyze
              </p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">P&L %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedByPnLPercent.slice(0, 10).map((h, index) => (
                    <TableRow key={h.symbol}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{h.symbol}</TableCell>
                      <TableCell
                        className={`text-right ${
                          h.unrealizedPnLPercent >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {h.unrealizedPnLPercent >= 0 ? "+" : ""}
                        {formatPercent(h.unrealizedPnLPercent)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Trade Pattern Analysis</CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {tradeAnalysis.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No trades to analyze
            </p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Buy Trades</TableHead>
                  <TableHead className="text-right">Sell Trades</TableHead>
                  <TableHead className="text-right">Avg Buy</TableHead>
                  <TableHead className="text-right">Avg Sell</TableHead>
                  <TableHead className="text-right">Buy Vol</TableHead>
                  <TableHead className="text-right">Sell Vol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradeAnalysis.map((a) => (
                  <TableRow key={a.symbol}>
                    <TableCell className="font-medium">{a.symbol}</TableCell>
                    <TableCell className="text-right">{a.totalBuys}</TableCell>
                    <TableCell className="text-right">{a.totalSells}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(a.avgBuyPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.avgSellPrice > 0 ? formatCurrency(a.avgSellPrice) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(a.buyVolume, 4)}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.sellVolume > 0 ? formatNumber(a.sellVolume, 4) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
