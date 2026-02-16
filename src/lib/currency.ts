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

const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  CNY: 7.25,
  HKD: 7.82,
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let cachedRates: ExchangeRates | null = null;
let cachedAt = 0;

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
    return cachedRates;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 1800 },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates: ExchangeRates = {
      USD: 1,
      ...(data.rates ?? {}),
    };
    cachedRates = rates;
    cachedAt = now;
    return rates;
  } catch (error) {
    console.error("Failed to fetch exchange rates, using fallback:", error);
    cachedRates = FALLBACK_RATES;
    cachedAt = now;
    return FALLBACK_RATES;
  }
}

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
