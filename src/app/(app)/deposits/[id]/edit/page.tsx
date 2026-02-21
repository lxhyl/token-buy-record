import { notFound } from "next/navigation";
import { DepositForm } from "@/components/DepositForm";
import { getDeposit } from "@/actions/deposits";
import { getDisplayCurrency } from "@/actions/settings";
import { Card, CardContent } from "@/components/ui/card";
import { getDisplayLanguage } from "@/actions/settings";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EditDepositPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const depositId = parseInt(id, 10);
  if (isNaN(depositId)) notFound();

  const [deposit, currency, locale] = await Promise.all([
    getDeposit(depositId),
    getDisplayCurrency(),
    getDisplayLanguage(),
  ]);

  if (!deposit) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t(locale, "deposit.editTitle")}</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          {t(locale, "deposit.editSubtitle")}
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DepositForm deposit={deposit} mode="edit" currency={currency} />
        </CardContent>
      </Card>
    </div>
  );
}
