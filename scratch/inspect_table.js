const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'members' });
  if (error) {
    console.error('RPC Error:', error);
    // Let's run a raw SQL query using a table or just try an insert
    console.log('Trying direct query on information_schema...');
  }
  
  // Let's query information_schema.table_constraints
  // Since we cannot run raw sql rpc unless defined, let's just query information_schema or inspect via a simple select
  // Or we can try to insert a test member with a duplicate email and phone number to see if it throws a duplicate key violation.
  const testEmail = 'test_duplicate_' + Date.now() + '@example.com';
  const testPhone = '12345678901';
  
  console.log('Inserting first record...');
  const { data: res1, error: err1 } = await supabase.from('members').insert([{
    full_name: 'Test Dup 1',
    email: testEmail,
    phone: testPhone,
    status: 'active'
  }]).select();
  
  if (err1) {
    console.error('Insert 1 failed:', err1);
    return;
  }
  console.log('Insert 1 succeeded:', res1[0]?.id);
  
  console.log('Inserting second record with SAME email and phone...');
  const { data: res2, error: err2 } = await supabase.from('members').insert([{
    full_name: 'Test Dup 2',
    email: testEmail,
    phone: testPhone,
    status: 'active'
  }]).select();
  
  if (err2) {
    console.log('Insert 2 failed as expected if constraint exists:', err2.message);
    if (err2.message.includes('unique')) {
      console.log('A unique constraint definitely exists in the DB.');
    }
  } else {
    console.log('Insert 2 succeeded! No unique constraint on email or phone in DB! ID:', res2[0]?.id);
    // Clean up
    await supabase.from('members').delete().in('id', [res1[0].id, res2[0].id]);
    console.log('Cleaned up both records.');
  }
}
run();
