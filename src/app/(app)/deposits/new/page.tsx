import { DepositForm } from "@/components/DepositForm";
import { getDisplayCurrency } from "@/actions/settings";
import { Card, CardContent } from "@/components/ui/card";
import { getDisplayLanguage } from "@/actions/settings";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function NewDepositPage() {
  const [currency, locale] = await Promise.all([
    getDisplayCurrency(),
    getDisplayLanguage(),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t(locale, "deposit.addTitle")}</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          {t(locale, "deposit.addSubtitle")}
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DepositForm currency={currency} />
        </CardContent>
      </Card>
    </div>
  );
}
