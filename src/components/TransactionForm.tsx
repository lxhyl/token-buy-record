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
import { useI18n } from "@/components/I18nProvider";

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
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [assetType, setAssetType] = useState(transaction?.assetType || "crypto");
  const [tradeType, setTradeType] = useState(transaction?.tradeType || "buy");
  const [subType, setSubType] = useState(transaction?.subType || "fixed");
  const [incomeMode, setIncomeMode] = useState<"cash" | "asset">(
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
        toast(t("form.transactionUpdated"), "success");
      } else {
        await createTransaction(formData);
        toast(t("form.transactionCreated"), "success");
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
    crypto: t("form.symbolPlaceholderCrypto"),
    stock: t("form.symbolPlaceholderStock"),
    deposit: t("form.symbolPlaceholderDeposit"),
    bond: t("form.symbolPlaceholderBond"),
  }[assetType] || t("form.symbol");

  const namePlaceholder = {
    crypto: t("form.namePlaceholderCrypto"),
    stock: t("form.namePlaceholderStock"),
    deposit: t("form.namePlaceholderDeposit"),
    bond: t("form.namePlaceholderBond"),
  }[assetType] || t("form.nameOptional");

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
            {mode === "create" ? t("form.addNewTransaction") : t("form.editTransaction")}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form action={handleSubmit} className="space-y-6">
          {/* Asset Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("form.assetInfo")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">{t("form.symbol")}</Label>
                <Input
                  id="symbol"
                  name="symbol"
                  placeholder={symbolPlaceholder}
                  defaultValue={transaction?.symbol || ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t("form.nameOptional")}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={namePlaceholder}
                  defaultValue={transaction?.name || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetType">{t("form.assetType")}</Label>
                <Select
                  id="assetType"
                  name="assetType"
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  required
                  className="h-11"
                >
                  <option value="crypto">{t("form.crypto")}</option>
                  <option value="stock">{t("form.stock")}</option>
                  <option value="deposit">{t("form.depositType")}</option>
                  <option value="bond">{t("form.bondType")}</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradeType">{t("form.tradeType")}</Label>
                <Select
                  id="tradeType"
                  name="tradeType"
                  value={tradeType}
                  onChange={(e) => setTradeType(e.target.value)}
                  required
                  className="h-11"
                >
                  <option value="buy">{isFixedIncome ? t("form.depositAction") : t("form.buy")}</option>
                  <option value="sell">{isFixedIncome ? t("form.withdrawAction") : t("form.sell")}</option>
                  <option value="income">{t("form.income")}</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Income Mode Toggle — only for non-fixed-income assets */}
          {isIncome && !isFixedIncome && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t("form.incomeTypeSection")}
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
                    <p className="font-semibold text-sm">{t("form.cashIncome")}</p>
                    <p className="text-xs text-muted-foreground">{t("form.cashIncomeDesc")}</p>
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
                    <p className="font-semibold text-sm">{t("form.assetIncome")}</p>
                    <p className="text-xs text-muted-foreground">{t("form.assetIncomeDesc")}</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Deposit Sub-type Toggle */}
          {isFixedIncome && assetType === "deposit" && tradeType === "buy" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t("form.depositTypeSection")}
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
                    <p className="font-semibold text-sm">{t("form.fixedTerm")}</p>
                    <p className="text-xs text-muted-foreground">{t("form.fixedTermDesc")}</p>
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
                    <p className="font-semibold text-sm">{t("form.demandType")}</p>
                    <p className="text-xs text-muted-foreground">{t("form.demandDesc")}</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Trade Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {isFixedIncome
                ? tradeType === "buy" ? t("form.depositDetails") : tradeType === "sell" ? t("form.withdrawalDetails") : t("form.incomeDetails")
                : isIncome ? t("form.incomeDetails") : t("form.tradeDetails")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isFixedIncome && tradeType !== "income" ? (
                <>
                  <input type="hidden" name="quantity" value="1" />
                  <input type="hidden" name="price" value="0" />
                  <input type="hidden" name="fee" value="0" />
                  <div className="space-y-2">
                    <Label htmlFor="incomeAmount">
                      {tradeType === "buy" ? t("form.principalAmount") : t("form.withdrawalAmount")}
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
                  <input type="hidden" name="quantity" value="0" />
                  <input type="hidden" name="price" value="0" />
                  <input type="hidden" name="fee" value="0" />
                  <div className="space-y-2">
                    <Label htmlFor="incomeAmount">{t("form.incomeAmount")}</Label>
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
                  <input type="hidden" name="quantity" value="0" />
                  <input type="hidden" name="price" value="0" />
                  <div className="space-y-2">
                    <Label htmlFor="incomeAmount">{t("form.incomeAmount")}</Label>
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
                      {isIncome ? t("form.quantityReceived") : t("form.quantity")}
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
                      {isIncome ? t("form.marketPriceAtReceipt") : t("form.price")}
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
                <Label htmlFor="currency">{t("form.currency")}</Label>
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
                  <Label htmlFor="fee">{t("form.fee")}</Label>
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
                  <Label htmlFor="interestRate">{t("form.interestRate")}</Label>
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
                  <Label htmlFor="maturityDate">{t("form.maturityDate")}</Label>
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
                    ? tradeType === "buy" ? t("form.depositDate") : tradeType === "sell" ? t("form.withdrawalDate") : t("form.incomeDate")
                    : isIncome ? t("form.incomeDate") : t("form.tradeDate")}
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
            <Label htmlFor="notes">{t("form.notes")}</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder={t("form.notesPlaceholder")}
              defaultValue={transaction?.notes || ""}
              className="min-h-[100px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending} className="flex-1 md:flex-none">
              {isPending ? (
                t("form.saving")
              ) : isIncome ? (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  {mode === "create" ? t("form.recordIncome") : t("form.updateIncome")}
                </>
              ) : mode === "create" ? (
                <>
                  <ArrowDownRight className="h-4 w-4 mr-2" />
                  {t("form.addTransactionBtn")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("form.updateTransaction")}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              <X className="h-4 w-4 mr-2" />
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
