import { Transaction, CurrentPrice } from "./schema";
import { ExchangeRates } from "./currency";

/**
 * Convert a price from its original transaction currency to USD.
 * If the transaction is already in USD, returns as-is.
 */
function toUsd(
  price: number,
  txCurrency: string,
  rates: ExchangeRates
): number {
  if (txCurrency === "USD" || !rates[txCurrency]) return price;
  return price / rates[txCurrency];
}

export interface Holding {
  symbol: string;
  name: string | null;
  assetType: string;
  quantity: number;
  avgCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalIncome: number;
  firstBuyDate: Date;
}

export interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  totalIncome: number;
  totalPnL: number;
  totalPnLPercent: number;
}

export function calculateHoldings(
  transactions: Transaction[],
  currentPrices: CurrentPrice[],
  rates: ExchangeRates = { USD: 1 }
): Holding[] {
  const priceMap = new Map<string, number>();
  currentPrices.forEach((p) => {
    priceMap.set(p.symbol, parseFloat(p.price));
  });

  const holdingsMap = new Map<
    string,
    {
      symbol: string;
      name: string | null;
      assetType: string;
      buys: { quantity: number; priceUsd: number; date: Date }[];
      sells: { quantity: number; priceUsd: number }[];
      incomeTotal: number;
      firstBuyDate: Date | null;
    }
  >();

  // Group transactions by symbol, converting prices to USD
  transactions.forEach((t) => {
    if (!holdingsMap.has(t.symbol)) {
      holdingsMap.set(t.symbol, {
        symbol: t.symbol,
        name: t.name,
        assetType: t.assetType,
        buys: [],
        sells: [],
        incomeTotal: 0,
        firstBuyDate: null,
      });
    }

    const holding = holdingsMap.get(t.symbol)!;
    const quantity = parseFloat(t.quantity);
    const rawPrice = parseFloat(t.price);
    const txCurrency = t.currency || "USD";
    const priceUsd = toUsd(rawPrice, txCurrency, rates);
    const date = new Date(t.tradeDate);

    if (t.tradeType === "income") {
      // Income: add totalAmount as income
      const rawTotal = parseFloat(t.totalAmount);
      holding.incomeTotal += toUsd(rawTotal, txCurrency, rates);
      // Asset income (staking rewards etc.) — quantity > 0 means tokens received
      if (quantity > 0) {
        holding.buys.push({ quantity, priceUsd, date });
        if (!holding.firstBuyDate || date < holding.firstBuyDate) {
          holding.firstBuyDate = date;
        }
      }
    } else if (t.tradeType === "buy") {
      holding.buys.push({ quantity, priceUsd, date });
      if (!holding.firstBuyDate || date < holding.firstBuyDate) {
        holding.firstBuyDate = date;
      }
    } else {
      holding.sells.push({ quantity, priceUsd });
    }
  });

  const holdings: Holding[] = [];

  holdingsMap.forEach((data) => {
    // Calculate total bought and sold quantities
    const totalBought = data.buys.reduce((sum, b) => sum + b.quantity, 0);
    const totalSold = data.sells.reduce((sum, s) => sum + s.quantity, 0);
    const remainingQty = totalBought - totalSold;

    if (remainingQty <= 0.00000001 && data.incomeTotal <= 0) return; // Skip if no holdings and no income

    // Calculate average cost using FIFO for remaining shares
    let totalCost = 0;
    const sortedBuys = [...data.buys].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // First, consume buys for sold shares
    let soldToConsume = totalSold;
    const adjustedBuys: { quantity: number; priceUsd: number }[] = [];

    for (const buy of sortedBuys) {
      if (soldToConsume >= buy.quantity) {
        soldToConsume -= buy.quantity;
      } else {
        adjustedBuys.push({
          quantity: buy.quantity - soldToConsume,
          priceUsd: buy.priceUsd,
        });
        soldToConsume = 0;
      }
    }

    // Calculate cost from remaining buys
    for (const buy of adjustedBuys) {
      totalCost += buy.quantity * buy.priceUsd;
    }

    // Calculate realized P&L
    const sellsTotal = data.sells.reduce(
      (sum, s) => sum + s.quantity * s.priceUsd,
      0
    );
    let costOfSold = 0;
    let soldRemaining = totalSold;
    for (const buy of sortedBuys) {
      if (soldRemaining <= 0) break;
      const qtyFromBuy = Math.min(soldRemaining, buy.quantity);
      costOfSold += qtyFromBuy * buy.priceUsd;
      soldRemaining -= qtyFromBuy;
    }
    const realizedPnL = sellsTotal - costOfSold;

    // Position-derived metrics: only meaningful when there's an active position
    const hasPosition = remainingQty > 0.00000001;
    const effectiveQty = hasPosition ? remainingQty : 0;
    const avgCost = hasPosition ? totalCost / remainingQty : 0;
    const currentPrice = hasPosition
      ? (priceMap.get(data.symbol) ?? avgCost)
      : 0;
    const currentValue = effectiveQty * currentPrice;
    const unrealizedPnL = hasPosition ? currentValue - totalCost : 0;
    const unrealizedPnLPercent =
      totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

    holdings.push({
      symbol: data.symbol,
      name: data.name,
      assetType: data.assetType,
      quantity: effectiveQty,
      avgCost,
      totalCost,
      currentPrice,
      currentValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      realizedPnL,
      totalIncome: data.incomeTotal,
      firstBuyDate: data.firstBuyDate || new Date(),
    });
  });

  return holdings.sort((a, b) => b.currentValue - a.currentValue);
}

