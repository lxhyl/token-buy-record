export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { fetchCryptoPrices, fetchStockPrices } from "@/lib/price-service";

const LANDING_ASSETS = [
  { symbol: "BTC", assetType: "crypto" },
  { symbol: "ETH", assetType: "crypto" },
  { symbol: "AAPL", assetType: "stock" },
  { symbol: "NVDA", assetType: "stock" },
  { symbol: "MSFT", assetType: "stock" },
  { symbol: "TSLA", assetType: "stock" },
];

const CRYPTO_SYMBOLS = LANDING_ASSETS.filter((a) => a.assetType === "crypto").map((a) => a.symbol);
const STOCK_SYMBOLS = LANDING_ASSETS.filter((a) => a.assetType === "stock").map((a) => a.symbol);

// Simple in-memory cache: refresh at most once per minute
let cache: { prices: Record<string, number>; ts: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json(cache.prices);
    }

    const [cryptoPrices, stockPrices] = await Promise.all([
      fetchCryptoPrices(CRYPTO_SYMBOLS),
      fetchStockPrices(STOCK_SYMBOLS),
    ]);

    const prices: Record<string, number> = {};
    cryptoPrices.forEach((price, symbol) => { prices[symbol] = price; });
    stockPrices.forEach((price, symbol) => { prices[symbol] = price; });

    cache = { prices, ts: now };
    return NextResponse.json(prices);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
