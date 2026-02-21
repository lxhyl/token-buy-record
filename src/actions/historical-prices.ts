"use server";

import { db } from "@/lib/db";
import { transactions, priceHistory } from "@/lib/schema";
import { eq, and, gte, lte, lt, asc, desc } from "drizzle-orm";
import { getUserId } from "@/lib/auth-utils";
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

  const today = toMidnightUTC(new Date());

  // 3. Load all historical prices for user's symbols
  // (backfill is handled by /api/prices when user refreshes prices)
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

      if (tx.tradeType === "buy") {
        investedCumulative += amountUsd;
        holdings.set(tx.symbol, (holdings.get(tx.symbol) || 0) + qty);
        // Seed lastKnownPrice from transaction price so holdings don't
        // drop to zero value before the first market price is available
        if (qty > 0 && !lastKnownPrice.has(tx.symbol)) {
          lastKnownPrice.set(tx.symbol, amountUsd / qty);
        }
      } else if (tx.tradeType === "sell") {
        investedCumulative -= amountUsd;
        holdings.set(tx.symbol, Math.max(0, (holdings.get(tx.symbol) || 0) - qty));
      } else if (tx.tradeType === "income") {
        investedCumulative += amountUsd;
        if (qty > 0) {
          holdings.set(tx.symbol, (holdings.get(tx.symbol) || 0) + qty);
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
      value: Math.round(marketValue * 100) / 100,
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
  const lastKnownPrice = new Map<string, number>();

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

    // Pre-seed lastKnownPrice: find the most recent price before the loaded range
    // so holdings with long price gaps (e.g. A-shares during holidays) don't drop to 0
    if (dateMap.size === 0 || !dateMap.has(lookbackStart.toISOString().slice(0, 10))) {
      const fallback = await db
        .select({ price: priceHistory.price })
        .from(priceHistory)
        .where(
          and(
            eq(priceHistory.symbol, symbol),
            lt(priceHistory.date, lookbackStart)
          )
        )
        .orderBy(desc(priceHistory.date))
        .limit(1);

      if (fallback.length > 0) {
        lastKnownPrice.set(symbol, parseFloat(fallback[0].price));
      }
    }
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
  let txIdx = 0;

  function applyTransactionsUpTo(targetDate: Date) {
    while (txIdx < allTx.length) {
      const tx = allTx[txIdx];
      const txDate = toMidnightUTC(new Date(tx.tradeDate));
      if (txDate > targetDate) break;

      const amountUsd = toUsd(parseFloat(tx.totalAmount), tx.currency || "USD", rates);
      const qty = parseFloat(tx.quantity);

      if (tx.tradeType === "buy") {
        invested += amountUsd;
        holdings.set(tx.symbol, (holdings.get(tx.symbol) || 0) + qty);
        if (qty > 0 && !lastKnownPrice.has(tx.symbol)) {
          lastKnownPrice.set(tx.symbol, amountUsd / qty);
        }
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
        lastKnownPrice.set(symbol, price);
        marketValue += qty * price;
      } else {
        const lkp = lastKnownPrice.get(symbol);
        if (lkp !== undefined) marketValue += qty * lkp;
      }
    });
    return marketValue;
  }

  // Advance to day before month start
  applyTransactionsUpTo(dayBefore);
  let prevUnrealizedPnL = computePortfolioValue(dayBefore) - invested;

  const daysInMonth = lastDay.getUTCDate();
  const results: { date: string; pnl: number }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date > todayUTC) break;

    applyTransactionsUpTo(date);
    const unrealizedPnL = computePortfolioValue(date) - invested;
    const dailyPnL = unrealizedPnL - prevUnrealizedPnL;

    results.push({
      date: date.toISOString().slice(0, 10),
      pnl: Math.round(dailyPnL * 100) / 100,
    });

    prevUnrealizedPnL = unrealizedPnL;
  }

  return results;
}
