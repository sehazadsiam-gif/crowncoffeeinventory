-- ============================================================
-- CROWN COFFEE — MENU COSTING & PROFITABILITY MODULE
-- Run this entire file in Supabase SQL Editor (one go).
-- All tables are prefixed `costing_` — no conflict with
-- the existing inventory schema (menu_items, ingredients, etc.)
-- ============================================================

-- ============================================================
-- 1. USERS (chef / admin roles for costing module)
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_users (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('chef', 'admin')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. SESSIONS (cookie-based auth for costing module)
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_sessions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES costing_users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_costing_sessions_token ON costing_sessions(token);

-- ============================================================
-- 3. MENU ITEMS (chef-managed, separate from POS menu_items)
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_menu_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  category    TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  current_cogs NUMERIC(12,4) DEFAULT 0,   -- cached, updated on every save
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. MASTER INGREDIENTS LIST (for autocomplete)
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_ingredients (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ITEM INGREDIENTS (junction: item ↔ ingredient with costing)
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_item_ingredients (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id      UUID NOT NULL REFERENCES costing_menu_items(id) ON DELETE CASCADE,
  ingredient_id     UUID REFERENCES costing_ingredients(id),
  ingredient_name   TEXT NOT NULL,           -- denormalized for display speed
  quantity          NUMERIC(12,4) NOT NULL,
  unit              TEXT NOT NULL CHECK (unit IN ('g','kg','L','ml','piece','bottle')),
  price             NUMERIC(12,4) NOT NULL,
  price_basis_unit  TEXT NOT NULL CHECK (price_basis_unit IN ('per g','per kg','per L','per ml','per piece','per bottle')),
  line_cost         NUMERIC(12,4),           -- computed + stored
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cii_menu_item ON costing_item_ingredients(menu_item_id);

-- ============================================================
-- 6. COGS HISTORY (version history — one row per save event)
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_cogs_history (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES costing_menu_items(id) ON DELETE CASCADE,
  total_cogs   NUMERIC(12,4) NOT NULL,
  snapshot     JSONB,                       -- [{ingredient_name, qty, unit, price, price_basis_unit, line_cost}]
  saved_by     UUID REFERENCES costing_users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cogs_hist_item ON costing_cogs_history(menu_item_id, created_at DESC);

-- ============================================================
-- 7. DELIVERY CHANNELS (admin-configurable: Foodpanda, Pathao…)
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_delivery_channels (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default channels (seeded below)

-- ============================================================
-- 8. ITEM PRICING — DINE-IN (admin only)
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_item_pricing (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES costing_menu_items(id) ON DELETE CASCADE UNIQUE,
  dine_in_price NUMERIC(12,2) DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. ITEM CHANNEL PRICING (selling price + commission per channel)
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_item_channel_pricing (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id   UUID NOT NULL REFERENCES costing_menu_items(id) ON DELETE CASCADE,
  channel_id     UUID NOT NULL REFERENCES costing_delivery_channels(id) ON DELETE CASCADE,
  selling_price  NUMERIC(12,2) DEFAULT 0,
  commission_pct NUMERIC(5,2) DEFAULT 0,    -- e.g. 30 means 30%
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(menu_item_id, channel_id)
);
CREATE INDEX IF NOT EXISTS idx_cicp_item ON costing_item_channel_pricing(menu_item_id);

-- ============================================================
-- 10. MONTHLY SALES ENTRY
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_sales_monthly (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES costing_menu_items(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL,
  month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  channel_id   UUID REFERENCES costing_delivery_channels(id),  -- NULL = dine-in
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(menu_item_id, year, month, channel_id)
);
CREATE INDEX IF NOT EXISTS idx_csm_year_month ON costing_sales_monthly(year, month);

-- ============================================================
-- 11. MONTHLY FIXED COSTS (rent, salaries, utilities, other)
-- ============================================================
CREATE TABLE IF NOT EXISTS costing_fixed_costs_monthly (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year          INTEGER NOT NULL,
  month         INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  rent          NUMERIC(14,2) DEFAULT 0,
  salaries      NUMERIC(14,2) DEFAULT 0,
  utilities     NUMERIC(14,2) DEFAULT 0,
  other_overhead NUMERIC(14,2) DEFAULT 0,
  notes         TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

-- ============================================================
-- TRIGGERS — auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION costing_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_cmi_updated BEFORE UPDATE ON costing_menu_items
    FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_cii_updated BEFORE UPDATE ON costing_item_ingredients
    FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_cip_updated BEFORE UPDATE ON costing_item_pricing
    FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_cicp_updated BEFORE UPDATE ON costing_item_channel_pricing
    FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_csm_updated BEFORE UPDATE ON costing_sales_monthly
    FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_cfcm_updated BEFORE UPDATE ON costing_fixed_costs_monthly
    FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- NOTE: The costing module uses its own session/cookie auth
-- enforced at the API route level. If you want Supabase RLS,
-- enable it below and use a service-role key in API routes.
-- ALTER TABLE costing_menu_items ENABLE ROW LEVEL SECURITY;
-- (Add policies per your Supabase Auth setup)

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default delivery channels
INSERT INTO costing_delivery_channels (name, sort_order) VALUES
  ('Foodpanda',    1),
  ('Pathao Food',  2),
  ('Own Delivery', 3)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ADMIN USER SETUP
-- Run this separately after installing bcryptjs and hashing
-- your password. Or use the /api/costing/auth/setup endpoint
-- (see README) to create the first admin user.
-- ============================================================
-- Example (replace hash with real bcrypt hash):
-- INSERT INTO costing_users (email, password_hash, name, role)
-- VALUES ('admin@crowncoffee.com', '$2b$10$...', 'Admin', 'admin');
