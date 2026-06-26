const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('staff').select('*').limit(1);
  if (error) {
    console.error('Error fetching staff:', error);
  } else {
    console.log('Staff row:', data[0]);
  }
}
check();
