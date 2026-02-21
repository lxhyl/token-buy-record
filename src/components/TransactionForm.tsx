"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { Transaction } from "@/lib/schema";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { Bitcoin, TrendingUp, DollarSign, Coins, X } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/components/I18nProvider";
import { SymbolAutocomplete } from "@/components/SymbolAutocomplete";

interface TransactionFormProps {
  transaction?: Transaction;
  mode?: "create" | "edit";
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

// Map stock exchange names (from Yahoo Finance) to currencies
function exchangeToCurrency(exchange: string): SupportedCurrency | null {
  const e = exchange.toLowerCase();
  if (e.includes("hong kong") || e.includes("hkse")) return "HKD";
  if (e.includes("shanghai") || e.includes("shenzhen") || e.includes("shh") || e.includes("shz")) return "CNY";
  return "USD";
}

const ASSET_TYPES = [
  { value: "crypto", icon: Bitcoin, color: "blue" },
  { value: "stock", icon: TrendingUp, color: "indigo" },
] as const;

const ASSET_COLOR_MAP: Record<string, { iconBg: string; selectedBorder: string; selectedBg: string; hoverBorder: string }> = {
  blue: {
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
    selectedBorder: "border-blue-500",
    selectedBg: "bg-blue-50/50 dark:bg-blue-950/30",
    hoverBorder: "hover:border-blue-300",
  },
  indigo: {
    iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    selectedBorder: "border-indigo-500",
    selectedBg: "bg-indigo-50/50 dark:bg-indigo-950/30",
    hoverBorder: "hover:border-indigo-300",
  },
};

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
  const [incomeMode, setIncomeMode] = useState<"cash" | "asset">(
    transaction?.tradeType === "income" && parseFloat(transaction?.quantity || "0") === 0
      ? "cash"
      : "asset"
  );
  const [autoName, setAutoName] = useState(transaction?.name || "");
  const [liveSymbol, setLiveSymbol] = useState(transaction?.symbol || "");
  const [liveQuantity, setLiveQuantity] = useState(transaction?.quantity || "");
  const [livePrice, setLivePrice] = useState(transaction?.price || "");
  const [liveAmount, setLiveAmount] = useState(
    transaction?.tradeType === "income" && parseFloat(transaction?.quantity || "0") === 0
      ? transaction?.totalAmount || ""
      : ""
  );
  const [liveCurrency, setLiveCurrency] = useState(transaction?.currency || currency);

  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [marketPriceCurrency, setMarketPriceCurrency] = useState<string>("USD");
  const [priceLoading, setPriceLoading] = useState(false);
  const priceAbortRef = useRef<AbortController | null>(null);

  const fetchMarketPrice = useCallback(async (symbol: string, type: string) => {
    if (!symbol || (type !== "crypto" && type !== "stock")) {
      setMarketPrice(null);
      return;
    }
    priceAbortRef.current?.abort();
    const controller = new AbortController();
    priceAbortRef.current = controller;
    setPriceLoading(true);
    try {
      const res = await fetch(
        `/api/price-lookup?symbol=${encodeURIComponent(symbol)}&type=${type}`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        if (!controller.signal.aborted) {
          setMarketPrice(data.price);
          setMarketPriceCurrency(data.currency || "USD");
        }
      }
    } catch {
      // aborted or network error
    } finally {
      if (!controller.signal.aborted) setPriceLoading(false);
    }
  }, []);

  // Fetch price when symbol or asset type changes
  useEffect(() => {
    const sym = liveSymbol.trim().toUpperCase();
    if (sym && (assetType === "crypto" || assetType === "stock")) {
      const timer = setTimeout(() => fetchMarketPrice(sym, assetType), 400);
      return () => clearTimeout(timer);
    } else {
      setMarketPrice(null);
    }
  }, [liveSymbol, assetType, fetchMarketPrice]);

