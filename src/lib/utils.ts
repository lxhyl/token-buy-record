import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  type SupportedCurrency,
  type ExchangeRates,
  CURRENCY_CONFIG,
  convertAmount,
} from "./currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number,
  currency: SupportedCurrency = "USD",
  rates?: ExchangeRates
): string {
  const converted =
    currency !== "USD" && rates ? convertAmount(value, currency, rates) : value;
  const config = CURRENCY_CONFIG[currency];
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}

export function createCurrencyFormatter(
  currency: SupportedCurrency,
  rates: ExchangeRates
): (value: number) => string {
  return (value: number) => formatCurrency(value, currency, rates);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
