export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchCryptoPrices } from "@/lib/price-service";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const API_TIMEOUT_MS = 8000;

/**
 * GET /api/price-lookup?symbol=BTC&type=crypto
 * Returns price in the asset's native currency (crypto→USD, stock→native).
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const type = request.nextUrl.searchParams.get("type")?.trim();

  if (!symbol || !type) {
    return NextResponse.json({ error: "Missing symbol or type" }, { status: 400 });
  }

  try {
    if (type === "crypto") {
      const prices = await fetchCryptoPrices([symbol]);
      const price = prices.get(symbol) ?? null;
      return NextResponse.json({ symbol, price, currency: "USD" });
    }

    if (type === "stock") {
      const quote = await Promise.race([
        yf.quote(symbol),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), API_TIMEOUT_MS)
        ),
      ]);
      if (quote.regularMarketPrice) {
        return NextResponse.json({
          symbol,
          price: quote.regularMarketPrice,
          currency: quote.currency || "USD",
        });
      }
      return NextResponse.json({ symbol, price: null, currency: null });
    }

    return NextResponse.json({ symbol, price: null, currency: null });
  } catch (error) {
    console.error("Price lookup error:", error);
    return NextResponse.json({ symbol, price: null, currency: null });
  }
}
