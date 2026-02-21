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
import { TrendingUp, PiggyBank, X } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/components/I18nProvider";
import { SymbolAutocomplete } from "@/components/SymbolAutocomplete";

interface TransactionFormProps {
  transaction?: Transaction;
  deposit?: Deposit;
  mode?: "create" | "edit";
  initialAssetType?: string;
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
  { value: "investment", icon: TrendingUp, color: "blue" },
  { value: "deposit", icon: PiggyBank, color: "green" },
] as const;

const ASSET_COLOR_MAP: Record<string, { iconBg: string; selectedBorder: string; selectedBg: string; hoverBorder: string }> = {
  blue: {
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
    selectedBorder: "border-blue-500",
    selectedBg: "bg-blue-50/50 dark:bg-blue-950/30",
    hoverBorder: "hover:border-blue-300",
  },
  green: {
    iconBg: "bg-gradient-to-br from-green-500 to-emerald-500",
    selectedBorder: "border-green-500",
    selectedBg: "bg-green-50/50 dark:bg-green-950/30",
    hoverBorder: "hover:border-green-300",
  },
};

const assetLabelKey: Record<string, string> = {
  investment: "form.investment",
  deposit: "form.depositType",
};

const assetDescKey: Record<string, string> = {
  investment: "form.investmentDesc",
  deposit: "form.depositDesc",
};

