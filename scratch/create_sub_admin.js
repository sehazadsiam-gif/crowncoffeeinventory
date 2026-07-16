const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const username = 'subadmin';
  const password = 'subadminpassword';
  const role = 'sub_admin';
  const password_hash = await bcrypt.hash(password, 10);
  
  const { data, error } = await supabase
    .from('admin_accounts')
    .insert([{ username, password_hash, role }])
    .select();
    
  if (error) {
    console.error('Error inserting sub_admin:', error);
  } else {
    console.log('Inserted sub_admin:', data);
  }
}
run();
