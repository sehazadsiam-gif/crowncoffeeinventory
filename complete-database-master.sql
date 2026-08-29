-- ========================================================
-- CROWN COFFEE - 100% COMPLETE MASTER DATABASE SCHEMA
-- Generated: 2026-08-03T07:23:14.246Z
-- Strictly Ordered for Zero-Dependency Errors (Clean Schema Creation)
-- ========================================================

-- 1. BASE ACCOUNTS & AUTH TABLES
CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_accounts DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;

-- Default admin user (username: admin, password: password123)
INSERT INTO admin_accounts (username, password_hash, role)
VALUES ('admin', '$2b$10$uzZgKsy32QpUrHwwcFEfYuOcqdb0/VNToPftNoh4JXBWeITBloXOe', 'admin')
ON CONFLICT (username) DO NOTHING;

-- --------------------------------------------------------
-- MODULE FILE: sql/hr-module.sql
-- --------------------------------------------------------
-- ============================================
-- HR & STAFF MANAGEMENT MODULE - SUPABASE SQL SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Staff master table
CREATE TABLE staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  contract_type TEXT DEFAULT 'full_time',
  base_salary NUMERIC NOT NULL DEFAULT 0,
  per_day_rate NUMERIC GENERATED ALWAYS AS 
    (base_salary / 30) STORED,
  per_hour_rate NUMERIC GENERATED ALWAYS AS 
    (base_salary / 30 / 8) STORED,
  join_date DATE,
  emergency_contact TEXT,
  emergency_phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly payroll entries
CREATE TABLE payroll_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  late_days INTEGER DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  overtime_pay NUMERIC DEFAULT 0,
  service_charge NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  lunch_dinner NUMERIC DEFAULT 0,
  morning_food NUMERIC DEFAULT 0,
  advance_taken NUMERIC DEFAULT 0,
  others_taken NUMERIC DEFAULT 0,
  miscellaneous NUMERIC DEFAULT 0,
  miscellaneous_note TEXT,
  final_salary NUMERIC DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,
  lunch_dinner_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month, year)
);

-- Advance log
CREATE TABLE advance_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance
CREATE TABLE attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  -- status: present, absent, half_day, late
  leave_type TEXT,
  -- leave_type: sick, casual, annual, null
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- Leave balances
CREATE TABLE leave_balance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  sick_total INTEGER DEFAULT 10,
  sick_used INTEGER DEFAULT 0,
  casual_total INTEGER DEFAULT 10,
  casual_used INTEGER DEFAULT 0,
  annual_total INTEGER DEFAULT 15,
  annual_used INTEGER DEFAULT 0,
  UNIQUE(staff_id, year)
);

-- Service charge pool
CREATE TABLE service_charge_pool (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  distribution_type TEXT DEFAULT 'equal',
  is_distributed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

-- Staff notes
CREATE TABLE staff_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general',
  -- note_type: general, warning, performance, commendation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on all new tables
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE advance_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balance DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_charge_pool DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notes DISABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- MODULE FILE: sql/manager_setup.sql
-- --------------------------------------------------------
-- Manager Auth Setup
-- Run this in Supabase SQL Editor

-- 1. Add role column to admin_accounts if not exists
ALTER TABLE admin_accounts
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';

-- 2. Insert or update manager account
-- Replace HASH_HERE with: $2b$10$uzZgKsy32QpUrHwwcFEfYuOcqdb0/VNToPftNoh4JXBWeITBloXOe
INSERT INTO admin_accounts (username, password_hash, role)
VALUES ('cc', '$2b$10$uzZgKsy32QpUrHwwcFEfYuOcqdb0/VNToPftNoh4JXBWeITBloXOe', 'manager')
ON CONFLICT (username) DO UPDATE SET role='manager';


-- --------------------------------------------------------
-- MODULE FILE: sql/add-staff-serial.sql
-- --------------------------------------------------------
-- Add serial column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS serial INTEGER DEFAULT 999;


-- --------------------------------------------------------
-- MODULE FILE: supabase_staff_queries.sql
-- --------------------------------------------------------
-- Run this in your Supabase SQL Editor to safely add the missing column
-- and ensure the table and policies are set up correctly.

CREATE TABLE IF NOT EXISTS public.staff_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    staff_name TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    admin_reply TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add the column if the table already existed from the previous version
ALTER TABLE public.staff_queries ADD COLUMN IF NOT EXISTS admin_reply TEXT;

-- Set up Row Level Security (RLS)
ALTER TABLE public.staff_queries ENABLE ROW LEVEL SECURITY;

-- Safely create policies (ignoring if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'staff_queries' AND policyname = 'Enable insert for all users'
    ) THEN
        CREATE POLICY "Enable insert for all users" ON public.staff_queries FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'staff_queries' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.staff_queries FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'staff_queries' AND policyname = 'Enable update for all users'
    ) THEN
        CREATE POLICY "Enable update for all users" ON public.staff_queries FOR UPDATE USING (true);
    END IF;
END $$;


-- --------------------------------------------------------
-- MODULE FILE: supabase-schema.sql
-- --------------------------------------------------------
-- ============================================
-- CAFE INVENTORY SYSTEM - SUPABASE SQL SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. INGREDIENTS (raw stock items)
CREATE TABLE ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,          -- e.g. "gm", "ml", "pcs", "kg", "liter"
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0, -- low stock alert threshold
  cost_per_unit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MENU ITEMS
CREATE TABLE menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,      -- e.g. "Coffee", "Food", "Beverage"
  selling_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RECIPES (which ingredients each menu item needs)
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,   -- how much of the ingredient per 1 serving
  UNIQUE(menu_item_id, ingredient_id)
);

