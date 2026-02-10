"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TradeAnalysis } from "@/lib/calculations";
import { createCurrencyFormatter, formatNumber } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { useI18n } from "@/components/I18nProvider";
import { TranslationKey } from "@/lib/i18n";

type Tab = "market" | "fixed-income";

const TABS: { key: Tab; labelKey: TranslationKey }[] = [
  { key: "market", labelKey: "tradePattern.market" },
  { key: "fixed-income", labelKey: "tradePattern.fixedIncome" },
];

function isFixedIncome(a: TradeAnalysis) {
  return a.assetType === "deposit" || a.assetType === "bond";
}

interface TradePatternCardProps {
  tradeAnalysis: TradeAnalysis[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function TradePatternCard({ tradeAnalysis, currency, rates }: TradePatternCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const fc = createCurrencyFormatter(currency, rates);
  const { t, tInterpolate } = useI18n();

  const filtered = tradeAnalysis.filter((a) =>
    activeTab === "market" ? !isFixedIncome(a) : isFixedIncome(a)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">{t("tradePattern.title")}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 md:px-6">
        <div className="flex gap-1 px-4 md:px-0 pb-4" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            {t("tradePattern.noTrades")}
          </p>
        ) : activeTab === "market" ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tradePattern.symbol")}</TableHead>
                  <TableHead className="text-right">{t("tradePattern.buyTrades")}</TableHead>
                  <TableHead className="text-right">{t("tradePattern.sellTrades")}</TableHead>
                  <TableHead className="text-right">{t("tradePattern.income")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t("tradePattern.avgBuy")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t("tradePattern.avgSell")}</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t("tradePattern.buyVol")}</TableHead>
                  <TableHead className="text-right">
                    {tInterpolate("tradePattern.buyAmount", { currency })}
                  </TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t("tradePattern.sellVol")}</TableHead>
                  <TableHead className="text-right">
                    {tInterpolate("tradePattern.sellAmount", { currency })}
                  </TableHead>
                  <TableHead className="text-right">
                    {tInterpolate("tradePattern.incomeAmount", { currency })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.symbol}>
                    <TableCell className="font-medium">{a.symbol}</TableCell>
                    <TableCell className="text-right">{a.totalBuys}</TableCell>
                    <TableCell className="text-right">{a.totalSells}</TableCell>
                    <TableCell className="text-right">{a.totalIncomes > 0 ? a.totalIncomes : "-"}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{fc(a.avgBuyPrice)}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{a.avgSellPrice > 0 ? fc(a.avgSellPrice) : "-"}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">{formatNumber(a.buyVolume, 4)}</TableCell>
                    <TableCell className="text-right">{fc(a.buyVolumeUsd)}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">{a.sellVolume > 0 ? formatNumber(a.sellVolume, 4) : "-"}</TableCell>
                    <TableCell className="text-right">{a.sellVolumeUsd > 0 ? fc(a.sellVolumeUsd) : "-"}</TableCell>
                    <TableCell className="text-right">{a.totalIncomeUsd > 0 ? fc(a.totalIncomeUsd) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tradePattern.symbol")}</TableHead>
                  <TableHead className="text-right">{t("tradePattern.depositsCol")}</TableHead>
                  <TableHead className="text-right">{t("tradePattern.withdrawals")}</TableHead>
                  <TableHead className="text-right">{t("tradePattern.income")}</TableHead>
                  <TableHead className="text-right">{t("tradePattern.deposited")}</TableHead>
                  <TableHead className="text-right">{t("tradePattern.withdrawn")}</TableHead>
                  <TableHead className="text-right">
                    {tInterpolate("tradePattern.incomeAmount", { currency })}
                  </TableHead>
                  <TableHead className="text-right">{t("tradePattern.net")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const net = a.buyTotalAmountUsd - a.sellTotalAmountUsd;
                  return (
                    <TableRow key={a.symbol}>
                      <TableCell className="font-medium">{a.symbol}</TableCell>
                      <TableCell className="text-right">{a.totalBuys}</TableCell>
                      <TableCell className="text-right">{a.totalSells > 0 ? a.totalSells : "-"}</TableCell>
                      <TableCell className="text-right">{a.totalIncomes > 0 ? a.totalIncomes : "-"}</TableCell>
                      <TableCell className="text-right">{fc(a.buyTotalAmountUsd)}</TableCell>
                      <TableCell className="text-right">{a.sellTotalAmountUsd > 0 ? fc(a.sellTotalAmountUsd) : "-"}</TableCell>
                      <TableCell className="text-right">{a.totalIncomeUsd > 0 ? fc(a.totalIncomeUsd) : "-"}</TableCell>
                      <TableCell className={`text-right font-medium ${net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {fc(net)}
                      </TableCell>

                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
