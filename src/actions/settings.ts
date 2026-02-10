"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { SupportedCurrency } from "@/lib/currency";
import { getUserId } from "@/lib/auth-utils";
import { Locale, DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";

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

// ── Language / Locale ───────────────────────────────────────

export async function getLocaleFromCookie(): Promise<Locale> {
  try {
    const cookieStore = cookies();
    const value = cookieStore.get("locale")?.value;
    if (value && LOCALES.includes(value as Locale)) {
      return value as Locale;
    }
  } catch {
    // cookies() may throw outside request context
  }
  return DEFAULT_LOCALE;
}

export async function getDisplayLanguage(): Promise<Locale> {
  try {
    const userId = await getUserId();

    const result = await db
      .select()
      .from(appSettings)
      .where(
        and(
          eq(appSettings.userId, userId),
          eq(appSettings.key, "displayLanguage")
        )
      );

    const value = result[0]?.value;
    if (value && LOCALES.includes(value as Locale)) {
      return value as Locale;
    }
  } catch {
    // Not authenticated — fall through to cookie
  }
  return await getLocaleFromCookie();
}

export async function setDisplayLanguage(locale: Locale) {
  // Always set cookie for immediate effect
  const cookieStore = cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Try to persist in DB for authenticated users
  try {
    const userId = await getUserId();
    await db
      .insert(appSettings)
      .values({
        userId,
        key: "displayLanguage",
        value: locale,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [appSettings.userId, appSettings.key],
        set: { value: locale, updatedAt: new Date() },
      });
  } catch {
    // Not authenticated — cookie is sufficient
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/holdings");
  revalidatePath("/transactions");
  revalidatePath("/analysis");
  revalidatePath("/settings");
}
