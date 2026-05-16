const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const req = new Request('http://localhost:3000/api/admin/members/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test'
    },
    body: JSON.stringify({
      subject: 'Test',
      message: 'Test Message',
      sendEmail: true,
      sendSms: false
    })
  });
  
  // Actually we need to test the actual Next.js server route or invoke it locally.
  // Next.js server isn't running in background here. Let's just import the POST function directly.
}
check();
