import {
  pgTable,
  serial,
  varchar,
  decimal,
  timestamp,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const ASSET_TYPES = ["crypto", "stock", "deposit", "bond"] as const;
export const TRADE_TYPES = ["buy", "sell", "income"] as const;
export const SUB_TYPES = ["fixed", "demand"] as const;

// ── Auth tables ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

// ── App tables ───────────────────────────────────────────────

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }),
  assetType: varchar("asset_type", { length: 10 }).notNull(),
  tradeType: varchar("trade_type", { length: 10 }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 18, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 18, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  tradeDate: timestamp("trade_date").notNull(),
  notes: text("notes"),
  interestRate: decimal("interest_rate", { precision: 8, scale: 4 }),
  maturityDate: timestamp("maturity_date"),
  subType: varchar("sub_type", { length: 20 }),
  realizedPnl: decimal("realized_pnl", { precision: 18, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const currentPrices = pgTable("current_prices", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  date: timestamp("date").notNull(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  source: varchar("source", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type CurrentPrice = typeof currentPrices.$inferSelect;
export type NewCurrentPrice = typeof currentPrices.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;
