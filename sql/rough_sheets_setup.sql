-- ============================================
-- ROUGH SHEETS / WORKBOOK TABLE
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS rough_sheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_name TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  styles JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup and ordering
CREATE INDEX IF NOT EXISTS idx_rough_sheets_sort ON rough_sheets (sort_order, updated_at DESC);

-- Trigger for auto updating updated_at
CREATE OR REPLACE FUNCTION update_rough_sheets_modtime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rough_sheets_updated_at ON rough_sheets;
CREATE TRIGGER trg_rough_sheets_updated_at
BEFORE UPDATE ON rough_sheets
FOR EACH ROW
EXECUTE FUNCTION update_rough_sheets_modtime();

-- Insert initial sample sheets if table is empty
INSERT INTO rough_sheets (sheet_name, columns, data, is_default, sort_order)
SELECT 
  'Phone Directory',
  '[{"key": "col_1", "title": "Name", "width": 180}, {"key": "col_2", "title": "Phone Number", "width": 180}, {"key": "col_3", "title": "Category / Tag", "width": 140}, {"key": "col_4", "title": "Notes / Details", "width": 240}, {"key": "col_5", "title": "Status", "width": 120}]'::jsonb,
  '[
    {"col_1": "Rahim Ahmed", "col_2": "01711000001", "col_3": "Customer", "col_4": "Prefers flat white", "col_5": "Active"},
    {"col_1": "Coffee Bean Supplier", "col_2": "+8801812345678", "col_3": "Supplier", "col_4": "Delivers every Tuesday", "col_5": "Active"},
    {"col_1": "Dairy Farm Fresh Milk", "col_2": "01999888777", "col_3": "Supplier", "col_4": "Call before 9 AM", "col_5": "Active"}
  ]'::jsonb,
  TRUE,
  0
WHERE NOT EXISTS (SELECT 1 FROM rough_sheets);
