const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  
  const { count: attCount } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).gte('date', startDate);
  const { count: otCount } = await supabase.from('overtime_logs').select('*', { count: 'exact', head: true }).gte('date', startDate);
  const { data: staff } = await supabase.from('staff').select('id, name, zkteco_id').limit(5);

  console.log('Attendance records this month:', attCount);
  console.log('Overtime records this month:', otCount);
  console.log('Sample Staff:', staff);
}
run();
