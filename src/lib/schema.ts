import {
  pgTable,
  serial,
  varchar,
  decimal,
  timestamp,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const ASSET_TYPES = ["crypto", "stock"] as const;
export const TRADE_TYPES = ["buy", "sell"] as const;

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

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
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

export const deposits = pgTable("deposits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }),
  principal: decimal("principal", { precision: 18, scale: 2 }).notNull(),
  withdrawnAmount: decimal("withdrawn_amount", { precision: 18, scale: 2 }).default("0"),
  interestRate: decimal("interest_rate", { precision: 8, scale: 4 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  startDate: timestamp("start_date").notNull(),
  maturityDate: timestamp("maturity_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const currentPrices = pgTable("current_prices", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appSettings = pgTable(
  "app_settings",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("app_settings_user_key").on(table.userId, table.key),
  ]
);

export const priceHistory = pgTable(
  "price_history",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    date: timestamp("date").notNull(),
    price: decimal("price", { precision: 18, scale: 8 }).notNull(),
    source: varchar("source", { length: 20 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("price_history_symbol_date").on(table.symbol, table.date),
  ]
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Deposit = typeof deposits.$inferSelect;
export type NewDeposit = typeof deposits.$inferInsert;
export type CurrentPrice = typeof currentPrices.$inferSelect;
export type NewCurrentPrice = typeof currentPrices.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;

// ── Asset logos ──────────────────────────────────────────────

export const assetLogos = pgTable("asset_logos", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  url: text("url").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
