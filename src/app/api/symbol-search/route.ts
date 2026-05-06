export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { auth } from "@/lib/auth";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  try {
    // Yahoo's response often fails yahoo-finance2's strict schema validation
    // (e.g. typeDisp "equity" vs schema's "Equity"), which would otherwise
    // throw and leave the dropdown empty. Skip validation to keep results.
    const result = (await Promise.race([
      yf.search(
        query,
        { quotesCount: 8, newsCount: 0 },
        { validateResult: false }
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Search timeout")), 5000)
      ),
    ])) as { quotes?: Array<Record<string, unknown>> };

    const ALLOWED_TYPES = new Set([
      "EQUITY",
      "ETF",
      "CRYPTOCURRENCY",
      "MUTUALFUND",
      "INDEX",
      "CURRENCY",
    ]);

    const quotes = (result.quotes || [])
      .filter((rec) => {
        const type = rec.quoteType as string | undefined;
        // Allow well-known types, but also keep entries that have a usable symbol
        // even if Yahoo doesn't classify them — better to show than hide.
        return !!rec.symbol && (!type || ALLOWED_TYPES.has(type));
      })
      .slice(0, 8)
      .map((rec) => ({
        symbol: rec.symbol as string,
        name: (rec.shortname || rec.longname || "") as string,
        exchange: (rec.exchDisp || rec.exchange || "") as string,
        type: rec.quoteType as string,
      }));

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Symbol search error:", error);
    return NextResponse.json([]);
  }
}
