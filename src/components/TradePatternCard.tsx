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

type Tab = "market" | "fixed-income";

const TABS: { key: Tab; label: string }[] = [
  { key: "market", label: "Market" },
  { key: "fixed-income", label: "Fixed Income" },
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

  const filtered = tradeAnalysis.filter((a) =>
    activeTab === "market" ? !isFixedIncome(a) : isFixedIncome(a)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Trade Pattern Analysis</CardTitle>
      </CardHeader>
      <CardContent className="px-0 md:px-6">
        <div className="flex gap-1 px-4 md:px-0 pb-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No trades to analyze
          </p>
        ) : activeTab === "market" ? (
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
                {filtered.map((a) => (
                  <TableRow key={a.symbol}>
                    <TableCell className="font-medium">{a.symbol}</TableCell>
                    <TableCell className="text-right">{a.totalBuys}</TableCell>
                    <TableCell className="text-right">{a.totalSells}</TableCell>
                    <TableCell className="text-right">{a.totalIncomes > 0 ? a.totalIncomes : "-"}</TableCell>
                    <TableCell className="text-right">{fc(a.avgBuyPrice)}</TableCell>
                    <TableCell className="text-right">{a.avgSellPrice > 0 ? fc(a.avgSellPrice) : "-"}</TableCell>
                    <TableCell className="text-right">{formatNumber(a.buyVolume, 4)}</TableCell>
                    <TableCell className="text-right">{fc(a.buyVolumeUsd)}</TableCell>
                    <TableCell className="text-right">{a.sellVolume > 0 ? formatNumber(a.sellVolume, 4) : "-"}</TableCell>
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
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Deposits</TableHead>
                  <TableHead className="text-right">Withdrawals</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Deposited</TableHead>
                  <TableHead className="text-right">Withdrawn</TableHead>
                  <TableHead className="text-right">Income {currency}</TableHead>
                  <TableHead className="text-right">Net</TableHead>
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
                      <TableCell className={`text-right font-medium ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
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
