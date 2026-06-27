const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('Adding column is_verified to staff_tasks...');
  const { data, error } = await supabase.rpc('execute_sql', {
    query: 'ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;'
  });

  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Migration completed successfully. Result:', data);
  }
}
run();
