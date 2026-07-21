-- ============================================================
-- ATTENDANCE & DUTY ROSTER SYSTEM — MIGRATION SCRIPT
-- Crown Coffee Management System
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- ── 1. Extend staff table with roster fields ─────────────────
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS employee_id   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS shift_start   TIME DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS weekly_off    TEXT DEFAULT 'Friday',
  ADD COLUMN IF NOT EXISTS grace_minutes INT DEFAULT 15;

-- Auto-generate CC-001 style employee IDs for existing staff
DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
BEGIN
  FOR rec IN SELECT id FROM staff WHERE employee_id IS NULL ORDER BY serial ASC, created_at ASC LOOP
    UPDATE staff SET employee_id = 'CC-' || LPAD(counter::TEXT, 3, '0') WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- ── 2. Attendance Log (real-time daily records) ───────────────
CREATE TABLE IF NOT EXISTS attendance_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id        UUID REFERENCES staff(id) ON DELETE CASCADE,
  employee_id     TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_at     TIMESTAMPTZ,
  check_out_at    TIMESTAMPTZ,
  status          TEXT CHECK (status IN ('present','late','absent','on_leave','off')) DEFAULT 'absent',
  source          TEXT DEFAULT 'manual',
  minutes_late    INT DEFAULT 0,
  hours_worked    NUMERIC,
  shift_start     TIME,
  auto_flagged    BOOLEAN DEFAULT FALSE,
  admin_override  BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_log_date ON attendance_log(date);
CREATE INDEX IF NOT EXISTS idx_attendance_log_staff ON attendance_log(staff_id, date DESC);

-- ── 3. Duty Roster (weekly grid) ─────────────────────────────
CREATE TABLE IF NOT EXISTS duty_roster (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id       UUID REFERENCES staff(id) ON DELETE CASCADE,
  week_start     DATE NOT NULL,
  day_date       DATE NOT NULL,
  shift_start    TIME NOT NULL DEFAULT '10:00',
  shift_hours    NUMERIC DEFAULT 10,
  is_off         BOOLEAN DEFAULT FALSE,
  is_leave       BOOLEAN DEFAULT FALSE,
  is_duty_change BOOLEAN DEFAULT FALSE,
  is_ai_draft    BOOLEAN DEFAULT FALSE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, day_date)
);

CREATE INDEX IF NOT EXISTS idx_duty_roster_week ON duty_roster(week_start);
CREATE INDEX IF NOT EXISTS idx_duty_roster_date ON duty_roster(day_date);

-- ── 4. Duty-Change Requests ───────────────────────────────────
CREATE TABLE IF NOT EXISTS duty_change_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id        UUID REFERENCES staff(id) ON DELETE CASCADE,
  request_date    DATE NOT NULL,
  request_type    TEXT CHECK (request_type IN ('shift_swap','day_off_swap')) DEFAULT 'day_off_swap',
  swap_with_id    UUID REFERENCES staff(id),
  new_shift_start TIME,
  reason          TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note      TEXT,
  ai_suggestion   JSONB,
  conflict_flag   BOOLEAN DEFAULT FALSE,
  conflict_detail TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_duty_change_status ON duty_change_requests(status, created_at DESC);

-- ── 5. Extend leave_requests with roster sync flag ────────────
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS roster_synced BOOLEAN DEFAULT FALSE;

-- ── 6. AI Roster Drafts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_roster_drafts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start  DATE NOT NULL UNIQUE,
  draft_data  JSONB NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','discarded')),
  ai_notes    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

-- ── 7. Attendance Anomaly Flags ───────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_anomalies (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id     UUID REFERENCES staff(id) ON DELETE CASCADE,
  type         TEXT,
  detail       JSONB,
  severity     TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  flagged_at   TIMESTAMPTZ DEFAULT NOW(),
  dismissed    BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_anomalies_active ON attendance_anomalies(flagged_at DESC) WHERE dismissed = FALSE;

-- ── 8. RLS: block public access, service role bypasses ────────
ALTER TABLE attendance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_roster_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_anomalies ENABLE ROW LEVEL SECURITY;
