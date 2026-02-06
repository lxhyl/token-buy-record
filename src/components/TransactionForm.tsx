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

interface TransactionFormProps {
  transaction?: Transaction;
  mode?: "create" | "edit";
}

export function TransactionForm({
  transaction,
  mode = "create",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Add New Transaction" : "Edit Transaction"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
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
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </Select>
            </div>

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
              <Label htmlFor="price">Price (USD)</Label>
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
              <Label htmlFor="fee">Fee (USD)</Label>
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add any notes about this transaction..."
              defaultValue={transaction?.notes || ""}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : mode === "create"
                ? "Add Transaction"
                : "Update Transaction"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
