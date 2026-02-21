"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deposits } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth-utils";
import { parseDepositFormData } from "@/lib/validation";

export async function getDeposits() {
  const userId = await getUserId();
  return await db
    .select()
    .from(deposits)
    .where(eq(deposits.userId, userId));
}

export async function getDeposit(id: number) {
  const userId = await getUserId();
  const result = await db
    .select()
    .from(deposits)
    .where(and(eq(deposits.id, id), eq(deposits.userId, userId)));
  return result[0] || null;
}

export async function createDeposit(formData: FormData): Promise<{ error: string } | void> {
  const userId = await getUserId();

  const parsed = parseDepositFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const v = parsed.data;

  await db.insert(deposits).values({
    userId,
    symbol: v.symbol.trim().toUpperCase(),
    name: v.name || null,
    principal: v.principal.toFixed(2),
    interestRate: v.interestRate.toFixed(4),
    currency: v.currency,
    startDate: new Date(v.startDate),
    maturityDate: v.maturityDate ? new Date(v.maturityDate) : null,
    notes: v.notes || null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/deposits");
  revalidatePath("/analysis");
}

export async function updateDeposit(id: number, formData: FormData): Promise<{ error: string } | void> {
  const userId = await getUserId();

  const parsed = parseDepositFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const v = parsed.data;

  await db
    .update(deposits)
    .set({
      symbol: v.symbol.trim().toUpperCase(),
      name: v.name || null,
      principal: v.principal.toFixed(2),
      interestRate: v.interestRate.toFixed(4),
      currency: v.currency,
      startDate: new Date(v.startDate),
      maturityDate: v.maturityDate ? new Date(v.maturityDate) : null,
      notes: v.notes || null,
    })
    .where(and(eq(deposits.id, id), eq(deposits.userId, userId)));

  revalidatePath("/dashboard");
  revalidatePath("/deposits");
  revalidatePath("/analysis");
}

export async function withdrawFromDeposit(id: number, amount: number): Promise<{ error: string } | void> {
  const userId = await getUserId();

  if (amount <= 0) {
    return { error: "Withdraw amount must be greater than 0" };
  }

  const deposit = await db
    .select()
    .from(deposits)
    .where(and(eq(deposits.id, id), eq(deposits.userId, userId)));

  if (deposit.length === 0) {
    return { error: "Deposit not found" };
  }

  const d = deposit[0];
  const principal = parseFloat(d.principal);
  const withdrawn = parseFloat(d.withdrawnAmount || "0");
  const remaining = principal - withdrawn;

  if (amount > remaining + 0.001) {
    return { error: `Cannot withdraw more than remaining principal (${remaining.toFixed(2)})` };
  }

  const newWithdrawn = (withdrawn + amount).toFixed(2);

  await db
    .update(deposits)
    .set({ withdrawnAmount: newWithdrawn })
    .where(and(eq(deposits.id, id), eq(deposits.userId, userId)));

  revalidatePath("/dashboard");
  revalidatePath("/deposits");
  revalidatePath("/transactions");
  revalidatePath("/analysis");
}

export async function deleteDeposit(id: number) {
  const userId = await getUserId();

  await db
    .delete(deposits)
    .where(and(eq(deposits.id, id), eq(deposits.userId, userId)));

  revalidatePath("/dashboard");
  revalidatePath("/deposits");
  revalidatePath("/analysis");
}
