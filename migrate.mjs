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

// Add currency column to transactions if missing
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'currency'
    ) THEN
      ALTER TABLE "transactions"
        ADD COLUMN "currency" varchar(10) NOT NULL DEFAULT 'USD';
    END IF;
  END $$
`;

// Add interest_rate column to transactions if missing
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'interest_rate'
    ) THEN
      ALTER TABLE "transactions"
        ADD COLUMN "interest_rate" numeric(8, 4);
    END IF;
  END $$
`;

// Add maturity_date column to transactions if missing
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'maturity_date'
    ) THEN
      ALTER TABLE "transactions"
        ADD COLUMN "maturity_date" timestamp;
    END IF;
  END $$
`;

// Add sub_type column to transactions if missing
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'sub_type'
    ) THEN
      ALTER TABLE "transactions"
        ADD COLUMN "sub_type" varchar(20);
    END IF;
  END $$
`;

// ── Auth tables ──────────────────────────────────────────────

await sql`
  CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text,
    "email" text NOT NULL UNIQUE,
    "emailVerified" timestamp,
    "image" text
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS "accounts" (
    "userId" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" text NOT NULL,
    "provider" text NOT NULL,
    "providerAccountId" text NOT NULL,
    "refresh_token" text,
    "access_token" text,
    "expires_at" integer,
    "token_type" text,
    "scope" text,
    "id_token" text,
    "session_state" text,
    PRIMARY KEY ("provider", "providerAccountId")
  )
`;

// ── Add user_id to transactions ──────────────────────────────

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE "transactions"
        ADD COLUMN "user_id" text NOT NULL DEFAULT 'legacy';
    END IF;
  END $$
`;

// ── Add user_id to app_settings ──────────────────────────────

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'app_settings' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE "app_settings"
        ADD COLUMN "user_id" text NOT NULL DEFAULT 'legacy';
    END IF;
  END $$
`;

// Drop old unique constraint on app_settings.key (now composite with user_id)
await sql`
  DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_key_unique'
    ) THEN
      ALTER TABLE "app_settings"
        DROP CONSTRAINT "app_settings_key_unique";
    END IF;
  END $$
`;

// Add composite unique on (user_id, key)
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_user_key_unique'
    ) THEN
      ALTER TABLE "app_settings"
        ADD CONSTRAINT "app_settings_user_key_unique" UNIQUE("user_id", "key");
    END IF;
  END $$
`;

// ── Add realized_pnl to transactions ─────────────────────────

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'realized_pnl'
    ) THEN
      ALTER TABLE "transactions"
        ADD COLUMN "realized_pnl" numeric(18, 2);
    END IF;
  END $$
`;

// ── Price history table ──────────────────────────────────────────

await sql`
  CREATE TABLE IF NOT EXISTS "price_history" (
    "id" serial PRIMARY KEY NOT NULL,
    "symbol" varchar(20) NOT NULL,
    "date" timestamp NOT NULL,
    "price" numeric(18, 8) NOT NULL,
    "source" varchar(20) NOT NULL,
    "created_at" timestamp DEFAULT now()
  )
`;

// Add unique constraint on (symbol, date) if missing
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'price_history_symbol_date_unique'
    ) THEN
      ALTER TABLE "price_history"
        ADD CONSTRAINT "price_history_symbol_date_unique" UNIQUE("symbol", "date");
    END IF;
  END $$
`;

// Add index on (symbol, date) if missing
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'price_history_symbol_date_idx'
    ) THEN
      CREATE INDEX "price_history_symbol_date_idx" ON "price_history" ("symbol", "date");
    END IF;
  END $$
`;

// ── Backfill realized_pnl for existing sell transactions (FIFO) ──

const sellsToBackfill = await sql`
  SELECT id, user_id, symbol, quantity, price, total_amount, currency, trade_date
  FROM transactions
  WHERE trade_type = 'sell'
    AND asset_type NOT IN ('deposit', 'bond')
    AND realized_pnl IS NULL
  ORDER BY trade_date ASC
`;

