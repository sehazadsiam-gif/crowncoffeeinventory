-- ============================================
-- STAFF PENALTIES & SALARY DEDUCTION SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS staff_penalties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  penalty_percent NUMERIC NOT NULL DEFAULT 0.5,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- Disable Row Level Security (RLS) for compatibility with admin API
ALTER TABLE staff_penalties DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_staff_penalties_staff_date ON staff_penalties(staff_id, date);
