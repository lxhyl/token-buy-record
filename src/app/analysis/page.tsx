import { getTransactions, getCurrentPrices } from "@/actions/transactions";
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
  const [transactions, currentPrices] = await Promise.all([
    getTransactions(),
    getCurrentPrices(),
  ]);

  const holdings = calculateHoldings(transactions, currentPrices);
  const summary = calculatePortfolioSummary(holdings);
  const allocationData = calculateAllocationData(holdings);
  const tradeAnalysis = analyzeTradePatterns(transactions);

  // Calculate portfolio value history (simplified - based on transaction dates)
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
      runningValue -= amount * 0.5; // Simplified - show net effect
    }

    const dateStr = new Date(t.tradeDate).toLocaleDateString();
    const existing = portfolioHistory.find((h) => h.date === dateStr);
    if (existing) {
      existing.value = runningValue;
    } else {
      portfolioHistory.push({ date: dateStr, value: runningValue });
    }
  });

  // Sort holdings by P&L for ranking
  const sortedByPnL = [...holdings].sort(
    (a, b) => b.unrealizedPnL - a.unrealizedPnL
  );
  const sortedByPnLPercent = [...holdings].sort(
    (a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analysis</h1>
        <p className="text-muted-foreground">
          Detailed portfolio analysis and insights
        </p>
      </div>

      <StatsCards summary={summary} />

      <div className="grid gap-8 lg:grid-cols-2">
        <AllocationPieChart data={allocationData} />
        <PortfolioLineChart data={portfolioHistory} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>P&L Ranking (by Amount)</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedByPnL.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No holdings to analyze
              </p>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>P&L Ranking (by Percentage)</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedByPnLPercent.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No holdings to analyze
              </p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade Pattern Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {tradeAnalysis.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No trades to analyze
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Buy Trades</TableHead>
                  <TableHead className="text-right">Sell Trades</TableHead>
                  <TableHead className="text-right">Avg Buy Price</TableHead>
                  <TableHead className="text-right">Avg Sell Price</TableHead>
                  <TableHead className="text-right">Buy Volume</TableHead>
                  <TableHead className="text-right">Sell Volume</TableHead>
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Annualized Returns</CardTitle>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No holdings to analyze
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">First Buy</TableHead>
                  <TableHead className="text-right">Days Held</TableHead>
                  <TableHead className="text-right">Total Return</TableHead>
                  <TableHead className="text-right">Annualized Return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => {
                  const daysHeld = Math.floor(
                    (new Date().getTime() - h.firstBuyDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return (
                    <TableRow key={h.symbol}>
                      <TableCell className="font-medium">{h.symbol}</TableCell>
                      <TableCell className="text-right">
                        {h.firstBuyDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">{daysHeld}</TableCell>
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
                      <TableCell
                        className={`text-right ${
                          h.annualizedReturn >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {h.annualizedReturn >= 0 ? "+" : ""}
                        {formatPercent(h.annualizedReturn)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
