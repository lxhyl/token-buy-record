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
import { deleteDeposit, withdrawFromDeposit } from "@/actions/deposits";
import { Transaction, Deposit } from "@/lib/schema";
import { createCurrencyFormatter, formatNumber, formatDate } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates, toUsd } from "@/lib/currency";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/components/I18nProvider";
import {
  Pencil,
  Trash2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Search,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
} from "lucide-react";
import { usePnLColors } from "@/components/ColorSchemeProvider";
import { AssetLogo } from "@/components/AssetLogo";

type SortField = "date" | "symbol" | "total";
type SortDir = "asc" | "desc";

type TxRow = {
  kind: "transaction";
  id: number;
  symbol: string;
  name: string | null;
  assetType: string;
  tradeType: string;
  quantity: string;
  price: string;
  totalAmount: string;
  currency: string;
  date: Date;
  realizedPnl: string | null;
  editUrl: string;
};

type DepositRow = {
  kind: "deposit";
  id: number;
  symbol: string;
  name: string | null;
  totalAmount: string;
  withdrawnAmount: string;
  currency: string;
  date: Date;
  interestRate: string | null;
  maturityDate: Date | null;
  editUrl: string;
};

interface TransactionListProps {
  transactions: Transaction[];
  deposits?: Deposit[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

const PAGE_SIZE = 10;

function useSortedPaginated<T extends { date: Date; symbol: string; totalAmount: string }>(
  rows: T[],
  search: string,
  matchFn: (row: T, q: string) => boolean,
  page: number,
) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let result = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) => matchFn(row, q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = a.date.getTime() - b.date.getTime();
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
  }, [rows, search, sortField, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return { filtered, paginated, totalPages, safePage, sortField, sortDir, toggleSort };
}

export function TransactionList({ transactions, deposits = [], currency, rates }: TransactionListProps) {
  const fc = createCurrencyFormatter(currency, rates);
  const { toast } = useToast();
  const { t, tInterpolate } = useI18n();
  const pnlColors = usePnLColors();
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; symbol: string; assetType: string; kind: "transaction" | "deposit" } | null>(null);
  const [withdrawDialog, setWithdrawDialog] = useState<{ id: number; symbol: string; remaining: number; currency: string } | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Investment table state
  const [investSearch, setInvestSearch] = useState("");
  const [investPage, setInvestPage] = useState(1);

  // Deposit table state
  const [depositSearch, setDepositSearch] = useState("");
  const [depositPage, setDepositPage] = useState(1);

  const txRows: TxRow[] = useMemo(
    () =>
      transactions.map((tx) => ({
        kind: "transaction" as const,
        id: tx.id,
        symbol: tx.symbol,
        name: tx.name,
        assetType: tx.assetType,
        tradeType: tx.tradeType,
        quantity: tx.quantity,
        price: tx.price,
        totalAmount: tx.totalAmount,
        currency: tx.currency || "USD",
        date: new Date(tx.tradeDate),
        realizedPnl: tx.realizedPnl ?? null,
        editUrl: `/transactions/${tx.id}/edit`,
      })),
    [transactions],
  );

  const depositRows: DepositRow[] = useMemo(
    () =>
      deposits.map((d) => ({
        kind: "deposit" as const,
        id: d.id,
        symbol: d.symbol,
        name: d.name,
        totalAmount: d.principal,
        withdrawnAmount: d.withdrawnAmount || "0",
        currency: d.currency || "USD",
        date: new Date(d.startDate),
        interestRate: d.interestRate ?? null,
        maturityDate: d.maturityDate ? new Date(d.maturityDate) : null,
        editUrl: `/deposits/${d.id}/edit`,
      })),
    [deposits],
  );

  function getAssetTypeLabel(assetType: string): string {
    if (assetType === "crypto") return t("form.crypto");
    if (assetType === "stock") return t("form.stock");
    return assetType;
  }

  function getTradeTypeLabel(tradeType: string): string {
    if (tradeType === "buy") return t("transactions.buy");
    if (tradeType === "sell") return t("transactions.sell");
    return tradeType.toUpperCase();
  }

