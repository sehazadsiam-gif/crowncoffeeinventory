// Creates the first admin AND a chef user directly in Supabase
// Run: node scripts/create-costing-users.js
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── CONFIGURE THESE ──────────────────────────────────────────
const USERS = [
  {
    email:    'admin@crowncoffee.com',
    password: 'CrownAdmin@2025',
    name:     'Crown Admin',
    role:     'admin',
  },
  {
    email:    'chef@crowncoffee.com',
    password: 'CrownChef@2025',
    name:     'Head Chef',
    role:     'chef',
  },
]
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('Creating costing users...\n')

  for (const user of USERS) {
    const hash = await bcrypt.hash(user.password, 10)
    const { data, error } = await supabase
      .from('costing_users')
      .upsert(
        { email: user.email, password_hash: hash, name: user.name, role: user.role },
        { onConflict: 'email' }
      )
      .select('id, email, name, role')
      .single()

    if (error) {
      console.log(`❌ ${user.email} — ${error.message}`)
    } else {
      console.log(`✅ Created ${data.role}: ${data.email}`)
      console.log(`   Name:     ${data.name}`)
      console.log(`   Password: ${user.password}`)
      console.log(`   ID:       ${data.id}\n`)
    }
  }

  console.log('Done! Login at:')
  console.log('  Chef:  http://localhost:3000/menu-costings/login')
  console.log('  Admin: http://localhost:3000/menu-costings/login (then redirects to /admin/menu-engineering)')
}

main().catch(console.error)