-- 4. DAILY BAZAR (purchases each day)
CREATE TABLE bazar_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  cost_per_unit NUMERIC NOT NULL,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SALES LOG (daily sales input)
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  total_revenue NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STOCK MOVEMENTS (audit trail of every stock change)
CREATE TABLE stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'bazar_in', 'sale_out', 'manual_adjust', 'waste'
  quantity NUMERIC NOT NULL,   -- positive = added, negative = removed
  reference_id UUID,           -- links to bazar_entry or sale id
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update stock when bazar entry is added
CREATE OR REPLACE FUNCTION update_stock_on_bazar()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ingredients
  SET current_stock = current_stock + NEW.quantity,
      cost_per_unit = NEW.cost_per_unit
  WHERE id = NEW.ingredient_id;

  INSERT INTO stock_movements (ingredient_id, movement_type, quantity, reference_id, notes)
  VALUES (NEW.ingredient_id, 'bazar_in', NEW.quantity, NEW.id, 'Bazar purchase on ' || NEW.date);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bazar_stock
AFTER INSERT ON bazar_entries
FOR EACH ROW EXECUTE FUNCTION update_stock_on_bazar();

-- Auto-deduct stock when a sale is logged
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Update total_revenue from menu item price
  UPDATE sales
  SET total_revenue = NEW.quantity * (SELECT selling_price FROM menu_items WHERE id = NEW.menu_item_id)
  WHERE id = NEW.id;

  -- Deduct ingredients based on recipe
  FOR rec IN
    SELECT r.ingredient_id, r.quantity * NEW.quantity AS total_qty
    FROM recipes r
    WHERE r.menu_item_id = NEW.menu_item_id
  LOOP
    UPDATE ingredients
    SET current_stock = current_stock - rec.total_qty
    WHERE id = rec.ingredient_id;

    INSERT INTO stock_movements (ingredient_id, movement_type, quantity, reference_id, notes)
    VALUES (rec.ingredient_id, 'sale_out', -rec.total_qty, NEW.id, 'Sale deduction');
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sale_stock
AFTER INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION update_stock_on_sale();

-- ============================================
-- SAMPLE DATA (optional - delete if not needed)
-- ============================================

INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit) VALUES
('Espresso Beans', 'gm', 2000, 500, 1.2),
('Whole Milk', 'ml', 5000, 1000, 0.08),
('Sugar', 'gm', 3000, 500, 0.05),
('Bread', 'pcs', 20, 5, 12),
('Butter', 'gm', 500, 100, 0.9),
('Tea Leaves', 'gm', 500, 100, 0.6),
('Whipped Cream', 'ml', 1000, 200, 0.15);

INSERT INTO menu_items (name, category, selling_price) VALUES
('Espresso', 'Coffee', 150),
('Cappuccino', 'Coffee', 220),
('Latte', 'Coffee', 250),
('Masala Tea', 'Tea', 80),
('Butter Toast', 'Food', 120);

