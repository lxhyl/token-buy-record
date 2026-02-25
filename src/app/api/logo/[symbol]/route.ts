import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assetLogos } from "@/lib/schema";
import { eq } from "drizzle-orm";

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

async function fetchFromTwelveData(symbol: string): Promise<string | null> {
  if (!TWELVE_DATA_API_KEY) return null;
  try {
    // Try as-is first (stocks), then as crypto pair (BTC → BTC/USD)
    for (const s of [symbol, `${symbol}/USD`]) {
      const res = await fetch(
        `https://api.twelvedata.com/logo?symbol=${encodeURIComponent(s)}&apikey=${TWELVE_DATA_API_KEY}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const url = data.url || data.logo_base;
      if (url) return url;
    }
  } catch {}
  return null;
}

function getFreeLogoUrl(symbol: string, assetType: string): string {
  if (assetType === "crypto") {
    return `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`;
  }
  return `https://financialmodelingprep.com/image-stock/${symbol}.png`;
}

async function urlIsReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

function cacheLogoUrl(symbol: string, url: string) {
  db.insert(assetLogos)
    .values({ symbol, url })
    .onConflictDoUpdate({
      target: assetLogos.symbol,
      set: { url, updatedAt: new Date() },
    })
    .catch((err) => console.error(`[Logo] Failed to cache URL for ${symbol}:`, err));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  const assetType = request.nextUrl.searchParams.get("type") ?? "stock";

  // Validate symbol: alphanumeric, dots, hyphens, 1-10 chars
  if (!/^[A-Z0-9.\-]{1,10}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  // 1. Check DB cache
  const [cached] = await db
    .select()
    .from(assetLogos)
    .where(eq(assetLogos.symbol, symbol))
    .limit(1);

  if (cached) {
    return NextResponse.redirect(cached.url, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=604800, immutable" },
    });
  }

  // 2. Try free CDN (CoinCap for crypto, FMP for stocks)
  const freeUrl = getFreeLogoUrl(symbol, assetType);
  if (await urlIsReachable(freeUrl)) {
    cacheLogoUrl(symbol, freeUrl);
    return NextResponse.redirect(freeUrl, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=604800, immutable" },
    });
  }

  // 3. Fallback to Twelve Data
  const twelveUrl = await fetchFromTwelveData(symbol);
  if (twelveUrl) {
    cacheLogoUrl(symbol, twelveUrl);
    return NextResponse.redirect(twelveUrl, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=604800, immutable" },
    });
  }

  return NextResponse.json({ error: "No logo found" }, { status: 404 });
}
