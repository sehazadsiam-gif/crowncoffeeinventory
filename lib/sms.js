import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSMS(phone, message) {
  if (!client || !twilioPhone) {
    console.error('Twilio credentials missing');
    return false;
  }

  try {
    // Robust phone formatting
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+88' + formattedPhone;
    } else if (formattedPhone.startsWith('880')) {
      formattedPhone = '+' + formattedPhone;
    } else if (formattedPhone.length === 10 && !formattedPhone.startsWith('0')) {
      formattedPhone = '+880' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    await client.messages.create({
      body: message,
      from: twilioPhone,
      to: formattedPhone
    });
    console.log(`SMS sent to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error('Twilio SMS Error:', error.message);
    return false;
  }
}

// Professional English Template functions

export async function sendMemberApplicationConfirmSMS(phone, name) {
  const message = `Hello ${name}, thank you for applying for Crown Coffee membership. We have received your application and will review it within 24 hours.`;
  return sendSMS(phone, message);
}

export async function sendMemberApprovedSMS(phone, name, cardNumber) {
  const message = `Congratulations ${name}! Your Crown Coffee membership is now active. Your Card Number: ${cardNumber}. Enjoy your 5% lifetime discount!`;
  return sendSMS(phone, message);
}

export async function sendVisitRecordedSMS(phone, name, visits, punchCount) {
  const message = `Thank you for visiting Crown Coffee, ${name}! Your visit has been recorded. Total visits: ${visits}, Punch count: ${punchCount}. Reach 5 punches for a free coffee!`;
  return sendSMS(phone, message);
}

export async function sendFreeCoffeeSMS(phone, name, cardNumber) {
  const message = `Great news ${name}! You've earned a free coffee. Present your card ${cardNumber} during your next visit to redeem it. Enjoy!`;
  return sendSMS(phone, message);
}

export async function sendTierUpgradeSMS(phone, name) {
  const message = `Congratulations ${name}! You've reached the Gold tier at Crown Coffee. You now enjoy a 10% lifetime discount on all purchases!`;
  return sendSMS(phone, message);
}

export async function sendOfferSMS(phone, discount, validDays) {
  const message = `Exclusive Offer for you! Enjoy ${discount}% OFF at Crown Coffee. Valid for the next ${validDays} days. We look forward to seeing you!`;
  return sendSMS(phone, message);
}