-- Espresso recipe
INSERT INTO recipes (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, 18
FROM menu_items m, ingredients i
WHERE m.name = 'Espresso' AND i.name = 'Espresso Beans';

-- Cappuccino recipe
INSERT INTO recipes (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, v.qty
FROM menu_items m
JOIN (VALUES
  ('Espresso Beans', 18),
  ('Whole Milk', 120),
  ('Sugar', 10)
) AS v(iname, qty) ON true
JOIN ingredients i ON i.name = v.iname
WHERE m.name = 'Cappuccino';

-- Latte recipe
INSERT INTO recipes (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, v.qty
FROM menu_items m
JOIN (VALUES
  ('Espresso Beans', 18),
  ('Whole Milk', 200),
  ('Sugar', 10)
) AS v(iname, qty) ON true
JOIN ingredients i ON i.name = v.iname
WHERE m.name = 'Latte';

-- Masala Tea recipe
INSERT INTO recipes (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, v.qty
FROM menu_items m
JOIN (VALUES
  ('Tea Leaves', 5),
  ('Whole Milk', 100),
  ('Sugar', 15)
) AS v(iname, qty) ON true
JOIN ingredients i ON i.name = v.iname
WHERE m.name = 'Masala Tea';

-- Butter Toast recipe
INSERT INTO recipes (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, v.qty
FROM menu_items m
JOIN (VALUES
  ('Bread', 2),
  ('Butter', 20)
) AS v(iname, qty) ON true
JOIN ingredients i ON i.name = v.iname
WHERE m.name = 'Butter Toast';


-- --------------------------------------------------------
-- MODULE FILE: menu-costings-schema.sql
-- --------------------------------------------------------
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


-- --------------------------------------------------------
-- MODULE FILE: sql/membership_setup.sql
-- --------------------------------------------------------
-- Membership System Tables
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  address TEXT,
  occupation TEXT,
  status TEXT DEFAULT 'pending',
  tier TEXT DEFAULT 'silver',
  member_since DATE,
  total_visits INTEGER DEFAULT 0,
  punch_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_special_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  occasion_name TEXT NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by TEXT DEFAULT 'manager',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS member_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  discount_percent INTEGER DEFAULT 10,
  valid_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES member_visits(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent'
);

-- Disable RLS for now as requested
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_special_dates DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_notifications DISABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- MODULE FILE: sql/member-rfid-schema.sql
-- --------------------------------------------------------
-- MIGRATION: Member RFID & Credit-Card ID System Schema (24-Month Validity)

-- 1. Extend members table with RFID card and visit punch columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS rfid_code TEXT UNIQUE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS card_status TEXT DEFAULT 'active';
ALTER TABLE members ADD COLUMN IF NOT EXISTS card_issued_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE members ADD COLUMN IF NOT EXISTS card_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 months');
ALTER TABLE members ADD COLUMN IF NOT EXISTS visit_punch_count INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS free_coffee_rewards_available INTEGER DEFAULT 0;

-- 2. Create member_card_logs table for tracking card issuance, replacements, and status changes
CREATE TABLE IF NOT EXISTS member_card_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  card_number TEXT,
  rfid_code TEXT,
  action TEXT NOT NULL, -- 'issued', 'replaced', 'lost', 'expired', 'deactivated'
  reason TEXT,
  performed_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create member_rfid_taps table for logging tap events
CREATE TABLE IF NOT EXISTS member_rfid_taps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  rfid_code TEXT NOT NULL,
  tapped_at TIMESTAMPTZ DEFAULT NOW(),
  location TEXT DEFAULT 'Counter',
  visit_number INTEGER,
  reward_earned BOOLEAN DEFAULT FALSE
);

-- Disable RLS on new tables as per project policy
ALTER TABLE member_card_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_rfid_taps DISABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- MODULE FILE: fix_members_schema.sql
-- --------------------------------------------------------
-- Allow NULL card_number for pending members
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_card_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS members_card_number_unique ON members (card_number) WHERE card_number IS NOT NULL;

-- Add status column values if not exists
ALTER TABLE members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;


-- --------------------------------------------------------
-- MODULE FILE: supabase_migrations.sql
-- --------------------------------------------------------
-- Add free coffee columns to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS free_coffee_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS free_coffee_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS free_coffee_claimed_at TIMESTAMPTZ;

-- Create free_coffee_claims table
CREATE TABLE IF NOT EXISTS free_coffee_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  claim_type VARCHAR(50) DEFAULT 'first_time',
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on new table if needed
ALTER TABLE free_coffee_claims DISABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- MODULE FILE: sql/leave-requests-schema.sql
-- --------------------------------------------------------
-- ============================================
-- LEAVE REQUEST SYSTEM SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL, -- 'sick', 'casual', 'annual', 'unpaid'
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for ease of operations in dev
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- MODULE FILE: sql/attendance-schema.sql
-- --------------------------------------------------------
-- ============================================================
-- ATTENDANCE & DUTY ROSTER SYSTEM — MIGRATION SCRIPT
-- Crown Coffee Management System
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- ── 1. Extend staff table with roster fields ─────────────────
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS employee_id   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS shift_start   TIME DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS weekly_off    TEXT DEFAULT 'Friday',
  ADD COLUMN IF NOT EXISTS grace_minutes INT DEFAULT 15,
  ADD COLUMN IF NOT EXISTS is_rostered   BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS department    VARCHAR(20) DEFAULT 'front',
  ADD COLUMN IF NOT EXISTS rfid_code      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS nid           TEXT,
  ADD COLUMN IF NOT EXISTS blood_group   VARCHAR(10),
  ADD COLUMN IF NOT EXISTS photo_url      TEXT;

-- Auto-generate CC-001 style employee IDs for existing staff
DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
BEGIN
  FOR rec IN SELECT id FROM staff WHERE employee_id IS NULL ORDER BY serial ASC, created_at ASC LOOP
    UPDATE staff SET employee_id = 'CC-' || LPAD(counter::TEXT, 3, '0') WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- ── 2. Attendance Log (real-time daily records) ───────────────
CREATE TABLE IF NOT EXISTS attendance_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id        UUID REFERENCES staff(id) ON DELETE CASCADE,
  employee_id     TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_at     TIMESTAMPTZ,
  check_out_at    TIMESTAMPTZ,
  status          TEXT CHECK (status IN ('present','late','absent','on_leave','off')) DEFAULT 'absent',
  source          TEXT DEFAULT 'manual',
  minutes_late    INT DEFAULT 0,
  hours_worked    NUMERIC,
  shift_start     TIME,
  auto_flagged    BOOLEAN DEFAULT FALSE,
  admin_override  BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_log_date ON attendance_log(date);
CREATE INDEX IF NOT EXISTS idx_attendance_log_staff ON attendance_log(staff_id, date DESC);

-- ── 3. Duty Roster (weekly grid) ─────────────────────────────
CREATE TABLE IF NOT EXISTS duty_roster (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id       UUID REFERENCES staff(id) ON DELETE CASCADE,
  week_start     DATE NOT NULL,
  day_date       DATE NOT NULL,
  shift_start    TIME NOT NULL DEFAULT '10:00',
  shift_hours    NUMERIC DEFAULT 10,
  is_off         BOOLEAN DEFAULT FALSE,
  is_leave       BOOLEAN DEFAULT FALSE,
  is_duty_change BOOLEAN DEFAULT FALSE,
  is_ai_draft    BOOLEAN DEFAULT FALSE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, day_date)
);

CREATE INDEX IF NOT EXISTS idx_duty_roster_week ON duty_roster(week_start);
CREATE INDEX IF NOT EXISTS idx_duty_roster_date ON duty_roster(day_date);

-- ── 4. Duty-Change Requests ───────────────────────────────────
CREATE TABLE IF NOT EXISTS duty_change_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id        UUID REFERENCES staff(id) ON DELETE CASCADE,
  request_date    DATE NOT NULL,
  request_type    TEXT CHECK (request_type IN ('shift_swap','day_off_swap')) DEFAULT 'day_off_swap',
  swap_with_id    UUID REFERENCES staff(id),
  new_shift_start TIME,
  reason          TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note      TEXT,
  ai_suggestion   JSONB,
  conflict_flag   BOOLEAN DEFAULT FALSE,
  conflict_detail TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_duty_change_status ON duty_change_requests(status, created_at DESC);

-- ── 5. Extend leave_requests with roster sync flag ────────────
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS roster_synced BOOLEAN DEFAULT FALSE;

-- ── 6. AI Roster Drafts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_roster_drafts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start  DATE NOT NULL UNIQUE,
  draft_data  JSONB NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','discarded')),
  ai_notes    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

-- ── 7. Attendance Anomaly Flags ───────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_anomalies (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id     UUID REFERENCES staff(id) ON DELETE CASCADE,
  type         TEXT,
  detail       JSONB,
  severity     TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  flagged_at   TIMESTAMPTZ DEFAULT NOW(),
  dismissed    BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_anomalies_active ON attendance_anomalies(flagged_at DESC) WHERE dismissed = FALSE;

-- ── 8. RLS: block public access, service role bypasses ────────
ALTER TABLE attendance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_roster_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_anomalies ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- MODULE FILE: sql/add-department-rfid-schema.sql
-- --------------------------------------------------------
-- ============================================================
-- MIGRATION: STAFF DEPARTMENT, RFID & OVERTIME MINUTE TRACKING
-- Crown Coffee Management System
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Extend staff table with department & RFID card code
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS department VARCHAR(20) DEFAULT 'front',
  ADD COLUMN IF NOT EXISTS rfid_code TEXT UNIQUE;

-- 2. Extend attendance_log table with minute-level overtime
ALTER TABLE attendance_log
  ADD COLUMN IF NOT EXISTS overtime_minutes INT DEFAULT 0;

-- 3. Enable Supabase Realtime replication on attendance_log table (if publication exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE attendance_log;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- ignore if already added or permission constrained
  NULL;
END $$;


-- --------------------------------------------------------
-- MODULE FILE: sql/add-break-tracking-schema.sql
-- --------------------------------------------------------
-- ============================================================
-- BREAK TRACKING SCHEMA MIGRATION
-- Crown Coffee Attendance System
-- ============================================================

ALTER TABLE attendance_log
ADD COLUMN IF NOT EXISTS break_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS break_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS break_duration_minutes INT DEFAULT 0;


-- --------------------------------------------------------
-- MODULE FILE: sql/add-attendance-time-columns.sql
-- --------------------------------------------------------
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS check_in_time TEXT;
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS check_out_time TEXT;


-- --------------------------------------------------------
-- MODULE FILE: sql/overtime-setup.sql
-- --------------------------------------------------------
-- ============================================
-- OVERTIME CALCULATION SYSTEM - SUPABASE SQL SCHEMA
-- ============================================

-- 1. Update staff table with overtime-related columns
ALTER TABLE staff ADD COLUMN IF NOT EXISTS shift_hours INTEGER DEFAULT 10;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS overtime_hours_month NUMERIC DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS overtime_pay_month NUMERIC DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;

-- 2. Update attendance table to include check-in/out times
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in TIME;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out TIME;

-- 3. Create overtime_logs table
CREATE TABLE IF NOT EXISTS overtime_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    shift_hours INTEGER DEFAULT 10,
    actual_hours NUMERIC,
    overtime_hours NUMERIC,
    hourly_rate NUMERIC,
    overtime_pay NUMERIC,
    manual_override BOOLEAN DEFAULT FALSE,
    manual_overtime_hours NUMERIC,
    manual_overtime_pay NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, date)
);

-- Disable RLS
ALTER TABLE overtime_logs DISABLE ROW LEVEL SECURITY;

-- Helper function to calculate hourly rate if not set
CREATE OR REPLACE FUNCTION update_staff_hourly_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.base_salary IS NOT NULL THEN
    NEW.hourly_rate := NEW.base_salary / 30 / 10;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hourly_rate
BEFORE INSERT OR UPDATE OF base_salary ON staff
FOR EACH ROW EXECUTE FUNCTION update_staff_hourly_rate();

-- Initial update for existing staff
UPDATE staff SET hourly_rate = base_salary / 30 / 10 WHERE hourly_rate IS NULL;


-- --------------------------------------------------------
-- MODULE FILE: sql/fix-payroll-columns-v2.sql
-- --------------------------------------------------------
-- Run this in your Supabase SQL Editor to fix the payroll syncing issues

ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_days INTEGER DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS miscellaneous_plus INTEGER DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_waived BOOLEAN DEFAULT FALSE;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS unpaid_leave_deduction NUMERIC DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_deduction NUMERIC DEFAULT 0;


-- --------------------------------------------------------
-- MODULE FILE: sql/payroll-leave-update.sql
-- --------------------------------------------------------
-- Unpaid Leave Calculation Rule Update
-- New rule: 4 free days per month, then deduction.
-- Added Waive and Manual Override options.

-- 1. Add new columns for tracking and waiving
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS manual_unpaid_days INTEGER DEFAULT NULL;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS waived_unpaid_days INTEGER DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;

ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS present_days INTEGER DEFAULT 0;
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS late_days INTEGER DEFAULT 0;
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'system';
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure the unique constraint exists for the upsert logic to function correctly
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_entries_staff_month_year_key') THEN
        ALTER TABLE payroll_entries ADD CONSTRAINT payroll_entries_staff_month_year_key UNIQUE (staff_id, month, year);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_attendance_summary_staff_id_month_year_key') THEN
        ALTER TABLE monthly_attendance_summary ADD CONSTRAINT monthly_attendance_summary_staff_id_month_year_key UNIQUE (staff_id, month, year);
    END IF;
END $$;


-- --------------------------------------------------------
-- MODULE FILE: sql/staff-tasks-schema.sql
-- --------------------------------------------------------
-- Run this in Supabase SQL Editor
-- Staff Tasks Table for To-Do assignment from admin to staff

CREATE TABLE IF NOT EXISTS staff_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal')),
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'not_done')),
  staff_note TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;

-- Allow all operations (admin controls access via application logic)
DROP POLICY IF EXISTS "Allow all select staff_tasks" ON staff_tasks;
DROP POLICY IF EXISTS "Allow all insert staff_tasks" ON staff_tasks;
DROP POLICY IF EXISTS "Allow all update staff_tasks" ON staff_tasks;
DROP POLICY IF EXISTS "Allow all delete staff_tasks" ON staff_tasks;

CREATE POLICY "Allow all select staff_tasks" ON staff_tasks FOR SELECT USING (true);
CREATE POLICY "Allow all insert staff_tasks" ON staff_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update staff_tasks" ON staff_tasks FOR UPDATE USING (true);
CREATE POLICY "Allow all delete staff_tasks" ON staff_tasks FOR DELETE USING (true);

-- Optional: Create an index for faster staff lookups
CREATE INDEX IF NOT EXISTS idx_staff_tasks_staff_id ON staff_tasks (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks (status);


-- --------------------------------------------------------
-- MODULE FILE: sql/add-is-verified-to-tasks.sql
-- --------------------------------------------------------
-- Migration script to add is_verified column to staff_tasks table
-- Run this in Supabase SQL Editor:

ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;


-- --------------------------------------------------------
-- MODULE FILE: sql/staff-remarks.sql
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_remarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admin_accounts(id),
  remark_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_by_name TEXT DEFAULT 'Admin'
);

ALTER TABLE staff_remarks DISABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- MODULE FILE: sql/staff-messages-schema.sql
-- --------------------------------------------------------
-- Staff Messages table (staff -> admin inbox)
CREATE TABLE IF NOT EXISTS staff_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- --------------------------------------------------------
-- MODULE FILE: sql/equipment-checklist-schema.sql
-- --------------------------------------------------------
-- ============================================================
-- EQUIPMENT CHECK-LIST SCHEMA
-- Crown Coffee Management System
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment_checklist (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name    TEXT NOT NULL,
  quantity     INT NOT NULL DEFAULT 1,
  price        NUMERIC DEFAULT NULL,
  month        INT NOT NULL,
  year         INT NOT NULL,
  status       TEXT DEFAULT 'working' CHECK (status IN ('working', 'maintenance', 'damaged', 'checked')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_checklist_month_year ON equipment_checklist(month, year);
ALTER TABLE equipment_checklist ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- MODULE FILE: sql/recipe-book-schema.sql
-- --------------------------------------------------------
-- SQL Schema for Recipe Book module
-- Can be run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.recipe_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    paragraph TEXT NOT NULL,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recipe_book ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read recipe_book" ON public.recipe_book
    FOR SELECT USING (true);

-- Allow public insert access
CREATE POLICY "Allow public insert recipe_book" ON public.recipe_book
    FOR INSERT WITH CHECK (true);

-- Allow public update access
CREATE POLICY "Allow public update recipe_book" ON public.recipe_book
    FOR UPDATE USING (true);

-- Allow public delete access
CREATE POLICY "Allow public delete recipe_book" ON public.recipe_book
    FOR DELETE USING (true);

-- Index for sorting & searching
CREATE INDEX IF NOT EXISTS idx_recipe_book_category ON public.recipe_book (category);
CREATE INDEX IF NOT EXISTS idx_recipe_book_created_at ON public.recipe_book (created_at DESC);


-- --------------------------------------------------------
-- MODULE FILE: sql/pos-schema.sql
-- --------------------------------------------------------


-- 1. POS Settings table for Printer and Receipt Configurations
CREATE TABLE IF NOT EXISTS pos_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,          -- setting name (e.g., 'vat_percent', 'service_charge_percent', 'cashier_printer', 'kitchen_printer', 'bar_printer', 'receipt_width')
  value TEXT NOT NULL,               -- setting value
  category TEXT DEFAULT 'general',   -- 'software' or 'hardware'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prepopulate default settings
INSERT INTO pos_settings (key, value, category) VALUES
('vat_percent', '5', 'software'),
('service_charge_percent', '10', 'software'),
('receipt_header_title', 'Crown Coffee', 'software'),
('receipt_header_subtitle', 'Premium Coffee & Bakery', 'software'),
('receipt_address', 'Banani, Dhaka, Bangladesh', 'software'),
('receipt_phone', '+880 1700-000000', 'software'),
('receipt_bin', '123456789-BIN', 'software'),
('receipt_wifi_pass', 'CrownCoffee@2026', 'software'),
('cashier_printer_ip', '192.168.1.100', 'hardware'),
('kitchen_printer_ip', '192.168.1.101', 'hardware'),
('bar_printer_ip', '192.168.1.102', 'hardware'),
('printer_port', '9100', 'hardware'),
('receipt_width_mm', '80', 'hardware')
ON CONFLICT (key) DO NOTHING;

-- 2. Shift / Cash Registry table
CREATE TABLE IF NOT EXISTS pos_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opened_by UUID REFERENCES staff(id),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_float NUMERIC NOT NULL DEFAULT 0,
  closing_cash NUMERIC,
  actual_cash NUMERIC,
  card_total NUMERIC DEFAULT 0,
  mobile_total NUMERIC DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- Enable RLS
ALTER TABLE pos_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;

-- Disable RLS restrictions for easy sandbox testing or write open policies
CREATE POLICY "Allow read pos_settings" ON pos_settings FOR SELECT USING (true);
CREATE POLICY "Allow write pos_settings" ON pos_settings FOR ALL USING (true);
CREATE POLICY "Allow read pos_shifts" ON pos_shifts FOR SELECT USING (true);
CREATE POLICY "Allow write pos_shifts" ON pos_shifts FOR ALL USING (true);


-- --------------------------------------------------------
-- MODULE FILE: sql/create_guest_feedbacks.sql
-- --------------------------------------------------------
-- Create Guest Feedbacks Table
CREATE TABLE IF NOT EXISTS guest_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  highlights TEXT[] DEFAULT '{}', -- E.g. array containing 'food', 'service', 'value_for_money'
  suggestion TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security as per the app conventions (all tables are disabled RLS or handled via standard public key)
ALTER TABLE guest_feedbacks DISABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- MODULE FILE: sql/inventory-audit.sql
-- --------------------------------------------------------
-- ============================================
-- SQL SCHEMA: MONTHLY INVENTORY AUDIT & BAZAR RATIO
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  opening_stock_value NUMERIC NOT NULL DEFAULT 0,
  closing_stock_value NUMERIC NOT NULL DEFAULT 0,
  total_purchases_value NUMERIC NOT NULL DEFAULT 0,
  total_sales_value NUMERIC NOT NULL DEFAULT 0,
  bazar_ratio NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS inventory_audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES inventory_audits(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  opening_qty NUMERIC NOT NULL DEFAULT 0,
  opening_cost NUMERIC NOT NULL DEFAULT 0,
  closing_qty NUMERIC,
  closing_cost NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(audit_id, ingredient_id)
);

-- Enable RLS
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audit_items ENABLE ROW LEVEL SECURITY;

-- Add open policy permissions
DROP POLICY IF EXISTS "Allow read audits" ON inventory_audits;
DROP POLICY IF EXISTS "Allow write audits" ON inventory_audits;
CREATE POLICY "Allow read audits" ON inventory_audits FOR SELECT USING (true);
CREATE POLICY "Allow write audits" ON inventory_audits FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read audit_items" ON inventory_audit_items;
DROP POLICY IF EXISTS "Allow write audit_items" ON inventory_audit_items;
CREATE POLICY "Allow read audit_items" ON inventory_audit_items FOR SELECT USING (true);
CREATE POLICY "Allow write audit_items" ON inventory_audit_items FOR ALL USING (true);


-- --------------------------------------------------------
-- MODULE FILE: sql/sales_reconciliation_schema.sql
-- --------------------------------------------------------
-- ============================================
-- DAILY SALES AUDIT & RECONCILIATION SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. DAILY RECONCILIATIONS TABLE
CREATE TABLE IF NOT EXISTS daily_reconciliations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_cash NUMERIC DEFAULT 0,
  pos_total_sales NUMERIC DEFAULT 0,
  pos_cash_sales NUMERIC DEFAULT 0,
  pos_card_sales NUMERIC DEFAULT 0,
  foodpanda_declared NUMERIC DEFAULT 0,
  foodpanda_portal_total NUMERIC DEFAULT 0,
  pathao_declared NUMERIC DEFAULT 0,
  pathao_portal_total NUMERIC DEFAULT 0,
  bazar_expense_total NUMERIC DEFAULT 0,
  bazar_receipts_count INTEGER DEFAULT 0,
  actual_cash_submitted NUMERIC DEFAULT 0,
  expected_cash NUMERIC DEFAULT 0,
  cash_shortage NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'MATCHED', 'DISCREPANCY', 'APPROVED'
  notes TEXT,
  extracted_raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

-- 2. BAZAR VERIFIED RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS bazar_verified_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_id UUID REFERENCES daily_reconciliations(id) ON DELETE CASCADE,
  image_url TEXT,
  vendor_name TEXT,
  extracted_total NUMERIC DEFAULT 0,
  line_items JSONB,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_reconciliations_date ON daily_reconciliations(date);


-- --------------------------------------------------------
-- MODULE FILE: sql/feature-flags-schema.sql
-- --------------------------------------------------------
-- SQL Schema for Feature Flags / System Settings
-- Can be run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access for feature flags
CREATE POLICY "Allow public read system_settings" ON public.system_settings
    FOR SELECT USING (true);

-- Allow public insert/update access
CREATE POLICY "Allow public insert system_settings" ON public.system_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update system_settings" ON public.system_settings
    FOR UPDATE USING (true);

-- Seed default feature flags (all enabled by default)
INSERT INTO public.system_settings (key, value)
VALUES (
    'feature_flags',
    '{
        "inventory_manager": true,
        "stock_import": true,
        "stock_audit": true,
        "menu_list": true,
        "menu_import": true,
        "menu_engineering": true,
        "recipebook": true,
        "bazar": true,
        "balance_sheet": true,
        "waste": true,
        "sales_audit": true,
        "feedbacks": true,
        "checklist": true,
        "staff_directory": true,
        "attendance_live": true,
        "attendance_public": true,
        "attendance_reports": true,
        "leave_requests": true,
        "payroll": true,
        "advances": true,
        "service_charge": true,
        "tasks": true,
        "overtime": true,
        "members": true,
        "pos": true
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;


-- --------------------------------------------------------
-- MODULE FILE: sql/unit-conversion-migration.sql
-- --------------------------------------------------------
-- ============================================
-- SQL MIGRATION: INTELLIGENT UNIT CONVERSION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add unit column to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'gm';

-- 2. Helper function for unit conversion
CREATE OR REPLACE FUNCTION convert_unit(qty NUMERIC, from_unit TEXT, to_unit TEXT)
RETURNS NUMERIC AS $$
DECLARE
  from_factor NUMERIC;
  to_factor NUMERIC;
BEGIN
  from_unit := lower(from_unit);
  to_unit := lower(to_unit);

  IF from_unit = to_unit THEN
    RETURN qty;
  END IF;

  -- Assign base factors relative to gm/ml
  -- 1 gm = 1, 1 ml = 1
  -- 1 kg = 1000, 1 ltr = 1000
  from_factor := CASE from_unit
    WHEN 'gm' THEN 1
    WHEN 'ml' THEN 1
    WHEN 'kg' THEN 1000
    WHEN 'ltr' THEN 1000
    ELSE NULL
  END;

  to_factor := CASE to_unit
    WHEN 'gm' THEN 1
    WHEN 'ml' THEN 1
    WHEN 'kg' THEN 1000
    WHEN 'ltr' THEN 1000
    ELSE NULL
  END;

  IF from_factor IS NULL OR to_factor IS NULL THEN
    RETURN qty;
  END IF;

  RETURN (qty * from_factor) / to_factor;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Update the sale deduction function to be unit-aware
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
  converted_qty NUMERIC;
  stock_unit TEXT;
BEGIN
  -- Update total_revenue from menu item price
  UPDATE sales
  SET total_revenue = NEW.quantity * (SELECT selling_price FROM menu_items WHERE id = NEW.menu_item_id)
  WHERE id = NEW.id;

  -- Deduct ingredients based on recipe
  FOR rec IN
    SELECT 
      r.ingredient_id, 
      r.quantity * NEW.quantity AS total_recipe_qty,
      r.unit AS recipe_unit,
      i.unit AS ingredient_unit
    FROM recipes r
    JOIN ingredients i ON i.id = r.ingredient_id
    WHERE r.menu_item_id = NEW.menu_item_id
  LOOP
    -- Convert recipe quantity to ingredient's stock unit
    converted_qty := convert_unit(rec.total_recipe_qty, rec.recipe_unit, rec.ingredient_unit);

    UPDATE ingredients
    SET current_stock = current_stock - converted_qty
    WHERE id = rec.ingredient_id;

    INSERT INTO stock_movements (ingredient_id, movement_type, quantity, reference_id, notes)
    VALUES (
      rec.ingredient_id, 
      'sale_out', 
      -converted_qty, 
      NEW.id, 
      'Sale deduction (' || rec.total_recipe_qty || ' ' || rec.recipe_unit || ' converted to ' || converted_qty || ' ' || rec.ingredient_unit || ')'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update existing recipes if unit is null
UPDATE recipes SET unit = 'gm' WHERE unit IS NULL;


-- --------------------------------------------------------
-- MODULE FILE: sql/seed-menu-items.sql
-- --------------------------------------------------------
-- ============================================================
-- CROWN COFFEE — FULL MENU ITEMS SEED DATA
-- Run this in Supabase SQL Editor to populate all 95 menu items
-- across costing_menu_items, costing_item_pricing, and menu_items tables.
-- ============================================================

-- 1. COSTING MENU ITEMS (costing_menu_items)
INSERT INTO costing_menu_items (name, category, is_active) VALUES
  -- Breakfast
  ('Traditional Breakfast', 'Breakfast', TRUE),
  ('American Breakfast', 'Breakfast', TRUE),
  ('Brunch Delight', 'Breakfast', TRUE),
  ('Grilled Chicken Sandwich', 'Breakfast', TRUE),
  ('Eggs Benedict', 'Breakfast', TRUE),

  -- Sandwich
  ('Chicken Sandwich', 'Sandwich', TRUE),
  ('Mushroom Sandwich', 'Sandwich', TRUE),
  ('Classic Club Sandwich', 'Sandwich', TRUE),

  -- Appetizers
  ('French Fries', 'Appetizers', TRUE),
  ('Japanese Fried Chicken', 'Appetizers', TRUE),
  ('Chicken Nanban', 'Appetizers', TRUE),
  ('Chicken Gyoza', 'Appetizers', TRUE),
  ('Steamed Wonton', 'Appetizers', TRUE),
  ('Fried Sesame Dory', 'Appetizers', TRUE),
  ('Fish and Chips', 'Appetizers', TRUE),
  ('High Tea (1:4)', 'Appetizers', TRUE),

  -- Soup
  ('Thai Clear Soup', 'Soup', TRUE),
  ('Thai Thick Soup', 'Soup', TRUE),
  ('Cream of Mushroom Soup', 'Soup', TRUE),

  -- Pasta
  ('Creamy Fettuccine Alfredo Pasta', 'Pasta', TRUE),
  ('Beef Bolognese Pasta', 'Pasta', TRUE),
  ('Pasta De La Casa', 'Pasta', TRUE),

  -- Noodles
  ('Stir Fried Chicken Noodles', 'Noodles', TRUE),
  ('Stir Fried Beef Noodles', 'Noodles', TRUE),

  -- Salad
  ('Cashew Nut Salad', 'Salad', TRUE),
  ('Spanish Grilled Chicken Salad', 'Salad', TRUE),

  -- Pizza
  ('BBQ Chicken Pizza', 'Pizza', TRUE),
  ('Beef Bolognese Pizza', 'Pizza', TRUE),
  ('CC Special Four Seasons', 'Pizza', TRUE),

  -- Main Course
  ('Chicken Schnitzel', 'Main Course', TRUE),
  ('Turkish Savory', 'Main Course', TRUE),
  ('Basil Leaf Beef (Spicy)', 'Main Course', TRUE),
  ('Herbed Dory with Salsa', 'Main Course', TRUE),
  ('King Prawn', 'Main Course', TRUE),
  ('Peri Peri Chicken', 'Main Course', TRUE),
  ('Crown Coffee Special Rice (Spicy)', 'Main Course', TRUE),
  ('Health Plus', 'Main Course', TRUE),

  -- Desert
  ('Chawanmushi', 'Desert', TRUE),
  ('Crêpe', 'Desert', TRUE),
  ('Sweet Madness', 'Desert', TRUE),
  ('Chocolate Lava', 'Desert', TRUE),

  -- Coffee
  ('Espresso', 'Coffee', TRUE),
  ('Cappuccino', 'Coffee', TRUE),
  ('Caffè Latte', 'Coffee', TRUE),
  ('Mocha', 'Coffee', TRUE),
  ('Macchiato', 'Coffee', TRUE),
  ('Americano', 'Coffee', TRUE),
  ('Cappuccino (Small)', 'Coffee', TRUE),
  ('Affogato', 'Coffee', TRUE),
  ('Flat White', 'Coffee', TRUE),

  -- Cold Brew & Tea
  ('Cold Brew', 'Cold Brew & Tea', TRUE),
  ('Masala Chai', 'Cold Brew & Tea', TRUE),

  -- Pastries & Desserts
  ('Butter Croissant', 'Pastries & Desserts', TRUE),
  ('New York Cheesecake', 'Pastries & Desserts', TRUE),

  -- Boba Specials
  ('Iced Coffee Boba Milk Tea', 'Boba Specials', TRUE),

  -- Shakes
  ('Nutella Shake', 'Shakes', TRUE),
  ('Vanilla Shake', 'Shakes', TRUE),
  ('Chocolate Shake', 'Shakes', TRUE),
  ('Oreo Shake', 'Shakes', TRUE),
  ('Mango Shake', 'Shakes', TRUE),
  ('Blueberry Shake', 'Shakes', TRUE),
  ('Strawberry Shake', 'Shakes', TRUE),

  -- Iced Coffee
  ('Iced Americano', 'Iced Coffee', TRUE),
  ('Iced Cappuccino', 'Iced Coffee', TRUE),
  ('Iced Latte', 'Iced Coffee', TRUE),

  -- Smoothie
  ('Mango Smoothie', 'Smoothie', TRUE),
  ('Strawberry Smoothie', 'Smoothie', TRUE),
  ('Peach Smoothie', 'Smoothie', TRUE),

  -- Hot Chocolate
  ('Regular Hot Chocolate', 'Hot Chocolate', TRUE),
  ('Frozen Hot Chocolate', 'Hot Chocolate', TRUE),

  -- Mocktails
  ('Mint Lemonade', 'Mocktails', TRUE),
  ('Blu Ocean', 'Mocktails', TRUE),
  ('Hurricane', 'Mocktails', TRUE),
  ('Crown Coffee Special', 'Mocktails', TRUE),

  -- Frappe
  ('Hazelnut Frappe', 'Frappe', TRUE),
  ('Caramel Frappe', 'Frappe', TRUE),
  ('Salted Caramel Frappe', 'Frappe', TRUE),
  ('Vanilla Frappe', 'Frappe', TRUE),
  ('Mocha Frappe', 'Frappe', TRUE),
  ('Tiramisu Frappe', 'Frappe', TRUE),

  -- Fresh Juices
  ('Orange Juice', 'Fresh Juices', TRUE),
  ('Pineapple Juice', 'Fresh Juices', TRUE),
  ('Papaya Juice', 'Fresh Juices', TRUE),
  ('Apple Juice', 'Fresh Juices', TRUE),

  -- Ice Cream
  ('Vanilla Ice Cream', 'Ice Cream', TRUE),
  ('Chocolate Ice Cream', 'Ice Cream', TRUE),
  ('Mango Ice Cream', 'Ice Cream', TRUE),

  -- Add On(s) Flavours
  ('Hazelnut Syrup', 'Add On(s) Flavours', TRUE),
  ('Caramel Syrup', 'Add On(s) Flavours', TRUE),
  ('Vanilla Syrup', 'Add On(s) Flavours', TRUE),
  ('Mocha Syrup', 'Add On(s) Flavours', TRUE),
  ('Salted Caramel Syrup', 'Add On(s) Flavours', TRUE),
  ('Tiramisu Syrup', 'Add On(s) Flavours', TRUE),

  -- Traditionals
  ('Mango Lassi', 'Traditionals', TRUE),
  ('Strawberry Lassi', 'Traditionals', TRUE)
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, is_active = EXCLUDED.is_active;

-- 2. DINE-IN PRICING INITIALIZATION (costing_item_pricing)
INSERT INTO costing_item_pricing (menu_item_id, dine_in_price)
SELECT id, 0 FROM costing_menu_items
ON CONFLICT (menu_item_id) DO NOTHING;

-- 3. INVENTORY / POS MENU ITEMS (menu_items)
INSERT INTO menu_items (name, category, is_active)
SELECT name, category, is_active FROM costing_menu_items
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, is_active = EXCLUDED.is_active;



-- ========================================================
-- ADDITIONAL SUPPORTING TABLES FOR FRONTEND / API
-- ========================================================

CREATE TABLE IF NOT EXISTS staff_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE staff_accounts DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS balance_sheet (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE balance_sheet DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS balance_sheet_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  balance_sheet_id UUID REFERENCES balance_sheet(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE balance_sheet_items DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS salary_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE salary_payments DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS salary_balance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  remaining_balance NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month, year)
);
ALTER TABLE salary_balance DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS service_charge_distribution (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);
ALTER TABLE service_charge_distribution DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS service_charge_allocation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  distribution_id UUID REFERENCES service_charge_distribution(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE service_charge_allocation DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS stock_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  change_amount NUMERIC NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stock_logs DISABLE ROW LEVEL SECURITY;

