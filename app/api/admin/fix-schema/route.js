import { NextResponse } from 'next/server'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'

export async function GET() {
  const passwords = [
    'ojUc3lohC4MhvqZvLUXgi9fU27grUF4Z', // Supabase DB password
    'YJEwDbQHPOF6Te4Yk1c8vQqTaa6yaKwcv1dLnb9682HDFGmwDbSk0OdiwxcTFXts' // Standalone DB password
  ]

  const hosts = [
    'supabase-db',
    'supabase-db-m1u2pojetwat5vctyrld24gh',
    'host.docker.internal',
    '172.17.0.1',
    '169.58.136.137'
  ]

  const ports = [5432, 5433]

  const connStrings = []
  if (process.env.DATABASE_URL) connStrings.push(process.env.DATABASE_URL)

  for (const pwd of passwords) {
    for (const host of hosts) {
      for (const port of ports) {
        connStrings.push(`postgres://postgres:${pwd}@${host}:${port}/postgres`)
      }
    }
  }

  const results = []

  for (const connStr of connStrings) {
    const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 2000 })
    try {
      await client.connect()
      await client.query(`
        ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_days INTEGER DEFAULT 0;
        ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS miscellaneous_plus INTEGER DEFAULT 0;
        ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_waived BOOLEAN DEFAULT FALSE;
        ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS unpaid_leave_deduction NUMERIC DEFAULT 0;
        ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS late_deduction NUMERIC DEFAULT 0;
        ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS manual_unpaid_days INTEGER DEFAULT NULL;
        ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS waived_unpaid_days INTEGER DEFAULT 0;
        ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;

        ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS employee_id TEXT;
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS rfid_code TEXT;
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS nid TEXT;
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT;

        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS present_days INTEGER DEFAULT 0;
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS late_days INTEGER DEFAULT 0;
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0;
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS overtime_pay NUMERIC DEFAULT 0;
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'system';
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        CREATE TABLE IF NOT EXISTS staff_penalties (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          penalty_percent NUMERIC DEFAULT 0,
          reason TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(staff_id, date)
        );

        INSERT INTO staff_penalties (staff_id, date, penalty_percent, reason)
        VALUES
          ('d4c47a39-da06-4823-95f6-3725cc7ea02f', '2026-08-16', 0.5, NULL),
          ('808d17e2-8e73-46af-a473-682cddb5c945', '2026-08-16', 0.5, NULL),
          ('cdf26b9d-2e76-4b88-9172-f50f5640a7a1', '2026-08-16', 0.5, NULL),
          ('cdf26b9d-2e76-4b88-9172-f50f5640a7a1', '2026-08-17', 0.5, 'Handgloves'),
          ('cdf26b9d-2e76-4b88-9172-f50f5640a7a1', '2026-08-20', 0.5, 'Poor customer handling'),
          ('9f0814e0-249a-4548-ad5c-219019ec68d6', '2026-08-20', 0.5, 'Late Pizza and oven off'),
          ('cdf26b9d-2e76-4b88-9172-f50f5640a7a1', '2026-08-15', 0.5, 'Time of deliverling food'),
          ('808d17e2-8e73-46af-a473-682cddb5c945', '2026-08-18', 0.5, 'No feedback reported back from sector-12 program')
        ON CONFLICT (staff_id, date) DO UPDATE
        SET penalty_percent = EXCLUDED.penalty_percent, reason = EXCLUDED.reason;

        CREATE TABLE IF NOT EXISTS rough_sheets (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          sheet_name TEXT NOT NULL,
          columns JSONB NOT NULL DEFAULT '[]'::jsonb,
          data JSONB NOT NULL DEFAULT '[]'::jsonb,
          styles JSONB DEFAULT '{}'::jsonb,
          is_default BOOLEAN DEFAULT FALSE,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_rough_sheets_sort ON rough_sheets (sort_order, updated_at DESC);

        CREATE TABLE IF NOT EXISTS staff_locations (
          staff_id UUID PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          accuracy DOUBLE PRECISION,
          speed DOUBLE PRECISION,
          heading DOUBLE PRECISION,
          altitude DOUBLE PRECISION,
          battery_level INT,
          is_charging BOOLEAN DEFAULT false,
          tracking_mode TEXT DEFAULT 'off',
          address_hint TEXT,
          is_inside_geofence BOOLEAN DEFAULT false,
          last_updated TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS staff_location_logs (
          id BIGSERIAL PRIMARY KEY,
          staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          speed DOUBLE PRECISION,
          battery_level INT,
          recorded_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_loc_logs_staff_date ON staff_location_logs (staff_id, recorded_at DESC);

        CREATE TABLE IF NOT EXISTS geofence_zones (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          radius_m INT NOT NULL DEFAULT 100,
          zone_type TEXT DEFAULT 'workplace',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS geofence_events (
          id BIGSERIAL PRIMARY KEY,
          staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
          zone_id UUID NOT NULL REFERENCES geofence_zones(id) ON DELETE CASCADE,
          event_type TEXT NOT NULL,
          recorded_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_geofence_events_staff ON geofence_events (staff_id, recorded_at DESC);

        CREATE TABLE IF NOT EXISTS tracking_consent (
          staff_id UUID PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
          consented BOOLEAN DEFAULT false,
          consented_at TIMESTAMPTZ,
          revoked_at TIMESTAMPTZ,
          ip_address TEXT,
          device_info TEXT
        );

        INSERT INTO geofence_zones (name, latitude, longitude, radius_m, zone_type)
        SELECT 'Crown Coffee Main', 23.8759, 90.3795, 120, 'workplace'
        WHERE NOT EXISTS (SELECT 1 FROM geofence_zones WHERE name = 'Crown Coffee Main');

        CREATE TABLE IF NOT EXISTS sos_alerts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          battery_level INT,
          status TEXT DEFAULT 'active',
          notes TEXT,
          resolved_at TIMESTAMPTZ,
          resolved_by TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts (status, created_at DESC);

        CREATE TABLE IF NOT EXISTS errand_trips (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
          destination TEXT NOT NULL,
          purpose TEXT,
          estimated_cost NUMERIC DEFAULT 0,
          actual_cost NUMERIC DEFAULT 0,
          departure_time TIMESTAMPTZ DEFAULT NOW(),
          return_time TIMESTAMPTZ,
          distance_km NUMERIC DEFAULT 0,
          status TEXT DEFAULT 'in_progress',
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_errand_trips_staff ON errand_trips (staff_id, departure_time DESC);

          ALTER TABLE staff_locations DISABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_location_logs DISABLE ROW LEVEL SECURITY;
        ALTER TABLE geofence_zones DISABLE ROW LEVEL SECURITY;
        ALTER TABLE geofence_events DISABLE ROW LEVEL SECURITY;
        ALTER TABLE tracking_consent DISABLE ROW LEVEL SECURITY;
        ALTER TABLE sos_alerts DISABLE ROW LEVEL SECURITY;
        ALTER TABLE errand_trips DISABLE ROW LEVEL SECURITY;

        GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

        NOTIFY pgrst, 'reload schema';
        NOTIFY pgrst, 'reload config';
      `)

      const tableCheck = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('staff', 'staff_locations', 'staff_location_logs', 'geofence_zones', 'sos_alerts')
      `)

      await client.end()
      results.push({
        connection: connStr.replace(/:[^:@]+@/, ':***@'),
        foundTables: tableCheck.rows.map(r => r.table_name)
      })
    } catch (err) {
      try { await client.end() } catch (e) {}
    }
  }

  return NextResponse.json({ success: results.length > 0, results })
}
