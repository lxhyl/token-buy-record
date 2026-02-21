import { getTransactions, getLatestPrices } from "@/actions/transactions";
import { getDeposits } from "@/actions/deposits";
import { getDisplayCurrency } from "@/actions/settings";
import { getExchangeRates } from "@/lib/exchange-rates";
import {
  calculateHoldings,
  calculateDepositHoldings,
  calculatePortfolioSummary,
  calculateAllocationData,
  analyzeTradePatterns,
} from "@/lib/calculations";
import { StatsCards } from "@/components/StatsCards";
import { AllocationPieChart } from "@/components/PieChart";
import { HistoricalValueChart } from "@/components/HistoricalValueChart";
import { PnLChart } from "@/components/PnLChart";
import { PnLHeatmap } from "@/components/PnLHeatmap";
import { TradingStats } from "@/components/TradingStats";
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
import { TrendingUp, TrendingDown, Receipt, PiggyBank } from "lucide-react";
import { getDisplayLanguage, getColorScheme } from "@/actions/settings";
import { t } from "@/lib/i18n";
import { AssetLogo } from "@/components/AssetLogo";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const nowUTC = new Date();
  const currentYear = nowUTC.getUTCFullYear();
  const currentMonth = nowUTC.getUTCMonth() + 1;

  const [transactions, currentPrices, deposits, currency, rates, locale, historicalData, heatmapData, colorScheme] = await Promise.all([
    getTransactions(),
    getLatestPrices(),
    getDeposits(),
    getDisplayCurrency(),
    getExchangeRates(),
    getDisplayLanguage(),
    getHistoricalPortfolioData(),
    getDailyPnLForMonth(currentYear, currentMonth),
    getColorScheme(),
  ]);

  const holdings = calculateHoldings(transactions, currentPrices, rates);
  const depositHoldings = calculateDepositHoldings(deposits, rates);
  const summary = calculatePortfolioSummary(holdings, depositHoldings);
  const allocationData = calculateAllocationData(holdings, depositHoldings);
  const tradeAnalysis = analyzeTradePatterns(transactions, rates);

  const fc = createCurrencyFormatter(currency, rates);
  const isCN = colorScheme === "cn";
  const gainTextClass = isCN ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400";
  const lossTextClass = isCN ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  const sortedByPnL = [...holdings].sort(
    (a, b) => b.unrealizedPnL - a.unrealizedPnL
  );
  const sortedByPnLPercent = [...holdings].sort(
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

      <PnLChart
        data={historicalData.chartData.map((d) => ({
          date: d.date,
          pnl: Math.round((d.value - d.invested) * 100) / 100,
        }))}
        currency={currency}
        rates={rates}
      />

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <HistoricalValueChart data={historicalData.chartData} currency={currency} rates={rates} />
        <AllocationPieChart data={allocationData} currency={currency} rates={rates} />
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <PnLHeatmap
          initialData={heatmapData}
          initialYear={currentYear}
          initialMonth={currentMonth}
          currency={currency}
          rates={rates}
        />
        <TradingStats chartData={historicalData.chartData} currency={currency} rates={rates} />
      </div>

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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AssetLogo symbol={h.symbol} assetType={h.assetType} className="h-6 w-6" />
                          <span className="font-medium">{h.symbol}</span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-right font-num ${
                          h.unrealizedPnL >= 0 ? gainTextClass : lossTextClass
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AssetLogo symbol={h.symbol} assetType={h.assetType} className="h-6 w-6" />
                          <span className="font-medium">{h.symbol}</span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-right font-num ${
                          h.unrealizedPnLPercent >= 0 ? gainTextClass : lossTextClass
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

      <TradePatternCard tradeAnalysis={tradeAnalysis} currency={currency} rates={rates} />

      {/* Deposit Analysis */}
      {depositHoldings.length > 0 && (() => {
        const totalPrincipal = depositHoldings.reduce((sum, d) => sum + d.remainingPrincipal, 0);
        const totalInterest = depositHoldings.reduce((sum, d) => sum + d.accruedInterest, 0);
        const weightedRate = totalPrincipal > 0
          ? depositHoldings.reduce((sum, d) => sum + d.interestRate * d.remainingPrincipal, 0) / totalPrincipal
          : 0;
        const now = new Date();

        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">{t(locale, "analysis.depositOverview")}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t(locale, "analysis.totalPrincipal")} <span className="font-semibold font-num text-green-600 dark:text-green-400">{fc(totalPrincipal)}</span>
                    <span className="mx-2">·</span>
                    {t(locale, "analysis.totalInterest")} <span className="font-semibold font-num text-amber-600 dark:text-amber-400">{fc(totalInterest)}</span>
                    <span className="mx-2">·</span>
                    {t(locale, "analysis.avgRate")} <span className="font-semibold font-num">{weightedRate.toFixed(2)}%</span>
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t(locale, "analysis.depositAsset")}</TableHead>
                      <TableHead className="text-right">{t(locale, "analysis.depositPrincipal")}</TableHead>
                      <TableHead className="text-right">{t(locale, "analysis.depositRate")}</TableHead>
                      <TableHead className="text-right">{t(locale, "analysis.depositInterest")}</TableHead>
                      <TableHead className="text-right">{t(locale, "analysis.depositDays")}</TableHead>
                      <TableHead className="text-right">{t(locale, "analysis.depositStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depositHoldings.map((d) => {
                      const days = Math.max(0, Math.floor((now.getTime() - d.startDate.getTime()) / (1000 * 60 * 60 * 24)));
                      const isMatured = d.maturityDate && d.maturityDate.getTime() < now.getTime();
                      const isMaturingSoon = d.maturityDate && !isMatured && (d.maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) < 30;
                      return (
                        <TableRow key={d.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                                <PiggyBank className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <span className="font-medium">{d.symbol}</span>
                                {d.name && <span className="text-xs text-muted-foreground ml-1.5">{d.name}</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-num font-semibold">{fc(d.remainingPrincipal)}</TableCell>
                          <TableCell className="text-right font-num">
                            {d.interestRate > 0 ? `${d.interestRate.toFixed(2)}%` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-num text-amber-600 dark:text-amber-400 font-medium">
                            {d.accruedInterest > 0 ? fc(d.accruedInterest) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-num">{days}</TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              isMatured
                                ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                : isMaturingSoon
                                ? "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300"
                                : "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                            }`}>
                              {isMatured
                                ? t(locale, "deposit.matured")
                                : isMaturingSoon
                                ? t(locale, "deposit.maturingSoon")
                                : t(locale, "deposit.active")}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Total row */}
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell>{t(locale, "common.total")}</TableCell>
                      <TableCell className="text-right font-num">{fc(totalPrincipal)}</TableCell>
                      <TableCell className="text-right font-num">{weightedRate.toFixed(2)}%</TableCell>
                      <TableCell className="text-right font-num text-amber-600 dark:text-amber-400">{fc(totalInterest)}</TableCell>
                      <TableCell className="text-right font-num">-</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
                  <CardTitle className="text-base md:text-lg">{t(locale, "analysis.feeAnalysis")}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t(locale, "analysis.totalFeesPaid")} <span className="font-semibold font-num text-foreground">{fc(totalFees)}</span>
                    {totalTraded > 0 && (
                      <span className="ml-2 font-num">({formatPercent(feePercent)} {t(locale, "analysis.ofVolume")})</span>
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
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <AssetLogo symbol={a.symbol} assetType={a.assetType} className="h-6 w-6" />
                                <span className="font-medium">{a.symbol}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-num">{tradeCount}</TableCell>
                            <TableCell className="text-right font-num text-orange-600 dark:text-orange-400 font-medium">
                              {fc(a.totalFees)}
                            </TableCell>
                            <TableCell className="text-right font-num">
                              {fc(avgFee)}
                            </TableCell>
                            <TableCell className="text-right font-num">
                              {fc(volume)}
                            </TableCell>
                            <TableCell className="text-right font-num">
                              {formatPercent(rate)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total row */}
                      <TableRow className="border-t-2 font-semibold">
                        <TableCell>{t(locale, "common.total")}</TableCell>
                        <TableCell className="text-right font-num">
                          {tradeAnalysis.reduce((s, a) => s + a.totalBuys + a.totalSells, 0)}
                        </TableCell>
                        <TableCell className="text-right font-num text-orange-600 dark:text-orange-400">
                          {fc(totalFees)}
                        </TableCell>
                        <TableCell className="text-right font-num">
                          {fc(
                            tradeAnalysis.reduce((s, a) => s + a.totalBuys + a.totalSells, 0) > 0
                              ? totalFees / tradeAnalysis.reduce((s, a) => s + a.totalBuys + a.totalSells, 0)
                              : 0
                          )}
                        </TableCell>
                        <TableCell className="text-right font-num">
                          {fc(totalTraded)}
                        </TableCell>
                        <TableCell className="text-right font-num">
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

    </div>
  );
}
