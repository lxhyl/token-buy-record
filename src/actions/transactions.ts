"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { transactions, currentPrices, priceHistory } from "@/lib/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/price-service";
import { getUserId } from "@/lib/auth-utils";
import { normalizeStockSymbol } from "@/lib/stock-utils";
import { parseTransactionFormData } from "@/lib/validation";

export async function createTransaction(formData: FormData): Promise<{ error: string } | void> {
  const userId = await getUserId();

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const v = parsed.data;

  const symbol = String(v.symbol);
  const name = v.name || "";
  const assetType = v.assetType;
  const tradeType = v.tradeType;
  const quantity = String(v.quantity);
  const price = String(v.price);
  const fee = String(v.fee);
  const currency = v.currency;
  const tradeDate = v.tradeDate;
  const notes = v.notes || "";

  const isFixedIncome = assetType === "deposit" || assetType === "bond";
  let totalAmount: string;
  if (isFixedIncome || (tradeType === "income" && v.quantity === 0)) {
    totalAmount = (v.incomeAmount || 0).toFixed(2);
  } else {
    totalAmount = (v.quantity * v.price + v.fee).toFixed(2);
  }

  // Calculate realized P&L for market sell transactions using FIFO
  let realizedPnl: string | null = null;
  const isMarketType = assetType !== "deposit" && assetType !== "bond";
  const normalizedSymbol = normalizeStockSymbol(symbol, assetType);

  if (tradeType === "sell" && isMarketType) {
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

  await db.insert(transactions).values({
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
    interestRate: v.interestRate ? v.interestRate.toFixed(4) : null,
    maturityDate: v.maturityDate ? new Date(v.maturityDate) : null,
    subType: v.subType || null,
    realizedPnl,
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/analysis");
}

export async function updateTransaction(id: number, formData: FormData): Promise<{ error: string } | void> {
  const userId = await getUserId();

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const v = parsed.data;

  const symbol = String(v.symbol);
  const name = v.name || "";
  const assetType = v.assetType;
  const tradeType = v.tradeType;
  const quantity = String(v.quantity);
  const price = String(v.price);
  const fee = String(v.fee);
  const currency = v.currency;
  const tradeDate = v.tradeDate;
  const notes = v.notes || "";

  const isFixedIncome = assetType === "deposit" || assetType === "bond";
  let totalAmount: string;
  if (isFixedIncome || (tradeType === "income" && v.quantity === 0)) {
    totalAmount = (v.incomeAmount || 0).toFixed(2);
  } else {
    totalAmount = (v.quantity * v.price + v.fee).toFixed(2);
  }

  const normalizedSymbol = normalizeStockSymbol(symbol, assetType);

  // Recalculate realized P&L for market sell transactions using FIFO
  let updatedRealizedPnl: string | null = null;
  const isMarketTypeUpdate = assetType !== "deposit" && assetType !== "bond";
  if (tradeType === "sell" && isMarketTypeUpdate) {
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
      interestRate: v.interestRate ? v.interestRate.toFixed(4) : null,
      maturityDate: v.maturityDate ? new Date(v.maturityDate) : null,
      subType: v.subType || null,
      realizedPnl: updatedRealizedPnl,
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/analysis");
}

export async function deleteTransaction(id: number) {
  const userId = await getUserId();

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/analysis");
}

export async function getTransactions() {
  const userId = await getUserId();

  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.tradeDate));
}

export async function getTransaction(id: number) {
  const userId = await getUserId();

  const result = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  return result[0] || null;
}

export async function updateCurrentPrice(symbol: string, price: string) {
  const existing = await db
    .select()
    .from(currentPrices)
    .where(eq(currentPrices.symbol, symbol.toUpperCase()));

  if (existing.length > 0) {
    await db
      .update(currentPrices)
      .set({ price, updatedAt: new Date() })
      .where(eq(currentPrices.symbol, symbol.toUpperCase()));
  } else {
    await db.insert(currentPrices).values({
      symbol: symbol.toUpperCase(),
      price,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/holdings");
  revalidatePath("/analysis");
}

export async function getCurrentPrices() {
  return await db.select().from(currentPrices);
}

export async function updateMultiplePrices(
  prices: { symbol: string; price: string }[]
) {
  for (const { symbol, price } of prices) {
    await updateCurrentPrice(symbol, price);
  }
}

const PRICE_STALE_MS = 60 * 1000; // 1 minute

/**
 * Get latest prices: auto-fetch from external APIs if stale (>1min),
 * otherwise return cached DB prices.
 */
export async function getLatestPrices() {
  const userId = await getUserId();

  const allTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId));
  const dbPrices = await db.select().from(currentPrices);

  // Build asset list from user's transactions
  const assetMap = new Map<string, string>();
  for (const tx of allTx) {
    if (!assetMap.has(tx.symbol)) {
      assetMap.set(tx.symbol, tx.assetType);
    }
  }

  if (assetMap.size === 0) return dbPrices;

  // Check if any price is stale or missing
  const now = Date.now();
  const dbPriceMap = new Map<string, { price: string; updatedAt: Date | null }>();
  for (const p of dbPrices) {
    dbPriceMap.set(p.symbol, { price: p.price, updatedAt: p.updatedAt });
  }

  let needsRefresh = false;
  assetMap.forEach((_, symbol) => {
    const cached = dbPriceMap.get(symbol);
    if (!cached || !cached.updatedAt || now - cached.updatedAt.getTime() > PRICE_STALE_MS) {
      needsRefresh = true;
    }
  });

  if (!needsRefresh) return dbPrices;

  // Fetch fresh prices from APIs (skip deposit/bond — no market prices)
  const assets = Array.from(assetMap.entries())
    .filter(([_, assetType]) => assetType === "crypto" || assetType === "stock")
    .map(([symbol, assetType]) => ({
      symbol,
      assetType,
    }));

  try {
    // Overall 10s timeout: if APIs are too slow, use cached prices
    const freshPrices = await Promise.race([
      fetchAllPrices(assets),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Price fetch overall timeout")), 10000)
      ),
    ]);

    // Upsert into DB using ON CONFLICT
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

      // Also record in price_history for historical tracking
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

    // Return updated prices
    return await db.select().from(currentPrices);
  } catch (error) {
    console.error("Failed to fetch latest prices, using cached:", error);
    return dbPrices;
  }
}

/**
 * Calculate realized P&L for a sell transaction using FIFO cost basis.
 * Queries all prior buys and sells for the same user+symbol,
 * consumes buy lots in chronological order, and returns the P&L.
 *
 * @param excludeSellId - When updating an existing sell, exclude it from prior sells
 */
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
      and(
        eq(transactions.userId, userId),
        eq(transactions.symbol, symbol),
      )
    )
    .orderBy(asc(transactions.tradeDate), asc(transactions.id));

  const marketTxs = allTxs.filter(
    t => t.assetType !== "deposit" && t.assetType !== "bond"
  );

  // Build FIFO lot queue from buys/income
  const lots = marketTxs
    .filter(t => t.tradeType === "buy" || t.tradeType === "income")
    .map(t => ({
      remaining: parseFloat(t.quantity),
      price: parseFloat(t.price),
    }));

  // Consume lots for all prior sells (excluding the current one if updating)
  const priorSells = marketTxs.filter(
    t => t.tradeType === "sell" && t.id !== excludeSellId
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

  // Now consume lots for this sell
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

/**
 * Calculate the available quantity of a symbol for selling.
 * Sum of buys/income minus sum of sells, excluding a specific transaction if updating.
 */
async function getAvailableQuantity(
  userId: string,
  symbol: string,
  excludeTxId?: number
): Promise<number> {
  const allTxs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.symbol, symbol)
      )
    );

  let available = 0;
  for (const tx of allTxs) {
    if (tx.assetType === "deposit" || tx.assetType === "bond") continue;
    if (excludeTxId !== undefined && tx.id === excludeTxId) continue;
    const qty = parseFloat(tx.quantity);
    if (tx.tradeType === "buy" || tx.tradeType === "income") {
      available += qty;
    } else if (tx.tradeType === "sell") {
      available -= qty;
    }
  }
  return Math.max(0, available);
}
