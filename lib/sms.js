import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function sendSMS(to, message) {
  try {
    if (!to || !message) {
      console.error('SMS: Missing phone or message')
      return false
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    })

    console.log('SMS sent:', result.sid)
    return true
  } catch (error) {
    console.error('SMS error:', error.message)
    return false
  }
}

export async function sendMemberApplicationConfirmSMS(phone, name) {
  const message = `Crown Coffee: We have received your membership application. Our team will review it within 24 hours. Thank you for choosing us.`
  return sendSMS(phone, message)
}

export async function sendMemberApprovedSMS(phone, name, cardNumber) {
  const message = `Crown Coffee: Congratulations! Your membership has been approved. Card Number: ${cardNumber}. Enjoy 5% discount on all items. Visit us soon!`
  return sendSMS(phone, message)
}

export async function sendVisitRecordedSMS(phone, name, visits, punchCount) {
  const currentPunch = punchCount % 10
  const remaining = 10 - currentPunch
  const message = `Crown Coffee: Thank you for visiting! Total visits: ${visits}. Punch card: ${currentPunch}/10. ${remaining} more punches for a free coffee.`
  return sendSMS(phone, message)
}

export async function sendFreeCoffeeSMS(phone, name, cardNumber) {
  const message = `Crown Coffee: Congratulations! You have earned a free coffee after 10 visits. Card: ${cardNumber}. Valid for 7 days. Redeem your reward today!`
  return sendSMS(phone, message)
}

export async function sendTierUpgradeSMS(phone, name) {
  const message = `Crown Coffee: Excellent news! You have been upgraded to Gold Member. Enjoy 10% discount on all items. We appreciate your loyalty!`
  return sendSMS(phone, message)
}

export async function sendOfferSMS(phone, discount, validDays) {
  const message = `Crown Coffee: Special offer for you! Get ${discount}% discount on all items. Valid for ${validDays} days. Visit us and enjoy!`
  return sendSMS(phone, message)
}

export async function sendSpecialDateSMS(phone, name, occasion) {
  const message = `Crown Coffee: Happy ${occasion}, ${name}! Enjoy a special discount on us. Present your membership card to claim your offer.`
  return sendSMS(phone, message)
}
