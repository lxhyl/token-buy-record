"use client";

import { useState, useMemo } from "react";
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
import { usePnLColors } from "@/components/ColorSchemeProvider";
import { ArrowUpDown } from "lucide-react";

type Tab = "market" | "fixed-income";
type SortDir = "asc" | "desc";

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
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const fc = createCurrencyFormatter(currency, rates);
  const { t, tInterpolate } = useI18n();
  const c = usePnLColors();

  const filtered = useMemo(() => {
    const base = tradeAnalysis.filter((a) =>
      activeTab === "market" ? !isFixedIncome(a) : isFixedIncome(a)
    );
    if (!sortField) return base;

    return [...base].sort((a, b) => {
      let va: number, vb: number;
      if (sortField === "net") {
        va = a.buyTotalAmountUsd - a.sellTotalAmountUsd;
        vb = b.buyTotalAmountUsd - b.sellTotalAmountUsd;
      } else {
        va = (a as unknown as Record<string, number>)[sortField] ?? 0;
        vb = (b as unknown as Record<string, number>)[sortField] ?? 0;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [tradeAnalysis, activeTab, sortField, sortDir]);

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setSortField(null);
  }

  const SortButton = ({ field, children, className }: { field: string; children: React.ReactNode; className?: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${className ?? ""}`}
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-primary" : "opacity-40"}`} />
    </button>
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
              onClick={() => handleTabChange(tab.key)}
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
                  <TableHead className="text-right">
                    <SortButton field="realizedPnl">{t("tradePattern.realizedPnl")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="buyVolumeUsd">{tInterpolate("tradePattern.buyAmount", { currency })}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="sellVolumeUsd">{tInterpolate("tradePattern.sellAmount", { currency })}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="avgBuyPrice">{t("tradePattern.avgBuy")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="avgSellPrice">{t("tradePattern.avgSell")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="totalBuys">{t("tradePattern.buyTrades")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="totalSells">{t("tradePattern.sellTrades")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="buyVolume">{t("tradePattern.buyVol")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="sellVolume">{t("tradePattern.sellVol")}</SortButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.symbol}>
                    <TableCell className="font-medium">{a.symbol}</TableCell>
                    <TableCell className={`text-right font-medium font-num ${
                      a.realizedPnl >= 0 ? c.gainText : c.lossText
                    }`}>
                      {a.realizedPnl !== 0 ? (a.realizedPnl >= 0 ? "+" : "") + fc(a.realizedPnl) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-num">{fc(a.buyVolumeUsd)}</TableCell>
                    <TableCell className="text-right font-num">{a.sellVolumeUsd > 0 ? fc(a.sellVolumeUsd) : "-"}</TableCell>
                    <TableCell className="text-right font-num">{fc(a.avgBuyPrice)}</TableCell>
                    <TableCell className="text-right font-num">{a.avgSellPrice > 0 ? fc(a.avgSellPrice) : "-"}</TableCell>
                    <TableCell className="text-right font-num">{a.totalBuys}</TableCell>
                    <TableCell className="text-right font-num">{a.totalSells}</TableCell>
                    <TableCell className="text-right font-num">{formatNumber(a.buyVolume, 4)}</TableCell>
                    <TableCell className="text-right font-num">{a.sellVolume > 0 ? formatNumber(a.sellVolume, 4) : "-"}</TableCell>
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
                  <TableHead className="text-right">
                    <SortButton field="net">{t("tradePattern.net")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="buyTotalAmountUsd">{t("tradePattern.deposited")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="sellTotalAmountUsd">{t("tradePattern.withdrawn")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="totalIncomeUsd">{tInterpolate("tradePattern.incomeAmount", { currency })}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="totalBuys">{t("tradePattern.depositsCol")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="totalSells">{t("tradePattern.withdrawals")}</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="totalIncomes">{t("tradePattern.income")}</SortButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const net = a.buyTotalAmountUsd - a.sellTotalAmountUsd;
                  return (
                    <TableRow key={a.symbol}>
                      <TableCell className="font-medium">{a.symbol}</TableCell>
                      <TableCell className={`text-right font-medium font-num ${net >= 0 ? c.gainText : c.lossText}`}>
                        {fc(net)}
                      </TableCell>
                      <TableCell className="text-right font-num">{fc(a.buyTotalAmountUsd)}</TableCell>
                      <TableCell className="text-right font-num">{a.sellTotalAmountUsd > 0 ? fc(a.sellTotalAmountUsd) : "-"}</TableCell>
                      <TableCell className="text-right font-num">{a.totalIncomeUsd > 0 ? fc(a.totalIncomeUsd) : "-"}</TableCell>
                      <TableCell className="text-right font-num">{a.totalBuys}</TableCell>
                      <TableCell className="text-right font-num">{a.totalSells > 0 ? a.totalSells : "-"}</TableCell>
                      <TableCell className="text-right font-num">{a.totalIncomes > 0 ? a.totalIncomes : "-"}</TableCell>
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
