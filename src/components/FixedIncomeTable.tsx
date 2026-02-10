"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FixedIncomeHolding } from "@/lib/calculations";
import { createCurrencyFormatter, formatDate } from "@/lib/utils";
import { SupportedCurrency, ExchangeRates } from "@/lib/currency";
import { PiggyBank, Landmark } from "lucide-react";

interface FixedIncomeTableProps {
  holdings: FixedIncomeHolding[];
  currency: SupportedCurrency;
  rates: ExchangeRates;
}

function getStatus(maturityDate: Date | null): {
  label: string;
  className: string;
} {
  if (!maturityDate) {
    return { label: "Active", className: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" };
  }

  const now = new Date();
  const diffMs = maturityDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return { label: "Matured", className: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" };
  }
  if (diffDays < 30) {
    return { label: "Maturing Soon", className: "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300" };
  }
  return { label: "Active", className: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" };
}

export function FixedIncomeTable({
  holdings,
  currency,
  rates,
}: FixedIncomeTableProps) {
  const fc = createCurrencyFormatter(currency, rates);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <PiggyBank className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <CardTitle className="text-base md:text-lg truncate">
            Fixed-Income Holdings
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <PiggyBank className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">
              No fixed-income assets yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Add deposit or bond transactions to see them here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Maturity</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => {
                  const status = getStatus(h.maturityDate);
                  const isDeposit = h.assetType === "deposit";
                  return (
                    <TableRow key={h.symbol}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white ${
                              isDeposit
                                ? "bg-gradient-to-br from-green-500 to-emerald-500"
                                : "bg-gradient-to-br from-amber-500 to-yellow-500"
                            }`}
                          >
                            {isDeposit ? (
                              <PiggyBank className="h-5 w-5" />
                            ) : (
                              <Landmark className="h-5 w-5" />
                            )}
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
                      <TableCell>
                        {isDeposit ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              h.subType === "demand"
                                ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                : "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                            }`}
                          >
                            {h.subType === "demand" ? "活期" : "定期"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            Bond
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {fc(h.principal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {h.interestRate > 0
                          ? `${h.interestRate.toFixed(2)}%`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {h.totalIncome > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            {fc(h.totalIncome)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {h.maturityDate
                          ? formatDate(new Date(h.maturityDate))
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
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
  );
}
