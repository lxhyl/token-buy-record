/**
 * Asset type detection: automatically determine if a symbol is crypto or stock.
 *
 * Detection order:
 * 1. Local COINGECKO_ID_MAP → crypto (instant)
 * 2. Binance API `{SYMBOL}USDT` → crypto
 * 3. Yahoo Finance quote → stock
 * 4. Unknown
 */

import { COINGECKO_ID_MAP } from "./price-service";

const API_TIMEOUT_MS = 5000;

/** Synchronous check: is this symbol in our known crypto list? */
export function isKnownCrypto(symbol: string): boolean {
  return symbol.toUpperCase() in COINGECKO_ID_MAP;
}

/** Try Binance API to check if symbol is a crypto */
async function checkBinance(symbol: string): Promise<boolean> {
  try {
    const pair = `${symbol.toUpperCase()}USDT`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      return !!data.price;
    }
  } catch {
    // Try US endpoint as fallback
    try {
      const pair = `${symbol.toUpperCase()}USDT`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      const res = await fetch(
        `https://api.binance.us/api/v3/ticker/price?symbol=${pair}`,
        { signal: controller.signal, cache: "no-store" }
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        return !!data.price;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

/** Try Yahoo Finance to check if symbol is a stock */
async function checkYahoo(symbol: string): Promise<boolean> {
  try {
    const YahooFinance = (await import("yahoo-finance2")).default;
    const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
    const quote = await Promise.race([
      yf.quote(symbol),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), API_TIMEOUT_MS)
      ),
    ]);
    return !!quote?.regularMarketPrice;
  } catch {
    return false;
  }
}

/**
 * Detect whether a symbol is crypto, stock, or unknown.
 */
export async function detectAssetType(
  symbol: string
): Promise<"crypto" | "stock" | "unknown"> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return "unknown";

  // 1. Known crypto from local map
  if (isKnownCrypto(sym)) return "crypto";

  // 2. Check Binance
  if (await checkBinance(sym)) return "crypto";

  // 3. Check Yahoo Finance
  if (await checkYahoo(sym)) return "stock";

  return "unknown";
}
