const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('staff').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Staff columns:', data[0] ? Object.keys(data[0]) : 'No data');
  }
}
run();