export function TransactionForm({
  transaction,
  deposit,
  mode = "create",
  initialAssetType: initialAssetTypeProp,
  currency,
  rates,
}: TransactionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  // Map old crypto/stock to "investment" for the UI
  const mapToUiType = (type: string | undefined) => {
    if (type === "crypto" || type === "stock") return "investment";
    return type || "investment";
  };

  const initialAssetType = deposit ? "deposit" : mapToUiType(initialAssetTypeProp || transaction?.assetType);
  const [assetType, setAssetType] = useState(initialAssetType);
  const isDeposit = assetType === "deposit";
  const isInvestment = assetType === "investment";

  // Track the detected type from API (crypto/stock) for the hidden field
  const [detectedType, setDetectedType] = useState<"crypto" | "stock" | "unknown">(
    (transaction?.assetType as "crypto" | "stock") || "unknown"
  );

  const [tradeType, setTradeType] = useState(transaction?.tradeType || "buy");
  const [autoName, setAutoName] = useState(transaction?.name || deposit?.name || "");
  const [liveSymbol, setLiveSymbol] = useState(transaction?.symbol || deposit?.symbol || "");
  const [liveQuantity, setLiveQuantity] = useState(transaction?.quantity || "");
  const [livePrice, setLivePrice] = useState(transaction?.price || "");
  const [liveCurrency, setLiveCurrency] = useState(transaction?.currency || deposit?.currency || currency);

  // Deposit-specific state
  const [livePrincipal, setLivePrincipal] = useState(deposit?.principal || "");
  const [liveRate, setLiveRate] = useState(deposit?.interestRate || "");

  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [marketPriceCurrency, setMarketPriceCurrency] = useState<string>("USD");
  const [priceLoading, setPriceLoading] = useState(false);
  const priceAbortRef = useRef<AbortController | null>(null);

  const fetchMarketPrice = useCallback(async (symbol: string) => {
    if (!symbol) {
      setMarketPrice(null);
      return;
    }
    priceAbortRef.current?.abort();
    const controller = new AbortController();
    priceAbortRef.current = controller;
    setPriceLoading(true);
    try {
      // No type param — let API auto-detect
      const res = await fetch(
        `/api/price-lookup?symbol=${encodeURIComponent(symbol)}`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        if (!controller.signal.aborted) {
          setMarketPrice(data.price);
          setMarketPriceCurrency(data.currency || "USD");
          if (data.detectedType && data.detectedType !== "unknown") {
            setDetectedType(data.detectedType);
            // Auto-set currency for crypto
            if (data.detectedType === "crypto") {
              setLiveCurrency("USD");
            }
          }
        }
      }
    } catch {
      // aborted or network error
    } finally {
      if (!controller.signal.aborted) setPriceLoading(false);
    }
  }, []);

  // Fetch price when symbol changes (for investment type only)
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
        // Deposit flow
        if (mode === "edit" && deposit) {
          result = await updateDeposit(deposit.id, formData);
        } else {
          result = await createDeposit(formData);
        }
        if (result && "error" in result) {
          toast(result.error, "error");
          return;
        }
        toast(
          mode === "edit" ? t("deposit.updated") : t("deposit.created"),
          "success"
        );
        router.push("/dashboard");
      } else {
        // Transaction flow
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

  return (
    <form action={handleSubmit} className="space-y-6 overflow-hidden">
      {/* Hidden fields — assetType is auto-detected for investments, not sent from UI */}
      {isDeposit && <input type="hidden" name="assetType" value="deposit" />}
      {!isDeposit && detectedType !== "unknown" && (
        <input type="hidden" name="assetType" value={detectedType} />
      )}
      {!isDeposit && <input type="hidden" name="tradeType" value={tradeType} />}

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
                  if (value === "investment") setLiveCurrency(currency);
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
                <span className="font-semibold text-sm">{t(assetLabelKey[value] as "form.investment")}</span>
                <span className="text-xs text-muted-foreground">{t(assetDescKey[value] as "form.investmentDesc")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Trade Type Pills (not shown for deposits) */}
      {!isDeposit && (
        <div className="animate-section-reveal space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("form.tradeType")}
          </h3>
          <div className="flex gap-2">
            {(["buy", "sell"] as const).map((type) => {
              const selected = tradeType === type;
              const label = type === "buy"
                ? t("form.buy")
                : t("form.sell");
              const selectedClass = type === "buy"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white";
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
      )}

      {/* Section 3: Form Fields */}
      <div
        key={`${assetType}-${tradeType}`}
        className="animate-section-reveal space-y-4"
      >
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {isDeposit
            ? t("form.depositDetails")
            : t("form.tradeDetails")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 [&>div]:min-w-0">
          {/* Symbol — use SymbolAutocomplete for all investments */}
          <div className="space-y-2">
            <Label htmlFor="symbol">{t("form.symbol")}</Label>
            {isInvestment ? (
              <SymbolAutocomplete
                defaultValue={transaction?.symbol || ""}
                placeholder={symbolPlaceholder}
                onChange={(val) => setLiveSymbol(val)}
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
              onChange={(e) => setAutoName(e.target.value)}
            />
          </div>

          {/* ── Deposit-specific fields ── */}
          {isDeposit ? (
            <>
              {/* Principal */}
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

              {/* Interest Rate */}
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

              {/* Start Date */}
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
                  className="h-11 min-w-0"
                />
              </div>

              {/* Maturity Date */}
              <div className="space-y-2">
                <Label htmlFor="maturityDate">{t("deposit.maturityDate")}</Label>
                <Input
                  id="maturityDate"
                  name="maturityDate"
                  type="date"
                  defaultValue={formatDateForInput(deposit?.maturityDate)}
                  className="h-11 min-w-0"
                />
              </div>
            </>
          ) : (
            <>
              {/* ── Transaction-specific fields ── */}
              <div className="space-y-2">
                    <div className="flex items-center h-5">
                      <Label htmlFor="quantity">
                        {t("form.quantity")}
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
                        {t("form.price")}
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

              {/* Trade Date */}
              <div className="space-y-2">
                <Label htmlFor="tradeDate">
                  {t("form.tradeDate")}
                </Label>
                <Input
                  id="tradeDate"
                  name="tradeDate"
                  type="date"
                  defaultValue={
                    formatDateForInput(transaction?.tradeDate) ||
                    new Date().toISOString().split("T")[0]
                  }
                  required
                  className="h-11 min-w-0"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-xs text-muted-foreground">{t("form.notes")}</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder={isDeposit ? t("deposit.notesPlaceholder") : t("form.notesPlaceholder")}
          defaultValue={transaction?.notes || deposit?.notes || ""}
          className="min-h-[72px] text-sm bg-muted/20 border-dashed"
        />
      </div>

      {/* Summary & Actions */}
      <div className="rounded-xl border bg-muted/30 backdrop-blur-sm p-4 space-y-3">
        {(() => {
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
            return (
              <p className="text-sm text-muted-foreground">
                {t("form.summaryPlaceholder")}
              </p>
            );
          }

          const qty = parseFloat(liveQuantity);
          const prc = parseFloat(livePrice);
          const sym = liveSymbol.toUpperCase();
          const cur = liveCurrency || defaultCurrency;

          const hasQtyPrice = !isNaN(qty) && qty > 0 && !isNaN(prc) && prc > 0 && sym;

          const tradeLabel = tradeType === "buy"
            ? t("form.buy")
            : t("form.sell");

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
              isDeposit
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                : tradeType === "buy"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                : "bg-gradient-to-r from-red-500 to-rose-500 text-white"
            }`}
          >
            {isPending
              ? t("form.saving")
              : isDeposit
              ? (mode === "edit" ? t("deposit.update") : t("deposit.confirm"))
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
