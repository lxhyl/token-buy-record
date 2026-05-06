"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mounted on data-driven pages to refresh stale market prices in the
 * background after SSR. Keeps the initial render instant and quietly
 * re-renders the page once fresh prices land in the DB.
 */
export function PriceRefresher() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const idle: (cb: () => void) => number =
      typeof window !== "undefined" &&
      "requestIdleCallback" in window
        ? (cb) =>
            (window as unknown as {
              requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
            }).requestIdleCallback(cb, { timeout: 1500 })
        : (cb) => window.setTimeout(cb, 200);

    const handle = idle(async () => {
      try {
        const res = await fetch("/api/prices/refresh", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { refreshed?: boolean };
        if (!cancelled && data.refreshed) {
          router.refresh();
        }
      } catch {
        // Network failed — leave cached prices in place.
      }
    });

    return () => {
      cancelled = true;
      if (
        typeof window !== "undefined" &&
        "cancelIdleCallback" in window
      ) {
        (window as unknown as {
          cancelIdleCallback: (h: number) => void;
        }).cancelIdleCallback(handle);
      } else {
        clearTimeout(handle);
      }
    };
  }, [router]);

  return null;
}
