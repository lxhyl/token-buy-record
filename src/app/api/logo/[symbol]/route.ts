import { NextRequest, NextResponse } from "next/server";
import { getLogoFromR2, uploadLogoToR2 } from "@/lib/r2";

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();

  // Validate symbol: alphanumeric, dots, hyphens, 1-10 chars
  if (!/^[A-Z0-9.\-]{1,10}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  // 1. Try R2 cache
  const cached = await getLogoFromR2(symbol);
  if (cached) {
    return new NextResponse(cached.body, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  }

  // 2. Fetch from Twelve Data
  if (!TWELVE_DATA_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.twelvedata.com/logo?symbol=${encodeURIComponent(symbol)}&apikey=${TWELVE_DATA_API_KEY}`
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }

    const data = await res.json();
    const logoUrl = data.url;
    if (!logoUrl) {
      return NextResponse.json({ error: "No logo URL" }, { status: 404 });
    }

    // Fetch the actual image
    const imgRes = await fetch(logoUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to fetch logo image" }, { status: 404 });
    }

    const contentType = imgRes.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // 3. Cache in R2 (fire and forget)
    uploadLogoToR2(symbol, buffer, contentType).catch(() => {});

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch logo" }, { status: 404 });
  }
}
