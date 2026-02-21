"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DepositHolding } from "@/lib/calculations";
import { createCurrencyFormatter, formatDate } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { PiggyBank, Plus, Pencil, Trash2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { TranslationKey } from "@/lib/i18n";
import { deleteDeposit } from "@/actions/deposits";
import { useToast } from "@/components/Toast";
import { useState } from "react";

interface DepositTableProps {
  holdings: DepositHolding[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

function getStatus(maturityDate: Date | null): {
  labelKey: TranslationKey;
  className: string;
} {
  if (!maturityDate) {
    return { labelKey: "deposit.active", className: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300" };
  }

  const now = new Date();
  const diffMs = maturityDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return { labelKey: "deposit.matured", className: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" };
  }
  if (diffDays < 30) {
    return { labelKey: "deposit.maturingSoon", className: "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300" };
  }
  return { labelKey: "deposit.active", className: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300" };
}

export function DepositTable({
  holdings,
  currency,
  rates,
}: DepositTableProps) {
  const fc = createCurrencyFormatter(currency, rates);
  const { t } = useI18n();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; symbol: string } | null>(null);

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const { id, symbol } = deleteConfirm;
    setDeleteConfirm(null);
    startTransition(async () => {
      await deleteDeposit(id);
      toast(`${t("common.delete")} ${symbol}`, "success");
    });
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 px-4 md:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <PiggyBank className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <CardTitle className="text-base md:text-lg truncate">
                {t("deposit.title")}
              </CardTitle>
            </div>
            <Link href="/transactions/new?type=deposit">
              <Button size="sm" className="md:h-10 md:px-4">
                <Plus className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">{t("deposit.addDeposit")}</span>
                <span className="sm:hidden">{t("common.add")}</span>
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <PiggyBank className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                {t("deposit.empty")}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {t("deposit.emptyHint")}
              </p>
              <Link href="/transactions/new?type=deposit">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("deposit.addDeposit")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("deposit.asset")}</TableHead>
                    <TableHead className="text-right">{t("deposit.principalCol")}</TableHead>
                    <TableHead className="text-right">{t("deposit.rate")}</TableHead>
                    <TableHead className="text-right">{t("deposit.accruedInterest")}</TableHead>
                    <TableHead className="text-right">{t("deposit.currentValue")}</TableHead>
                    <TableHead className="text-right">{t("deposit.startDateCol")}</TableHead>
                    <TableHead className="text-right">{t("deposit.maturity")}</TableHead>
                    <TableHead className="text-right">{t("deposit.status")}</TableHead>
                    <TableHead className="text-right">{t("deposit.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((h) => {
                    const status = getStatus(h.maturityDate);
                    return (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white bg-gradient-to-br from-green-500 to-emerald-500">
                              <PiggyBank className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-semibold">{h.symbol}</div>
                              {h.name && (
                                <div className="text-xs text-muted-foreground">
                                  {h.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold font-num">
                          {fc(h.principal)}
                        </TableCell>
                        <TableCell className="text-right font-num">
                          {h.interestRate > 0
                            ? `${h.interestRate.toFixed(2)}%`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {h.accruedInterest > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium font-num bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                              {fc(h.accruedInterest)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold font-num">
                          {fc(h.currentValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatDate(h.startDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          {h.maturityDate
                            ? formatDate(h.maturityDate)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                          >
                            {t(status.labelKey)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/deposits/${h.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.edit")}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteConfirm({ id: h.id, symbol: h.symbol })}
                              disabled={isPending}
                              aria-label={t("common.delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-popover text-popover-foreground border rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{t("deposit.deleteTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("deposit.deleteConfirm")} {deleteConfirm.symbol}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
