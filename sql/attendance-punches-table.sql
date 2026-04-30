CREATE TABLE IF NOT EXISTS attendance_punches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  zkteco_id INTEGER,
  punch_time TIMESTAMPTZ NOT NULL,
  punch_date DATE NOT NULL,
  punch_type TEXT DEFAULT 'check_in',
  device_ip TEXT,
  raw_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE attendance_punches DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_punches_staff_date
ON attendance_punches(staff_id, punch_date);
