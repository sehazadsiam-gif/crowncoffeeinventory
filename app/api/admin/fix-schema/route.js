import { NextResponse } from 'next/server'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'

export async function GET() {
  const passwords = [
    'ojUc3lohC4MfvqZvLUXgi9fU27grUF4Z', // Supabase DB password
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

        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS present_days INTEGER DEFAULT 0;
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS late_days INTEGER DEFAULT 0;
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'system';
        ALTER TABLE monthly_attendance_summary ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
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
