/**
 * Crown Coffee - Batch Staff Passcode Generator
 * Usage: node scripts/set-staff-passcodes.js
 * Automatically assigns <name>@cc passcodes to all active staff in Supabase.
 */

const axios = require('axios')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!serviceKey || !supabaseUrl) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local')
  process.exit(1)
}

async function executeSql(query) {
  const res = await axios.post(
    `${supabaseUrl}/pg/query`,
    { query },
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    }
  )
  return res.data
}

async function main() {
  console.log('Fetching active staff members...')
  const staff = await executeSql('SELECT id, name, employee_id FROM public.staff WHERE is_active = true ORDER BY name ASC;')
  console.log(`Found ${staff.length} active staff members.\n`)

  for (const s of staff) {
    let cleanName = s.name.trim().toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '')
    if (cleanName === 'sehazad') cleanName = 'siam'
    const passcode = `${cleanName}@cc`
    const hash = await bcrypt.hash(passcode, 10)

    const upsertSql = `
      INSERT INTO public.staff_accounts (staff_id, username, password_hash, mobile_number)
      VALUES ('${s.id}', '${cleanName}', '${hash}', '${passcode}')
      ON CONFLICT (staff_id) DO UPDATE 
      SET username = '${cleanName}', password_hash = '${hash}', mobile_number = '${passcode}';
    `
    await executeSql(upsertSql)
    console.log(`✓ ${s.name} (${s.employee_id || 'N/A'}) -> Passcode: ${passcode}`)
  }

  console.log('\nAll staff passcodes successfully synchronized!')
}

main().catch(console.error)
