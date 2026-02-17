import "server-only";

import { db } from "./db";
import { appSettings } from "./schema";
import { and, eq } from "drizzle-orm";
import type { ExchangeRates } from "./currency";

const HARDCODED_FALLBACK: ExchangeRates = {
  USD: 1,
  CNY: 7.25,
  HKD: 7.82,
};

const SYSTEM_USER_ID = "system";
const RATES_KEY = "_system_exchange_rates";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let cachedRates: ExchangeRates | null = null;
let cachedAt = 0;

async function loadRatesFromDb(): Promise<ExchangeRates | null> {
  try {
    const result = await db
      .select()
      .from(appSettings)
      .where(
        and(
          eq(appSettings.userId, SYSTEM_USER_ID),
          eq(appSettings.key, RATES_KEY)
        )
      );
    if (result[0]?.value) {
      return JSON.parse(result[0].value) as ExchangeRates;
    }
  } catch (e) {
    console.warn("Failed to load cached exchange rates from DB:", e);
  }
  return null;
}

async function saveRatesToDb(rates: ExchangeRates): Promise<void> {
  try {
    await db
      .insert(appSettings)
      .values({
        userId: SYSTEM_USER_ID,
        key: RATES_KEY,
        value: JSON.stringify(rates),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [appSettings.userId, appSettings.key],
        set: { value: JSON.stringify(rates), updatedAt: new Date() },
      });
  } catch (e) {
    console.warn("Failed to save exchange rates to DB:", e);
  }
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
    return cachedRates;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 1800 },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates: ExchangeRates = {
      USD: 1,
      ...(data.rates ?? {}),
    };
    cachedRates = rates;
    cachedAt = now;

    // Persist to DB for future fallback
    saveRatesToDb(rates).catch(() => {});

    return rates;
  } catch (error) {
    console.error("Failed to fetch exchange rates, trying DB cache:", error);

    // Try DB-cached rates
    const dbRates = await loadRatesFromDb();
    if (dbRates) {
      cachedRates = dbRates;
      cachedAt = now;
      return dbRates;
    }

    // Absolute last resort
    console.warn("No cached exchange rates in DB, using hardcoded fallback");
    cachedRates = HARDCODED_FALLBACK;
    cachedAt = now;
    return HARDCODED_FALLBACK;
  }
}