  const handleDelete = (id: number, symbol: string, assetType: string, kind: "transaction" | "deposit") => {
    setDeleteConfirm({ id, symbol, assetType, kind });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const { id, symbol, kind } = deleteConfirm;
    setDeleteConfirm(null);
    startTransition(async () => {
      if (kind === "deposit") {
        await deleteDeposit(id);
      } else {
        await deleteTransaction(id);
      }
      toast(tInterpolate("transactions.deleted", { symbol }), "success");
    });
  };

  const confirmWithdraw = () => {
    if (!withdrawDialog) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast(t("deposit.withdrawInvalid"), "error");
      return;
    }
    if (amount > withdrawDialog.remaining + 0.001) {
      toast(t("deposit.withdrawExceeds"), "error");
      return;
    }
    const { id, symbol } = withdrawDialog;
    setWithdrawDialog(null);
    setWithdrawAmount("");
    startTransition(async () => {
      const result = await withdrawFromDeposit(id, amount);
      if (result && "error" in result) {
        toast(result.error, "error");
        return;
      }
      toast(`${t("deposit.withdrew")} ${amount.toFixed(2)} — ${symbol}`, "success");
    });
  };

  const investData = useSortedPaginated(
    txRows,
    investSearch,
    (row, q) => row.symbol.toLowerCase().includes(q) || (row.name?.toLowerCase().includes(q) ?? false),
    investPage,
  );

  const depositData = useSortedPaginated(
    depositRows,
    depositSearch,
    (row, q) => row.symbol.toLowerCase().includes(q) || (row.name?.toLowerCase().includes(q) ?? false),
    depositPage,
  );

  const handleExportInvestCSV = () => {
    const headers = [t("transactions.date"), t("transactions.symbol"), t("transactions.name"), t("transactions.type"), t("transactions.assetType"), t("transactions.total"), t("transactions.currency")];
    const rows = investData.filtered.map((row) => [
      row.date.toISOString().split("T")[0],
      row.symbol,
      row.name || "",
      row.tradeType,
      row.assetType,
      row.totalAmount,
      row.currency,
    ]);
    exportCSV(headers, rows, "investments");
  };

  const handleExportDepositCSV = () => {
    const headers = [t("transactions.date"), t("transactions.symbol"), t("transactions.name"), t("form.principalAmount"), t("form.interestRate"), t("form.maturityDate"), t("transactions.currency")];
    const rows = depositData.filtered.map((row) => [
      row.date.toISOString().split("T")[0],
      row.symbol,
      row.name || "",
      row.totalAmount,
      row.interestRate || "",
      row.maturityDate ? row.maturityDate.toISOString().split("T")[0] : "",
      row.currency,
    ]);
    exportCSV(headers, rows, "deposits");
  };

  const exportCSV = (headers: string[], rows: string[][], name: string) => {
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t("transactions.exportedCSV"), "success");
  };

  const SortButton = ({
    field,
    children,
    toggleFn,
    activeField,
  }: {
    field: SortField;
    children: React.ReactNode;
    toggleFn: (f: SortField) => void;
    activeField: SortField;
  }) => (
    <button
      onClick={() => toggleFn(field)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${activeField === field ? "text-primary" : "opacity-40"}`} />
    </button>
  );

  return (
    <>
      {/* ── Investment Transactions ── */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 px-4 md:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <CardTitle className="text-base md:text-lg truncate">{t("transactions.investments")}</CardTitle>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {txRows.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleExportInvestCSV} className="hidden sm:flex gap-1.5 text-xs md:text-sm">
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
          {txRows.length > 0 && (
            <div className="flex items-center px-4 md:px-6 pt-4 pb-2">
              <div className="relative sm:ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("transactions.searchPlaceholder")}
                  value={investSearch}
                  onChange={(e) => { setInvestSearch(e.target.value); setInvestPage(1); }}
                  className="pl-8 h-8 text-xs w-full sm:w-48"
                />
              </div>
            </div>
          )}

          {investData.filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                {investSearch ? t("transactions.noMatching") : t("transactions.noTransactions")}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {investSearch ? t("transactions.tryDifferent") : t("transactions.addFirst")}
              </p>
              {!investSearch && (
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
                      <SortButton field="date" toggleFn={investData.toggleSort} activeField={investData.sortField}>{t("transactions.date")}</SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton field="symbol" toggleFn={investData.toggleSort} activeField={investData.sortField}>{t("transactions.asset")}</SortButton>
                    </TableHead>
                    <TableHead>{t("transactions.type")}</TableHead>
                    <TableHead className="text-right">{t("transactions.quantity")}</TableHead>
                    <TableHead className="text-right">{t("transactions.price")}</TableHead>
                    <TableHead className="text-right">
                      <SortButton field="total" toggleFn={investData.toggleSort} activeField={investData.sortField}>{t("transactions.total")}</SortButton>
                    </TableHead>
                    <TableHead className="text-right">{t("transactions.realizedPnl")}</TableHead>
                    <TableHead className="text-right">{t("transactions.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investData.paginated.map((row) => (
                    <TableRow key={`tx-${row.id}`}>
                      <TableCell className="text-muted-foreground">{formatDate(row.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AssetLogo symbol={row.symbol} assetType={row.assetType} className="h-9 w-9" />
                          <div>
                            <div className="font-semibold">{row.symbol}</div>
                            <div className="text-xs text-muted-foreground capitalize">{getAssetTypeLabel(row.assetType)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          row.tradeType === "buy"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        }`}>
                          {row.tradeType === "buy" ? (
                            <ArrowDownRight className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {getTradeTypeLabel(row.tradeType)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium font-num">
                        {parseFloat(row.quantity) > 0 ? formatNumber(parseFloat(row.quantity), 8) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-num">
                        {parseFloat(row.price) > 0 ? fc(toUsd(parseFloat(row.price), row.currency, rates)) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold font-num">
                        {fc(toUsd(parseFloat(row.totalAmount), row.currency, rates))}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.tradeType === "sell" && row.realizedPnl ? (() => {
                          const pnlUsd = toUsd(parseFloat(row.realizedPnl), row.currency, rates);
                          const isProfit = pnlUsd >= 0;
                          return (
                            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold font-num leading-none ${
                              isProfit ? pnlColors.gainPill : pnlColors.lossPill
                            }`}>
                              {isProfit ? <ArrowUpRight className="h-3 w-3 shrink-0" /> : <ArrowDownRight className="h-3 w-3 shrink-0" />}
                              <span className="whitespace-nowrap">{isProfit ? "+" : ""}{fc(pnlUsd)}</span>
                            </div>
                          );
                        })() : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={row.editUrl}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.edit")}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(row.id, row.symbol, row.assetType, "transaction")}
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

          {investData.filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t">
              <Button size="sm" variant="outline" onClick={() => setInvestPage((p) => Math.max(1, p - 1))} disabled={investData.safePage <= 1} className="gap-1 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />
                {t("pagination.prev")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {tInterpolate("pagination.pageInfo", { page: investData.safePage, total: investData.totalPages })}
              </span>
              <Button size="sm" variant="outline" onClick={() => setInvestPage((p) => Math.min(investData.totalPages, p + 1))} disabled={investData.safePage >= investData.totalPages} className="gap-1 text-xs">
                {t("pagination.next")}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {txRows.length > 0 && (
            <div className="sm:hidden px-4 py-3 border-t">
              <Button size="sm" variant="outline" onClick={handleExportInvestCSV} className="w-full gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                {t("common.exportCSV")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Deposits ── */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 px-4 md:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <PiggyBank className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <CardTitle className="text-base md:text-lg truncate">{t("transactions.depositsHistory")}</CardTitle>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {depositRows.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleExportDepositCSV} className="hidden sm:flex gap-1.5 text-xs md:text-sm">
                  <Download className="h-3.5 w-3.5" />
                  {t("common.export")}
                </Button>
              )}
              <Link href="/transactions/new?type=deposit">
                <Button size="sm" className="md:h-10 md:px-4">
                  <Plus className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">{t("transactions.addDeposit")}</span>
                  <span className="sm:hidden">{t("common.add")}</span>
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {depositRows.length > 0 && (
            <div className="flex items-center px-4 md:px-6 pt-4 pb-2">
              <div className="relative sm:ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("transactions.searchPlaceholder")}
                  value={depositSearch}
                  onChange={(e) => { setDepositSearch(e.target.value); setDepositPage(1); }}
                  className="pl-8 h-8 text-xs w-full sm:w-48"
                />
              </div>
            </div>
          )}

          {depositData.filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <PiggyBank className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                {depositSearch ? t("transactions.noMatching") : t("transactions.noDeposits")}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {depositSearch ? t("transactions.tryDifferent") : t("transactions.addDepositFirst")}
              </p>
              {!depositSearch && (
                <Link href="/transactions/new?type=deposit">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("transactions.addDeposit")}
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
                      <SortButton field="date" toggleFn={depositData.toggleSort} activeField={depositData.sortField}>{t("transactions.date")}</SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton field="symbol" toggleFn={depositData.toggleSort} activeField={depositData.sortField}>{t("transactions.institution")}</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="total" toggleFn={depositData.toggleSort} activeField={depositData.sortField}>{t("transactions.principal")}</SortButton>
                    </TableHead>
                    <TableHead className="text-right">{t("transactions.interestRate")}</TableHead>
                    <TableHead className="text-right">{t("form.maturityDate")}</TableHead>
                    <TableHead className="text-right">{t("transactions.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depositData.paginated.map((row) => (
                    <TableRow key={`deposit-${row.id}`}>
                      <TableCell className="text-muted-foreground">{formatDate(row.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shrink-0">
                            <PiggyBank className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold">{row.symbol}</div>
                            {row.name && <div className="text-xs text-muted-foreground">{row.name}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold font-num">
                        {fc(toUsd(parseFloat(row.totalAmount), row.currency, rates))}
                      </TableCell>
                      <TableCell className="text-right font-num text-muted-foreground">
                        {row.interestRate ? `${parseFloat(row.interestRate).toFixed(2)}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.maturityDate ? formatDate(row.maturityDate) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(() => {
                            const remaining = parseFloat(row.totalAmount) - parseFloat(row.withdrawnAmount);
                            return remaining > 0 ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                                onClick={() => {
                                  setWithdrawDialog({ id: row.id, symbol: row.symbol, remaining, currency: row.currency });
                                  setWithdrawAmount("");
                                }}
                                disabled={isPending}
                                aria-label={t("deposit.withdraw")}
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </Button>
                            ) : null;
                          })()}
                          <Link href={row.editUrl}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.edit")}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(row.id, row.symbol, "deposit", "deposit")}
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

          {depositData.filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t">
              <Button size="sm" variant="outline" onClick={() => setDepositPage((p) => Math.max(1, p - 1))} disabled={depositData.safePage <= 1} className="gap-1 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />
                {t("pagination.prev")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {tInterpolate("pagination.pageInfo", { page: depositData.safePage, total: depositData.totalPages })}
              </span>
              <Button size="sm" variant="outline" onClick={() => setDepositPage((p) => Math.min(depositData.totalPages, p + 1))} disabled={depositData.safePage >= depositData.totalPages} className="gap-1 text-xs">
                {t("pagination.next")}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {depositRows.length > 0 && (
            <div className="sm:hidden px-4 py-3 border-t">
              <Button size="sm" variant="outline" onClick={handleExportDepositCSV} className="w-full gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                {t("common.exportCSV")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      {withdrawDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setWithdrawDialog(null)}>
          <div
            className="bg-popover text-popover-foreground border rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{t("deposit.withdraw")}</h3>
                <p className="text-sm text-muted-foreground">
                  {withdrawDialog.symbol} — {t("deposit.remainingPrincipal")}: {fc(toUsd(withdrawDialog.remaining, withdrawDialog.currency, rates))}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Input
                type="number"
                step="0.01"
                placeholder={t("deposit.withdrawAmount")}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setWithdrawDialog(null)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                  onClick={confirmWithdraw}
                  disabled={isPending}
                >
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                  {t("deposit.withdraw")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-popover text-popover-foreground border rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              {deleteConfirm.kind === "deposit" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                  <PiggyBank className="h-5 w-5" />
                </div>
              ) : (
                <AssetLogo symbol={deleteConfirm.symbol} assetType={deleteConfirm.assetType} className="h-10 w-10" />
              )}
              <div>
                <h3 className="font-semibold">{t("transactions.deleteTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {tInterpolate("transactions.deleteConfirm", { symbol: deleteConfirm.symbol })}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" variant="destructive" onClick={confirmDelete}>
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
