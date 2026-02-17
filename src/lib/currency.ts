export type SupportedCurrency = "USD" | "CNY" | "HKD";

export type ExchangeRates = Record<string, number>;

export const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  { code: string; symbol: string; locale: string; name: string }
> = {
  USD: { code: "USD", symbol: "$", locale: "en-US", name: "US Dollar" },
  CNY: { code: "CNY", symbol: "\u00a5", locale: "zh-CN", name: "Chinese Yuan" },
  HKD: { code: "HKD", symbol: "HK$", locale: "en-HK", name: "Hong Kong Dollar" },
};

export function convertAmount(
  usdValue: number,
  currency: SupportedCurrency,
  rates: ExchangeRates
): number {
  if (currency === "USD") return usdValue;
  return usdValue * (rates[currency] ?? 1);
}

/**
 * Convert a price from its original transaction currency to USD.
 * If the transaction is already in USD, returns as-is.
 */
export function toUsd(
  value: number,
  txCurrency: string,
  rates: ExchangeRates
): number {
  if (txCurrency === "USD" || !rates[txCurrency]) return value;
  return value / rates[txCurrency];
}
