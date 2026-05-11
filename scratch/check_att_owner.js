const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: att } = await supabase.from('attendance').select('staff_id').not('check_in_time', 'is', null).limit(5);
  if (att && att.length > 0) {
      const ids = att.map(a => a.staff_id);
      const { data: staff } = await supabase.from('staff').select('id, name').in('id', ids);
      const { data: admins } = await supabase.from('admin_accounts').select('id, username').in('id', ids);
      console.log('Staff found for attendance with times:', staff);
      console.log('Admins found for attendance with times:', admins);
  } else {
      console.log('No attendance records with times found.');
  }
}
run();
