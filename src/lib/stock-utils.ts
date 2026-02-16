/**
 * A-share stock code detection and exchange suffix normalization.
 *
 * 6-digit numeric codes are mapped to the correct exchange:
 *   Shanghai (.SS): 600/601/603/605 (main), 688 (STAR), 900 (B-share)
 *   Shenzhen (.SZ): 000/001/002/003 (main/SME), 300/301 (ChiNext), 200 (B-share)
 *
 * All other symbols (e.g. AAPL, 0700.HK, 600519.SS) are returned as-is (uppercased).
 */

const SS_PREFIXES = ["600", "601", "603", "605", "688", "900"];
const SZ_PREFIXES = ["000", "001", "002", "003", "300", "301", "200"];

function getAShareSuffix(code: string): string | null {
  for (const p of SS_PREFIXES) {
    if (code.startsWith(p)) return ".SS";
  }
  for (const p of SZ_PREFIXES) {
    if (code.startsWith(p)) return ".SZ";
  }
  return null;
}

/**
 * Normalize a stock symbol: detect bare 6-digit A-share codes and append
 * the correct exchange suffix. Non-stock asset types are uppercased only.
 */
export function normalizeStockSymbol(symbol: string, assetType: string): string {
  const trimmed = symbol.trim().toUpperCase();
  if (assetType !== "stock") return trimmed;

  // Only transform bare 6-digit numeric codes (no existing suffix)
  if (/^\d{6}$/.test(trimmed)) {
    const suffix = getAShareSuffix(trimmed);
    if (suffix) return trimmed + suffix;
  }

  return trimmed;
}
