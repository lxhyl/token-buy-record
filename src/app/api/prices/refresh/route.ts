export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, currentPrices, priceHistory } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/price-service";
import { getUserId } from "@/lib/auth-utils";

const PRICE_STALE_MS = 60 * 1000;

/**
 * Lightweight price refresh for client-side polling after SSR.
 * - Skips historical backfill (handled separately by /api/prices)
 * - Returns immediately if DB cache is fresh enough
 * - Updates currentPrices + today's priceHistory snapshot
 *
 * Response shape: { refreshed: boolean, count: number }
 */
export async function GET() {
  try {
    const userId = await getUserId();

    const [allTx, dbPrices] = await Promise.all([
      db.select().from(transactions).where(eq(transactions.userId, userId)),
      db.select().from(currentPrices),
    ]);

    const assetMap = new Map<string, string>();
    for (const tx of allTx) {
      if (
        (tx.assetType === "crypto" || tx.assetType === "stock") &&
        !assetMap.has(tx.symbol)
      ) {
        assetMap.set(tx.symbol, tx.assetType);
      }
    }

    if (assetMap.size === 0) {
      return NextResponse.json({ refreshed: false, count: 0 });
    }

    const now = Date.now();
    const cached = new Map<string, Date | null>();
    for (const p of dbPrices) cached.set(p.symbol, p.updatedAt);

    const stale = Array.from(assetMap.entries()).filter(([symbol]) => {
      const at = cached.get(symbol);
      return !at || now - at.getTime() > PRICE_STALE_MS;
    });

    if (stale.length === 0) {
      return NextResponse.json({ refreshed: false, count: 0 });
    }

    const assets = stale.map(([symbol, assetType]) => ({ symbol, assetType }));
    const results = await fetchAllPrices(assets);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await Promise.all(
      results.map(async ({ symbol, price, source }) => {
        await db
          .insert(currentPrices)
          .values({ symbol, price: price.toString() })
          .onConflictDoUpdate({
            target: currentPrices.symbol,
            set: { price: price.toString(), updatedAt: new Date() },
          });
        try {
          await db
            .insert(priceHistory)
            .values({ symbol, date: today, price: price.toString(), source })
            .onConflictDoNothing();
        } catch {
          /* ignore */
        }
      })
    );

    return NextResponse.json({ refreshed: true, count: results.length });
  } catch (error) {
    console.error("Price refresh failed:", error);
    return NextResponse.json(
      { refreshed: false, count: 0, error: "refresh failed" },
      { status: 500 }
    );
  }
}
