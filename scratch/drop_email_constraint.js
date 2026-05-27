const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Dropping unique constraint on email in members table...');
  const { data, error } = await supabase.rpc('execute_sql', { 
    query: 'ALTER TABLE members DROP CONSTRAINT IF EXISTS members_email_key;' 
  });
  
  if (error) {
    console.error('Failed to drop email constraint:', error);
  } else {
    console.log('Successfully dropped unique email constraint!', data);
  }
}
run();
