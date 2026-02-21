import { Transaction, CurrentPrice, Deposit } from "./schema";
import { ExchangeRates, toUsd } from "./currency";

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

export interface DepositHolding {
  id: number;
  symbol: string;
  name: string | null;
  principal: number;
  withdrawnAmount: number;
  remainingPrincipal: number;
  interestRate: number;
  currency: string;
  startDate: Date;
  maturityDate: Date | null;
  accruedInterest: number;
  currentValue: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  totalDepositInterest: number;
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
      storedRealizedPnl: number;
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
        storedRealizedPnl: 0,
        firstBuyDate: null,
      });
    }

    const holding = holdingsMap.get(t.symbol)!;
    const quantity = parseFloat(t.quantity);
    const rawPrice = parseFloat(t.price);
    const txCurrency = t.currency || "USD";
    const priceUsd = toUsd(rawPrice, txCurrency, rates);
    const date = new Date(t.tradeDate);

    if (t.tradeType === "buy") {
      holding.buys.push({ quantity, priceUsd, date });
      if (!holding.firstBuyDate || date < holding.firstBuyDate) {
        holding.firstBuyDate = date;
      }
    } else {
      holding.sells.push({ quantity, priceUsd });
      if (t.realizedPnl) {
        holding.storedRealizedPnl += toUsd(parseFloat(t.realizedPnl), txCurrency, rates);
      }
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

    // Use stored realized P&L if available, otherwise calculate from FIFO
    let realizedPnL: number;
    const hasStoredPnl = data.sells.length === 0 || data.storedRealizedPnl !== 0;
    if (hasStoredPnl) {
      realizedPnL = data.storedRealizedPnl;
    } else {
      // Fallback: calculate realized P&L from FIFO (for un-backfilled sells)
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
      realizedPnL = sellsTotal - costOfSold;
    }

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
      firstBuyDate: data.firstBuyDate || new Date(),
    });
  });

  return holdings.sort((a, b) => b.currentValue - a.currentValue);
}

export function calculateDepositHoldings(
  deposits: Deposit[],
  rates: ExchangeRates = { USD: 1 }
): DepositHolding[] {
  const now = new Date();

  return deposits.map((d) => {
    const principal = toUsd(parseFloat(d.principal), d.currency || "USD", rates);
    const withdrawnAmount = toUsd(parseFloat(d.withdrawnAmount || "0"), d.currency || "USD", rates);
    const remainingPrincipal = principal - withdrawnAmount;
    const interestRate = parseFloat(d.interestRate);
    const startDate = new Date(d.startDate);

    // Calculate accrued interest based on remaining principal
    const daysSinceStart = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const accruedInterest = remainingPrincipal * (interestRate / 100) * (daysSinceStart / 365);
    const currentValue = remainingPrincipal + accruedInterest;

    return {
      id: d.id,
      symbol: d.symbol,
      name: d.name,
      principal,
      withdrawnAmount,
      remainingPrincipal,
      interestRate,
      currency: d.currency || "USD",
      startDate,
      maturityDate: d.maturityDate ? new Date(d.maturityDate) : null,
      accruedInterest,
      currentValue,
    };
  }).sort((a, b) => b.remainingPrincipal - a.remainingPrincipal);
}

export function calculatePortfolioSummary(
  holdings: Holding[],
  depositHoldings: DepositHolding[] = []
): PortfolioSummary {
  const depositRemainingPrincipal = depositHoldings.reduce((sum, h) => sum + h.remainingPrincipal, 0);
  const depositInterest = depositHoldings.reduce((sum, h) => sum + h.accruedInterest, 0);

  const totalInvested = holdings.reduce((sum, h) => sum + h.totalCost, 0) + depositRemainingPrincipal;
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0) + depositRemainingPrincipal + depositInterest;
  const totalUnrealizedPnL = holdings.reduce(
    (sum, h) => sum + h.unrealizedPnL,
    0
  );
  const totalRealizedPnL = holdings.reduce((sum, h) => sum + h.realizedPnL, 0);
  const totalDepositInterest = depositInterest;
  const totalPnL = totalUnrealizedPnL + totalRealizedPnL + totalDepositInterest;
  const totalPnLPercent =
    totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0;

  return {
    totalInvested,
    totalCurrentValue,
    totalUnrealizedPnL,
    totalRealizedPnL,
    totalDepositInterest,
    totalPnL,
    totalPnLPercent,
  };
}

export function calculateAllocationData(
  holdings: Holding[],
  depositHoldings: DepositHolding[] = []
) {
  const marketValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const depositValue = depositHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalValue = marketValue + depositValue;

  const marketItems = holdings.map((h) => ({
    name: h.symbol,
    value: h.currentValue,
    percentage: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0,
  }));

  const depositItems = depositHoldings.map((h) => ({
    name: h.symbol,
    value: h.currentValue,
    percentage: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0,
  }));

  return [...marketItems, ...depositItems];
}

export interface TradeAnalysis {
  symbol: string;
  assetType: string;
  totalBuys: number;
  totalSells: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  buyVolume: number;
  sellVolume: number;
  buyVolumeUsd: number;
  sellVolumeUsd: number;
  totalFees: number;
  buyTotalAmountUsd: number;
  sellTotalAmountUsd: number;
  realizedPnl: number;
}

export function analyzeTradePatterns(
  transactions: Transaction[],
  rates: ExchangeRates = { USD: 1 }
): TradeAnalysis[] {
  const analysisMap = new Map<
    string,
    {
      symbol: string;
      assetType: string;
      buys: { quantity: number; priceUsd: number }[];
      sells: { quantity: number; priceUsd: number }[];
      fees: number;
      buyTotalAmountUsd: number;
      sellTotalAmountUsd: number;
      realizedPnl: number;
    }
  >();

  transactions.forEach((t) => {
    if (!analysisMap.has(t.symbol)) {
      analysisMap.set(t.symbol, {
        symbol: t.symbol,
        assetType: t.assetType,
        buys: [],
        sells: [],
        fees: 0,
        buyTotalAmountUsd: 0,
        sellTotalAmountUsd: 0,
        realizedPnl: 0,
      });
    }

    const analysis = analysisMap.get(t.symbol)!;
    const quantity = parseFloat(t.quantity);
    const rawPrice = parseFloat(t.price);
    const rawFee = parseFloat(t.fee || "0");
    const rawTotal = parseFloat(t.totalAmount);
    const txCurrency = t.currency || "USD";
    const priceUsd = toUsd(rawPrice, txCurrency, rates);
    const feeUsd = toUsd(rawFee, txCurrency, rates);
    const totalUsd = toUsd(rawTotal, txCurrency, rates);

    analysis.fees += feeUsd;

    if (t.tradeType === "buy") {
      analysis.buys.push({ quantity, priceUsd });
      analysis.buyTotalAmountUsd += totalUsd;
    } else {
      analysis.sells.push({ quantity, priceUsd });
      analysis.sellTotalAmountUsd += totalUsd;
      if (t.realizedPnl) {
        analysis.realizedPnl += toUsd(parseFloat(t.realizedPnl), txCurrency, rates);
      }
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
      assetType: data.assetType,
      totalBuys: data.buys.length,
      totalSells: data.sells.length,
      avgBuyPrice,
      avgSellPrice,
      buyVolume,
      sellVolume,
      buyVolumeUsd,
      sellVolumeUsd,
      totalFees: data.fees,
      buyTotalAmountUsd: data.buyTotalAmountUsd,
      sellTotalAmountUsd: data.sellTotalAmountUsd,
      realizedPnl: data.realizedPnl,
    });
  });

  return results;
}
