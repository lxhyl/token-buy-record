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
    const result = await Promise.race([
      yf.search(query, { quotesCount: 8, newsCount: 0 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Search timeout")), 5000)
      ),
    ]);

    const quotes = (result.quotes || [])
      .filter((q) => {
        const type = (q as Record<string, unknown>).quoteType as string | undefined;
        return type === "EQUITY" || type === "ETF";
      })
      .slice(0, 6)
      .map((q) => {
        const rec = q as Record<string, unknown>;
        return {
          symbol: rec.symbol as string,
          name: (rec.shortname || rec.longname || "") as string,
          exchange: (rec.exchDisp || rec.exchange || "") as string,
          type: rec.quoteType as string,
        };
      });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Symbol search error:", error);
    return NextResponse.json([]);
  }
}
