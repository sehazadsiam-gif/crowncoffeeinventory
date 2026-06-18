require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('payroll_entries').insert({
    staff_id: 'b587ee76-ff23-40ea-bde1-d54bbc366f90', // Using the ID from earlier
    month: 12,
    year: 2099,
    lunch_dinner_manual: false,
    lunch_dinner: 0,
    late_waived: true,
    miscellaneous_plus: 0
  }).select();
  if (error) {
    console.error("INSERT ERROR:", error);
  } else {
    console.log("INSERT SUCCESS", data);
    await supabase.from('payroll_entries').delete().eq('year', 2099);
  }
}
check();
