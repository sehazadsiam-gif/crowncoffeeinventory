-- ============================================================
-- PRACTICE MODULE — Supabase SQL Migration
-- Run this in the Supabase SQL Editor (or via psql).
-- Creates 4 practice_ tables that are completely separate
-- from all existing inventory tables.
-- ============================================================

-- practice_items: the product catalogue for practice mode
CREATE TABLE IF NOT EXISTS practice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  barcode     text NOT NULL UNIQUE,
  base_unit   text NOT NULL CHECK (base_unit IN ('g','ml','pcs')),
  pack_size   integer NOT NULL DEFAULT 1 CHECK (pack_size > 0),
  par_level   integer NOT NULL DEFAULT 0 CHECK (par_level >= 0),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- practice_bazar_trips: one shopping run = one trip
CREATE TABLE IF NOT EXISTS practice_bazar_trips (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved')),
  total_paid      numeric(12,2),
  approved_by     text,
  approved_at     timestamptz,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- practice_bazar_lines: each scanned item line in a trip
CREATE TABLE IF NOT EXISTS practice_bazar_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES practice_bazar_trips(id) ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES practice_items(id),
  quantity    integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  scanned_by  text,
  scanned_at  timestamptz NOT NULL DEFAULT now()
);

-- practice_stock_movements: append-only ledger
CREATE TABLE IF NOT EXISTS practice_stock_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid NOT NULL REFERENCES practice_items(id),
  movement_type   text NOT NULL CHECK (movement_type IN ('purchase','usage','reversal')),
  quantity        integer NOT NULL,  -- positive=in, negative=out
  trip_id         uuid REFERENCES practice_bazar_trips(id),
  reason          text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_practice_lines_trip     ON practice_bazar_lines (trip_id);
CREATE INDEX IF NOT EXISTS idx_practice_mov_item       ON practice_stock_movements (item_id);
CREATE INDEX IF NOT EXISTS idx_practice_items_barcode  ON practice_items (barcode);

-- Disable RLS on practice tables so staff and app can read/write without restriction
ALTER TABLE practice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_bazar_trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_bazar_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_stock_movements DISABLE ROW LEVEL SECURITY;

GRANT ALL ON practice_items TO anon, authenticated, service_role;
GRANT ALL ON practice_bazar_trips TO anon, authenticated, service_role;
GRANT ALL ON practice_bazar_lines TO anon, authenticated, service_role;
GRANT ALL ON practice_stock_movements TO anon, authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Seed 10 sample items (safe to run multiple times)
INSERT INTO practice_items (name, barcode, base_unit, pack_size, par_level) VALUES
  ('Coffee Beans',  'ITEM-COFFEE-BEANS',  'g',   1000, 2000),
  ('Milk',          'ITEM-MILK',          'ml',  1000, 5000),
  ('Sugar',         'ITEM-SUGAR',         'g',   1000, 3000),
  ('Onion',         'ITEM-ONION',         'g',    500, 2000),
  ('Tomato',        'ITEM-TOMATO',        'g',    500, 2000),
  ('Chicken',       'ITEM-CHICKEN',       'g',   1000, 5000),
  ('Flour',         'ITEM-FLOUR',         'g',   1000, 4000),
  ('Cooking Oil',   'ITEM-COOKING-OIL',   'ml',  1000, 3000),
  ('Eggs',          'ITEM-EGGS',          'pcs',   12,   24),
  ('Cheese',        'ITEM-CHEESE',        'g',    500, 1000)
ON CONFLICT (barcode) DO NOTHING;
