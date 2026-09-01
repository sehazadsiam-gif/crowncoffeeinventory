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

        NOTIFY pgrst, 'reload schema';
      `)
      await client.end()
      results.push(`Success on: ${connStr.replace(/:[^:@]+@/, ':***@')}`)
    } catch (err) {
      try { await client.end() } catch (e) {}
    }
  }

  if (results.length > 0) {
    return NextResponse.json({ success: true, results })
  }

  return NextResponse.json({ error: 'Could not connect to Supabase DB container directly from app network.' }, { status: 500 })
}
