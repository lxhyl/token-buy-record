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

  const handleRefreshAllPrices = useCallback(async () => {
    setRefreshStatus("loading");
    setRefreshInfo("");
    try {
      const res = await fetch("/api/prices");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch prices");

      setRefreshStatus("success");
      setRefreshInfo(`Updated ${data.updated} price(s)`);
      router.refresh();

      setTimeout(() => {
        setRefreshStatus("idle");
        setRefreshInfo("");
      }, 3000);
    } catch {
      setRefreshStatus("error");
      setRefreshInfo("Failed to fetch prices");
      setTimeout(() => {
        setRefreshStatus("idle");
        setRefreshInfo("");
      }, 3000);
    }
  }, [router]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 px-4 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              <Wallet className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <CardTitle className="text-base md:text-lg truncate">Current Holdings</CardTitle>
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
                disabled={refreshStatus === "loading"}
                className="gap-1.5 text-xs md:text-sm"
              >
                {refreshStatus === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{refreshStatus === "loading" ? "Fetching..." : "Refresh Prices"}</span>
                <span className="sm:hidden">{refreshStatus === "loading" ? "..." : "Refresh"}</span>
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
              No holdings yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Add buy transactions to see your portfolio
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                {hasIncome && <TableHead className="text-right">Income</TableHead>}
                <TableHead className="text-right">P&L</TableHead>
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
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-amber-50 text-amber-700">
                          <Coins className="h-3.5 w-3.5" />
                          {fc(h.totalIncome)}
                        </div>
                      ) : "-"}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                      h.unrealizedPnL >= 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}>
                      {h.unrealizedPnL >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      <span>{fc(Math.abs(h.unrealizedPnL))}</span>
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
