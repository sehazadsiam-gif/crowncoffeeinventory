-- ============================================================
-- BREAK TRACKING SCHEMA MIGRATION
-- Crown Coffee Attendance System
-- ============================================================

ALTER TABLE attendance_log
ADD COLUMN IF NOT EXISTS break_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS break_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS break_duration_minutes INT DEFAULT 0;
