"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Holding } from "@/lib/calculations";
import { createCurrencyFormatter, formatNumber, formatPercent } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { TrendingUp, TrendingDown, Wallet, Zap, Loader2, Check, AlertCircle, Coins } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

interface HoldingsTableProps {
  holdings: Holding[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

type RefreshStatus = "idle" | "loading" | "success" | "error";

const assetGradient = (assetType: string) => {
  switch (assetType) {
    case "crypto": return "bg-gradient-to-br from-purple-500 to-pink-500";
    case "stock": return "bg-gradient-to-br from-blue-500 to-cyan-500";
    case "deposit": return "bg-gradient-to-br from-green-500 to-emerald-500";
    case "bond": return "bg-gradient-to-br from-amber-500 to-yellow-500";
    default: return "bg-gradient-to-br from-gray-500 to-slate-500";
  }
};

export function HoldingsTable({ holdings, currency, rates }: HoldingsTableProps) {
  const fc = createCurrencyFormatter(currency, rates);
  const hasIncome = holdings.some((h) => h.totalIncome > 0);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>("idle");
  const [refreshInfo, setRefreshInfo] = useState("");
  const router = useRouter();
  const { t, tInterpolate } = useI18n();

  const [cooldown, setCooldown] = useState(false);

  const handleRefreshAllPrices = useCallback(async () => {
    setRefreshStatus("loading");
    setRefreshInfo("");
    try {
      const res = await fetch("/api/prices");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch prices");

      setRefreshStatus("success");
      setRefreshInfo(tInterpolate("holdings.updatedPrices", { count: data.updated }));
      router.refresh();

      setCooldown(true);
      setTimeout(() => setCooldown(false), 30000);

      setTimeout(() => {
        setRefreshStatus("idle");
        setRefreshInfo("");
      }, 3000);
    } catch {
      setRefreshStatus("error");
      setRefreshInfo(t("holdings.fetchFailed"));
      setTimeout(() => {
        setRefreshStatus("idle");
        setRefreshInfo("");
      }, 3000);
    }
  }, [router, t, tInterpolate]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 px-4 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              <Wallet className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <CardTitle className="text-base md:text-lg truncate">{t("holdings.title")}</CardTitle>
          </div>
          {holdings.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {refreshInfo && (
                <span className={`text-xs md:text-sm hidden sm:inline ${
                  refreshStatus === "success" ? "text-emerald-600" :
                  refreshStatus === "error" ? "text-red-600" : "text-muted-foreground"
                }`}>
                  {refreshStatus === "success" && <Check className="inline h-3.5 w-3.5 mr-1" />}
                  {refreshStatus === "error" && <AlertCircle className="inline h-3.5 w-3.5 mr-1" />}
                  {refreshInfo}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshAllPrices}
                disabled={refreshStatus === "loading" || cooldown}
                className="gap-1.5 text-xs md:text-sm"
              >
                {refreshStatus === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{refreshStatus === "loading" ? t("holdings.fetching") : t("holdings.refreshPrices")}</span>
                <span className="sm:hidden">{refreshStatus === "loading" ? "..." : t("holdings.refresh")}</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">
              {t("holdings.empty")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("holdings.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("holdings.asset")}</TableHead>
                <TableHead className="text-right">{t("holdings.quantity")}</TableHead>
                <TableHead className="text-right">{t("holdings.avgCost")}</TableHead>
                <TableHead className="text-right">{t("holdings.currentPrice")}</TableHead>
                <TableHead className="text-right">{t("holdings.value")}</TableHead>
                {hasIncome && <TableHead className="text-right">{t("holdings.income")}</TableHead>}
                <TableHead className="text-right">{t("holdings.pnl")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h) => (
                <TableRow key={h.symbol}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white ${assetGradient(h.assetType)}`}>
                        {h.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold">{h.symbol}</div>
                        {h.name && (
                          <div className="text-xs text-muted-foreground">
                            {h.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {h.quantity > 0 ? formatNumber(h.quantity, 8) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {h.avgCost > 0 ? fc(h.avgCost) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {h.currentPrice > 0 ? fc(h.currentPrice) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {h.currentValue > 0 ? fc(h.currentValue) : "-"}
                  </TableCell>
                  {hasIncome && (
                    <TableCell className="text-right">
                      {h.totalIncome > 0 ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                          <Coins className="h-3.5 w-3.5" />
                          {fc(h.totalIncome)}
                        </div>
                      ) : "-"}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                      h.unrealizedPnL >= 0
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                    }`}>
                      {h.unrealizedPnL >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      <span>{h.unrealizedPnL >= 0 ? "+" : "-"}{fc(Math.abs(h.unrealizedPnL))}</span>
                      <span className="text-xs opacity-75">
                        ({h.unrealizedPnLPercent >= 0 ? "+" : ""}{formatPercent(h.unrealizedPnLPercent)})
                      </span>
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
  );
}
