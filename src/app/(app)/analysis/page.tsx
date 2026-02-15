import { getTransactions, getLatestPrices } from "@/actions/transactions";
import { getDisplayCurrency } from "@/actions/settings";
import { getExchangeRates } from "@/lib/currency";
import {
  calculateHoldings,
  calculateFixedIncomeHoldings,
  calculatePortfolioSummary,
  calculateAllocationData,
  analyzeTradePatterns,
} from "@/lib/calculations";
import { StatsCards } from "@/components/StatsCards";
import { AllocationPieChart } from "@/components/PieChart";
import { HistoricalValueChart } from "@/components/HistoricalValueChart";
import { PnLChart } from "@/components/PnLChart";
import { PnLHeatmap } from "@/components/PnLHeatmap";
import { getHistoricalPortfolioData, getDailyPnLForMonth } from "@/actions/historical-prices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TradePatternCard } from "@/components/TradePatternCard";
import { formatPercent, createCurrencyFormatter } from "@/lib/utils";
import { TrendingUp, TrendingDown, Receipt, Coins } from "lucide-react";
import { getDisplayLanguage } from "@/actions/settings";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const nowUTC = new Date();
  const currentYear = nowUTC.getUTCFullYear();
  const currentMonth = nowUTC.getUTCMonth() + 1;

  const [transactions, currentPrices, currency, rates, locale, historicalData, heatmapData] = await Promise.all([
    getTransactions(),
    getLatestPrices(),
    getDisplayCurrency(),
    getExchangeRates(),
    getDisplayLanguage(),
    getHistoricalPortfolioData(),
    getDailyPnLForMonth(currentYear, currentMonth),
  ]);

  const holdings = calculateHoldings(transactions, currentPrices, rates);
  const fixedIncomeHoldings = calculateFixedIncomeHoldings(transactions, rates);
  const summary = calculatePortfolioSummary(holdings, fixedIncomeHoldings);
  const allocationData = calculateAllocationData(holdings, fixedIncomeHoldings);
  const tradeAnalysis = analyzeTradePatterns(transactions, rates);

  const fc = createCurrencyFormatter(currency, rates);

  // Filter out fixed-income from P&L rankings (no unrealized P&L)
  const marketHoldings = holdings.filter(
    (h) => h.assetType !== "deposit" && h.assetType !== "bond"
  );
  const sortedByPnL = [...marketHoldings].sort(
    (a, b) => b.unrealizedPnL - a.unrealizedPnL
  );
  const sortedByPnLPercent = [...marketHoldings].sort(
    (a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent
  );

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t(locale, "analysis.title")}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t(locale, "analysis.subtitle")}
        </p>
      </div>

      <StatsCards summary={summary} currency={currency} rates={rates} />

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <AllocationPieChart data={allocationData} currency={currency} rates={rates} />
        <HistoricalValueChart data={historicalData.chartData} currency={currency} rates={rates} />
      </div>

      <PnLChart
        data={historicalData.chartData.map((d) => ({
          date: d.date,
          pnl: Math.round((d.value - d.invested) * 100) / 100,
        }))}
        currency={currency}
        rates={rates}
      />

      <PnLHeatmap
        initialData={heatmapData}
        initialYear={currentYear}
        initialMonth={currentMonth}
        currency={currency}
        rates={rates}
      />

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">{t(locale, "analysis.pnlByAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedByPnL.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {t(locale, "analysis.noHoldings")}
              </p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, "analysis.rank")}</TableHead>
                    <TableHead>{t(locale, "analysis.symbol")}</TableHead>
                    <TableHead className="text-right">{t(locale, "analysis.pnl")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedByPnL.slice(0, 10).map((h, index) => (
                    <TableRow key={h.symbol}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{h.symbol}</TableCell>
                      <TableCell
                        className={`text-right ${
                          h.unrealizedPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
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
            <CardTitle className="text-base md:text-lg">{t(locale, "analysis.pnlByPercent")}</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedByPnLPercent.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {t(locale, "analysis.noHoldings")}
              </p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, "analysis.rank")}</TableHead>
                    <TableHead>{t(locale, "analysis.symbol")}</TableHead>
                    <TableHead className="text-right">{t(locale, "analysis.pnlPercent")}</TableHead>
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

      {/* Fee Analysis — market assets only (fixed-income has zero fees) */}
      {(() => {
        const marketAnalysis = tradeAnalysis.filter(
          (a) => a.assetType !== "deposit" && a.assetType !== "bond"
        );
        const totalFees = marketAnalysis.reduce((sum, a) => sum + a.totalFees, 0);
        const feeBySymbol = [...marketAnalysis]
          .filter((a) => a.totalFees > 0)
          .sort((a, b) => b.totalFees - a.totalFees);
        const totalTraded = marketAnalysis.reduce(
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
                  <CardTitle className="text-base md:text-lg">{t(locale, "analysis.feeAnalysis")}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t(locale, "analysis.totalFeesPaid")} <span className="font-semibold text-foreground">{fc(totalFees)}</span>
                    {totalTraded > 0 && (
                      <span className="ml-2">({formatPercent(feePercent)} {t(locale, "analysis.ofVolume")})</span>
                    )}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {feeBySymbol.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {t(locale, "analysis.noFeeData")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t(locale, "analysis.symbol")}</TableHead>
                        <TableHead className="text-right">{t(locale, "analysis.trades")}</TableHead>
                        <TableHead className="text-right">{t(locale, "analysis.totalFees")}</TableHead>
                        <TableHead className="text-right">{t(locale, "analysis.avgFee")}</TableHead>
                        <TableHead className="text-right">{t(locale, "analysis.volume")}</TableHead>
                        <TableHead className="text-right">{t(locale, "analysis.feeRate")}</TableHead>
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
                            <TableCell className="text-right text-orange-600 dark:text-orange-400 font-medium">
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
                        <TableCell>{t(locale, "common.total")}</TableCell>
                        <TableCell className="text-right">
                          {marketAnalysis.reduce((s, a) => s + a.totalBuys + a.totalSells, 0)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600 dark:text-orange-400">
                          {fc(totalFees)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fc(
                            marketAnalysis.reduce((s, a) => s + a.totalBuys + a.totalSells, 0) > 0
                              ? totalFees / marketAnalysis.reduce((s, a) => s + a.totalBuys + a.totalSells, 0)
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
                  <CardTitle className="text-base md:text-lg">{t(locale, "analysis.incomeSummary")}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t(locale, "analysis.totalIncome")} <span className="font-semibold text-amber-600 dark:text-amber-400">{fc(totalIncome)}</span>
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t(locale, "analysis.incomeAsset")}</TableHead>
                      <TableHead className="text-right">{t(locale, "analysis.incomeEntries")}</TableHead>
                      <TableHead className="text-right">{t(locale, "analysis.incomeAmount")}</TableHead>
                      <TableHead className="text-right">{t(locale, "analysis.incomePercent")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeBySymbol.map((a) => (
                      <TableRow key={a.symbol}>
                        <TableCell className="font-medium">{a.symbol}</TableCell>
                        <TableCell className="text-right">{a.totalIncomes}</TableCell>
                        <TableCell className="text-right text-amber-600 dark:text-amber-400 font-medium">
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

      <TradePatternCard tradeAnalysis={tradeAnalysis} currency={currency} rates={rates} />

    </div>
  );
}
