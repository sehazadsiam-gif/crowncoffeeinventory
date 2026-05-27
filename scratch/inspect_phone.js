const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const testEmail1 = 'test_ph_1_' + Date.now() + '@example.com';
  const testEmail2 = 'test_ph_2_' + Date.now() + '@example.com';
  const testPhone = '12345678902';
  
  console.log('Inserting first record...');
  const { data: res1, error: err1 } = await supabase.from('members').insert([{
    full_name: 'Test Ph 1',
    email: testEmail1,
    phone: testPhone,
    status: 'active'
  }]).select();
  
  if (err1) {
    console.error('Insert 1 failed:', err1);
    return;
  }
  console.log('Insert 1 succeeded:', res1[0]?.id);
  
  console.log('Inserting second record with SAME phone but different email...');
  const { data: res2, error: err2 } = await supabase.from('members').insert([{
    full_name: 'Test Ph 2',
    email: testEmail2,
    phone: testPhone,
    status: 'active'
  }]).select();
  
  if (err2) {
    console.log('Insert 2 failed (constraint on phone exists):', err2.message);
  } else {
    console.log('Insert 2 succeeded! No unique constraint on phone in DB! ID:', res2[0]?.id);
    // Clean up both
    await supabase.from('members').delete().in('id', [res1[0].id, res2[0].id]);
    console.log('Cleaned up both records.');
  }
}
run();
