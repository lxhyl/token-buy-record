import { getTransactions, getLatestPrices } from "@/actions/transactions";
import { getDisplayCurrency } from "@/actions/settings";
import { getExchangeRates } from "@/lib/currency";
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
import { formatNumber, formatPercent, createCurrencyFormatter } from "@/lib/utils";
import { TrendingUp, TrendingDown, Receipt, Coins } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const [transactions, currentPrices, currency, rates] = await Promise.all([
    getTransactions(),
    getLatestPrices(),
    getDisplayCurrency(),
    getExchangeRates(),
  ]);

  const holdings = calculateHoldings(transactions, currentPrices, rates);
  const summary = calculatePortfolioSummary(holdings);
  const allocationData = calculateAllocationData(holdings);
  const tradeAnalysis = analyzeTradePatterns(transactions, rates);

  const sortedTransactions = [...transactions].sort(
    (a, b) =>
      new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );

  const portfolioHistory: { date: string; value: number }[] = [];
  let runningValue = 0;

  sortedTransactions.forEach((t) => {
    const amount = parseFloat(t.totalAmount);
    if (t.tradeType === "buy" || t.tradeType === "income") {
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

  const fc = createCurrencyFormatter(currency, rates);

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

      <StatsCards summary={summary} currency={currency} rates={rates} />

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <AllocationPieChart data={allocationData} currency={currency} rates={rates} />
        <PortfolioLineChart data={portfolioHistory} currency={currency} rates={rates} />
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
                          {fc(Math.abs(h.unrealizedPnL))}
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

      {/* Fee Analysis */}
      {(() => {
        const totalFees = tradeAnalysis.reduce((sum, a) => sum + a.totalFees, 0);
        const feeBySymbol = [...tradeAnalysis]
          .filter((a) => a.totalFees > 0)
          .sort((a, b) => b.totalFees - a.totalFees);
        const totalTraded = tradeAnalysis.reduce(
          (sum, a) => sum + a.buyVolumeUsd + a.sellVolumeUsd,
          0
        );
        const feePercent = totalTraded > 0 ? (totalFees / totalTraded) * 100 : 0;

        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Fee Analysis</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Total fees paid: <span className="font-semibold text-foreground">{fc(totalFees)}</span>
                    {totalTraded > 0 && (
                      <span className="ml-2">({formatPercent(feePercent)} of volume)</span>
                    )}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {feeBySymbol.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No fee data recorded
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead className="text-right">Trades</TableHead>
                        <TableHead className="text-right">Total Fees</TableHead>
                        <TableHead className="text-right">Avg Fee/Trade</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                        <TableHead className="text-right">Fee Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeBySymbol.map((a) => {
                        const tradeCount = a.totalBuys + a.totalSells;
                        const avgFee = tradeCount > 0 ? a.totalFees / tradeCount : 0;
                        const volume = a.buyVolumeUsd + a.sellVolumeUsd;
                        const rate = volume > 0 ? (a.totalFees / volume) * 100 : 0;
                        return (
                          <TableRow key={a.symbol}>
                            <TableCell className="font-medium">{a.symbol}</TableCell>
                            <TableCell className="text-right">{tradeCount}</TableCell>
                            <TableCell className="text-right text-orange-600 font-medium">
                              {fc(a.totalFees)}
                            </TableCell>
                            <TableCell className="text-right">
                              {fc(avgFee)}
                            </TableCell>
                            <TableCell className="text-right">
                              {fc(volume)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercent(rate)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total row */}
                      <TableRow className="border-t-2 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                          {tradeAnalysis.reduce((s, a) => s + a.totalBuys + a.totalSells, 0)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {fc(totalFees)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fc(
                            tradeAnalysis.reduce((s, a) => s + a.totalBuys + a.totalSells, 0) > 0
                              ? totalFees / tradeAnalysis.reduce((s, a) => s + a.totalBuys + a.totalSells, 0)
                              : 0
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {fc(totalTraded)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(feePercent)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Income Summary */}
      {(() => {
        const totalIncome = tradeAnalysis.reduce((sum, a) => sum + a.totalIncomeUsd, 0);
        if (totalIncome <= 0) return null;
        const incomeBySymbol = [...tradeAnalysis]
          .filter((a) => a.totalIncomeUsd > 0)
          .sort((a, b) => b.totalIncomeUsd - a.totalIncomeUsd);
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-white">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Income Summary</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Total income: <span className="font-semibold text-amber-600">{fc(totalIncome)}</span>
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeBySymbol.map((a) => (
                      <TableRow key={a.symbol}>
                        <TableCell className="font-medium">{a.symbol}</TableCell>
                        <TableCell className="text-right">{a.totalIncomes}</TableCell>
                        <TableCell className="text-right text-amber-600 font-medium">
                          {fc(a.totalIncomeUsd)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent((a.totalIncomeUsd / totalIncome) * 100)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Avg Buy</TableHead>
                  <TableHead className="text-right">Avg Sell</TableHead>
                  <TableHead className="text-right">Buy Vol</TableHead>
                  <TableHead className="text-right">Buy {currency}</TableHead>
                  <TableHead className="text-right">Sell Vol</TableHead>
                  <TableHead className="text-right">Sell {currency}</TableHead>
                  <TableHead className="text-right">Income {currency}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradeAnalysis.map((a) => (
                  <TableRow key={a.symbol}>
                    <TableCell className="font-medium">{a.symbol}</TableCell>
                    <TableCell className="text-right">{a.totalBuys}</TableCell>
                    <TableCell className="text-right">{a.totalSells}</TableCell>
                    <TableCell className="text-right">{a.totalIncomes > 0 ? a.totalIncomes : "-"}</TableCell>
                    <TableCell className="text-right">
                      {fc(a.avgBuyPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.avgSellPrice > 0 ? fc(a.avgSellPrice) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(a.buyVolume, 4)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fc(a.buyVolumeUsd)}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.sellVolume > 0 ? formatNumber(a.sellVolume, 4) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.sellVolumeUsd > 0 ? fc(a.sellVolumeUsd) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.totalIncomeUsd > 0 ? fc(a.totalIncomeUsd) : "-"}
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
