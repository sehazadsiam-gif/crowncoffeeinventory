/**
 * lib/whatsapp-client.js
 * 100% FREE 1-Click WhatsApp Link Generator (Zero API Fees, Unlimited Messages)
 * NO EMOJIS - Clean Professional Plain Text Templates
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
 * Message Templates (Clean Plain Text - No Emojis)
 */

export function buildRosterWhatsAppMessage({ weekRangeText, rosterUrl = 'https://ccadmin.online/staff-portal' }) {
  return `*CROWN COFFEE - WEEKLY DUTY ROSTER*\n\nDear Staff,\n\nThe Weekly Duty Roster for *${weekRangeText}* is now published.\n\nView your shifts: ${rosterUrl}\n\nPlease check your schedule and arrive on time.\n\n- Crown Coffee Management`
}

export function buildShiftSwapWhatsAppMessage({ requesterName, targetName, dateStr, status = 'requested', portalUrl = 'https://ccadmin.online/staff-portal' }) {
  if (status === 'approved') {
    return `*SHIFT SWAP APPROVED*\n\nThe shift swap between *${requesterName}* and *${targetName}* for *${dateStr}* has been APPROVED by Admin.\n\nView updated roster: ${portalUrl}\n\n- Crown Coffee Management`
  }
  return `*SHIFT SWAP REQUEST*\n\nHi ${targetName}, ${requesterName} requested a shift swap with you for *${dateStr}*.\n\nLog in to Accept or Decline: ${portalUrl}\n\n- Crown Coffee Management`
}

export function buildMemberRewardWhatsAppMessage({ memberName, totalVisits, rewardTitle, rewardDescription }) {
  // Strip emojis from reward title/description if present
  const cleanTitle = String(rewardTitle || '').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu, '').trim()
  const cleanDesc = String(rewardDescription || '').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu, '').trim()

  return `*CROWN COFFEE VIP MEMBER REWARD*\n\nDear ${memberName},\n\nWelcome back. Visit #${totalVisits} recorded.\n\n*Your Unlocked Reward Today*: ${cleanTitle}\n${cleanDesc}\n\nThank you for being an esteemed VIP member of Crown Coffee.\n\n- Crown Coffee Management`
}

export function buildEmployeeOfMonthWhatsAppMessage({ winnerName, monthYear, totalScore, bonusAmount }) {
  return `*EMPLOYEE OF THE MONTH ANNOUNCEMENT*\n\nCrown Coffee is proud to award *${winnerName}* as the Employee of the Month for *${monthYear}*.\n\nTotal Performance Score: *${totalScore}/200*\nCash Bonus Awarded: *Tk ${bonusAmount}*\n\nThank you for your outstanding dedication and service.\n\n- Crown Coffee Management`
}
