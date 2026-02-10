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
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { useToast } from "@/components/Toast";
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
} from "lucide-react";

type TabFilter = "all" | "market" | "fixed-income";
type SortField = "date" | "symbol" | "total";
type SortDir = "asc" | "desc";

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "market", label: "Market" },
  { key: "fixed-income", label: "Fixed Income" },
];

function isFixedIncome(t: Transaction) {
  return t.assetType === "deposit" || t.assetType === "bond";
}

function getTradeTypeLabel(t: Transaction): string {
  if (isFixedIncome(t)) {
    if (t.tradeType === "buy") return "DEPOSIT";
    if (t.tradeType === "sell") return "WITHDRAW";
  }
  return t.tradeType.toUpperCase();
}

interface TransactionListProps {
  transactions: Transaction[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function TransactionList({ transactions, currency, rates }: TransactionListProps) {
  const fc = createCurrencyFormatter(currency, rates);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; symbol: string } | null>(null);

  const handleDelete = (id: number, symbol: string) => {
    setDeleteConfirm({ id, symbol });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const { id, symbol } = deleteConfirm;
    setDeleteConfirm(null);
    startTransition(async () => {
      await deleteTransaction(id);
      toast(`Deleted ${symbol} transaction`, "success");
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
    let result = transactions.filter((t) => {
      if (activeTab === "market") return !isFixedIncome(t);
      if (activeTab === "fixed-income") return isFixedIncome(t);
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          (t.name && t.name.toLowerCase().includes(q))
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

  const showFixedIncomeColumns = activeTab === "fixed-income";

  const handleExportCSV = () => {
    const headers = ["Date", "Symbol", "Name", "Type", "Asset Type", "Quantity", "Price", "Total", "Fee", "Currency", "Notes"];
    const rows = filtered.map((t) => [
      new Date(t.tradeDate).toISOString().split("T")[0],
      t.symbol,
      t.name || "",
      t.tradeType,
      t.assetType,
      t.quantity,
      t.price,
      t.totalAmount,
      t.fee || "0",
      t.currency,
      (t.notes || "").replace(/"/g, '""'),
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
    toast("Exported CSV file", "success");
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
              <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                <History className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <CardTitle className="text-base md:text-lg truncate">Transaction History</CardTitle>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {transactions.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleExportCSV} className="hidden sm:flex gap-1.5 text-xs md:text-sm">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              )}
              <Link href="/transactions/new">
                <Button size="sm" className="md:h-10 md:px-4">
                  <Plus className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Add Transaction</span>
                  <span className="sm:hidden">Add</span>
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
            {transactions.length > 0 && (
              <div className="relative sm:ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search symbol or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                {searchQuery ? "No matching transactions" : "No transactions yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {searchQuery
                  ? "Try a different search term"
                  : activeTab === "all"
                  ? "Add your first transaction to get started"
                  : activeTab === "market"
                  ? "No market (crypto/stock) transactions"
                  : "No fixed-income (deposit/bond) transactions"}
              </p>
              {!searchQuery && (
                <Link href="/transactions/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
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
                    <SortButton field="date">Date</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="symbol">Asset</SortButton>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  {showFixedIncomeColumns ? (
                    <>
                      <TableHead className="text-right">
                        <SortButton field="total">Amount</SortButton>
                      </TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Maturity</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">
                        <SortButton field="total">Total</SortButton>
                      </TableHead>
                    </>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(new Date(t.tradeDate))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold text-white text-xs ${
                          t.assetType === "crypto"
                            ? "bg-gradient-to-br from-purple-500 to-pink-500"
                            : t.assetType === "deposit"
                            ? "bg-gradient-to-br from-green-500 to-emerald-500"
                            : t.assetType === "bond"
                            ? "bg-gradient-to-br from-amber-500 to-yellow-500"
                            : "bg-gradient-to-br from-blue-500 to-cyan-500"
                        }`}>
                          {t.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold">{t.symbol}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {t.assetType}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        t.tradeType === "buy"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : t.tradeType === "income"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      }`}>
                        {t.tradeType === "buy" ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : t.tradeType === "income" ? (
                          <Coins className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {getTradeTypeLabel(t)}
                      </div>
                    </TableCell>
                    {showFixedIncomeColumns ? (
                      <>
                        <TableCell className="text-right font-semibold">
                          {fc(parseFloat(t.totalAmount))}
                        </TableCell>
                        <TableCell className="text-right">
                          {t.interestRate && parseFloat(t.interestRate) > 0
                            ? `${parseFloat(t.interestRate).toFixed(2)}%`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {t.maturityDate
                            ? formatDate(new Date(t.maturityDate))
                            : "-"}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right font-medium">
                          {parseFloat(t.quantity) > 0 ? formatNumber(parseFloat(t.quantity), 8) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {parseFloat(t.price) > 0 ? fc(parseFloat(t.price)) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {fc(parseFloat(t.totalAmount))}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/transactions/${t.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit transaction">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(t.id, t.symbol)}
                          disabled={isPending}
                          aria-label="Delete transaction"
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

          {/* Mobile export button */}
          {transactions.length > 0 && (
            <div className="sm:hidden px-4 py-3 border-t">
              <Button size="sm" variant="outline" onClick={handleExportCSV} className="w-full gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Export CSV
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
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold">Delete Transaction</h3>
                <p className="text-sm text-muted-foreground">
                  Delete this {deleteConfirm.symbol} transaction? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
