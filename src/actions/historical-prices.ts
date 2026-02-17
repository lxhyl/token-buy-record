"use server";

import { db } from "@/lib/db";
import { transactions, priceHistory, appSettings } from "@/lib/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { getUserId } from "@/lib/auth-utils";
import {
  fetchCryptoHistoricalPrices,
  fetchStockHistoricalPrices,
  delay,
  type HistoricalPrice,
} from "@/lib/historical-price-service";
import { toUsd } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

function toMidnightUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

interface ChartDataPoint {
  date: string;
  invested: number;
  value: number;
}

/**
 * Build historical portfolio data for the dual-line chart.
 * Backfills missing prices on first load, then serves from cache.
 */
export async function getHistoricalPortfolioData(): Promise<{
  chartData: ChartDataPoint[];
}> {
  const userId = await getUserId();

  // 1. Get user's transactions sorted by date
  const allTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(asc(transactions.tradeDate));

  if (allTx.length === 0) {
    return { chartData: [] };
  }

  const rates = await getExchangeRates();

  // 2. Identify unique market symbols and their date ranges
  const symbolInfo = new Map<
    string,
    { assetType: string; firstDate: Date; lastDate: Date }
  >();
  for (const tx of allTx) {
    if (tx.assetType === "deposit" || tx.assetType === "bond") continue;
    const sym = tx.symbol;
    const existing = symbolInfo.get(sym);
    const txDate = new Date(tx.tradeDate);
    if (!existing) {
      symbolInfo.set(sym, {
        assetType: tx.assetType,
        firstDate: txDate,
        lastDate: new Date(),
      });
    } else {
      if (txDate < existing.firstDate) existing.firstDate = txDate;
      existing.lastDate = new Date();
    }
  }

  // 3. Backfill missing prices from external APIs (throttled to once per 6 hours)
  const BACKFILL_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours
  const BACKFILL_KEY = "_last_backfill_at";

  let shouldBackfill = true;
  try {
    const lastBackfillResult = await db
      .select()
      .from(appSettings)
      .where(
        and(
          eq(appSettings.userId, userId),
          eq(appSettings.key, BACKFILL_KEY)
        )
      );
    if (lastBackfillResult[0]?.value) {
      const lastBackfillAt = parseInt(lastBackfillResult[0].value, 10);
      if (Date.now() - lastBackfillAt < BACKFILL_THROTTLE_MS) {
        shouldBackfill = false;
      }
    }
  } catch {
    // If we can't check, allow backfill
  }

  const today = toMidnightUTC(new Date());

  if (shouldBackfill) {
    const symbolEntries = Array.from(symbolInfo.entries());
    for (const [symbol, info] of symbolEntries) {
      // Find the latest existing price to avoid re-fetching everything
      const latestExisting = await db
        .select({ date: priceHistory.date })
        .from(priceHistory)
        .where(eq(priceHistory.symbol, symbol))
        .orderBy(asc(priceHistory.date))
        .then((rows) => rows.at(-1));

      let fetchFrom: Date;
      if (latestExisting) {
        // Start from the day after the latest existing record
        fetchFrom = new Date(latestExisting.date);
        fetchFrom.setUTCDate(fetchFrom.getUTCDate() + 1);
        if (fetchFrom >= today) continue; // Already up to date
      } else {
        fetchFrom = toMidnightUTC(info.firstDate);
      }

      // Fetch historical prices from where we left off
      let fetched: HistoricalPrice[] = [];
      try {
        if (info.assetType === "crypto") {
          fetched = await fetchCryptoHistoricalPrices(symbol, fetchFrom, today);
          await delay(1500); // Rate limit for CoinGecko
        } else if (info.assetType === "stock") {
          fetched = await fetchStockHistoricalPrices(symbol, fetchFrom, today);
          await delay(500);
        }
      } catch (e) {
        console.warn(`[HistoricalPrices] Failed to fetch ${symbol}:`, e);
        continue;
      }

      // Insert to DB with ON CONFLICT DO NOTHING
      for (const p of fetched) {
        try {
          await db
            .insert(priceHistory)
            .values({
              symbol: p.symbol,
              date: p.date,
              price: p.price.toString(),
              source: p.source,
            })
            .onConflictDoNothing();
        } catch {
          // Skip duplicates
        }
      }
    }

    // Record backfill timestamp
    try {
      await db
        .insert(appSettings)
        .values({
          userId,
          key: BACKFILL_KEY,
          value: Date.now().toString(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [appSettings.userId, appSettings.key],
          set: { value: Date.now().toString(), updatedAt: new Date() },
        });
    } catch {
      // Non-critical
    }
  }

  // 4. Load all historical prices for user's symbols
  const allSymbols = Array.from(symbolInfo.keys());
  const priceMap = new Map<string, Map<string, number>>(); // symbol -> dateStr -> price

  for (const symbol of allSymbols) {
    const prices = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.symbol, symbol))
      .orderBy(asc(priceHistory.date));

    const dateMap = new Map<string, number>();
    for (const p of prices) {
      const dateStr = toMidnightUTC(new Date(p.date)).toISOString().slice(0, 10);
      dateMap.set(dateStr, parseFloat(p.price));
    }
    priceMap.set(symbol, dateMap);
  }

  // 5. Generate daily sample dates (client handles downsampling via LTTB)
  const firstTxDate = toMidnightUTC(new Date(allTx[0].tradeDate));
  const sampleDates: Date[] = [];
  const cursor = new Date(firstTxDate);
  while (cursor <= today) {
    sampleDates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // 6. Build chart data by walking through sample dates
  const holdings = new Map<string, number>();
  let investedCumulative = 0;
  let fixedIncomeValue = 0;
  let txIdx = 0;
  const lastKnownPrice = new Map<string, number>();
  const chartData: ChartDataPoint[] = [];

  for (const sampleDate of sampleDates) {
    const sampleDateStr = sampleDate.toISOString().slice(0, 10);

    // Replay transactions up to this sample date
    while (txIdx < allTx.length) {
      const tx = allTx[txIdx];
      const txDate = toMidnightUTC(new Date(tx.tradeDate));
      if (txDate > sampleDate) break;

      const amountUsd = toUsd(parseFloat(tx.totalAmount), tx.currency || "USD", rates);
      const qty = parseFloat(tx.quantity);

      if (tx.assetType === "deposit" || tx.assetType === "bond") {
        if (tx.tradeType === "buy") {
          investedCumulative += amountUsd;
          fixedIncomeValue += amountUsd;
        } else if (tx.tradeType === "sell") {
          investedCumulative -= amountUsd;
          fixedIncomeValue -= amountUsd;
        } else if (tx.tradeType === "income") {
          investedCumulative += amountUsd;
        }
      } else {
        if (tx.tradeType === "buy") {
          investedCumulative += amountUsd;
          holdings.set(tx.symbol, (holdings.get(tx.symbol) || 0) + qty);
        } else if (tx.tradeType === "sell") {
          investedCumulative -= amountUsd;
          holdings.set(tx.symbol, Math.max(0, (holdings.get(tx.symbol) || 0) - qty));
        } else if (tx.tradeType === "income") {
          investedCumulative += amountUsd;
          if (qty > 0) {
            holdings.set(tx.symbol, (holdings.get(tx.symbol) || 0) + qty);
          }
        }
      }

      txIdx++;
    }

    // Calculate market value for this date
    let marketValue = 0;
    holdings.forEach((qty, symbol) => {
      if (qty <= 0) return;
      const symbolPrices = priceMap.get(symbol);
      let price: number | undefined;

      if (symbolPrices) {
        price = symbolPrices.get(sampleDateStr);
        if (price === undefined) {
          const d = new Date(sampleDate);
          for (let i = 0; i < 10; i++) {
            d.setUTCDate(d.getUTCDate() - 1);
            price = symbolPrices.get(d.toISOString().slice(0, 10));
            if (price !== undefined) break;
          }
        }
      }

      if (price !== undefined) {
        lastKnownPrice.set(symbol, price);
        marketValue += qty * price;
      } else {
        const lkp = lastKnownPrice.get(symbol);
        if (lkp !== undefined) marketValue += qty * lkp;
      }
    });

    chartData.push({
      date: sampleDateStr,
      invested: Math.round(investedCumulative * 100) / 100,
      value: Math.round((marketValue + fixedIncomeValue) * 100) / 100,
    });
  }

  return { chartData };
}

