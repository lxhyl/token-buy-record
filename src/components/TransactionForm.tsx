"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { createDeposit, updateDeposit } from "@/actions/deposits";
import { Transaction, Deposit } from "@/lib/schema";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { TrendingUp, PiggyBank, X, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/components/I18nProvider";
import { SymbolAutocomplete } from "@/components/SymbolAutocomplete";
import { cn } from "@/lib/utils";

interface TransactionFormProps {
  transaction?: Transaction;
  deposit?: Deposit;
  mode?: "create" | "edit";
  initialAssetType?: string;
  initialTradeType?: "buy" | "sell";
  initialSymbol?: string;
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
  { value: "investment", icon: TrendingUp, labelKey: "form.investment", descKey: "form.investmentDesc" },
  { value: "deposit", icon: PiggyBank, labelKey: "form.depositType", descKey: "form.depositDesc" },
] as const;

export function TransactionForm({
  transaction,
  deposit,
  mode = "create",
  initialAssetType: initialAssetTypeProp,
  initialTradeType,
  initialSymbol,
  currency,
  rates,
}: TransactionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const mapToUiType = (type: string | undefined) => {
    if (type === "crypto" || type === "stock") return "investment";
    return type || "investment";
  };

  const initialAssetType = deposit ? "deposit" : mapToUiType(initialAssetTypeProp || transaction?.assetType);
  const [assetType, setAssetType] = useState(initialAssetType);
  const isDeposit = assetType === "deposit";
  const isInvestment = assetType === "investment";

  const [detectedType, setDetectedType] = useState<"crypto" | "stock" | "unknown">(
    (transaction?.assetType as "crypto" | "stock") || "unknown"
  );

  const [tradeType, setTradeType] = useState(initialTradeType || transaction?.tradeType || "buy");
  const [autoName, setAutoName] = useState(transaction?.name || deposit?.name || "");
  const [liveSymbol, setLiveSymbol] = useState(transaction?.symbol || deposit?.symbol || initialSymbol || "");
  const [liveQuantity, setLiveQuantity] = useState(transaction?.quantity || "");
  const [livePrice, setLivePrice] = useState(transaction?.price || "");
  const [liveCurrency, setLiveCurrency] = useState(transaction?.currency || deposit?.currency || currency);

  const [livePrincipal, setLivePrincipal] = useState(deposit?.principal || "");
  const [liveRate, setLiveRate] = useState(deposit?.interestRate || "");

  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [marketPriceCurrency, setMarketPriceCurrency] = useState<string>("USD");
  const [marketPriceSymbol, setMarketPriceSymbol] = useState<string>("");
  const [marketPriceName, setMarketPriceName] = useState<string>("");
  const [priceLoading, setPriceLoading] = useState(false);
  const priceAbortRef = useRef<AbortController | null>(null);
  // True when the user has typed in the name field; suppresses auto-refill
  // from symbol lookup. Edit mode starts true so we don't overwrite the
  // saved name. Selecting from the autocomplete list resets it to false.
  const nameManuallyEditedRef = useRef<boolean>(
    !!(transaction?.name || deposit?.name)
  );

  const fetchMarketPrice = useCallback(async (symbol: string) => {
    if (!symbol) {
      setMarketPrice(null);
      setMarketPriceSymbol("");
      setMarketPriceName("");
      return;
    }
    priceAbortRef.current?.abort();
    const controller = new AbortController();
    priceAbortRef.current = controller;
    setPriceLoading(true);
    try {
      const res = await fetch(
        `/api/price-lookup?symbol=${encodeURIComponent(symbol)}`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        if (!controller.signal.aborted) {
          setMarketPrice(data.price);
          setMarketPriceCurrency(data.currency || "USD");
          setMarketPriceSymbol(data.symbol || symbol);
          setMarketPriceName(data.name || "");
          if (data.name && !nameManuallyEditedRef.current) setAutoName(data.name);
          if (data.detectedType && data.detectedType !== "unknown") {
            setDetectedType(data.detectedType);
            if (data.detectedType === "crypto") setLiveCurrency("USD");
          }
        }
      }
    } catch {
      // aborted or network error
    } finally {
      if (!controller.signal.aborted) setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    const sym = liveSymbol.trim().toUpperCase();
    if (sym && isInvestment) {
      const timer = setTimeout(() => fetchMarketPrice(sym), 400);
      return () => clearTimeout(timer);
    } else {
      setMarketPrice(null);
    }
  }, [liveSymbol, isInvestment, fetchMarketPrice]);

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      let result: { error: string } | void;

      if (isDeposit) {
        if (mode === "edit" && deposit) {
          result = await updateDeposit(deposit.id, formData);
        } else {
          result = await createDeposit(formData);
        }
        if (result && "error" in result) {
          toast(result.error, "error");
          return;
        }
        toast(mode === "edit" ? t("deposit.updated") : t("deposit.created"), "success");
        router.push("/dashboard");
      } else {
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
      }
    });
  };

  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  const defaultCurrency = transaction?.currency || deposit?.currency || currency;

  const symbolPlaceholder = isDeposit
    ? t("form.symbolPlaceholderDeposit")
    : t("form.symbolPlaceholderInvestment" as "form.symbolPlaceholderCrypto");

  const namePlaceholder = isDeposit
    ? t("form.namePlaceholderDeposit")
    : t("form.namePlaceholderInvestment" as "form.namePlaceholderCrypto");

  // Summary computation
  const summaryNode = (() => {
    if (isDeposit) {
      const principal = parseFloat(String(livePrincipal));
      const rate = parseFloat(String(liveRate));
      const sym = liveSymbol.toUpperCase();
      const cur = liveCurrency || defaultCurrency;
      if (!isNaN(principal) && principal > 0 && !isNaN(rate) && rate > 0 && sym) {
        const dailyInterest = (principal * rate / 100 / 365);
        const fmtPrincipal = principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fmtDaily = dailyInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
        return (
          <p className="text-sm font-medium text-foreground">
            {sym} — {t("deposit.principal")}: <span className="font-num font-bold">{fmtPrincipal}</span> {cur}
            {" @ "}
            <span className="font-num">{rate.toFixed(2)}%</span>
            {" = "}
            <span className="font-num">{fmtDaily}</span> {cur}/{t("deposit.perDay")}
          </p>
        );
      }
      return <p className="text-sm text-muted-foreground">{t("form.summaryPlaceholder")}</p>;
    }

    const qty = parseFloat(liveQuantity);
    const prc = parseFloat(livePrice);
    const sym = liveSymbol.toUpperCase();
    const cur = liveCurrency || defaultCurrency;
    const tradeLabel = tradeType === "buy" ? t("form.buy") : t("form.sell");

    if (!isNaN(qty) && qty > 0 && !isNaN(prc) && prc > 0 && sym) {
      const total = qty * prc;
      const fmtQty = qty.toLocaleString(undefined, { maximumFractionDigits: 8 });
      const fmtPrice = prc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
      const fmtTotal = total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return (
        <p className="text-sm font-medium text-foreground">
          {tradeLabel}{" "}
          <span className="font-num">{fmtQty}</span> {sym} ×{" "}
          <span className="font-num">{fmtPrice}</span> ={" "}
          <span className="font-num font-bold">{fmtTotal}</span> {cur}
        </p>
      );
    }
    return <p className="text-sm text-muted-foreground">{t("form.summaryPlaceholder")}</p>;
  })();

  // Submit button styling based on action context
  const submitClass = isDeposit
    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
    : tradeType === "buy"
    ? "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600"
    : "bg-destructive hover:bg-destructive/90 text-destructive-foreground";

  return (
    <form action={handleSubmit} className="space-y-0 overflow-hidden">
      {/* Hidden fields */}
      {isDeposit && <input type="hidden" name="assetType" value="deposit" />}
      {!isDeposit && detectedType !== "unknown" && (
        <input type="hidden" name="assetType" value={detectedType} />
      )}
      {!isDeposit && <input type="hidden" name="tradeType" value={tradeType} />}

      {/* ── Section 1: Asset Type ──────────────────────── */}
      <div className="p-6 space-y-3 border-b">
        <div className="label-caps">{t("form.assetType")}</div>
        <div className="grid grid-cols-2 gap-3">
          {ASSET_TYPES.map(({ value, icon: Icon, labelKey, descKey }) => {
            const selected = assetType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setAssetType(value);
                  setLiveCurrency(currency);
                }}
                className={cn(
                  "relative flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all duration-150",
                  selected
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border hover:border-border/80 hover:bg-muted/30"
                )}
              >
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                  selected
                    ? value === "deposit" ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className={cn("text-sm font-semibold", selected ? "text-primary" : "text-foreground")}>
                    {t(labelKey as "form.investment")}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t(descKey as "form.investmentDesc")}
                  </div>
                </div>
                {selected && (
                  <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Trade Type (investments only, edit mode only) ──── */}
      {!isDeposit && mode === "edit" && (
        <div className="p-6 space-y-3 border-b animate-section-reveal">
          <div className="label-caps">{t("form.tradeType")}</div>
          <div className="grid grid-cols-2 rounded-md border overflow-hidden">
            {(["buy", "sell"] as const).map((type, idx) => {
              const selected = tradeType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTradeType(type)}
                  className={cn(
                    "py-2.5 text-sm font-semibold transition-all duration-150",
                    idx > 0 && "border-l",
                    selected
                      ? type === "buy"
                        ? "bg-emerald-600 text-white dark:bg-emerald-500"
                        : "bg-destructive text-destructive-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {type === "buy" ? t("form.buy") : t("form.sell")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 3: Fields ─────────────────────────── */}
      <div
        key={`${assetType}-${tradeType}`}
        className="p-6 space-y-4 border-b animate-section-reveal"
      >
        <div className="label-caps">
          {isDeposit ? t("form.depositDetails") : t("form.tradeDetails")}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 [&>div]:min-w-0">
          {/* Symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol">{t("form.symbol")}</Label>
            {isInvestment ? (
              <SymbolAutocomplete
                defaultValue={transaction?.symbol || initialSymbol || ""}
                placeholder={symbolPlaceholder}
                onChange={(val) => setLiveSymbol(val)}
                onSelect={(symbol, name, exchange) => {
                  setLiveSymbol(symbol);
                  if (name) {
                    setAutoName(name);
                    // Treat dropdown picks as authoritative: subsequent symbol
                    // changes are free to refill the name automatically.
                    nameManuallyEditedRef.current = false;
                  }
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
                defaultValue={deposit?.symbol || ""}
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
              onChange={(e) => {
                setAutoName(e.target.value);
                nameManuallyEditedRef.current = true;
              }}
            />
          </div>

          {/* ── Deposit fields ── */}
          {isDeposit ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="principal">{t("deposit.principal")}</Label>
                <Input
                  id="principal"
                  name="principal"
                  type="number"
                  step="0.01"
                  placeholder="10000.00"
                  defaultValue={deposit?.principal || ""}
                  onChange={(e) => setLivePrincipal(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestRate">{t("deposit.interestRate")}</Label>
                <Input
                  id="interestRate"
                  name="interestRate"
                  type="number"
                  step="0.0001"
                  placeholder="3.5000"
                  defaultValue={deposit?.interestRate || ""}
                  onChange={(e) => setLiveRate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">{t("form.currency")}</Label>
                <Select
                  id="currency"
                  name="currency"
                  value={liveCurrency}
                  onChange={(e) => setLiveCurrency(e.target.value)}
                  className="h-10"
                >
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                  <option value="HKD">HKD</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">{t("deposit.startDate")}</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={
                    formatDateForInput(deposit?.startDate) ||
                    new Date().toISOString().split("T")[0]
                  }
                  required
                  className="h-10 min-w-0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maturityDate">{t("deposit.maturityDate")}</Label>
                <Input
                  id="maturityDate"
                  name="maturityDate"
                  type="date"
                  defaultValue={formatDateForInput(deposit?.maturityDate)}
                  className="h-10 min-w-0"
                />
              </div>
            </>
          ) : (
            <>
              {/* ── Investment fields ── */}
              <div className="space-y-2">
                <Label htmlFor="quantity">{t("form.quantity")}</Label>
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
                <div className="flex items-center justify-between gap-2 min-h-5">
                  <Label htmlFor="price">{t("form.price")}</Label>
                  {liveSymbol.trim() && (
                    priceLoading ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {"…"}
                      </span>
                    ) : marketPrice !== null ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLivePrice(String(marketPrice));
                          const el = document.getElementById("price") as HTMLInputElement;
                          if (el) el.value = String(marketPrice);
                        }}
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors underline underline-offset-2 text-right truncate max-w-[70%]"
                        title={
                          marketPriceName
                            ? `${marketPriceSymbol} — ${marketPriceName} · ${t("form.useMarketPrice")}`
                            : `${marketPriceSymbol} · ${t("form.useMarketPrice")}`
                        }
                      >
                        <span className="font-semibold">{marketPriceSymbol}</span>
                        {marketPriceName && (
                          <span className="text-muted-foreground"> · {marketPriceName}</span>
                        )}
                        {": "}
                        <span className="font-num">
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

              <div className="space-y-2">
                <Label htmlFor="currency">{t("form.currency")}</Label>
                <Select
                  id="currency"
                  name="currency"
                  value={liveCurrency}
                  onChange={(e) => setLiveCurrency(e.target.value)}
                  className="h-10"
                >
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                  <option value="HKD">HKD</option>
                </Select>
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="tradeDate">{t("form.tradeDate")}</Label>
                <Input
                  id="tradeDate"
                  name="tradeDate"
                  type="date"
                  defaultValue={
                    formatDateForInput(transaction?.tradeDate) ||
                    new Date().toISOString().split("T")[0]
                  }
                  required
                  className="h-10 min-w-0"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────── */}
      <div className="p-6 space-y-2 border-b">
        <Label htmlFor="notes" className="text-xs text-muted-foreground">
          {t("form.notes")}
        </Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder={isDeposit ? t("deposit.notesPlaceholder") : t("form.notesPlaceholder")}
          defaultValue={transaction?.notes || deposit?.notes || ""}
          className="min-h-[68px] text-sm resize-none"
        />
      </div>

      {/* ── Summary + Actions ─────────────────────────── */}
      <div className="p-6 bg-muted/20 space-y-4">
        {/* Live summary */}
        <div className="min-h-[20px]">{summaryNode}</div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className={cn("flex-1 md:flex-none h-10 px-8 font-semibold rounded-md transition-colors", submitClass)}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("form.saving")}
              </span>
            ) : isDeposit
              ? (mode === "edit" ? t("deposit.update") : t("deposit.confirm"))
              : t("form.confirmTransaction")
            }
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-10 px-6 rounded-md"
          >
            <X className="h-4 w-4 mr-2" />
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </form>
  );
}
