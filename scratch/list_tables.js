const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // If RPC doesn't exist, try another way
    const { data: tables, error: tablesError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
    console.log('Tables:', tables?.map(t => t.tablename) || tablesError);
  } else {
    console.log('Tables:', data);
  }
}
run();
