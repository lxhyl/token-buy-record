"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { SupportedCurrency } from "@/lib/currency";

export async function getDisplayCurrency(): Promise<SupportedCurrency> {
  try {
    const result = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "displayCurrency"));

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
  await db
    .insert(appSettings)
    .values({
      key: "displayCurrency",
      value: currency,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: currency, updatedAt: new Date() },
    });

  revalidatePath("/");
  revalidatePath("/holdings");
  revalidatePath("/transactions");
  revalidatePath("/analysis");
  revalidatePath("/settings");
}
