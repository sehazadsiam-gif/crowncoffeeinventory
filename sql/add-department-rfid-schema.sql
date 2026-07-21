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
