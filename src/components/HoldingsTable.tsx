"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateCurrentPrice } from "@/actions/transactions";
import { Holding } from "@/lib/calculations";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface HoldingsTableProps {
  holdings: Holding[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleUpdatePrice = (symbol: string) => {
    if (!newPrice) return;

    startTransition(async () => {
      await updateCurrentPrice(symbol, newPrice);
      setEditingSymbol(null);
      setNewPrice("");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        {holdings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No holdings yet. Add buy transactions to see your portfolio.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead className="text-right">P&L %</TableHead>
                <TableHead className="text-right">Annual %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h) => (
                <TableRow key={h.symbol}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{h.symbol}</div>
                      {h.name && (
                        <div className="text-xs text-muted-foreground">
                          {h.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        h.assetType === "crypto"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {h.assetType}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(h.quantity, 8)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(h.avgCost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingSymbol === h.symbol ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Input
                          type="number"
                          step="0.00000001"
                          value={newPrice}
                          onChange={(e) => setNewPrice(e.target.value)}
                          className="w-24 h-8"
                          placeholder="Price"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdatePrice(h.symbol)}
                          disabled={isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingSymbol(null);
                            setNewPrice("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        {formatCurrency(h.currentPrice)}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingSymbol(h.symbol);
                            setNewPrice(h.currentPrice.toString());
                          }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(h.currentValue)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      h.unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {h.unrealizedPnL >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatCurrency(Math.abs(h.unrealizedPnL))}
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      h.unrealizedPnLPercent >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {h.unrealizedPnLPercent >= 0 ? "+" : ""}
                    {formatPercent(h.unrealizedPnLPercent)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      h.annualizedReturn >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {h.annualizedReturn >= 0 ? "+" : ""}
                    {formatPercent(h.annualizedReturn)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
