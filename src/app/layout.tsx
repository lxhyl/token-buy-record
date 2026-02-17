import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SplashScreen } from "@/components/SplashScreen";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { I18nProvider } from "@/components/I18nProvider";
import { ColorSchemeProvider } from "@/components/ColorSchemeProvider";
import { getLocaleFromCookie } from "@/actions/settings";
import { getColorScheme } from "@/actions/settings";

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
  maximumScale: 5,
  userScalable: true,
  themeColor: "#3b82f6",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, colorScheme] = await Promise.all([
    getLocaleFromCookie(),
    getColorScheme(),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning>
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
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <I18nProvider locale={locale}>
            <ColorSchemeProvider scheme={colorScheme}>
            <ToastProvider>
              <SplashScreen />
              <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                {children}
              </div>
              <ServiceWorkerRegister />
            </ToastProvider>
            </ColorSchemeProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
