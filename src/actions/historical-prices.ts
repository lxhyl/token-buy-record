"use server";

import { db } from "@/lib/db";
import { transactions, priceHistory } from "@/lib/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { getUserId } from "@/lib/auth-utils";
import {
  fetchCryptoHistoricalPrices,
  fetchStockHistoricalPrices,
  delay,
  type HistoricalPrice,
} from "@/lib/historical-price-service";

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

  // 3. Backfill missing prices from external APIs
  const today = toMidnightUTC(new Date());
  const symbolEntries = Array.from(symbolInfo.entries());
  for (const [symbol, info] of symbolEntries) {
    const fromDate = toMidnightUTC(info.firstDate);

    // Check what we already have in the DB
    const existingPrices = await db
      .select()
      .from(priceHistory)
      .where(
        and(
          eq(priceHistory.symbol, symbol),
          gte(priceHistory.date, fromDate),
          lte(priceHistory.date, today)
        )
      );

    // Calculate expected rough count of days
    const daySpan = Math.ceil(
      (today.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If we have at least 70% of expected days, skip backfill
    if (existingPrices.length > daySpan * 0.7 && daySpan > 0) {
      continue;
    }

    // Fetch historical prices
    let fetched: HistoricalPrice[] = [];
    try {
      if (info.assetType === "crypto") {
        fetched = await fetchCryptoHistoricalPrices(symbol, fromDate, today);
        await delay(1500); // Rate limit for CoinGecko
      } else if (info.assetType === "stock") {
        fetched = await fetchStockHistoricalPrices(symbol, fromDate, today);
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

  // 5. Determine sample dates
  const firstTxDate = toMidnightUTC(new Date(allTx[0].tradeDate));
  const totalDays = Math.ceil(
    (today.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let intervalDays: number;
  if (totalDays <= 90) intervalDays = 1;
  else if (totalDays <= 365) intervalDays = 3;
  else if (totalDays <= 365 * 3) intervalDays = 7;
  else intervalDays = 14;

  const sampleDates: Date[] = [];
  const cursor = new Date(firstTxDate);
  while (cursor <= today) {
    sampleDates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + intervalDays);
  }
  // Always include today
  if (
    sampleDates.length === 0 ||
    sampleDates[sampleDates.length - 1].getTime() !== today.getTime()
  ) {
    sampleDates.push(new Date(today));
  }

  // 6. Build chart data by walking through sample dates
  // Maintain running holdings state
  const holdings = new Map<string, number>(); // symbol -> quantity
  let investedCumulative = 0;
  let txIdx = 0;

  // Track last known price per symbol for carry-forward
  const lastKnownPrice = new Map<string, number>();

  const chartData: ChartDataPoint[] = [];

  for (const sampleDate of sampleDates) {
    const sampleDateStr = sampleDate.toISOString().slice(0, 10);

    // Replay transactions up to this sample date
    while (txIdx < allTx.length) {
      const tx = allTx[txIdx];
      const txDate = toMidnightUTC(new Date(tx.tradeDate));
      if (txDate > sampleDate) break;

      const amount = parseFloat(tx.totalAmount);
      const qty = parseFloat(tx.quantity);

      if (tx.tradeType === "buy") {
        investedCumulative += amount;
        const current = holdings.get(tx.symbol) || 0;
        holdings.set(tx.symbol, current + qty);
      } else if (tx.tradeType === "sell") {
        investedCumulative -= amount;
        const current = holdings.get(tx.symbol) || 0;
        holdings.set(tx.symbol, Math.max(0, current - qty));
      } else if (tx.tradeType === "income") {
        investedCumulative += amount;
        if (qty > 0) {
          const current = holdings.get(tx.symbol) || 0;
          holdings.set(tx.symbol, current + qty);
        }
      }

      txIdx++;
    }

    // Calculate market value for this date
    let marketValue = 0;
    holdings.forEach((qty, symbol) => {
      if (qty <= 0) return;

      const info = symbolInfo.get(symbol);
      if (!info) {
        // Fixed-income: use principal (already in invested)
        return;
      }

      const symbolPrices = priceMap.get(symbol);
      let price: number | undefined;

      if (symbolPrices) {
        // Try exact date
        price = symbolPrices.get(sampleDateStr);

        // Carry forward: find closest previous date
        if (price === undefined) {
          const d = new Date(sampleDate);
          for (let i = 0; i < 10; i++) {
            d.setUTCDate(d.getUTCDate() - 1);
            const key = d.toISOString().slice(0, 10);
            price = symbolPrices.get(key);
            if (price !== undefined) break;
          }
        }
      }

      if (price !== undefined) {
        lastKnownPrice.set(symbol, price);
        marketValue += qty * price;
      } else {
        // Use last known price if available
        const lkp = lastKnownPrice.get(symbol);
        if (lkp !== undefined) {
          marketValue += qty * lkp;
        }
      }
    });

    // For fixed-income, add their principal to market value
    let fixedIncomeValue = 0;
    for (const tx of allTx) {
      if (tx.assetType !== "deposit" && tx.assetType !== "bond") continue;
      const txDate = toMidnightUTC(new Date(tx.tradeDate));
      if (txDate > sampleDate) continue;
      const amount = parseFloat(tx.totalAmount);
      if (tx.tradeType === "buy") {
        fixedIncomeValue += amount;
      } else if (tx.tradeType === "sell") {
        fixedIncomeValue -= amount;
      }
    }

    chartData.push({
      date: sampleDateStr,
      invested: Math.round(investedCumulative * 100) / 100,
      value: Math.round((marketValue + fixedIncomeValue) * 100) / 100,
    });
  }

  return { chartData };
}
