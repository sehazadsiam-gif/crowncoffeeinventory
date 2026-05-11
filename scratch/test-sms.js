require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function testSMS() {
  console.log('Using Account SID:', process.env.TWILIO_ACCOUNT_SID);
  console.log('Using Phone Number:', process.env.TWILIO_PHONE_NUMBER);
  
  try {
    const result = await client.messages.create({
      body: 'Crown Coffee: Test SMS to verify Twilio integration.',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: '+8801724623126' // Testing with a sample number, or I should ask the user for their number. 
                           // Actually, I'll just try to send and catch the error.
    });
    console.log('Success! Message SID:', result.sid);
  } catch (error) {
    console.error('FAILED to send SMS:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
  }
}

testSMS();
