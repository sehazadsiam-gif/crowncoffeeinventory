const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('Listing tables/views by querying pg_catalog or executing a RPC...');
    
    // We can run an RPC or raw sql if service role allows, but let's query some standard tables
    // Or we can try to fetch a row from tables we expect:
    const tables = [
      'attendance', 'attendance_log', 'attendance_anomalies', 'staff', 
      'payroll_entries', 'members', 'bazar_entries', 'ingredients', 
      'menu_items', 'recipes', 'sales', 'stock_movements', 'tasks'
    ];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table ${table}: error (${error.message})`);
      } else {
        console.log(`Table ${table}: ${count} rows`);
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
