"use client";

import { useState, useTransition } from "react";
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
import { ArrowDownRight, ArrowUpRight, TrendingUp, Save, X, DollarSign, Coins, Landmark, PiggyBank } from "lucide-react";
import { useToast } from "@/components/Toast";

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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [assetType, setAssetType] = useState(transaction?.assetType || "crypto");
  const [tradeType, setTradeType] = useState(transaction?.tradeType || "buy");
  const [subType, setSubType] = useState(transaction?.subType || "fixed");
  const [incomeMode, setIncomeMode] = useState<"cash" | "asset">(
    // Infer from existing transaction: if income with quantity=0, it's cash
    transaction?.tradeType === "income" && parseFloat(transaction?.quantity || "0") === 0
      ? "cash"
      : "asset"
  );

  const isIncome = tradeType === "income";
  const isCashIncome = isIncome && incomeMode === "cash";
  const isFixedIncome = assetType === "deposit" || assetType === "bond";
  const showMaturity = isFixedIncome && (subType === "fixed" || assetType === "bond");

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      if (mode === "edit" && transaction) {
        await updateTransaction(transaction.id, formData);
        toast("Transaction updated", "success");
      } else {
        await createTransaction(formData);
        toast("Transaction created", "success");
      }
      router.push("/transactions");
    });
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  const defaultCurrency = transaction?.currency || currency;

  const symbolPlaceholder = {
    crypto: "BTC, ETH, SOL...",
    stock: "AAPL, TSLA, 0700.HK...",
    deposit: "ABC Bank 1Y, Savings...",
    bond: "US10Y, Corp Bond...",
  }[assetType] || "Symbol";

  const namePlaceholder = {
    crypto: "Bitcoin, Ethereum...",
    stock: "Apple Inc, Tencent...",
    deposit: "1-Year Fixed Deposit...",
    bond: "US Treasury 10Y...",
  }[assetType] || "Name";

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
                  placeholder={symbolPlaceholder}
                  defaultValue={transaction?.symbol || ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={namePlaceholder}
                  defaultValue={transaction?.name || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetType">Asset Type</Label>
                <Select
                  id="assetType"
                  name="assetType"
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  required
                  className="h-11"
                >
                  <option value="crypto">Crypto</option>
                  <option value="stock">Stock</option>
                  <option value="deposit">Deposit</option>
                  <option value="bond">Bond</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradeType">Trade Type</Label>
                <Select
                  id="tradeType"
                  name="tradeType"
                  value={tradeType}
                  onChange={(e) => setTradeType(e.target.value)}
                  required
                  className="h-11"
                >
                  <option value="buy">{isFixedIncome ? "Deposit" : "Buy"}</option>
                  <option value="sell">{isFixedIncome ? "Withdraw" : "Sell"}</option>
                  <option value="income">Income</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Income Mode Toggle — only for non-fixed-income assets */}
          {isIncome && !isFixedIncome && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Income Type
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIncomeMode("cash")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    incomeMode === "cash"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950"
                      : "border-muted hover:border-amber-300"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    incomeMode === "cash" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Cash Income</p>
                    <p className="text-xs text-muted-foreground">Dividends, interest, coupons</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIncomeMode("asset")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    incomeMode === "asset"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950"
                      : "border-muted hover:border-amber-300"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    incomeMode === "asset" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <Coins className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Asset Income</p>
                    <p className="text-xs text-muted-foreground">Staking rewards, distributions</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Deposit Sub-type Toggle */}
          {isFixedIncome && assetType === "deposit" && tradeType === "buy" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Deposit Type
              </h3>
              <input type="hidden" name="subType" value={subType} />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSubType("fixed")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    subType === "fixed"
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-muted hover:border-green-300"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    subType === "fixed" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Fixed-term</p>
                    <p className="text-xs text-muted-foreground">定期存款</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSubType("demand")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    subType === "demand"
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-muted hover:border-green-300"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    subType === "demand" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <PiggyBank className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Demand</p>
                    <p className="text-xs text-muted-foreground">活期存款</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Trade Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {isFixedIncome
                ? tradeType === "buy" ? "Deposit Details" : tradeType === "sell" ? "Withdrawal Details" : "Income Details"
                : isIncome ? "Income Details" : "Trade Details"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isFixedIncome && tradeType !== "income" ? (
                <>
                  {/* Fixed-income buy/sell: single amount field */}
                  <input type="hidden" name="quantity" value="1" />
                  <input type="hidden" name="price" value="0" />
                  <input type="hidden" name="fee" value="0" />
                  <div className="space-y-2">
                    <Label htmlFor="incomeAmount">
                      {tradeType === "buy" ? "Principal Amount" : "Withdrawal Amount"}
                    </Label>
                    <Input
                      id="incomeAmount"
                      name="incomeAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      defaultValue={
                        transaction && (transaction.assetType === "deposit" || transaction.assetType === "bond")
                          ? transaction.totalAmount || ""
                          : ""
                      }
                      required
                    />
                  </div>
                </>
              ) : isFixedIncome && tradeType === "income" ? (
                <>
                  {/* Fixed-income income: cash income flow */}
                  <input type="hidden" name="quantity" value="0" />
                  <input type="hidden" name="price" value="0" />
                  <input type="hidden" name="fee" value="0" />
                  <div className="space-y-2">
                    <Label htmlFor="incomeAmount">Income Amount</Label>
                    <Input
                      id="incomeAmount"
                      name="incomeAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      defaultValue={
                        transaction?.tradeType === "income" && parseFloat(transaction?.quantity || "0") === 0
                          ? transaction?.totalAmount || ""
                          : ""
                      }
                      required
                    />
                  </div>
                </>
              ) : isCashIncome ? (
                <>
                  {/* Cash income: hide quantity/price, show income amount */}
                  <input type="hidden" name="quantity" value="0" />
                  <input type="hidden" name="price" value="0" />
                  <div className="space-y-2">
                    <Label htmlFor="incomeAmount">Income Amount</Label>
                    <Input
                      id="incomeAmount"
                      name="incomeAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      defaultValue={
                        transaction?.tradeType === "income" && parseFloat(transaction?.quantity || "0") === 0
                          ? transaction?.totalAmount || ""
                          : ""
                      }
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">
                      {isIncome ? "Quantity Received" : "Quantity"}
                    </Label>
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
                    <Label htmlFor="price">
                      {isIncome ? "Market Price at Receipt" : "Price"}
                    </Label>
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
                </>
              )}

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

              {!isCashIncome && !isFixedIncome && (
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
              )}
              {(isCashIncome && !isFixedIncome) && <input type="hidden" name="fee" value="0" />}

              {/* Interest Rate — for deposit/bond buy */}
              {isFixedIncome && tradeType === "buy" && (
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    name="interestRate"
                    type="number"
                    step="0.01"
                    placeholder="3.50"
                    defaultValue={transaction?.interestRate || ""}
                  />
                </div>
              )}

              {/* Maturity Date — for fixed deposits and bonds */}
              {showMaturity && tradeType === "buy" && (
                <div className="space-y-2">
                  <Label htmlFor="maturityDate">Maturity Date</Label>
                  <Input
                    id="maturityDate"
                    name="maturityDate"
                    type="date"
                    defaultValue={formatDateForInput(transaction?.maturityDate || null)}
                    className="h-11"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tradeDate">
                  {isFixedIncome
                    ? tradeType === "buy" ? "Deposit Date" : tradeType === "sell" ? "Withdrawal Date" : "Income Date"
                    : isIncome ? "Income Date" : "Trade Date"}
                </Label>
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
              ) : isIncome ? (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  {mode === "create" ? "Record Income" : "Update Income"}
                </>
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
