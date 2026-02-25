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
  const [loaded, setLoaded] = useState(false);

  const failed = srcIndex >= sources.length;
  const showFallback = failed || !loaded;

  const handleError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(srcIndex + 1);
    } else {
      setSrcIndex(sources.length); // mark as fully failed
    }
  };

  return (
    <div className={`relative ${className} shrink-0`}>
      {/* Gradient fallback — shown while loading or on error */}
      {showFallback && (
        <div className={`flex ${className} items-center justify-center rounded-xl font-bold text-white ${assetGradient(assetType)}`}>
          {symbol.slice(0, 2)}
        </div>
      )}
      {/* Actual logo image */}
      {!failed && (
        <img
          src={sources[srcIndex]}
          alt={symbol}
          className={`${className} rounded-xl object-cover ${showFallback ? "absolute inset-0" : ""}`}
          style={showFallback ? { opacity: 0 } : undefined}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}
    </div>
  );
}
