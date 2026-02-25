"use client";

import { useState } from "react";
import {
  TrendingUp,
  BarChart3,
  Shield,
  Smartphone,
  PieChart,
  ArrowRight,
  ChevronRight,
  Zap,
  Globe,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { LandingLanguageToggle } from "@/components/LandingLanguageToggle";
import { LoginModal } from "@/components/LoginModal";
import { LandingDashboard } from "@/components/LandingDashboard";
import { TranslationKey } from "@/lib/i18n";

const FEATURE_ITEMS: { icon: typeof BarChart3; titleKey: TranslationKey; descKey: TranslationKey; gradient: string }[] = [
  { icon: BarChart3,   titleKey: "landing.featureAnalyticsTitle",    descKey: "landing.featureAnalyticsDesc",    gradient: "from-blue-500 to-cyan-500"    },
  { icon: PieChart,    titleKey: "landing.featureMultiAssetTitle",   descKey: "landing.featureMultiAssetDesc",   gradient: "from-teal-500 to-emerald-500"  },
  { icon: Globe,       titleKey: "landing.featureMultiCurrencyTitle",descKey: "landing.featureMultiCurrencyDesc",gradient: "from-sky-500 to-blue-500"      },
  { icon: Smartphone,  titleKey: "landing.featurePWATitle",          descKey: "landing.featurePWADesc",          gradient: "from-orange-500 to-amber-500"  },
  { icon: Shield,      titleKey: "landing.featureSecureTitle",       descKey: "landing.featureSecureDesc",       gradient: "from-slate-600 to-slate-800"   },
  { icon: Zap,         titleKey: "landing.featureFastTitle",         descKey: "landing.featureFastDesc",         gradient: "from-amber-500 to-yellow-500"  },
];

// ── Landing page ───────────────────────────────────────────
export function LandingPage() {
  const { t } = useI18n();
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* Top nav bar */}
      <header className="sticky top-0 z-50 border-b bg-white/85 dark:bg-gray-950/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-md shadow-blue-600/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-gradient">TradeTracker</span>
          </div>
          <div className="flex items-center gap-3">
            <LandingLanguageToggle />
            <button
              onClick={() => setLoginOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0"
            >
              {t("common.getStarted")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative py-20 md:py-28">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/8 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/50 dark:bg-gray-900/50 px-4 py-1.5 text-sm text-muted-foreground mb-6 backdrop-blur-sm animate-fade-in">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              {t("landing.tagline")}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              {t("landing.heroTitle1")}{" "}
              <span className="text-gradient">{t("landing.heroTitle2")}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              {t("landing.heroDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <button
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 px-8 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0"
              >
                {t("common.getStarted")}
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-all hover:bg-secondary/50 hover:-translate-y-0.5 active:translate-y-0"
              >
                {t("common.learnMore")}
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Real dashboard preview */}
          <div className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {/* Browser chrome */}
            <div className="rounded-t-xl border border-b-0 bg-gray-50/80 dark:bg-gray-800/80 px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 rounded-md bg-white dark:bg-gray-900 border px-4 py-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3 text-emerald-500" />
                  trade.ozlab.xyz
                </div>
              </div>
            </div>
            <div className="rounded-b-xl border bg-background shadow-2xl shadow-black/5 dark:shadow-black/20 p-4 md:p-8">
              <LandingDashboard onLogin={() => setLoginOpen(true)} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────── */}
      <section id="features" className="py-20 md:py-28 border-t bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              {t("landing.featuresTitle1")}{" "}
              <span className="text-gradient">{t("landing.featuresTitle2")}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.featuresSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {FEATURE_ITEMS.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.titleKey}
                  className="group rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5 animate-fade-in"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${f.gradient} text-white mb-4 shadow-sm transition-transform group-hover:scale-105`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold mb-1.5">{t(f.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────── */}
      <section className="py-20 md:py-28 border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              {t("landing.ctaTitle")}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t("landing.ctaDesc")}
            </p>
            <button
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 px-8 py-4 text-base font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0"
            >
              {t("common.getStarted")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-teal-500 text-white">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-foreground">TradeTracker</span>
          </div>
          <p>{t("landing.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
