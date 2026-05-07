"use client";

import { useState } from "react";
import { Terminal, Copy, Check, ExternalLink, KeyRound, BarChart3, ListChecks } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import type { TranslationKey } from "@/lib/i18n";

const INSTALL_CMD = "cargo install tradetracker";

const CLI_FEATURES: { icon: typeof KeyRound; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: KeyRound,   titleKey: "landing.cliFeatureLoginTitle",     descKey: "landing.cliFeatureLoginDesc" },
  { icon: BarChart3,  titleKey: "landing.cliFeaturePortfolioTitle", descKey: "landing.cliFeaturePortfolioDesc" },
  { icon: ListChecks, titleKey: "landing.cliFeatureCrudTitle",      descKey: "landing.cliFeatureCrudDesc" },
];

function CommandBlock({ label, command }: { label: string; command: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <div className="label-caps mb-2 text-muted-foreground">{label}</div>
      <div className="group relative flex items-center gap-3 rounded-lg border bg-card px-4 py-3 font-mono text-sm">
        <span className="select-none text-muted-foreground">$</span>
        <code className="flex-1 truncate text-foreground">{command}</code>
        <button
          onClick={onCopy}
          className="flex h-7 items-center gap-1.5 rounded-md border border-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          aria-label={t("landing.cliCopy")}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              {t("landing.cliCopied")}
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              {t("landing.cliCopy")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function LandingCliSection() {
  const { t } = useI18n();

  return (
    <section className="border-t py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Left: copy + features */}
          <div>
            <div className="label-caps mb-6 inline-flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5" />
              {t("landing.cliBadge")}
            </div>
            <h2 className="mb-4 text-3xl font-extrabold tracking-tight md:text-4xl">
              {t("landing.cliTitle1")}{" "}
              <span className="text-primary">{t("landing.cliTitle2")}</span>
            </h2>
            <p className="mb-8 text-base text-muted-foreground md:text-lg leading-relaxed">
              {t("landing.cliDesc")}
            </p>

            <ul className="space-y-4 mb-8">
              {CLI_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.titleKey} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t(f.titleKey)}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap gap-3">
              <a
                href="https://crates.io/crates/tradetracker"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
              >
                {t("landing.cliViewOnCrates")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://github.com/lxhyl/trade-tracker/blob/main/cli/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50"
              >
                {t("landing.cliReadDocs")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Right: terminal mock */}
          <div className="space-y-4">
            <CommandBlock label={t("landing.cliInstallLabel")} command={INSTALL_CMD} />

            <div>
              <div className="label-caps mb-2 text-muted-foreground">{t("landing.cliRunLabel")}</div>
              <div className="rounded-lg border bg-card p-4 font-mono text-sm">
                <div className="space-y-1.5 text-muted-foreground">
                  <div>
                    <span className="select-none text-muted-foreground/70">$ </span>
                    <span className="text-foreground">tradetracker login</span>
                  </div>
                  <div className="pl-3 text-xs">→ open browser, sign in, token saved</div>
                  <div className="mt-2">
                    <span className="select-none text-muted-foreground/70">$ </span>
                    <span className="text-foreground">tradetracker portfolio</span>
                  </div>
                  <div className="pl-3 text-xs">→ holdings, cost, P&amp;L as a table</div>
                  <div className="mt-2">
                    <span className="select-none text-muted-foreground/70">$ </span>
                    <span className="text-foreground">tradetracker transactions add \</span>
                  </div>
                  <div className="pl-4 text-foreground">--symbol AAPL --trade-type buy \</div>
                  <div className="pl-4 text-foreground">--quantity 10 --price 187.42 \</div>
                  <div className="pl-4 text-foreground">--currency USD --date 2026-04-01</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
