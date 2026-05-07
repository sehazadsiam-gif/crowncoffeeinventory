// lib/whatsapp.js - Complete WhatsApp integration

export async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: {
            body: message
          }
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('WhatsApp error:', data)
      return { success: false, error: data }
    }

    return { success: true, message_id: data.messages[0].id }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return { success: false, error: error.message }
  }
}

export async function sendWhatsAppVisitConfirmation(phoneNumber, member, freeCoffeeLeft, visitsLeft, goldUpgradeEligible) {
  const message = `👋 *Visit Recorded!*

Hi ${member.full_name},

Your visit to Crown Coffee has been recorded.

📊 *Your Progress*
Total Visits: ${member.total_visits}
${!goldUpgradeEligible ? `Days left to Gold: ${visitsLeft}` : `✨ You're a Gold member! Enjoy 10% lifetime discount`}

☕ *Free Coffee Progress*
Visits left: ${freeCoffeeLeft}/10
${freeCoffeeLeft === 0 ? '🎉 You\'ve earned a free coffee! Visit us to claim.' : `Complete ${freeCoffeeLeft} more visits for a free coffee!`}

Thank you for being part of Crown Coffee family!`

  return sendWhatsAppMessage(phoneNumber, message)
}

export async function sendWhatsAppMembershipApproval(phoneNumber, member, cardNumber) {
  const message = `🎉 *Welcome to Crown Coffee!*

Hi ${member.full_name},

Your membership has been approved!

🎟️ *Your Card Number*
${cardNumber}

💰 *Your Benefits*
✓ 5% Lifetime Discount
✓ Free Coffee Every 10 Visits
✓ Special Day Offers
✓ Upgrade to Gold at 25 Visits (10% discount)

📍 *How to Use*
Show your card number to our manager for instant discount.

Visit us soon!`

  return sendWhatsAppMessage(phoneNumber, message)
}

export async function sendWhatsAppTierUpgrade(phoneNumber, member) {
  const message = `✨ *Tier Upgrade!*

Hi ${member.full_name},

Congratulations! You've been upgraded to *Gold Tier* at Crown Coffee.

💰 *Your New Benefit*
✓ 10% Lifetime Discount on all purchases!

Thank you for your loyalty. Visit us soon to enjoy your new discount!`

  return sendWhatsAppMessage(phoneNumber, message)
}