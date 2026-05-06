import { db } from "@/lib/db";
import { transactions, currentPrices, priceHistory } from "@/lib/schema";
import { eq, desc, and, asc, notInArray } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/price-service";
import { normalizeStockSymbol } from "@/lib/stock-utils";
import { detectAssetType } from "@/lib/asset-detection";
import { transactionSchema } from "@/lib/validation";

export interface TransactionInput {
  symbol: string;
  name?: string;
  assetType?: string;
  tradeType: string;
  quantity: number;
  price: number;
  fee?: number;
  currency: string;
  tradeDate: string;
  notes?: string;
}

export async function listTransactions(userId: string) {
  return await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        notInArray(transactions.assetType, ["deposit", "bond"])
      )
    )
    .orderBy(desc(transactions.tradeDate));
}

export async function getTransactionById(userId: string, id: number) {
  const result = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  return result[0] || null;
}

export async function createTransactionForUser(
  userId: string,
  input: TransactionInput
): Promise<{ error: string } | { id: number }> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  const symbol = String(v.symbol);
  const name = v.name || "";
  const assetType: string =
    v.assetType ||
    (await detectAssetType(symbol).then((t) =>
      t === "unknown" ? "stock" : t
    ));
  const tradeType = v.tradeType;
  const quantity = String(v.quantity);
  const price = String(v.price);
  const fee = String(v.fee);
  const currency = v.currency;
  const tradeDate = v.tradeDate;
  const notes = v.notes || "";

  const totalAmount = (v.quantity * v.price + v.fee).toFixed(2);

  let realizedPnl: string | null = null;
  const normalizedSymbol = normalizeStockSymbol(symbol, assetType);

  if (tradeType === "sell") {
    const available = await getAvailableQuantity(userId, normalizedSymbol);
    if (v.quantity > available + 0.00000001) {
      return {
        error: `Insufficient holdings: you have ${available} ${normalizedSymbol} but tried to sell ${v.quantity}`,
      };
    }
    realizedPnl = await calculateFifoRealizedPnl(
      userId,
      normalizedSymbol,
      v.quantity,
      parseFloat(totalAmount)
    );
  }

  const result = await db
    .insert(transactions)
    .values({
      userId,
      symbol: normalizedSymbol,
      name: name || null,
      assetType,
      tradeType,
      quantity,
      price,
      totalAmount,
      fee: fee || "0",
      currency,
      tradeDate: new Date(tradeDate),
      notes: notes || null,
      realizedPnl,
    })
    .returning({ id: transactions.id });

  return { id: result[0].id };
}

