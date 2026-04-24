-- Unpaid Leave Calculation Rule Update
-- New rule: 4 free days per month, then deduction.
-- Added Waive and Manual Override options.

-- 1. Add new columns for tracking and waiving
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS manual_unpaid_days INTEGER DEFAULT NULL;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS waived_unpaid_days INTEGER DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;

-- 2. Ensure the unique constraint exists for the upsert logic to function correctly
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_entries_staff_month_year_key') THEN
        ALTER TABLE payroll_entries ADD CONSTRAINT payroll_entries_staff_month_year_key UNIQUE (staff_id, month, year);
    END IF;
END $$;
