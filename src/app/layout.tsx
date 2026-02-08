import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TradeTracker - Personal Trading Record",
  description: "Track your stock and cryptocurrency trades with comprehensive analysis",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TradeTracker",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Inline critical CSS for instant splash screen - prevents black screen on PWA cold start */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #app-splash {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #f8fafc, #fff, #eff6ff);
                transition: opacity 0.3s;
              }
              #app-splash .splash-icon {
                width: 56px;
                height: 56px;
                border-radius: 16px;
                background: linear-gradient(135deg, #2563eb, #7c3aed);
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
                box-shadow: 0 4px 14px rgba(37,99,235,0.3);
              }
              #app-splash .splash-icon svg {
                width: 28px;
                height: 28px;
                color: white;
              }
              #app-splash .splash-title {
                font-size: 22px;
                font-weight: 700;
                background: linear-gradient(90deg, #2563eb, #7c3aed);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-family: system-ui, -apple-system, sans-serif;
              }
              #app-splash .splash-bar {
                width: 48px;
                height: 3px;
                border-radius: 3px;
                background: #e2e8f0;
                margin-top: 24px;
                overflow: hidden;
              }
              #app-splash .splash-bar::after {
                content: '';
                display: block;
                width: 50%;
                height: 100%;
                border-radius: 3px;
                background: linear-gradient(90deg, #2563eb, #7c3aed);
                animation: splashProgress 1.2s ease-in-out infinite;
              }
              @keyframes splashProgress {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
              }
              #app-splash.loaded { opacity: 0; pointer-events: none; }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {/* Splash screen: visible immediately, hidden once React hydrates */}
        <div id="app-splash">
          <div className="splash-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <div className="splash-title">TradeTracker</div>
          <div className="splash-bar" />
        </div>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
          <Navigation />
          <main className="container mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">{children}</main>
        </div>
        <ServiceWorkerRegister />
        {/* Remove splash screen once page content is ready */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var s = document.getElementById('app-splash');
                if (s) {
                  s.classList.add('loaded');
                  setTimeout(function() { s.remove(); }, 350);
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
