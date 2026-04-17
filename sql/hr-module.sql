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
