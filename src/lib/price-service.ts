/**
 * Price fetching service
 * - Crypto: Binance public API (no key needed)
 * - Stocks: yahoo-finance2 (no key needed)
 */

import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ============ Crypto: Binance API ============

interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

/**
 * Fetch a single crypto price from Binance
 * Symbol should be like "BTC", "ETH" — we append "USDT"
 */
export async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  try {
    const pair = `${symbol.toUpperCase()}USDT`;
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data: BinanceTickerPrice = await res.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

/**
 * Fetch multiple crypto prices from Binance in one request
 */
export async function fetchCryptoPrices(
  symbols: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (symbols.length === 0) return result;

  try {
    const pairs = symbols.map((s) => `"${s.toUpperCase()}USDT"`);
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs.join(",")}]`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      // If batch fails, try individually
      throw new Error("batch failed");
    }

    const data: BinanceTickerPrice[] = await res.json();
    for (const item of data) {
      const sym = item.symbol.replace(/USDT$/, "");
      result.set(sym, parseFloat(item.price));
    }
  } catch {
    // Fallback: try individually
    for (const symbol of symbols) {
      const price = await fetchCryptoPrice(symbol);
      if (price !== null) {
        result.set(symbol.toUpperCase(), price);
      }
    }
  }

  return result;
}

// ============ Stocks: yahoo-finance2 ============

/**
 * Fetch a single stock price from Yahoo Finance
 */
export async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    const quote = await yf.quote(symbol);
    return quote.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch multiple stock prices from Yahoo Finance
 */
export async function fetchStockPrices(
  symbols: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (symbols.length === 0) return result;

  // yahoo-finance2 supports batch via array
  try {
    const quotes = await yf.quote(symbols);
    if (Array.isArray(quotes)) {
      for (const quote of quotes) {
        if (quote.regularMarketPrice && quote.symbol) {
          result.set(quote.symbol.toUpperCase(), quote.regularMarketPrice);
        }
      }
    }
  } catch {
    // Fallback: fetch individually
    for (const symbol of symbols) {
      const price = await fetchStockPrice(symbol);
      if (price !== null) {
        result.set(symbol.toUpperCase(), price);
      }
    }
  }

  return result;
}

// ============ Unified API ============

export interface PriceResult {
  symbol: string;
  price: number;
  source: "binance" | "yahoo";
}

/**
 * Fetch prices for a mixed list of assets
 */
export async function fetchAllPrices(
  assets: { symbol: string; assetType: string }[]
): Promise<PriceResult[]> {
  const cryptoSymbols = assets
    .filter((a) => a.assetType === "crypto")
    .map((a) => a.symbol);
  const stockSymbols = assets
    .filter((a) => a.assetType === "stock")
    .map((a) => a.symbol);

  const [cryptoPrices, stockPrices] = await Promise.all([
    fetchCryptoPrices(cryptoSymbols),
    fetchStockPrices(stockSymbols),
  ]);

  const results: PriceResult[] = [];

  cryptoPrices.forEach((price, symbol) => {
    results.push({ symbol, price, source: "binance" });
  });
  stockPrices.forEach((price, symbol) => {
    results.push({ symbol, price, source: "yahoo" });
  });

  return results;
}
