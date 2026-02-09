"use client";

import { useTransition } from "react";
import Link from "next/link";
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
import { deleteTransaction } from "@/actions/transactions";
import { Transaction } from "@/lib/schema";
import { createCurrencyFormatter, formatNumber, formatDate } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { Pencil, Trash2, Plus, ArrowUpRight, ArrowDownRight, History, Coins } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function TransactionList({ transactions, currency, rates }: TransactionListProps) {
  const fc = createCurrencyFormatter(currency, rates);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      startTransition(async () => {
        await deleteTransaction(id);
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 px-4 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
              <History className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <CardTitle className="text-base md:text-lg truncate">Transaction History</CardTitle>
          </div>
          <Link href="/transactions/new" className="shrink-0">
            <Button size="sm" className="md:h-10 md:px-4">
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">
              No transactions yet
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add your first transaction to get started
            </p>
            <Link href="/transactions/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
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
                        ? "bg-emerald-50 text-emerald-700"
                        : t.tradeType === "income"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}>
                      {t.tradeType === "buy" ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : t.tradeType === "income" ? (
                        <Coins className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {t.tradeType.toUpperCase()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {parseFloat(t.quantity) > 0 ? formatNumber(parseFloat(t.quantity), 8) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {parseFloat(t.price) > 0 ? fc(parseFloat(t.price)) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {fc(parseFloat(t.totalAmount))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/transactions/${t.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(t.id)}
                        disabled={isPending}
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
      </CardContent>
    </Card>
  );
}
