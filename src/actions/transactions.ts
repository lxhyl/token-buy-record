"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentPrices } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth-utils";
import { parseTransactionFormData } from "@/lib/validation";
import {
  listTransactions as listTx,
  getTransactionById,
  createTransactionForUser,
  updateTransactionForUser,
  deleteTransactionForUser,
  getCachedPricesForUser,
  getAllCurrentPrices,
} from "@/lib/services/transaction-service";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/analysis");
}

export async function createTransaction(formData: FormData): Promise<{ error: string } | void> {
  const userId = await getUserId();

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const result = await createTransactionForUser(userId, parsed.data);
  if ("error" in result) {
    return { error: result.error };
  }

  revalidateAll();
}

export async function updateTransaction(id: number, formData: FormData): Promise<{ error: string } | void> {
  const userId = await getUserId();

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const result = await updateTransactionForUser(userId, id, parsed.data);
  if ("error" in result) {
    return { error: result.error };
  }

  revalidateAll();
}

export async function deleteTransaction(id: number) {
  const userId = await getUserId();
  await deleteTransactionForUser(userId, id);
  revalidateAll();
}

export async function getTransactions() {
  const userId = await getUserId();
  return await listTx(userId);
}

export async function getTransaction(id: number) {
  const userId = await getUserId();
  return await getTransactionById(userId, id);
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
  return await getAllCurrentPrices();
}

export async function updateMultiplePrices(
  prices: { symbol: string; price: string }[]
) {
  for (const { symbol, price } of prices) {
    await updateCurrentPrice(symbol, price);
  }
}

export async function getLatestPrices() {
  // Fast SSR path: return DB-cached prices immediately. The dashboard
  // mounts a client-side <PriceRefresher /> that hits /api/prices to
  // refresh stale prices in the background, then triggers router.refresh().
  const userId = await getUserId();
  return await getCachedPricesForUser(userId);
}
