const member = { email: 'test@example.com', full_name: 'Test User' };
const offerType = 'birthday';

async function test() {
  try {
    const { sendSpecialDateEmail } = require('./lib/email.js'); // wait, Next.js uses ES modules or Babel. We can't easily require it if it has import statements.
  } catch(e) {
    console.error(e);
  }
}
test();
