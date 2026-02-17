/**
 * Historical price fetching service
 * - Crypto: CoinGecko /coins/{id}/market_chart/range
 * - Stocks: yahoo-finance2 chart()
 */

import YahooFinance from "yahoo-finance2";
import { COINGECKO_ID_MAP } from "./price-service";
import { getExchangeRates } from "./exchange-rates";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const API_TIMEOUT_MS = 15000;

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

function toMidnightUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export interface HistoricalPrice {
  symbol: string;
  date: Date;
  price: number;
  source: string;
}

/**
 * Fetch historical crypto prices from CoinGecko market_chart/range API.
 * Returns daily prices normalized to midnight UTC.
 */
export async function fetchCryptoHistoricalPrices(
  symbol: string,
  from: Date,
  to: Date
): Promise<HistoricalPrice[]> {
  const coinId =
    COINGECKO_ID_MAP[symbol.toUpperCase()] || symbol.toLowerCase();

  const fromTs = Math.floor(from.getTime() / 1000);
  const toTs = Math.floor(to.getTime() / 1000);

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromTs}&to=${toTs}`;
    const res = await fetchWithTimeout(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(
        `[CoinGecko Historical] Failed for ${symbol}: ${res.status}`
      );
      return [];
    }

    const data: { prices: [number, number][] } = await res.json();
    if (!data.prices || data.prices.length === 0) return [];

    // Deduplicate by date (keep last entry per day)
    const byDate = new Map<string, HistoricalPrice>();
    for (const [timestamp, price] of data.prices) {
      const date = toMidnightUTC(new Date(timestamp));
      const key = date.toISOString();
      byDate.set(key, {
        symbol: symbol.toUpperCase(),
        date,
        price,
        source: "coingecko",
      });
    }

    return Array.from(byDate.values());
  } catch (e) {
    console.warn(
      `[CoinGecko Historical] Error for ${symbol}:`,
      (e as Error).message
    );
    return [];
  }
}

/**
 * Fetch historical stock prices using yahoo-finance2 chart().
 * Converts to USD using current exchange rates.
 */
export async function fetchStockHistoricalPrices(
  symbol: string,
  from: Date,
  to: Date
): Promise<HistoricalPrice[]> {
  const rates = await getExchangeRates();

  const toUsd = (price: number, currency?: string | null): number => {
    if (!currency || currency === "USD") return price;
    const rate = rates[currency];
    return rate ? price / rate : price;
  };

  try {
    const result = await Promise.race([
      yf.chart(symbol, {
        period1: from,
        period2: to,
        interval: "1d",
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Yahoo Finance chart timeout")),
          API_TIMEOUT_MS
        )
      ),
    ]);

    if (!result || !result.quotes || result.quotes.length === 0) return [];

    const currency = result.meta?.currency;
    const prices: HistoricalPrice[] = [];

    for (const quote of result.quotes) {
      if (quote.close != null && quote.date) {
        const date = toMidnightUTC(new Date(quote.date));
        prices.push({
          symbol: symbol.toUpperCase(),
          date,
          price: toUsd(quote.close, currency),
          source: "yahoo",
        });
      }
    }

    return prices;
  } catch (e) {
    console.warn(
      `[Yahoo Historical] Error for ${symbol}:`,
      (e as Error).message
    );
    return [];
  }
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
