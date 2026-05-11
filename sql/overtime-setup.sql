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
