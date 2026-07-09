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
