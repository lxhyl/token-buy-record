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

export interface FixedIncomeHolding {
  symbol: string;
  name: string | null;
  assetType: string;
  subType: string | null;
  principal: number;
  interestRate: number;
  totalIncome: number;
  maturityDate: Date | null;
  currency: string;
  firstDate: Date;
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
  // Filter out deposit/bond — they go through calculateFixedIncomeHoldings
  const marketTransactions = transactions.filter(
    (t) => t.assetType !== "deposit" && t.assetType !== "bond"
  );

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
      incomeTotal: number;
      firstBuyDate: Date | null;
    }
  >();

  // Group transactions by symbol, converting prices to USD
  marketTransactions.forEach((t) => {
    if (!holdingsMap.has(t.symbol)) {
      holdingsMap.set(t.symbol, {
        symbol: t.symbol,
        name: t.name,
        assetType: t.assetType,
        buys: [],
        sells: [],
        storedRealizedPnl: 0,
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
      if (t.realizedPnl) {
        holding.storedRealizedPnl += parseFloat(t.realizedPnl);
      }
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
      totalIncome: data.incomeTotal,
      firstBuyDate: data.firstBuyDate || new Date(),
    });
  });

  return holdings.sort((a, b) => b.currentValue - a.currentValue);
}

export function calculateFixedIncomeHoldings(
  transactions: Transaction[],
  rates: ExchangeRates = { USD: 1 }
): FixedIncomeHolding[] {
  const fixedTx = transactions.filter(
    (t) => t.assetType === "deposit" || t.assetType === "bond"
  );

  const groupMap = new Map<
    string,
    {
      symbol: string;
      name: string | null;
      assetType: string;
      subType: string | null;
      buys: { amountUsd: number; rate: number; maturity: Date | null; date: Date }[];
      withdrawals: number;
      incomeTotal: number;
      currency: string;
      firstDate: Date | null;
    }
  >();

  fixedTx.forEach((t) => {
    if (!groupMap.has(t.symbol)) {
      groupMap.set(t.symbol, {
        symbol: t.symbol,
        name: t.name,
        assetType: t.assetType,
        subType: t.subType,
        buys: [],
        withdrawals: 0,
        incomeTotal: 0,
        currency: t.currency || "USD",
        firstDate: null,
      });
    }

    const group = groupMap.get(t.symbol)!;
    const txCurrency = t.currency || "USD";
    const rawTotal = parseFloat(t.totalAmount);
    const totalUsd = toUsd(rawTotal, txCurrency, rates);
    const date = new Date(t.tradeDate);

    if (t.tradeType === "buy") {
      const rate = t.interestRate ? parseFloat(t.interestRate) : 0;
      const maturity = t.maturityDate ? new Date(t.maturityDate) : null;
      group.buys.push({ amountUsd: totalUsd, rate, maturity, date });
      if (!group.firstDate || date < group.firstDate) {
        group.firstDate = date;
      }
      // Use subType from this tx if available
      if (t.subType) group.subType = t.subType;
    } else if (t.tradeType === "sell") {
      group.withdrawals += totalUsd;
    } else if (t.tradeType === "income") {
      group.incomeTotal += totalUsd;
      if (!group.firstDate || date < group.firstDate) {
        group.firstDate = date;
      }
    }
  });

  const holdings: FixedIncomeHolding[] = [];

  groupMap.forEach((data) => {
    const totalBuy = data.buys.reduce((sum, b) => sum + b.amountUsd, 0);
    const principal = totalBuy - data.withdrawals;

    if (principal <= 0 && data.incomeTotal <= 0) return;

    // Weighted average interest rate (weighted by buy amount)
    let weightedRate = 0;
    if (totalBuy > 0) {
      const weightedSum = data.buys.reduce(
        (sum, b) => sum + b.rate * b.amountUsd,
        0
      );
      weightedRate = weightedSum / totalBuy;
    }

    // Nearest future maturity date
    const now = new Date();
    const futureMaturities = data.buys
      .filter((b) => b.maturity && b.maturity > now)
      .map((b) => b.maturity!)
      .sort((a, b) => a.getTime() - b.getTime());
    const nearestMaturity = futureMaturities.length > 0 ? futureMaturities[0] : null;

    // If no future maturity, find the most recent past maturity
    const pastMaturities = data.buys
      .filter((b) => b.maturity && b.maturity <= now)
      .map((b) => b.maturity!)
      .sort((a, b) => b.getTime() - a.getTime());
    const maturityDate = nearestMaturity || (pastMaturities.length > 0 ? pastMaturities[0] : null);

    holdings.push({
      symbol: data.symbol,
      name: data.name,
      assetType: data.assetType,
      subType: data.subType,
      principal: Math.max(principal, 0),
      interestRate: weightedRate,
      totalIncome: data.incomeTotal,
      maturityDate,
      currency: data.currency,
      firstDate: data.firstDate || new Date(),
    });
  });

  return holdings.sort((a, b) => b.principal - a.principal);
}

