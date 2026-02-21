"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createDeposit, updateDeposit } from "@/actions/deposits";
import { Deposit } from "@/lib/schema";
import { SupportedCurrency } from "@/lib/currency";
import { X, PiggyBank } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/components/I18nProvider";

interface DepositFormProps {
  deposit?: Deposit;
  mode?: "create" | "edit";
  currency: SupportedCurrency;
}

export function DepositForm({
  deposit,
  mode = "create",
  currency,
}: DepositFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [livePrincipal, setLivePrincipal] = useState(deposit?.principal || "");
  const [liveRate, setLiveRate] = useState(deposit?.interestRate || "");
  const [liveCurrency, setLiveCurrency] = useState(deposit?.currency || currency);

  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      let result: { error: string } | void;
      if (mode === "edit" && deposit) {
        result = await updateDeposit(deposit.id, formData);
      } else {
        result = await createDeposit(formData);
      }
      if (result && "error" in result) {
        toast(result.error, "error");
        return;
      }
      toast(
        mode === "edit" ? t("deposit.updated") : t("deposit.created"),
        "success"
      );
      router.push("/dashboard");
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Header icon */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
          <PiggyBank className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            {mode === "edit" ? t("deposit.editTitle") : t("deposit.addTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "edit" ? t("deposit.editSubtitle") : t("deposit.addSubtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Symbol */}
        <div className="space-y-2">
          <Label htmlFor="symbol">{t("deposit.symbol")}</Label>
          <Input
            id="symbol"
            name="symbol"
            placeholder={t("deposit.symbolPlaceholder")}
            defaultValue={deposit?.symbol || ""}
            required
          />
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">{t("deposit.name")}</Label>
          <Input
            id="name"
            name="name"
            placeholder={t("deposit.namePlaceholder")}
            defaultValue={deposit?.name || ""}
          />
        </div>

        {/* Principal */}
        <div className="space-y-2">
          <Label htmlFor="principal">{t("deposit.principal")}</Label>
          <Input
            id="principal"
            name="principal"
            type="number"
            step="0.01"
            placeholder="10000.00"
            defaultValue={deposit?.principal || ""}
            onChange={(e) => setLivePrincipal(e.target.value)}
            required
          />
        </div>

        {/* Interest Rate */}
        <div className="space-y-2">
          <Label htmlFor="interestRate">{t("deposit.interestRate")}</Label>
          <Input
            id="interestRate"
            name="interestRate"
            type="number"
            step="0.0001"
            placeholder="3.5000"
            defaultValue={deposit?.interestRate || ""}
            onChange={(e) => setLiveRate(e.target.value)}
            required
          />
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <Label htmlFor="currency">{t("form.currency")}</Label>
          <Select
            id="currency"
            name="currency"
            value={liveCurrency}
            onChange={(e) => setLiveCurrency(e.target.value)}
            className="h-11"
          >
            <option value="USD">USD</option>
            <option value="CNY">CNY</option>
            <option value="HKD">HKD</option>
          </Select>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate">{t("deposit.startDate")}</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={
              formatDateForInput(deposit?.startDate) ||
              new Date().toISOString().split("T")[0]
            }
            required
            className="h-11 min-w-0"
          />
        </div>

        {/* Maturity Date */}
        <div className="space-y-2">
          <Label htmlFor="maturityDate">{t("deposit.maturityDate")}</Label>
          <Input
            id="maturityDate"
            name="maturityDate"
            type="date"
            defaultValue={formatDateForInput(deposit?.maturityDate)}
            className="h-11 min-w-0"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-xs text-muted-foreground">{t("form.notes")}</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder={t("deposit.notesPlaceholder")}
          defaultValue={deposit?.notes || ""}
          className="min-h-[72px] text-sm bg-muted/20 border-dashed"
        />
      </div>

      {/* Summary & Actions */}
      <div className="rounded-xl border bg-muted/30 backdrop-blur-sm p-4 space-y-3">
        {(() => {
          const principal = parseFloat(String(livePrincipal));
          const rate = parseFloat(String(liveRate));
          if (!isNaN(principal) && principal > 0 && !isNaN(rate) && rate > 0) {
            const dailyInterest = (principal * rate / 100 / 365);
            const fmtPrincipal = principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const fmtDaily = dailyInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
            return (
              <p className="text-sm font-medium text-foreground">
                {t("deposit.principal")}: <span className="font-num font-bold">{fmtPrincipal}</span> {liveCurrency}
                {" @ "}
                <span className="font-num">{rate.toFixed(2)}%</span>
                {" = "}
                <span className="font-num">{fmtDaily}</span> {liveCurrency}/{t("deposit.perDay")}
              </p>
            );
          }
          return (
            <p className="text-sm text-muted-foreground">
              {t("form.summaryPlaceholder")}
            </p>
          );
        })()}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1 md:flex-none h-11 px-6 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white transition-all duration-200 hover:scale-[1.02]"
          >
            {isPending
              ? t("form.saving")
              : mode === "edit"
              ? t("deposit.update")
              : t("deposit.confirm")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-11 px-6 rounded-xl"
          >
            <X className="h-4 w-4 mr-2" />
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </form>
  );
}
