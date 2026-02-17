import { z } from "zod";
import { ASSET_TYPES, TRADE_TYPES } from "./schema";

const CURRENCIES = ["USD", "CNY", "HKD"] as const;

export const transactionSchema = z
  .object({
    symbol: z
      .string()
      .min(1, "Symbol is required")
      .max(20, "Symbol must be 20 characters or less"),
    name: z.string().max(100).optional().default(""),
    assetType: z.enum(ASSET_TYPES, {
      error: "Invalid asset type",
    }),
    tradeType: z.enum(TRADE_TYPES, {
      error: "Invalid trade type",
    }),
    quantity: z.coerce
      .number({ error: "Quantity must be a number" })
      .min(0, "Quantity cannot be negative"),
    price: z.coerce
      .number({ error: "Price must be a number" })
      .min(0, "Price cannot be negative"),
    fee: z.coerce
      .number({ error: "Fee must be a number" })
      .min(0, "Fee cannot be negative")
      .default(0),
    incomeAmount: z.coerce
      .number({ error: "Amount must be a number" })
      .positive("Amount must be greater than 0")
      .optional(),
    currency: z.enum(CURRENCIES, {
      error: "Invalid currency",
    }),
    tradeDate: z
      .string()
      .min(1, "Trade date is required")
      .refine((val) => !isNaN(Date.parse(val)), "Invalid date")
      .refine((val) => {
        const d = new Date(val);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return d < tomorrow;
      }, "Trade date cannot be in the future"),
    notes: z.string().optional().default(""),
    interestRate: z.coerce
      .number()
      .min(0, "Interest rate cannot be negative")
      .max(100, "Interest rate cannot exceed 100%")
      .optional()
      .nullable(),
    maturityDate: z.string().optional().default(""),
    subType: z.string().optional().default(""),
  })
  .refine(
    (data) => {
      const isFixedIncome =
        data.assetType === "deposit" || data.assetType === "bond";
      const isCashIncome =
        data.tradeType === "income" && data.quantity === 0;
      if (isFixedIncome || isCashIncome) {
        return (
          data.incomeAmount !== undefined && data.incomeAmount > 0
        );
      }
      return true;
    },
    { message: "Amount is required and must be greater than 0", path: ["incomeAmount"] }
  );

export type TransactionFormData = z.infer<typeof transactionSchema>;

export function parseTransactionFormData(formData: FormData): {
  success: true;
  data: TransactionFormData;
} | {
  success: false;
  error: string;
} {
  const raw = {
    symbol: formData.get("symbol") ?? "",
    name: formData.get("name") ?? "",
    assetType: formData.get("assetType") ?? "",
    tradeType: formData.get("tradeType") ?? "",
    quantity: formData.get("quantity") ?? "0",
    price: formData.get("price") ?? "0",
    fee: formData.get("fee") ?? "0",
    incomeAmount: formData.get("incomeAmount")
      ? Number(formData.get("incomeAmount"))
      : undefined,
    currency: formData.get("currency") ?? "USD",
    tradeDate: formData.get("tradeDate") ?? "",
    notes: formData.get("notes") ?? "",
    interestRate: formData.get("interestRate")
      ? Number(formData.get("interestRate"))
      : undefined,
    maturityDate: formData.get("maturityDate") ?? "",
    subType: formData.get("subType") ?? "",
  };

  const result = transactionSchema.safeParse(raw);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return { success: false, error: firstIssue.message };
  }
  return { success: true, data: result.data };
}
