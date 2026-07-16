// Disable RLS on all costing tables in Supabase
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const tables = [
  'costing_users',
  'costing_sessions',
  'costing_menu_items',
  'costing_ingredients',
  'costing_item_ingredients',
  'costing_cogs_history',
  'costing_delivery_channels',
  'costing_item_pricing',
  'costing_item_channel_pricing',
  'costing_sales_monthly',
  'costing_fixed_costs_monthly'
]

async function disableAllRLS() {
  console.log('Disabling RLS on costing tables via SQL...\n')

  const sqlStatements = tables.map(t => `ALTER TABLE IF EXISTS ${t} DISABLE ROW LEVEL SECURITY;`).join('\n')

  // Execute using REST rpc or direct raw query if available
  // Also add permissive RLS policies just in case RLS is turned back on automatically
  const policyStatements = tables.flatMap(t => [
    `ALTER TABLE IF EXISTS ${t} DISABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Allow all for ${t}" ON ${t};`,
    `CREATE POLICY "Allow all for ${t}" ON ${t} FOR ALL USING (true) WITH CHECK (true);`
  ]).join('\n')

  console.log('SQL to run:\n', policyStatements)

  // Try calling postgres function if available or run via pg
  // If rpc fails, print clean instructions for Supabase Dashboard
  const { error } = await supabase.rpc('exec_sql', { sql: policyStatements }).catch(e => ({ error: e }))

  if (error) {
    console.log('\n⚠️  RPC exec_sql not available. Open Supabase SQL Editor at:')
    console.log('   https://supabase.com/dashboard/project/smaoazpzngwyuqbdghfn/sql/new')
    console.log('\n   Paste and run this SQL:\n')
    console.log(policyStatements)
  } else {
    console.log('✅ RLS policies disabled / updated successfully!')
  }
}

disableAllRLS().catch(console.error)
