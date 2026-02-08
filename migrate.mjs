import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.log("No DATABASE_URL, skipping migration");
  process.exit(0);
}

const sql = neon(DATABASE_URL);

console.log("Running migrations...");

// Create tables if they don't exist
await sql`
  CREATE TABLE IF NOT EXISTS "transactions" (
    "id" serial PRIMARY KEY NOT NULL,
    "symbol" varchar(20) NOT NULL,
    "name" varchar(100),
    "asset_type" varchar(10) NOT NULL,
    "trade_type" varchar(10) NOT NULL,
    "quantity" numeric(18, 8) NOT NULL,
    "price" numeric(18, 8) NOT NULL,
    "total_amount" numeric(18, 2) NOT NULL,
    "fee" numeric(18, 2) DEFAULT '0',
    "trade_date" timestamp NOT NULL,
    "notes" text,
    "created_at" timestamp DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS "current_prices" (
    "id" serial PRIMARY KEY NOT NULL,
    "symbol" varchar(20) NOT NULL,
    "price" numeric(18, 8) NOT NULL,
    "updated_at" timestamp DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS "app_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar(100) NOT NULL,
    "value" text NOT NULL,
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "app_settings_key_unique" UNIQUE("key")
  )
`;

// Add unique constraint to current_prices.symbol if missing
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'current_prices_symbol_unique'
    ) THEN
      ALTER TABLE "current_prices"
        ADD CONSTRAINT "current_prices_symbol_unique" UNIQUE("symbol");
    END IF;
  END $$
`;

console.log("Migrations complete");