export function calculatePortfolioSummary(
  holdings: Holding[],
  fixedIncomeHoldings: FixedIncomeHolding[] = []
): PortfolioSummary {
  const fiPrincipal = fixedIncomeHoldings.reduce((sum, h) => sum + h.principal, 0);
  const fiIncome = fixedIncomeHoldings.reduce((sum, h) => sum + h.totalIncome, 0);

  const totalInvested = holdings.reduce((sum, h) => sum + h.totalCost, 0) + fiPrincipal;
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0) + fiPrincipal;
  const totalUnrealizedPnL = holdings.reduce(
    (sum, h) => sum + h.unrealizedPnL,
    0
  );
  const totalRealizedPnL = holdings.reduce((sum, h) => sum + h.realizedPnL, 0);
  const totalIncome = holdings.reduce((sum, h) => sum + h.totalIncome, 0) + fiIncome;
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

export function calculateAllocationData(
  holdings: Holding[],
  fixedIncomeHoldings: FixedIncomeHolding[] = []
) {
  const marketValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const fiValue = fixedIncomeHoldings.reduce((sum, h) => sum + h.principal, 0);
  const totalValue = marketValue + fiValue;

  const marketItems = holdings.map((h) => ({
    name: h.symbol,
    value: h.currentValue,
    percentage: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0,
  }));

  const fiItems = fixedIncomeHoldings.map((h) => ({
    name: h.symbol,
    value: h.principal,
    percentage: totalValue > 0 ? (h.principal / totalValue) * 100 : 0,
  }));

  return [...marketItems, ...fiItems];
}

export interface TradeAnalysis {
  symbol: string;
  assetType: string;
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
  buyTotalAmountUsd: number;
  sellTotalAmountUsd: number;
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
      incomeCount: number;
      incomeUsd: number;
      buyTotalAmountUsd: number;
      sellTotalAmountUsd: number;
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
        incomeCount: 0,
        incomeUsd: 0,
        buyTotalAmountUsd: 0,
        sellTotalAmountUsd: 0,
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

    if (t.tradeType === "income") {
      analysis.incomeCount++;
      analysis.incomeUsd += totalUsd;
    } else if (t.tradeType === "buy") {
      analysis.buys.push({ quantity, priceUsd });
      analysis.buyTotalAmountUsd += totalUsd;
    } else {
      analysis.sells.push({ quantity, priceUsd });
      analysis.sellTotalAmountUsd += totalUsd;
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
      totalIncomes: data.incomeCount,
      avgBuyPrice,
      avgSellPrice,
      buyVolume,
      sellVolume,
      buyVolumeUsd,
      sellVolumeUsd,
      totalFees: data.fees,
      totalIncomeUsd: data.incomeUsd,
      buyTotalAmountUsd: data.buyTotalAmountUsd,
      sellTotalAmountUsd: data.sellTotalAmountUsd,
    });
  });

  return results;
}
