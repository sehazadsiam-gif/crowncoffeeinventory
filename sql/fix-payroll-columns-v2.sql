-- Run this in your Supabase SQL Editor to fix the payroll syncing issues

ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_days INTEGER DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS miscellaneous_plus INTEGER DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_waived BOOLEAN DEFAULT FALSE;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS unpaid_leave_deduction NUMERIC DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_deduction NUMERIC DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS manual_unpaid_days INTEGER DEFAULT NULL;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS waived_unpaid_days INTEGER DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;

ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS present_days INTEGER DEFAULT 0;
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS late_days INTEGER DEFAULT 0;
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0;
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS overtime_pay NUMERIC DEFAULT 0;
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'system';
ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