  const isIncome = tradeType === "income";
  const isCashIncome = isIncome && incomeMode === "cash";

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      let result: { error: string } | void;
      if (mode === "edit" && transaction) {
        result = await updateTransaction(transaction.id, formData);
      } else {
        result = await createTransaction(formData);
      }
      if (result && "error" in result) {
        toast(result.error, "error");
        return;
      }
      toast(
        mode === "edit" ? t("form.transactionUpdated") : t("form.transactionCreated"),
        "success"
      );
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
  }[assetType] || t("form.symbol");

  const namePlaceholder = {
    crypto: t("form.namePlaceholderCrypto"),
    stock: t("form.namePlaceholderStock"),
  }[assetType] || t("form.nameOptional");

  const assetDescKey: Record<string, string> = {
    crypto: "form.cryptoDesc",
    stock: "form.stockDesc",
  };

  const assetLabelKey: Record<string, string> = {
    crypto: "form.crypto",
    stock: "form.stock",
  };

  return (
    <form action={handleSubmit} className="space-y-6 overflow-hidden">
      {/* Hidden fields for asset/trade type */}
      <input type="hidden" name="assetType" value={assetType} />
      <input type="hidden" name="tradeType" value={tradeType} />

      {/* Section 1: Asset Type Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("form.assetType")}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {ASSET_TYPES.map(({ value, icon: Icon, color }) => {
            const colors = ASSET_COLOR_MAP[color];
            const selected = assetType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setAssetType(value);
                  if (value === "crypto") setLiveCurrency("USD");
                  else if (value !== assetType) setLiveCurrency(currency);
                }}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                  selected
                    ? `border-2 ${colors.selectedBorder} ${colors.selectedBg} scale-[1.02]`
                    : `border border-border opacity-60 hover:opacity-100 ${colors.hoverBorder}`
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.iconBg} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">{t(assetLabelKey[value] as "form.crypto")}</span>
                <span className="text-xs text-muted-foreground">{t(assetDescKey[value] as "form.cryptoDesc")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Trade Type Pills */}
      <div className="animate-section-reveal space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("form.tradeType")}
        </h3>
        <div className="flex gap-2">
          {(["buy", "sell", "income"] as const).map((type) => {
            const selected = tradeType === type;
            const label = type === "buy"
              ? t("form.buy")
              : type === "sell"
              ? t("form.sell")
              : t("form.income");
            const selectedClass = type === "buy"
              ? "bg-emerald-500 text-white"
              : type === "sell"
              ? "bg-red-500 text-white"
              : "bg-amber-500 text-white";
            return (
              <button
                key={type}
                type="button"
                onClick={() => setTradeType(type)}
                className={`h-10 px-5 rounded-full font-medium text-sm transition-all duration-200 ${
                  selected ? selectedClass : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Income Mode Toggle */}
      {isIncome && (
        <div className="animate-section-reveal space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("form.incomeTypeSection")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIncomeMode("cash")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                incomeMode === "cash"
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
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
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
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

      {/* Section 3: Form Fields with Animation */}
      <div
        key={`${assetType}-${tradeType}-${incomeMode}`}
        className="animate-section-reveal space-y-4"
      >
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {isIncome ? t("form.incomeDetails") : t("form.tradeDetails")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 [&>div]:min-w-0">
          {/* Symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol">{t("form.symbol")}</Label>
            {assetType === "stock" ? (
              <SymbolAutocomplete
                defaultValue={transaction?.symbol || ""}
                placeholder={symbolPlaceholder}
                onSelect={(symbol, name, exchange) => {
                  setLiveSymbol(symbol);
                  if (name) setAutoName(name);
                  if (exchange) {
                    const inferred = exchangeToCurrency(exchange);
                    if (inferred) setLiveCurrency(inferred);
                  }
                }}
              />
            ) : (
              <Input
                id="symbol"
                name="symbol"
                placeholder={symbolPlaceholder}
                defaultValue={transaction?.symbol || ""}
                onChange={(e) => setLiveSymbol(e.target.value)}
                required
              />
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t("form.nameOptional")}</Label>
            <Input
              id="name"
              name="name"
              placeholder={namePlaceholder}
              value={autoName}
              onChange={(e) => setAutoName(e.target.value)}
            />
          </div>

          {/* Conditional trade detail fields */}
          {isCashIncome ? (
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
                  onChange={(e) => setLiveAmount(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center h-5">
                  <Label htmlFor="quantity">
                    {isIncome ? t("form.quantityReceived") : t("form.quantity")}
                  </Label>
                </div>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  defaultValue={transaction?.quantity || ""}
                  onChange={(e) => setLiveQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between h-5">
                  <Label htmlFor="price">
                    {isIncome ? t("form.marketPriceAtReceipt") : t("form.price")}
                  </Label>
                  {liveSymbol.trim() && (
                    priceLoading ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-muted-foreground border-t-transparent" />
                      </span>
                    ) : marketPrice !== null ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLivePrice(String(marketPrice));
                          const el = document.getElementById("price") as HTMLInputElement;
                          if (el) el.value = String(marketPrice);
                        }}
                        className="text-xs font-medium text-primary/70 hover:text-primary transition-colors cursor-pointer"
                        title={t("form.useMarketPrice")}
                      >
                        {t("form.currentPrice")}{" "}
                        <span className="font-mono tabular-nums">
                          {marketPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                        </span>
                        {" "}{marketPriceCurrency}
                      </button>
                    ) : null
                  )}
                </div>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  defaultValue={transaction?.price || ""}
                  onChange={(e) => setLivePrice(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">{t("form.currency")}</Label>
            <Select
              id="currency"
              name="currency"
              value={liveCurrency}
              onChange={(e) => setLiveCurrency(e.target.value)}
              className="h-11"
            >
              <option value="USD">USD</option>
              <option value="CNY">CNY</option>
              <option value="HKD">HKD</option>
            </Select>
          </div>

          {/* Fee */}
          {!isCashIncome && (
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
          {isCashIncome && <input type="hidden" name="fee" value="0" />}

          {/* Trade Date */}
          <div className="space-y-2">
            <Label htmlFor="tradeDate">
              {isIncome ? t("form.incomeDate") : t("form.tradeDate")}
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
              className="h-11 min-w-0"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-xs text-muted-foreground">{t("form.notes")}</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder={t("form.notesPlaceholder")}
          defaultValue={transaction?.notes || ""}
          className="min-h-[72px] text-sm bg-muted/20 border-dashed"
        />
      </div>

      {/* Summary & Actions */}
      <div className="rounded-xl border bg-muted/30 backdrop-blur-sm p-4 space-y-3">
        {(() => {
          const qty = parseFloat(liveQuantity);
          const prc = parseFloat(livePrice);
          const amt = parseFloat(liveAmount);
          const sym = liveSymbol.toUpperCase();
          const cur = liveCurrency || defaultCurrency;

          // For qty x price modes (market buy/sell, asset income)
          const hasQtyPrice = !isNaN(qty) && qty > 0 && !isNaN(prc) && prc > 0 && sym;
          // For amount-based modes (cash income)
          const hasAmount = !isNaN(amt) && amt > 0 && sym;

          const tradeLabel = tradeType === "buy"
            ? t("form.buy")
            : tradeType === "sell"
            ? t("form.sell")
            : t("form.income");

          if (hasQtyPrice) {
            const total = qty * prc;
            const fmtQty = qty.toLocaleString(undefined, { maximumFractionDigits: 8 });
            const fmtPrice = prc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
            const fmtTotal = total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return (
              <p className="text-sm font-medium text-foreground">
                {tradeLabel}{" "}
                <span className="font-num">{fmtQty}</span> {sym} x{" "}
                <span className="font-num">{fmtPrice}</span> ={" "}
                <span className="font-num font-bold">{fmtTotal}</span> {cur}
              </p>
            );
          } else if (hasAmount) {
            const fmtAmount = amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return (
              <p className="text-sm font-medium text-foreground">
                {tradeLabel}{" "}
                <span className="font-num font-bold">{fmtAmount}</span> {cur} — {sym}
              </p>
            );
          } else {
            return (
              <p className="text-sm text-muted-foreground">
                {t("form.summaryPlaceholder")}
              </p>
            );
          }
        })()}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className={`flex-1 md:flex-none h-11 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] ${
              tradeType === "buy"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                : tradeType === "sell"
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            }`}
          >
            {isPending
              ? t("form.saving")
              : isIncome
              ? t("form.confirmIncome")
              : t("form.confirmTransaction")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-11 px-6 rounded-xl"
          >
            <X className="h-4 w-4 mr-2" />
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </form>
  );
}
