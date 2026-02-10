export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, currentPrices } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/price-service";
import { getUserId } from "@/lib/auth-utils";

/**
 * GET /api/prices - Fetch latest prices for all held assets and update DB
 */
export async function GET() {
  try {
    const userId = await getUserId();

    // 1. Get unique symbols from user's transactions
    const allTx = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId));

    const assetMap = new Map<string, string>();
    for (const tx of allTx) {
      if (!assetMap.has(tx.symbol)) {
        assetMap.set(tx.symbol, tx.assetType);
      }
    }

    const assets = Array.from(assetMap.entries())
      .filter(([_, assetType]) => assetType === "crypto" || assetType === "stock")
      .map(([symbol, assetType]) => ({
        symbol,
        assetType,
      }));

    if (assets.length === 0) {
      return NextResponse.json({ updated: 0, prices: [] });
    }

    // 2. Fetch latest prices from external APIs
    const priceResults = await fetchAllPrices(assets);

    // 3. Upsert prices into DB using ON CONFLICT
    for (const { symbol, price } of priceResults) {
      await db
        .insert(currentPrices)
        .values({ symbol, price: price.toString() })
        .onConflictDoUpdate({
          target: currentPrices.symbol,
          set: { price: price.toString(), updatedAt: new Date() },
        });
    }

    return NextResponse.json({
      updated: priceResults.length,
      prices: priceResults.map((p) => ({
        symbol: p.symbol,
        price: p.price,
        source: p.source,
      })),
    });
  } catch (error) {
    console.error("Price fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
