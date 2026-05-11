const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('attendance').select('check_in_time, check_out_time').not('check_in_time', 'is', null).limit(5);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Attendance with times:', data);
  }
}
run();