export async function updateTransactionForUser(
  userId: string,
  id: number,
  input: TransactionInput
): Promise<{ error: string } | { id: number }> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  const symbol = String(v.symbol);
  const name = v.name || "";
  const assetType: string =
    v.assetType ||
    (await detectAssetType(symbol).then((t) =>
      t === "unknown" ? "stock" : t
    ));
  const tradeType = v.tradeType;
  const quantity = String(v.quantity);
  const price = String(v.price);
  const fee = String(v.fee);
  const currency = v.currency;
  const tradeDate = v.tradeDate;
  const notes = v.notes || "";

  const totalAmount = (v.quantity * v.price + v.fee).toFixed(2);
  const normalizedSymbol = normalizeStockSymbol(symbol, assetType);

  let updatedRealizedPnl: string | null = null;
  if (tradeType === "sell") {
    const available = await getAvailableQuantity(userId, normalizedSymbol, id);
    if (v.quantity > available + 0.00000001) {
      return {
        error: `Insufficient holdings: you have ${available} ${normalizedSymbol} but tried to sell ${v.quantity}`,
      };
    }
    updatedRealizedPnl = await calculateFifoRealizedPnl(
      userId,
      normalizedSymbol,
      v.quantity,
      parseFloat(totalAmount),
      id
    );
  }

  await db
    .update(transactions)
    .set({
      symbol: normalizedSymbol,
      name: name || null,
      assetType,
      tradeType,
      quantity,
      price,
      totalAmount,
      fee: fee || "0",
      currency,
      tradeDate: new Date(tradeDate),
      notes: notes || null,
      realizedPnl: updatedRealizedPnl,
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  return { id };
}

export async function deleteTransactionForUser(userId: string, id: number) {
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

// ── Price operations (used by CLI and server actions) ───────

const PRICE_STALE_MS = 60 * 1000;

/**
 * Fast path used during SSR: returns DB-cached prices instantly without
 * blocking on external APIs. Stale prices are refreshed by a client-side
 * call to /api/prices after the page has rendered.
 */
export async function getCachedPricesForUser(userId: string) {
  const dbPrices = await db.select().from(currentPrices);
  // userId param kept for API symmetry with getLatestPricesForUser.
  void userId;
  return dbPrices;
}

export async function getLatestPricesForUser(userId: string) {
  const allTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId));
  const dbPrices = await db.select().from(currentPrices);

  const assetMap = new Map<string, string>();
  for (const tx of allTx) {
    if (!assetMap.has(tx.symbol)) {
      assetMap.set(tx.symbol, tx.assetType);
    }
  }

  if (assetMap.size === 0) return dbPrices;

  const now = Date.now();
  const dbPriceMap = new Map<
    string,
    { price: string; updatedAt: Date | null }
  >();
  for (const p of dbPrices) {
    dbPriceMap.set(p.symbol, { price: p.price, updatedAt: p.updatedAt });
  }

  let needsRefresh = false;
  assetMap.forEach((_, symbol) => {
    const cached = dbPriceMap.get(symbol);
    if (
      !cached ||
      !cached.updatedAt ||
      now - cached.updatedAt.getTime() > PRICE_STALE_MS
    ) {
      needsRefresh = true;
    }
  });

  if (!needsRefresh) return dbPrices;

  const assets = Array.from(assetMap.entries()).map(([symbol, assetType]) => ({
    symbol,
    assetType,
  }));

  try {
    const freshPrices = await Promise.race([
      fetchAllPrices(assets),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Price fetch overall timeout")),
          10000
        )
      ),
    ]);

    const todayMidnight = new Date();
    todayMidnight.setUTCHours(0, 0, 0, 0);

    for (const { symbol, price, source } of freshPrices) {
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
          .values({
            symbol,
            date: todayMidnight,
            price: price.toString(),
            source,
          })
          .onConflictDoNothing();
      } catch {
        // Ignore duplicates
      }
    }

    return await db.select().from(currentPrices);
  } catch (error) {
    console.error("Failed to fetch latest prices, using cached:", error);
    return dbPrices;
  }
}

export async function getAllCurrentPrices() {
  return await db.select().from(currentPrices);
}

// ── FIFO P&L (internal) ────────────────────────────────────

async function calculateFifoRealizedPnl(
  userId: string,
  symbol: string,
  sellQuantity: number,
  sellTotalAmount: number,
  excludeSellId?: number
): Promise<string> {
  const allTxs = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.symbol, symbol))
    )
    .orderBy(asc(transactions.tradeDate), asc(transactions.id));

  const lots = allTxs
    .filter((t) => t.tradeType === "buy")
    .map((t) => ({
      remaining: parseFloat(t.quantity),
      price: parseFloat(t.price),
    }));

  const priorSells = allTxs.filter(
    (t) => t.tradeType === "sell" && t.id !== excludeSellId
  );

  let lotIdx = 0;
  for (const sell of priorSells) {
    let qty = parseFloat(sell.quantity);
    while (qty > 0.00000001 && lotIdx < lots.length) {
      const lot = lots[lotIdx];
      const take = Math.min(qty, lot.remaining);
      lot.remaining -= take;
      qty -= take;
      if (lot.remaining <= 0.00000001) lotIdx++;
    }
  }

  let costOfSold = 0;
  let remaining = sellQuantity;
  while (remaining > 0.00000001 && lotIdx < lots.length) {
    const lot = lots[lotIdx];
    const take = Math.min(remaining, lot.remaining);
    costOfSold += take * lot.price;
    lot.remaining -= take;
    remaining -= take;
    if (lot.remaining <= 0.00000001) lotIdx++;
  }

  return (sellTotalAmount - costOfSold).toFixed(2);
}

async function getAvailableQuantity(
  userId: string,
  symbol: string,
  excludeTxId?: number
): Promise<number> {
  const allTxs = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.symbol, symbol))
    );

  let available = 0;
  for (const tx of allTxs) {
    if (excludeTxId !== undefined && tx.id === excludeTxId) continue;
    const qty = parseFloat(tx.quantity);
    if (tx.tradeType === "buy") {
      available += qty;
    } else if (tx.tradeType === "sell") {
      available -= qty;
    }
  }
  return Math.max(0, available);
}
