/**
 * Price fetching service
 * - Crypto: Binance → CoinGecko fallback
 * - Stocks: yahoo-finance2
 */

import YahooFinance from "yahoo-finance2";
import { getExchangeRates } from "./currency";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const API_TIMEOUT_MS = 8000; // 8s timeout for external API calls

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// ============ Crypto: Binance API (primary) ============

interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

// Symbol → CoinGecko ID mapping for fallback
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  ATOM: "cosmos",
  LTC: "litecoin",
  ARB: "arbitrum",
  OP: "optimism",
  APT: "aptos",
  SUI: "sui",
  NEAR: "near",
  FIL: "filecoin",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  WIF: "dogwifcoin",
  TRX: "tron",
  TON: "the-open-network",
};

async function fetchCryptoPricesFromBinance(
  symbols: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (symbols.length === 0) return result;

  try {
    // Try batch request first
    const pairs = symbols.map((s) => `"${s.toUpperCase()}USDT"`);
    const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(`[${pairs.join(",")}]`)}`;
    const res = await fetchWithTimeout(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Binance batch failed: ${res.status}`);

    const data: BinanceTickerPrice[] = await res.json();
    for (const item of data) {
      const sym = item.symbol.replace(/USDT$/, "");
      result.set(sym, parseFloat(item.price));
    }
  } catch (e) {
    console.warn("[Binance] Batch request failed, trying individually:", (e as Error).message);
    // Fallback: try individually
    for (const symbol of symbols) {
      try {
        const pair = `${symbol.toUpperCase()}USDT`;
        const res = await fetchWithTimeout(
          `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data: BinanceTickerPrice = await res.json();
          result.set(symbol.toUpperCase(), parseFloat(data.price));
        }
      } catch {
        // skip
      }
    }
  }

  return result;
}

// ============ Crypto: CoinGecko (fallback) ============

async function fetchCryptoPricesFromCoinGecko(
  symbols: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (symbols.length === 0) return result;

  // Map symbols to CoinGecko IDs
  const idToSymbol = new Map<string, string>();
  const ids: string[] = [];
  for (const sym of symbols) {
    const id = COINGECKO_ID_MAP[sym.toUpperCase()] || sym.toLowerCase();
    ids.push(id);
    idToSymbol.set(id, sym.toUpperCase());
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`;
    const res = await fetchWithTimeout(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`CoinGecko failed: ${res.status}`);

    const data: Record<string, { usd?: number }> = await res.json();
    for (const [id, priceData] of Object.entries(data)) {
      const sym = idToSymbol.get(id);
      if (sym && priceData.usd) {
        result.set(sym, priceData.usd);
      }
    }
  } catch (e) {
    console.warn("[CoinGecko] Request failed:", (e as Error).message);
  }

  return result;
}

/**
 * Fetch crypto prices: try Binance first, then CoinGecko for any missing symbols
 */
export async function fetchCryptoPrices(
  symbols: string[]
): Promise<Map<string, number>> {
  if (symbols.length === 0) return new Map();

  // Try Binance first
  const result = await fetchCryptoPricesFromBinance(symbols);

  // Find missing symbols and fallback to CoinGecko
  const missing = symbols.filter((s) => !result.has(s.toUpperCase()));
  if (missing.length > 0) {
    console.log(`[PriceService] Binance missed: ${missing.join(", ")}. Trying CoinGecko...`);
    const fallback = await fetchCryptoPricesFromCoinGecko(missing);
    fallback.forEach((price, symbol) => {
      result.set(symbol, price);
    });
  }

  return result;
}

// ============ Stocks: yahoo-finance2 ============

export async function fetchStockPrices(
  symbols: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (symbols.length === 0) return result;

  const raceTimeout = <T>(promise: Promise<T>): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Yahoo Finance timeout")), API_TIMEOUT_MS)
      ),
    ]);

  // Fetch exchange rates for converting non-USD prices
  const rates = await getExchangeRates();

  const toUsd = (price: number, currency?: string | null): number => {
    if (!currency || currency === "USD") return price;
    const rate = rates[currency];
    return rate ? price / rate : price;
  };

  try {
    const quotes = await raceTimeout(yf.quote(symbols));
    if (Array.isArray(quotes)) {
      for (const quote of quotes) {
        if (quote.regularMarketPrice && quote.symbol) {
          result.set(
            quote.symbol.toUpperCase(),
            toUsd(quote.regularMarketPrice, quote.currency)
          );
        }
      }
    }
  } catch {
    // Fallback: fetch individually with timeout
    for (const symbol of symbols) {
      try {
        const quote = await raceTimeout(yf.quote(symbol));
        if (quote.regularMarketPrice) {
          result.set(
            symbol.toUpperCase(),
            toUsd(quote.regularMarketPrice, quote.currency)
          );
        }
      } catch {
        // skip
      }
    }
  }

  return result;
}

// ============ Unified API ============

export interface PriceResult {
  symbol: string;
  price: number;
  source: "binance" | "coingecko" | "yahoo";
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
