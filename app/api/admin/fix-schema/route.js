import { NextResponse } from 'next/server'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'

export async function GET() {
  const connectionStrings = [
    process.env.DATABASE_URL,
    'postgres://postgres:YJEwDbQHPOF6Te4Yk1c8vQqTaa6yaKwcv1dLnb9682HDFGmwDbSk0OdiwxcTFXts@169.58.136.137:5432/postgres',
    'postgres://postgres:ojUc3lohC4MfvqZvLUXgi9fU27grUF4Z@169.58.136.137:5432/postgres'
  ].filter(Boolean)

  let lastError = null

  for (const connStr of connectionStrings) {
    const client = new Client({ connectionString: connStr })
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
      `)
      await client.end()
      return NextResponse.json({ 
        success: true, 
        message: 'Schema successfully updated! Missing payroll_entries columns (including late_days) have been added.' 
      })
    } catch (err) {
      console.error('Connection attempt failed for:', connStr, err.message)
      lastError = err
      try { await client.end() } catch (e) {}
    }
  }

  return NextResponse.json({ error: lastError?.message || 'Failed to connect to database' }, { status: 500 })
}
