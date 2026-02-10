"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { SupportedCurrency } from "@/lib/currency";
import { getUserId } from "@/lib/auth-utils";

export async function getDisplayCurrency(): Promise<SupportedCurrency> {
  try {
    const userId = await getUserId();

    const result = await db
      .select()
      .from(appSettings)
      .where(
        and(
          eq(appSettings.userId, userId),
          eq(appSettings.key, "displayCurrency")
        )
      );

    const value = result[0]?.value;
    if (value === "CNY" || value === "HKD" || value === "USD") {
      return value;
    }
    return "USD";
  } catch {
    return "USD";
  }
}

export async function setDisplayCurrency(currency: SupportedCurrency) {
  const userId = await getUserId();

  await db
    .insert(appSettings)
    .values({
      userId,
      key: "displayCurrency",
      value: currency,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [appSettings.userId, appSettings.key],
      set: { value: currency, updatedAt: new Date() },
    });

  revalidatePath("/dashboard");
  revalidatePath("/holdings");
  revalidatePath("/transactions");
  revalidatePath("/analysis");
  revalidatePath("/settings");
}
