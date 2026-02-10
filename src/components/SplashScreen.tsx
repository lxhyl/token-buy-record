"use client";

import { useState, useEffect } from "react";

export function SplashScreen() {
  const [hiding, setHiding] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    // Hide splash once React has hydrated (page is interactive)
    setHiding(true);
    const timer = setTimeout(() => setRemoved(true), 400);
    return () => clearTimeout(timer);
  }, []);

  if (removed) return null;

  return (
    <div
      id="app-splash"
      style={{
        opacity: hiding ? 0 : 1,
        pointerEvents: hiding ? "none" : "auto",
      }}
    >
      <div className="splash-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      </div>
      <div className="splash-title">TradeTracker</div>
      <div className="splash-bar" />
    </div>
  );
}
