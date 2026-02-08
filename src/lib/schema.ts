import {
  pgTable,
  serial,
  varchar,
  decimal,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }),
  assetType: varchar("asset_type", { length: 10 }).notNull(), // 'stock' | 'crypto'
  tradeType: varchar("trade_type", { length: 10 }).notNull(), // 'buy' | 'sell'
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 18, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 18, scale: 2 }).default("0"),
  tradeDate: timestamp("trade_date").notNull(),
  notes: text("notes"),
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
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type CurrentPrice = typeof currentPrices.$inferSelect;
export type NewCurrentPrice = typeof currentPrices.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
