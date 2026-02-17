export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, currentPrices, priceHistory } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/price-service";
import {
  fetchCryptoHistoricalPrices,
  fetchStockHistoricalPrices,
  delay,
} from "@/lib/historical-price-service";
import { getUserId } from "@/lib/auth-utils";

function toMidnightUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/**
 * GET /api/prices - Fetch latest prices for all held assets and update DB.
 * Also backfills any missing days in priceHistory since the last recorded date.
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

    const marketAssets = Array.from(assetMap.entries())
      .filter(([_, assetType]) => assetType === "crypto" || assetType === "stock")
      .map(([symbol, assetType]) => ({ symbol, assetType }));

    if (marketAssets.length === 0) {
      return NextResponse.json({ updated: 0, prices: [] });
    }

    // 2. Fetch latest prices from external APIs
    const priceResults = await fetchAllPrices(marketAssets);

    // 3. Write current prices + today's snapshot to priceHistory
    const today = toMidnightUTC(new Date());

    for (const { symbol, price, source } of priceResults) {
      await db
        .insert(currentPrices)
        .values({ symbol, price: price.toString() })
        .onConflictDoUpdate({
          target: currentPrices.symbol,
          set: { price: price.toString(), updatedAt: new Date() },
        });

      await db
        .insert(priceHistory)
        .values({
          symbol,
          date: today,
          price: price.toString(),
          source: source || "api",
        })
        .onConflictDoNothing();
    }

    // 4. Backfill missing days between last recorded date and yesterday
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    for (const { symbol, assetType } of marketAssets) {
      const latestRow = await db
        .select({ date: priceHistory.date })
        .from(priceHistory)
        .where(eq(priceHistory.symbol, symbol))
        .orderBy(asc(priceHistory.date))
        .then((rows) => rows.at(-1));

      if (!latestRow) continue; // No history at all — full backfill handled by analysis page

      const lastDate = toMidnightUTC(new Date(latestRow.date));
      const gapDays = Math.floor(
        (yesterday.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (gapDays <= 0) continue; // No gap to fill

      const fetchFrom = new Date(lastDate);
      fetchFrom.setUTCDate(fetchFrom.getUTCDate() + 1);

      try {
        let fetched;
        if (assetType === "crypto") {
          fetched = await fetchCryptoHistoricalPrices(symbol, fetchFrom, today);
          await delay(1500);
        } else {
          fetched = await fetchStockHistoricalPrices(symbol, fetchFrom, today);
          await delay(500);
        }

        for (const p of fetched) {
          await db
            .insert(priceHistory)
            .values({
              symbol: p.symbol,
              date: p.date,
              price: p.price.toString(),
              source: p.source,
            })
            .onConflictDoNothing();
        }
      } catch (e) {
        console.warn(`[PriceBackfill] Failed for ${symbol}:`, (e as Error).message);
      }
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
