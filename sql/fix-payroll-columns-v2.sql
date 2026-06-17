-- Run this in your Supabase SQL Editor to fix the payroll syncing issues

ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS miscellaneous_plus INTEGER DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_waived BOOLEAN DEFAULT FALSE;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS unpaid_leave_deduction NUMERIC DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_deduction NUMERIC DEFAULT 0;
