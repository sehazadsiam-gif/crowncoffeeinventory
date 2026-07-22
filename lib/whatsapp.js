/**
 * lib/whatsapp.js
 *
 * WhatsApp Business Cloud API Integration (Meta)
 * Sends transactional notifications to staff upon check-in / check-out.
 * Requires environment variables:
 *  - WHATSAPP_TOKEN
 *  - WHATSAPP_PHONE_ID
 */

export async function sendWhatsAppNotification({ phone, text }) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID

  if (!token || !phoneId || !phone) {
    // Silent fallback if credentials or phone not provided
    return { success: false, reason: 'Credentials or phone missing' }
  }

  // Format phone number to international E.164 without '+' or spaces (e.g., 8801712345678)
  const cleanPhone = phone.replace(/[^0-9]/g, '')

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: text }
      })
    })

    const json = await res.json()
    if (!res.ok) {
      console.error('[WhatsApp API error]', json)
      return { success: false, error: json }
    }
    return { success: true, data: json }
  } catch (err) {
    console.error('[WhatsApp notification exception]', err.message)
    return { success: false, error: err.message }
  }
}