import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assetLogos } from "@/lib/schema";
import { eq } from "drizzle-orm";

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

async function fetchLogoUrl(symbol: string): Promise<string | null> {
  const res = await fetch(
    `https://api.twelvedata.com/logo?symbol=${encodeURIComponent(symbol)}&apikey=${TWELVE_DATA_API_KEY}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.url || data.logo_base || null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();

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

  // 2. Fetch from Twelve Data
  if (!TWELVE_DATA_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    // Try as-is first (works for stocks), then try as crypto pair (BTC → BTC/USD)
    let logoUrl = await fetchLogoUrl(symbol);
    if (!logoUrl) {
      logoUrl = await fetchLogoUrl(`${symbol}/USD`);
    }
    if (!logoUrl) {
      return NextResponse.json({ error: "No logo URL" }, { status: 404 });
    }

    // 3. Save URL to DB (fire and forget)
    db.insert(assetLogos)
      .values({ symbol, url: logoUrl })
      .onConflictDoUpdate({
        target: assetLogos.symbol,
        set: { url: logoUrl, updatedAt: new Date() },
      })
      .catch((err) => {
        console.error(`[Logo] Failed to cache URL for ${symbol}:`, err);
      });

    return NextResponse.redirect(logoUrl, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=604800, immutable" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch logo" }, { status: 404 });
  }
}
