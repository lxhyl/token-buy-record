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
  Settings,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { LoginModal } from "@/components/LoginModal";
import { LandingDashboard } from "@/components/LandingDashboard";
import { LandingCliSection } from "@/components/LandingCliSection";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TranslationKey } from "@/lib/i18n";

const FEATURE_ITEMS: { icon: typeof BarChart3; titleKey: TranslationKey; descKey: TranslationKey; iconColor: string }[] = [
  { icon: BarChart3,   titleKey: "landing.featureAnalyticsTitle",    descKey: "landing.featureAnalyticsDesc",    iconColor: "text-primary"              },
  { icon: PieChart,    titleKey: "landing.featureMultiAssetTitle",   descKey: "landing.featureMultiAssetDesc",   iconColor: "text-emerald-600"           },
  { icon: Globe,       titleKey: "landing.featureMultiCurrencyTitle",descKey: "landing.featureMultiCurrencyDesc",iconColor: "text-primary"              },
  { icon: Smartphone,  titleKey: "landing.featurePWATitle",          descKey: "landing.featurePWADesc",          iconColor: "text-amber-600"            },
  { icon: Shield,      titleKey: "landing.featureSecureTitle",       descKey: "landing.featureSecureDesc",       iconColor: "text-foreground"           },
  { icon: Zap,         titleKey: "landing.featureFastTitle",         descKey: "landing.featureFastDesc",         iconColor: "text-amber-600"            },
];

export function LandingPage() {
  const { t } = useI18n();
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        authenticated={false}
      />

      {/* Top nav bar */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-foreground">TradeTracker</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              aria-label={t("settings.title")}
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLoginOpen(true)}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
            >
              {t("common.getStarted")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative py-20 md:py-28">
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="label-caps inline-flex items-center gap-2 mb-6 animate-fade-in">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
              {t("landing.tagline")}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              {t("landing.heroTitle1")}{" "}
              <span className="text-primary">{t("landing.heroTitle2")}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              {t("landing.heroDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <button
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
              >
                {t("common.getStarted")}
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-all hover:bg-secondary/50"
              >
                {t("common.learnMore")}
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Real dashboard preview */}
          <div className="animate-fade-in rounded-lg border shadow-xl overflow-hidden" style={{ animationDelay: "0.4s" }}>
            <div className="p-4 md:p-8 bg-background">
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
              <span className="text-primary">{t("landing.featuresTitle2")}</span>
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
                  className="group rounded-lg border bg-card p-6 transition-all hover:shadow-md animate-fade-in"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-md bg-muted mb-4 ${f.iconColor}`}>
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

      {/* ── CLI Section ──────────────────────────────── */}
      <LandingCliSection />

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
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
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
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
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
