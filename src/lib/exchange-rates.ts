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
const RATES_UPDATED_KEY = "_system_exchange_rates_updated_at";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 1500; // Don't block SSR for more than this on cold start

let cachedRates: ExchangeRates | null = null;
let cachedAt = 0;
let inflightRefresh: Promise<ExchangeRates> | null = null;

async function loadRatesFromDb(): Promise<{ rates: ExchangeRates; updatedAt: number } | null> {
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
      const rates = JSON.parse(result[0].value) as ExchangeRates;
      const updatedAt = result[0].updatedAt
        ? new Date(result[0].updatedAt).getTime()
        : 0;
      return { rates, updatedAt };
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
  void RATES_UPDATED_KEY;
}

async function fetchFromUpstream(): Promise<ExchangeRates> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 1800 },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates: ExchangeRates = {
      USD: 1,
      ...(data.rates ?? {}),
    };
    cachedRates = rates;
    cachedAt = Date.now();
    saveRatesToDb(rates).catch(() => {});
    return rates;
  } finally {
    clearTimeout(timer);
  }
}

function refreshInBackground() {
  if (inflightRefresh) return;
  inflightRefresh = fetchFromUpstream()
    .catch(() => cachedRates ?? HARDCODED_FALLBACK)
    .finally(() => {
      inflightRefresh = null;
    });
}

/**
 * Returns exchange rates fast — never blocks SSR on a slow upstream.
 * 1. In-memory cache (instant)
 * 2. DB-cached rates (~1 query)
 * 3. Short-timeout upstream fetch
 * 4. Hardcoded fallback
 *
 * Stale-while-revalidate: if the in-memory or DB cache is older than the
 * TTL, kick off a background refresh but still return the cached value.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();

  if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
    return cachedRates;
  }

  // Try DB cache before going to network
  const fromDb = await loadRatesFromDb();
  if (fromDb) {
    cachedRates = fromDb.rates;
    cachedAt = fromDb.updatedAt || now;

    // If the DB copy is stale, refresh upstream in the background.
    if (now - cachedAt >= CACHE_TTL_MS) {
      refreshInBackground();
    }
    return fromDb.rates;
  }

  // No cache anywhere — must hit upstream synchronously, but with short timeout.
  try {
    return await fetchFromUpstream();
  } catch (error) {
    console.error("Exchange-rate fetch failed; using hardcoded fallback:", error);
    cachedRates = HARDCODED_FALLBACK;
    cachedAt = now;
    return HARDCODED_FALLBACK;
  }
}
