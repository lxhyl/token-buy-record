export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchCryptoPrices, fetchStockPrices } from "@/lib/price-service";

/**
 * GET /api/price-lookup?symbol=BTC&type=crypto
 * Lightweight single-symbol price lookup for the transaction form.
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
    let price: number | null = null;

    if (type === "crypto") {
      const prices = await fetchCryptoPrices([symbol]);
      price = prices.get(symbol) ?? null;
    } else if (type === "stock") {
      const prices = await fetchStockPrices([symbol]);
      price = prices.get(symbol) ?? null;
    }

    if (price === null) {
      return NextResponse.json({ symbol, price: null });
    }

    return NextResponse.json({ symbol, price });
  } catch (error) {
    console.error("Price lookup error:", error);
    return NextResponse.json({ symbol, price: null });
  }
}
