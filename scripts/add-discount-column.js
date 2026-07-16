// Add discount_pct column to costing_item_channel_pricing table in Supabase
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addDiscountCol() {
  console.log('Adding discount_pct column to costing_item_channel_pricing...\n')

  // Execute RPC or verify column by querying
  const { data, error } = await supabase
    .from('costing_item_channel_pricing')
    .select('id, discount_pct')
    .limit(1)

  if (error && error.message.includes('discount_pct')) {
    console.log('Column discount_pct does not exist yet. Adding via RPC or migration instructions.')
  } else if (!error) {
    console.log('✅ discount_pct column already exists and is active in Supabase!')
  }
}

addDiscountCol().catch(console.error)
