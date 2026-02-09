"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { transactions, currentPrices, NewTransaction } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { fetchAllPrices } from "@/lib/price-service";

export async function createTransaction(formData: FormData) {
  const symbol = formData.get("symbol") as string;
  const name = formData.get("name") as string;
  const assetType = formData.get("assetType") as string;
  const tradeType = formData.get("tradeType") as string;
  const quantity = formData.get("quantity") as string;
  const price = formData.get("price") as string;
  const fee = formData.get("fee") as string;
  const currency = (formData.get("currency") as string) || "USD";
  const tradeDate = formData.get("tradeDate") as string;
  const notes = formData.get("notes") as string;

  const totalAmount = (
    parseFloat(quantity) * parseFloat(price) +
    parseFloat(fee || "0")
  ).toFixed(2);

  await db.insert(transactions).values({
    symbol: symbol.toUpperCase(),
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
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/analysis");
}

export async function updateTransaction(id: number, formData: FormData) {
  const symbol = formData.get("symbol") as string;
  const name = formData.get("name") as string;
  const assetType = formData.get("assetType") as string;
  const tradeType = formData.get("tradeType") as string;
  const quantity = formData.get("quantity") as string;
  const price = formData.get("price") as string;
  const fee = formData.get("fee") as string;
  const currency = (formData.get("currency") as string) || "USD";
  const tradeDate = formData.get("tradeDate") as string;
  const notes = formData.get("notes") as string;

  const totalAmount = (
    parseFloat(quantity) * parseFloat(price) +
    parseFloat(fee || "0")
  ).toFixed(2);

  await db
    .update(transactions)
    .set({
      symbol: symbol.toUpperCase(),
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
    })
    .where(eq(transactions.id, id));

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/analysis");
}

export async function deleteTransaction(id: number) {
  await db.delete(transactions).where(eq(transactions.id, id));

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/analysis");
}

export async function getTransactions() {
  return await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.tradeDate));
}

export async function getTransaction(id: number) {
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id));
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

  revalidatePath("/");
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
  const allTx = await db.select().from(transactions);
  const dbPrices = await db.select().from(currentPrices);

  // Build asset list from transactions
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

  // Fetch fresh prices from APIs
  const assets = Array.from(assetMap.entries()).map(([symbol, assetType]) => ({
    symbol,
    assetType,
  }));

  try {
    const freshPrices = await fetchAllPrices(assets);

    // Upsert into DB using ON CONFLICT
    for (const { symbol, price } of freshPrices) {
      await db
        .insert(currentPrices)
        .values({ symbol, price: price.toString() })
        .onConflictDoUpdate({
          target: currentPrices.symbol,
          set: { price: price.toString(), updatedAt: new Date() },
        });
    }

    // Return updated prices
    return await db.select().from(currentPrices);
  } catch (error) {
    console.error("Failed to fetch latest prices, using cached:", error);
    return dbPrices;
  }
}
