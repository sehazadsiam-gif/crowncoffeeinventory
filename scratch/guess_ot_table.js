const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('overtime').select('*').limit(1);
  if (error) {
    console.error('Error (overtime):', error.message);
    const { data: data2, error: error2 } = await supabase.from('staff_overtime').select('*').limit(1);
    if (error2) {
        console.error('Error (staff_overtime):', error2.message);
    } else {
        console.log('staff_overtime exists');
    }
  } else {
    console.log('overtime exists');
  }
}
run();