if (sellsToBackfill.length > 0) {
  console.log(`Backfilling realized_pnl for ${sellsToBackfill.length} sell transaction(s)...`);

  // Group sells by (user_id, symbol) to process FIFO per group
  const groups = new Map();
  for (const sell of sellsToBackfill) {
    const key = `${sell.user_id}::${sell.symbol}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(sell);
  }

  for (const [key, sells] of groups) {
    const [userId, symbol] = key.split("::");

    // Get all buy transactions for this user+symbol, ordered by date
    const buys = await sql`
      SELECT quantity, price, currency, trade_date
      FROM transactions
      WHERE user_id = ${userId}
        AND symbol = ${symbol}
        AND trade_type = 'buy'
        AND asset_type NOT IN ('deposit', 'bond')
      ORDER BY trade_date ASC, id ASC
    `;

    // Build FIFO lot queue
    const lots = buys.map(b => ({
      remaining: parseFloat(b.quantity),
      price: parseFloat(b.price),
    }));

    // Get all sells for this user+symbol in chronological order (including already-filled ones)
    const allSells = await sql`
      SELECT id, quantity, price, total_amount, realized_pnl
      FROM transactions
      WHERE user_id = ${userId}
        AND symbol = ${symbol}
        AND trade_type = 'sell'
        AND asset_type NOT IN ('deposit', 'bond')
      ORDER BY trade_date ASC, id ASC
    `;

    let lotIdx = 0;
    for (const sell of allSells) {
      let sellQty = parseFloat(sell.quantity);
      let costOfSold = 0;

      while (sellQty > 0.00000001 && lotIdx < lots.length) {
        const lot = lots[lotIdx];
        const take = Math.min(sellQty, lot.remaining);
        costOfSold += take * lot.price;
        lot.remaining -= take;
        sellQty -= take;
        if (lot.remaining <= 0.00000001) lotIdx++;
      }

      if (sell.realized_pnl === null) {
        const sellProceeds = parseFloat(sell.total_amount);
        const realizedPnl = (sellProceeds - costOfSold).toFixed(2);
        await sql`
          UPDATE transactions SET realized_pnl = ${realizedPnl} WHERE id = ${sell.id}
        `;
      }
    }
  }

  console.log("Backfill complete.");
}

// ── Asset logos table ────────────────────────────────────────────

await sql`
  CREATE TABLE IF NOT EXISTS "asset_logos" (
    "id" serial PRIMARY KEY NOT NULL,
    "symbol" varchar(20) NOT NULL UNIQUE,
    "url" text NOT NULL,
    "updated_at" timestamp DEFAULT now()
  )
`;

// ── Deposits table ────────────────────────────────────────────

await sql`
  CREATE TABLE IF NOT EXISTS "deposits" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "symbol" varchar(20) NOT NULL,
    "name" varchar(100),
    "principal" numeric(18, 2) NOT NULL,
    "interest_rate" numeric(8, 4) NOT NULL,
    "currency" varchar(10) NOT NULL DEFAULT 'USD',
    "start_date" timestamp NOT NULL,
    "maturity_date" timestamp,
    "notes" text,
    "created_at" timestamp DEFAULT now()
  )
`;

// ── Migrate existing deposit/bond transactions to deposits table ──

const depositTxGroups = await sql`
  SELECT user_id, symbol,
    MAX(name) as name,
    SUM(CASE WHEN trade_type = 'buy' THEN CAST(total_amount AS numeric) ELSE 0 END) as total_buys,
    SUM(CASE WHEN trade_type = 'sell' THEN CAST(total_amount AS numeric) ELSE 0 END) as total_sells,
    COALESCE(
      SUM(CASE WHEN trade_type = 'buy' AND interest_rate IS NOT NULL THEN CAST(interest_rate AS numeric) * CAST(total_amount AS numeric) ELSE 0 END) /
      NULLIF(SUM(CASE WHEN trade_type = 'buy' THEN CAST(total_amount AS numeric) ELSE 0 END), 0),
      0
    ) as weighted_rate,
    MIN(trade_date) as earliest_date,
    MIN(CASE WHEN maturity_date IS NOT NULL AND maturity_date > NOW() THEN maturity_date ELSE NULL END) as nearest_maturity,
    MAX(currency) as currency
  FROM transactions
  WHERE asset_type IN ('deposit', 'bond')
  GROUP BY user_id, symbol
`;

if (depositTxGroups.length > 0) {
  console.log(`Migrating ${depositTxGroups.length} deposit/bond group(s) to deposits table...`);

  for (const group of depositTxGroups) {
    const principal = (parseFloat(group.total_buys) - parseFloat(group.total_sells)).toFixed(2);
    if (parseFloat(principal) <= 0) continue;

    // Check if already migrated
    const existing = await sql`
      SELECT id FROM deposits WHERE user_id = ${group.user_id} AND symbol = ${group.symbol} LIMIT 1
    `;
    if (existing.length > 0) continue;

    await sql`
      INSERT INTO deposits (user_id, symbol, name, principal, interest_rate, currency, start_date, maturity_date)
      VALUES (
        ${group.user_id},
        ${group.symbol},
        ${group.name || null},
        ${principal},
        ${parseFloat(group.weighted_rate || 0).toFixed(4)},
        ${group.currency || 'USD'},
        ${group.earliest_date},
        ${group.nearest_maturity || null}
      )
    `;
  }

  console.log("Deposit migration complete.");
}

// ── Add withdrawn_amount column to deposits if missing ───────────────
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'deposits' AND column_name = 'withdrawn_amount'
    ) THEN
      ALTER TABLE "deposits"
        ADD COLUMN "withdrawn_amount" numeric(18, 2) DEFAULT '0';
    END IF;
  END $$
`;

// ── Delete income transactions (trade type removed) ──────────────────
await sql`DELETE FROM transactions WHERE trade_type = 'income'`;

console.log("Migrations complete");
