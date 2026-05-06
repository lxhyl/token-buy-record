"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Defer registration until the page is idle so it doesn't compete
    // with the initial render. On PWA cold start, this saves ~hundreds of
    // ms on Time-to-Interactive on slower devices.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore */
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
