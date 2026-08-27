import { NextResponse } from 'next/server'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'

export async function GET() {
  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:ojUc3lohC4MfvqZvLUXgi9fU27grUF4Z@supabase-db:5432/postgres'
  
  const client = new Client({ connectionString })
  
  try {
    await client.connect()
    
    // Add missing columns to payroll_entries
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
    console.error('Fix schema error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
