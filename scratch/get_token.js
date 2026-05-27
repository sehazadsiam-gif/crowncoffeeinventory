const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('sessions').select('token').eq('role', 'admin').gt('expires_at', new Date().toISOString()).limit(1);
  console.log('Token:', data && data.length > 0 ? data[0].token : 'none');
}
run();
