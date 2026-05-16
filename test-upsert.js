const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('payroll_entries').upsert({
    id: '8558ac26-4127-41f0-add8-88c667bda8e2',
    staff_id: 'b587ee76-ff23-40ea-bde1-d54bbc366f90',
    month: 5,
    year: 2026,
    overtime_manual: true
  }, { onConflict: 'staff_id,month,year' });
  console.log(error);
}
check();
