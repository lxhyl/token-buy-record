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
import { usePnLColors } from "@/components/ColorSchemeProvider";
import { ArrowUpDown } from "lucide-react";
import { AssetLogo } from "@/components/AssetLogo";

type SortDir = "asc" | "desc";

interface TradePatternCardProps {
  tradeAnalysis: TradeAnalysis[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function TradePatternCard({ tradeAnalysis, currency, rates }: TradePatternCardProps) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const fc = createCurrencyFormatter(currency, rates);
  const { t, tInterpolate } = useI18n();
  const c = usePnLColors();

  const filtered = useMemo(() => {
    const base = [...tradeAnalysis];
    if (!sortField) return base;

    return base.sort((a, b) => {
      const va = (a as unknown as Record<string, number>)[sortField] ?? 0;
      const vb = (b as unknown as Record<string, number>)[sortField] ?? 0;
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [tradeAnalysis, sortField, sortDir]);

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
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
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            {t("tradePattern.noTrades")}
          </p>
        ) : (
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AssetLogo symbol={a.symbol} assetType={a.assetType} className="h-6 w-6" />
                        <span className="font-medium">{a.symbol}</span>
                      </div>
                    </TableCell>
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
        )}
      </CardContent>
    </Card>
  );
}
