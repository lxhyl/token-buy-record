"use client";

import { useState } from "react";

const assetGradient = (assetType: string) => {
  switch (assetType) {
    case "crypto": return "bg-gradient-to-br from-purple-500 to-pink-500";
    case "stock": return "bg-gradient-to-br from-blue-500 to-cyan-500";
    default: return "bg-gradient-to-br from-gray-500 to-slate-500";
  }
};

function getLogoSources(symbol: string, assetType: string): string[] {
  if (assetType === "crypto") {
    return [
      `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`,
      `/api/logo/${encodeURIComponent(symbol)}`,
    ];
  }
  return [
    `https://financialmodelingprep.com/image-stock/${symbol}.png`,
    `/api/logo/${encodeURIComponent(symbol)}`,
  ];
}

interface AssetLogoProps {
  symbol: string;
  assetType: string;
  className?: string;
}

export function AssetLogo({ symbol, assetType, className = "h-10 w-10" }: AssetLogoProps) {
  const sources = getLogoSources(symbol, assetType);
  const [srcIndex, setSrcIndex] = useState(0);

  const failed = srcIndex >= sources.length;

  const handleError = () => {
    setSrcIndex((i) => i + 1);
  };

  return (
    // Gradient is always the background; image overlays it once loaded
    <div className={`relative ${className} shrink-0 rounded-xl flex items-center justify-center font-bold text-white text-xs ${assetGradient(assetType)}`}>
      {symbol.slice(0, 2)}
      {!failed && (
        <img
          src={sources[srcIndex]}
          alt={symbol}
          className="absolute inset-0 h-full w-full rounded-xl object-cover"
          onError={handleError}
        />
      )}
    </div>
  );
}
