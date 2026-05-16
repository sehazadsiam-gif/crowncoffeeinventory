require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD
  }
});

async function test() {
  try {
    await transporter.verify();
    console.log('Transporter verified successfully!');
  } catch (err) {
    console.error('Transporter error:', err);
  }
}
test();