export function calculatePortfolioSummary(holdings: Holding[]): PortfolioSummary {
  const totalInvested = holdings.reduce((sum, h) => sum + h.totalCost, 0);
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalUnrealizedPnL = holdings.reduce(
    (sum, h) => sum + h.unrealizedPnL,
    0
  );
  const totalRealizedPnL = holdings.reduce((sum, h) => sum + h.realizedPnL, 0);
  const totalIncome = holdings.reduce((sum, h) => sum + h.totalIncome, 0);
  const totalPnL = totalUnrealizedPnL + totalRealizedPnL + totalIncome;
  const totalPnLPercent =
    totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0;

  return {
    totalInvested,
    totalCurrentValue,
    totalUnrealizedPnL,
    totalRealizedPnL,
    totalIncome,
    totalPnL,
    totalPnLPercent,
  };
}

export function calculateAllocationData(holdings: Holding[]) {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

  return holdings.map((h) => ({
    name: h.symbol,
    value: h.currentValue,
    percentage: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0,
  }));
}

export interface TradeAnalysis {
  symbol: string;
  totalBuys: number;
  totalSells: number;
  totalIncomes: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  buyVolume: number;
  sellVolume: number;
  buyVolumeUsd: number;
  sellVolumeUsd: number;
  totalFees: number;
  totalIncomeUsd: number;
}

export function analyzeTradePatterns(
  transactions: Transaction[],
  rates: ExchangeRates = { USD: 1 }
): TradeAnalysis[] {
  const analysisMap = new Map<
    string,
    {
      symbol: string;
      buys: { quantity: number; priceUsd: number }[];
      sells: { quantity: number; priceUsd: number }[];
      fees: number;
      incomeCount: number;
      incomeUsd: number;
    }
  >();

  transactions.forEach((t) => {
    if (!analysisMap.has(t.symbol)) {
      analysisMap.set(t.symbol, {
        symbol: t.symbol,
        buys: [],
        sells: [],
        fees: 0,
        incomeCount: 0,
        incomeUsd: 0,
      });
    }

    const analysis = analysisMap.get(t.symbol)!;
    const quantity = parseFloat(t.quantity);
    const rawPrice = parseFloat(t.price);
    const rawFee = parseFloat(t.fee || "0");
    const txCurrency = t.currency || "USD";
    const priceUsd = toUsd(rawPrice, txCurrency, rates);
    const feeUsd = toUsd(rawFee, txCurrency, rates);

    analysis.fees += feeUsd;

    if (t.tradeType === "income") {
      analysis.incomeCount++;
      const rawTotal = parseFloat(t.totalAmount);
      analysis.incomeUsd += toUsd(rawTotal, txCurrency, rates);
    } else if (t.tradeType === "buy") {
      analysis.buys.push({ quantity, priceUsd });
    } else {
      analysis.sells.push({ quantity, priceUsd });
    }
  });

  const results: TradeAnalysis[] = [];

  analysisMap.forEach((data) => {
    const buyVolume = data.buys.reduce((sum, b) => sum + b.quantity, 0);
    const sellVolume = data.sells.reduce((sum, s) => sum + s.quantity, 0);
    const buyVolumeUsd = data.buys.reduce((sum, b) => sum + b.quantity * b.priceUsd, 0);
    const sellVolumeUsd = data.sells.reduce((sum, s) => sum + s.quantity * s.priceUsd, 0);

    const avgBuyPrice = buyVolume > 0 ? buyVolumeUsd / buyVolume : 0;
    const avgSellPrice = sellVolume > 0 ? sellVolumeUsd / sellVolume : 0;

    results.push({
      symbol: data.symbol,
      totalBuys: data.buys.length,
      totalSells: data.sells.length,
      totalIncomes: data.incomeCount,
      avgBuyPrice,
      avgSellPrice,
      buyVolume,
      sellVolume,
      buyVolumeUsd,
      sellVolumeUsd,
      totalFees: data.fees,
      totalIncomeUsd: data.incomeUsd,
    });
  });

  return results;
}
