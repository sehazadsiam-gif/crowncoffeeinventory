const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  try {
    const res = await axios.get(url, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    
    const paths = Object.keys(res.data.paths || {});
    console.log('Available Endpoints:');
    paths.forEach(p => {
      if (p.startsWith('/rpc/')) {
        console.log('RPC:', p);
      }
    });
  } catch (err) {
    console.error('Error fetching OpenAPI spec:', err.response?.data || err.message);
  }
}
run();