/**
 * Get daily P&L for a specific month.
 * Daily P&L = change in unrealized P&L from previous day.
 * unrealized P&L = (market value) - (cost basis).
 */
export async function getDailyPnLForMonth(
  year: number,
  month: number
): Promise<{ date: string; pnl: number }[]> {
  const userId = await getUserId();

  const allTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(asc(transactions.tradeDate));

  if (allTx.length === 0) return [];

  const rates = await getExchangeRates();

  // Identify market symbols
  const symbolTypes = new Map<string, string>();
  for (const tx of allTx) {
    if (tx.assetType === "deposit" || tx.assetType === "bond") continue;
    if (!symbolTypes.has(tx.symbol)) {
      symbolTypes.set(tx.symbol, tx.assetType);
    }
  }

  // Date range: day before month start → last day of month
  const dayBefore = new Date(Date.UTC(year, month - 1, 0)); // last day of prev month
  const lastDay = new Date(Date.UTC(year, month, 0)); // last day of this month
  const todayUTC = toMidnightUTC(new Date());

  // Load prices for relevant symbols in this range (with some lookback for carry-forward)
  const lookbackStart = new Date(dayBefore);
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - 10);

  const allSymbols = Array.from(symbolTypes.keys());
  const priceMap = new Map<string, Map<string, number>>();

  for (const symbol of allSymbols) {
    const prices = await db
      .select()
      .from(priceHistory)
      .where(
        and(
          eq(priceHistory.symbol, symbol),
          gte(priceHistory.date, lookbackStart),
          lte(priceHistory.date, lastDay)
        )
      )
      .orderBy(asc(priceHistory.date));

    const dateMap = new Map<string, number>();
    for (const p of prices) {
      const dateStr = toMidnightUTC(new Date(p.date))
        .toISOString()
        .slice(0, 10);
      dateMap.set(dateStr, parseFloat(p.price));
    }
    priceMap.set(symbol, dateMap);
  }

  // Helper: look up price with carry-forward
  function getPrice(symbol: string, dateStr: string, date: Date): number | undefined {
    const symbolPrices = priceMap.get(symbol);
    if (!symbolPrices) return undefined;
    let price = symbolPrices.get(dateStr);
    if (price !== undefined) return price;
    const d = new Date(date);
    for (let i = 0; i < 10; i++) {
      d.setUTCDate(d.getUTCDate() - 1);
      price = symbolPrices.get(d.toISOString().slice(0, 10));
      if (price !== undefined) return price;
    }
    return undefined;
  }

  // Walk through days with running state
  const holdings = new Map<string, number>();
  let invested = 0;
  let fixedIncomeValue = 0;
  let txIdx = 0;

  function applyTransactionsUpTo(targetDate: Date) {
    while (txIdx < allTx.length) {
      const tx = allTx[txIdx];
      const txDate = toMidnightUTC(new Date(tx.tradeDate));
      if (txDate > targetDate) break;

      const amountUsd = toUsd(parseFloat(tx.totalAmount), tx.currency || "USD", rates);
      const qty = parseFloat(tx.quantity);

      if (tx.assetType === "deposit" || tx.assetType === "bond") {
        if (tx.tradeType === "buy") fixedIncomeValue += amountUsd;
        else if (tx.tradeType === "sell") fixedIncomeValue -= amountUsd;
      } else {
        if (tx.tradeType === "buy") {
          invested += amountUsd;
          holdings.set(tx.symbol, (holdings.get(tx.symbol) || 0) + qty);
        } else if (tx.tradeType === "sell") {
          invested -= amountUsd;
          holdings.set(
            tx.symbol,
            Math.max(0, (holdings.get(tx.symbol) || 0) - qty)
          );
        } else if (tx.tradeType === "income") {
          invested += amountUsd;
          if (qty > 0) {
            holdings.set(tx.symbol, (holdings.get(tx.symbol) || 0) + qty);
          }
        }
      }
      txIdx++;
    }
  }

  function computePortfolioValue(date: Date): number {
    const dateStr = date.toISOString().slice(0, 10);
    let marketValue = 0;
    holdings.forEach((qty, symbol) => {
      if (qty <= 0) return;
      const price = getPrice(symbol, dateStr, date);
      if (price !== undefined) {
        marketValue += qty * price;
      }
    });
    return marketValue + fixedIncomeValue;
  }

  // Advance to day before month start
  applyTransactionsUpTo(dayBefore);
  let prevUnrealizedPnL = computePortfolioValue(dayBefore) - invested - fixedIncomeValue;

  const daysInMonth = lastDay.getUTCDate();
  const results: { date: string; pnl: number }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date > todayUTC) break;

    applyTransactionsUpTo(date);
    const unrealizedPnL = computePortfolioValue(date) - invested - fixedIncomeValue;
    const dailyPnL = unrealizedPnL - prevUnrealizedPnL;

    results.push({
      date: date.toISOString().slice(0, 10),
      pnl: Math.round(dailyPnL * 100) / 100,
    });

    prevUnrealizedPnL = unrealizedPnL;
  }

  return results;
}
