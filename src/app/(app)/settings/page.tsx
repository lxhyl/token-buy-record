import { getDisplayCurrency, getDisplayLanguage } from "@/actions/settings";
import { getExchangeRates } from "@/lib/currency";
import { CurrencySettings } from "@/components/CurrencySettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ColorSchemeSettings } from "@/components/ColorSchemeSettings";
import { AccountSection } from "@/components/AccountSection";
import { LanguageSettings } from "@/components/LanguageSettings";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [currency, rates, locale] = await Promise.all([
    getDisplayCurrency(),
    getExchangeRates(),
    getDisplayLanguage(),
  ]);

  return (
    <div className="space-y-6 md:space-y-8 max-w-2xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {t(locale, "settings.title")}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          {t(locale, "settings.subtitle")}
        </p>
      </div>

      {/* Preferences - most frequently used, placed first */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {t(locale, "settings.preferences")}
        </h2>
        <Card>
          <CardContent className="p-5 space-y-6 divide-y divide-border">
            <LanguageSettings locale={locale} />
            <div className="pt-6">
              <CurrencySettings currency={currency} rates={rates} />
            </div>
            <div className="pt-6">
              <ColorSchemeSettings />
            </div>
            <div className="pt-6">
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Account - less frequently used, placed at bottom */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {t(locale, "settings.account")}
        </h2>
        <AccountSection />
      </section>
    </div>
  );
}
