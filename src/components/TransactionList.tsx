"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteTransaction } from "@/actions/transactions";
import { Transaction } from "@/lib/schema";
import { createCurrencyFormatter, formatNumber, formatDate } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates, toUsd } from "@/lib/currency";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/components/I18nProvider";
import { TranslationKey } from "@/lib/i18n";
import {
  Pencil,
  Trash2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Coins,
  Search,
  ArrowUpDown,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { usePnLColors } from "@/components/ColorSchemeProvider";

type TabFilter = "all" | "market" | "fixed-income";
type SortField = "date" | "symbol" | "total";
type SortDir = "asc" | "desc";

function isFixedIncome(t: Transaction) {
  return t.assetType === "deposit" || t.assetType === "bond";
}

interface TransactionListProps {
  transactions: Transaction[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function TransactionList({ transactions, currency, rates }: TransactionListProps) {
  const fc = createCurrencyFormatter(currency, rates);
  const { toast } = useToast();
  const { t, tInterpolate } = useI18n();
  const pnlColors = usePnLColors();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; symbol: string; assetType: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const TABS: { key: TabFilter; labelKey: TranslationKey }[] = [
    { key: "all", labelKey: "transactions.all" },
    { key: "market", labelKey: "transactions.market" },
    { key: "fixed-income", labelKey: "transactions.fixedIncome" },
  ];

  function getAssetTypeLabel(assetType: string): string {
    if (assetType === "crypto") return t("form.crypto");
    if (assetType === "stock") return t("form.stock");
    if (assetType === "deposit") return t("form.depositType");
    if (assetType === "bond") return t("form.bondType");
    return assetType;
  }

  function getTradeTypeLabel(tx: Transaction): string {
    if (isFixedIncome(tx)) {
      if (tx.tradeType === "buy") return t("transactions.deposit");
      if (tx.tradeType === "sell") return t("transactions.withdraw");
    }
    if (tx.tradeType === "buy") return t("transactions.buy");
    if (tx.tradeType === "sell") return t("transactions.sell");
    if (tx.tradeType === "income") return t("transactions.incomeType");
    return tx.tradeType.toUpperCase();
  }

  const handleDelete = (id: number, symbol: string, assetType: string) => {
    setDeleteConfirm({ id, symbol, assetType });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const { id, symbol } = deleteConfirm;
    setDeleteConfirm(null);
    startTransition(async () => {
      await deleteTransaction(id);
      toast(tInterpolate("transactions.deleted", { symbol }), "success");
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let result = transactions.filter((tx) => {
      if (activeTab === "market") return !isFixedIncome(tx);
      if (activeTab === "fixed-income") return isFixedIncome(tx);
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.symbol.toLowerCase().includes(q) ||
          (tx.name && tx.name.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime();
          break;
        case "symbol":
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case "total":
          cmp = parseFloat(a.totalAmount) - parseFloat(b.totalAmount);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [transactions, activeTab, searchQuery, sortField, sortDir]);

  // Reset to page 1 when filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  const showFixedIncomeColumns = activeTab === "fixed-income";

  const handleExportCSV = () => {
    const headers = [
      t("transactions.date"),
      t("transactions.symbol"),
      t("transactions.name"),
      t("transactions.type"),
      t("transactions.assetType"),
      t("transactions.quantity"),
      t("transactions.price"),
      t("transactions.total"),
      t("transactions.fee"),
      t("transactions.currency"),
      t("transactions.notes"),
    ];
    const rows = filtered.map((tx) => [
      new Date(tx.tradeDate).toISOString().split("T")[0],
      tx.symbol,
      tx.name || "",
      tx.tradeType,
      tx.assetType,
      tx.quantity,
      tx.price,
      tx.totalAmount,
      tx.fee || "0",
      tx.currency,
      (tx.notes || "").replace(/"/g, '""'),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t("transactions.exportedCSV"), "success");
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-primary" : "opacity-40"}`} />
    </button>
  );

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 px-4 md:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
                <History className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <CardTitle className="text-base md:text-lg truncate">{t("transactions.history")}</CardTitle>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {transactions.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleExportCSV} className="hidden sm:flex gap-1.5 text-xs md:text-sm">
                  <Download className="h-3.5 w-3.5" />
                  {t("common.export")}
                </Button>
              )}
              <Link href="/transactions/new">
                <Button size="sm" className="md:h-10 md:px-4">
                  <Plus className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">{t("transactions.addTransaction")}</span>
                  <span className="sm:hidden">{t("common.add")}</span>
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Tab Filter + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 md:px-6 pt-4 pb-2">
            <div className="flex gap-1" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
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
            {transactions.length > 0 && (
              <div className="relative sm:ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("transactions.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-8 h-8 text-xs w-full sm:w-48"
                />
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                {searchQuery ? t("transactions.noMatching") : t("transactions.noTransactions")}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {searchQuery
                  ? t("transactions.tryDifferent")
                  : activeTab === "all"
                  ? t("transactions.addFirst")
                  : activeTab === "market"
                  ? t("transactions.noMarket")
                  : t("transactions.noFixedIncome")}
              </p>
              {!searchQuery && (
                <Link href="/transactions/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("transactions.addTransaction")}
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    <SortButton field="date">{t("transactions.date")}</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="symbol">{t("transactions.asset")}</SortButton>
                  </TableHead>
                  <TableHead>{t("transactions.type")}</TableHead>
                  {showFixedIncomeColumns ? (
                    <>
                      <TableHead className="text-right">
                        <SortButton field="total">{t("transactions.amount")}</SortButton>
                      </TableHead>
                      <TableHead className="text-right">{t("transactions.rateCol")}</TableHead>
                      <TableHead className="text-right">{t("transactions.maturityCol")}</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-right">{t("transactions.quantity")}</TableHead>
                      <TableHead className="text-right">{t("transactions.price")}</TableHead>
                      <TableHead className="text-right">
                        <SortButton field="total">{t("transactions.total")}</SortButton>
                      </TableHead>
                      <TableHead className="text-right">{t("transactions.realizedPnl")}</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">{t("transactions.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(new Date(tx.tradeDate))}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{tx.symbol}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {getAssetTypeLabel(tx.assetType)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        tx.tradeType === "buy"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : tx.tradeType === "income"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      }`}>
                        {tx.tradeType === "buy" ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : tx.tradeType === "income" ? (
                          <Coins className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {getTradeTypeLabel(tx)}
                      </div>
                    </TableCell>
                    {showFixedIncomeColumns ? (
                      <>
                        <TableCell className="text-right font-semibold font-num">
                          {fc(toUsd(parseFloat(tx.totalAmount), tx.currency || "USD", rates))}
                        </TableCell>
                        <TableCell className="text-right font-num">
                          {tx.interestRate && parseFloat(tx.interestRate) > 0
                            ? `${parseFloat(tx.interestRate).toFixed(2)}%`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.maturityDate
                            ? formatDate(new Date(tx.maturityDate))
                            : "-"}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right font-medium font-num">
                          {parseFloat(tx.quantity) > 0 ? formatNumber(parseFloat(tx.quantity), 8) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-num">
                          {parseFloat(tx.price) > 0 ? fc(toUsd(parseFloat(tx.price), tx.currency || "USD", rates)) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold font-num">
                          {fc(toUsd(parseFloat(tx.totalAmount), tx.currency || "USD", rates))}
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.tradeType === "sell" && tx.realizedPnl ? (() => {
                            const pnlUsd = toUsd(parseFloat(tx.realizedPnl), tx.currency || "USD", rates);
                            const isProfit = pnlUsd >= 0;
                            return (
                              <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold font-num leading-none ${
                                isProfit ? pnlColors.gainPill : pnlColors.lossPill
                              }`}>
                                {isProfit ? (
                                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3 shrink-0" />
                                )}
                                <span className="whitespace-nowrap">{isProfit ? "+" : ""}{fc(pnlUsd)}</span>
                              </div>
                            );
                          })() : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/transactions/${tx.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.edit")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(tx.id, tx.symbol, tx.assetType)}
                          disabled={isPending}
                          aria-label={t("common.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {t("pagination.prev")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {tInterpolate("pagination.pageInfo", { page: safeCurrentPage, total: totalPages })}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="gap-1 text-xs"
              >
                {t("pagination.next")}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Mobile export button */}
          {transactions.length > 0 && (
            <div className="sm:hidden px-4 py-3 border-t">
              <Button size="sm" variant="outline" onClick={handleExportCSV} className="w-full gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                {t("common.exportCSV")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-popover text-popover-foreground border rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="font-semibold">{t("transactions.deleteTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {tInterpolate("transactions.deleteConfirm", { symbol: deleteConfirm.symbol })}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
