"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { Transaction } from "@/lib/schema";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { ArrowDownRight, ArrowUpRight, Bitcoin, TrendingUp, Save, X } from "lucide-react";

interface TransactionFormProps {
  transaction?: Transaction;
  mode?: "create" | "edit";
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

export function TransactionForm({
  transaction,
  mode = "create",
  currency,
  rates,
}: TransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      if (mode === "edit" && transaction) {
        await updateTransaction(transaction.id, formData);
      } else {
        await createTransaction(formData);
      }
      router.push("/transactions");
    });
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  // Default currency for new transactions is the display currency;
  // for editing, use the transaction's stored currency.
  const defaultCurrency = transaction?.currency || currency;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
            {mode === "create" ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <Save className="h-5 w-5" />
            )}
          </div>
          <CardTitle>
            {mode === "create" ? "Add New Transaction" : "Edit Transaction"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form action={handleSubmit} className="space-y-6">
          {/* Asset Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Asset Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  name="symbol"
                  placeholder="BTC, AAPL, ETH..."
                  defaultValue={transaction?.symbol || ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Bitcoin, Apple Inc..."
                  defaultValue={transaction?.name || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetType">Asset Type</Label>
                <Select
                  id="assetType"
                  name="assetType"
                  defaultValue={transaction?.assetType || "crypto"}
                  required
                  className="h-11"
                >
                  <option value="crypto">Crypto</option>
                  <option value="stock">Stock</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradeType">Trade Type</Label>
                <Select
                  id="tradeType"
                  name="tradeType"
                  defaultValue={transaction?.tradeType || "buy"}
                  required
                  className="h-11"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Trade Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Trade Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  defaultValue={transaction?.quantity || ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  id="currency"
                  name="currency"
                  defaultValue={defaultCurrency}
                  className="h-11"
                >
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                  <option value="HKD">HKD</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  defaultValue={transaction?.price || ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee">Fee</Label>
                <Input
                  id="fee"
                  name="fee"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={transaction?.fee || "0"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradeDate">Trade Date</Label>
                <Input
                  id="tradeDate"
                  name="tradeDate"
                  type="date"
                  defaultValue={
                    formatDateForInput(transaction?.tradeDate || null) ||
                    new Date().toISOString().split("T")[0]
                  }
                  required
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add any notes about this transaction..."
              defaultValue={transaction?.notes || ""}
              className="min-h-[100px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending} className="flex-1 md:flex-none">
              {isPending ? (
                "Saving..."
              ) : mode === "create" ? (
                <>
                  <ArrowDownRight className="h-4 w-4 mr-2" />
                  Add Transaction
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Transaction
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
