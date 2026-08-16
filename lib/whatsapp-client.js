/**
 * lib/whatsapp-client.js
 * 100% FREE 1-Click WhatsApp Link Generator (Zero API Fees, Unlimited Messages)
 */

/**
 * Clean & format Bangladeshi phone numbers (+8801XXXXXXXXX)
 */
export function formatPhoneNumberForWhatsApp(phone) {
  if (!phone) return ''
  let cleaned = String(phone).replace(/\D/g, '')
  
  if (cleaned.startsWith('880')) {
    return cleaned
  }
  if (cleaned.startsWith('0')) {
    return '88' + cleaned
  }
  if (cleaned.length === 10) {
    return '880' + cleaned
  }
  return cleaned
}

/**
 * Create a direct 1-click WhatsApp deep link (works on Mobile app & WhatsApp Web)
 */
export function createWhatsAppLink({ phone = '', message = '' }) {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone)
  const encodedText = encodeURIComponent(message)
  
  if (formattedPhone) {
    return `https://wa.me/${formattedPhone}?text=${encodedText}`
  }
  return `https://wa.me/?text=${encodedText}`
}

/**
 * Message Templates
 */

export function buildRosterWhatsAppMessage({ weekRangeText, rosterUrl = 'https://ccadmin.online/staff-portal' }) {
  return `📢 *CROWN COFFEE - WEEKLY DUTY ROSTER* ☕\n\nDear Staff,\n\nThe Weekly Duty Roster for *${weekRangeText}* is now published!\n\n👉 View your shifts: ${rosterUrl}\n\nPlease check your schedule & arrive on time. Work hard, stay passionate! ✨\n\n— Crown Coffee Management`
}

export function buildShiftSwapWhatsAppMessage({ requesterName, targetName, dateStr, status = 'requested', portalUrl = 'https://ccadmin.online/staff-portal' }) {
  if (status === 'approved') {
    return `✅ *SHIFT SWAP APPROVED!* ☕\n\nGreat news! The shift swap between *${requesterName}* & *${targetName}* for *${dateStr}* has been APPROVED by Admin.\n\n👉 View updated roster: ${portalUrl}\n\n— Crown Coffee Management`
  }
  return `🔄 *SHIFT SWAP REQUEST* ☕\n\nHi ${targetName}! ${requesterName} requested a shift swap with you for *${dateStr}*.\n\n👉 Log in to Accept/Decline: ${portalUrl}\n\n— Crown Coffee Management`
}

export function buildMemberRewardWhatsAppMessage({ memberName, totalVisits, rewardTitle, rewardDescription }) {
  return `🎉 *CROWN COFFEE VIP MEMBER REWARD* ☕\n\nDear ${memberName},\n\nWelcome back! Visit #${totalVisits} recorded!\n\n🎁 *Your Unlocked Reward Today*: ${rewardTitle}\n${rewardDescription}\n\nThank you for being an esteemed VIP member of Crown Coffee! ✨`
}

export function buildEmployeeOfMonthWhatsAppMessage({ winnerName, monthYear, totalScore, bonusAmount }) {
  return `👑 *EMPLOYEE OF THE MONTH ANNOUNCEMENT!* 🏆\n\nCrown Coffee is proud to award *${winnerName}* as the Employee of the Month for *${monthYear}*! 🎉\n\n⭐ Total Performance Score: *${totalScore}/200*\n💰 Cash Bonus Awarded: *৳${bonusAmount}*\n\nThank you for your outstanding dedication and service! ☕✨\n\n— Crown Coffee Management`
}
