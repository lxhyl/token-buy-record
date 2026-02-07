import { Transaction, CurrentPrice } from "./schema";

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
  firstBuyDate: Date;
}

export interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  totalPnL: number;
  totalPnLPercent: number;
}

export function calculateHoldings(
  transactions: Transaction[],
  currentPrices: CurrentPrice[]
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
      buys: { quantity: number; price: number; date: Date }[];
      sells: { quantity: number; price: number }[];
      firstBuyDate: Date | null;
    }
  >();

  // Group transactions by symbol
  transactions.forEach((t) => {
    if (!holdingsMap.has(t.symbol)) {
      holdingsMap.set(t.symbol, {
        symbol: t.symbol,
        name: t.name,
        assetType: t.assetType,
        buys: [],
        sells: [],
        firstBuyDate: null,
      });
    }

    const holding = holdingsMap.get(t.symbol)!;
    const quantity = parseFloat(t.quantity);
    const price = parseFloat(t.price);
    const date = new Date(t.tradeDate);

    if (t.tradeType === "buy") {
      holding.buys.push({ quantity, price, date });
      if (!holding.firstBuyDate || date < holding.firstBuyDate) {
        holding.firstBuyDate = date;
      }
    } else {
      holding.sells.push({ quantity, price });
    }
  });

  const holdings: Holding[] = [];

  holdingsMap.forEach((data) => {
    // Calculate total bought and sold quantities
    const totalBought = data.buys.reduce((sum, b) => sum + b.quantity, 0);
    const totalSold = data.sells.reduce((sum, s) => sum + s.quantity, 0);
    const remainingQty = totalBought - totalSold;

    if (remainingQty <= 0.00000001) return; // Skip if no holdings

    // Calculate average cost using FIFO for remaining shares
    let remainingForCost = remainingQty;
    let totalCost = 0;
    const sortedBuys = [...data.buys].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // First, consume buys for sold shares
    let soldToConsume = totalSold;
    let buyIndex = 0;
    const adjustedBuys: { quantity: number; price: number }[] = [];

    for (const buy of sortedBuys) {
      if (soldToConsume >= buy.quantity) {
        soldToConsume -= buy.quantity;
      } else {
        adjustedBuys.push({
          quantity: buy.quantity - soldToConsume,
          price: buy.price,
        });
        soldToConsume = 0;
      }
    }

    // Calculate cost from remaining buys
    for (const buy of adjustedBuys) {
      totalCost += buy.quantity * buy.price;
    }

    const avgCost = totalCost / remainingQty;
    const currentPrice = priceMap.get(data.symbol) || avgCost;
    const currentValue = remainingQty * currentPrice;
    const unrealizedPnL = currentValue - totalCost;
    const unrealizedPnLPercent =
      totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

    // Calculate realized P&L
    let realizedPnL = 0;
    let soldRemaining = totalSold;
    for (const buy of sortedBuys) {
      if (soldRemaining <= 0) break;
      const soldFromThisBuy = Math.min(soldRemaining, buy.quantity);
      soldRemaining -= soldFromThisBuy;
    }

    // Simple realized P&L calculation
    const sellsTotal = data.sells.reduce(
      (sum, s) => sum + s.quantity * s.price,
      0
    );
    let costOfSold = 0;
    soldRemaining = totalSold;
    for (const buy of sortedBuys) {
      if (soldRemaining <= 0) break;
      const qtyFromBuy = Math.min(soldRemaining, buy.quantity);
      costOfSold += qtyFromBuy * buy.price;
      soldRemaining -= qtyFromBuy;
    }
    realizedPnL = sellsTotal - costOfSold;

    holdings.push({
      symbol: data.symbol,
      name: data.name,
      assetType: data.assetType,
      quantity: remainingQty,
      avgCost,
      totalCost,
      currentPrice,
      currentValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      realizedPnL,
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
  const totalPnL = totalUnrealizedPnL + totalRealizedPnL;
  const totalPnLPercent =
    totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0;

  return {
    totalInvested,
    totalCurrentValue,
    totalUnrealizedPnL,
    totalRealizedPnL,
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
  avgBuyPrice: number;
  avgSellPrice: number;
  buyVolume: number;
  sellVolume: number;
}

export function analyzeTradePatterns(
  transactions: Transaction[]
): TradeAnalysis[] {
  const analysisMap = new Map<
    string,
    {
      symbol: string;
      buys: { quantity: number; price: number }[];
      sells: { quantity: number; price: number }[];
    }
  >();

  transactions.forEach((t) => {
    if (!analysisMap.has(t.symbol)) {
      analysisMap.set(t.symbol, {
        symbol: t.symbol,
        buys: [],
        sells: [],
      });
    }

    const analysis = analysisMap.get(t.symbol)!;
    const quantity = parseFloat(t.quantity);
    const price = parseFloat(t.price);

    if (t.tradeType === "buy") {
      analysis.buys.push({ quantity, price });
    } else {
      analysis.sells.push({ quantity, price });
    }
  });

  const results: TradeAnalysis[] = [];

  analysisMap.forEach((data) => {
    const buyVolume = data.buys.reduce((sum, b) => sum + b.quantity, 0);
    const sellVolume = data.sells.reduce((sum, s) => sum + s.quantity, 0);

    const avgBuyPrice =
      buyVolume > 0
        ? data.buys.reduce((sum, b) => sum + b.quantity * b.price, 0) / buyVolume
        : 0;

    const avgSellPrice =
      sellVolume > 0
        ? data.sells.reduce((sum, s) => sum + s.quantity * s.price, 0) /
          sellVolume
        : 0;

    results.push({
      symbol: data.symbol,
      totalBuys: data.buys.length,
      totalSells: data.sells.length,
      avgBuyPrice,
      avgSellPrice,
      buyVolume,
      sellVolume,
    });
  });

  return results;
}
