const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { query: 'ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS overtime_manual BOOLEAN DEFAULT false;' });
  console.log('RPC result:', data, error);
}
check();
