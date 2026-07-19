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
