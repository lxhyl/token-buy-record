CREATE TABLE IF NOT EXISTS "transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "symbol" varchar(20) NOT NULL,
  "name" varchar(100),
  "asset_type" varchar(10) NOT NULL,
  "trade_type" varchar(10) NOT NULL,
  "quantity" decimal(18, 8) NOT NULL,
  "price" decimal(18, 8) NOT NULL,
  "total_amount" decimal(18, 2) NOT NULL,
  "fee" decimal(18, 2) DEFAULT '0',
  "trade_date" timestamp NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "current_prices" (
  "id" serial PRIMARY KEY NOT NULL,
  "symbol" varchar(20) NOT NULL UNIQUE,
  "price" decimal(18, 8) NOT NULL,
  "updated_at" timestamp DEFAULT now()
);
