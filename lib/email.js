// lib/email.js - Complete updated version with WhatsApp

import nodemailer from 'nodemailer'
import { sendWhatsAppVisitConfirmation, sendWhatsAppMembershipApproval, sendWhatsAppTierUpgrade } from './whatsapp'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD
  }
})

// ===== MEMBERSHIP EMAILS =====

export async function sendMemberApplicationConfirm(member) {
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #6B3A2A; font-size: 24px; margin: 0 0 8px 0;">Application Received</h1>
          <p style="color: #9C8A76; margin: 0;">We'll review your membership application</p>
        </div>

        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #5C4A36; font-size: 14px; line-height: 1.6; margin: 0;">
            Hi ${member.full_name},<br><br>
            Thank you for applying to Crown Coffee membership!<br><br>
            We have received your application and will review it within 24 hours. 
            You will receive your digital membership card via email once approved.<br><br>
            Benefits you'll get:<br>
            ✓ 5% lifetime discount<br>
            ✓ Free coffee every 5 visits<br>
            ✓ Special date offers<br>
            ✓ Upgrade to Gold at 11 visits (10% discount)<br><br>
            Thank you for choosing Crown Coffee!
          </p>
        </div>

        <div style="text-align: center; color: #9C8A76; font-size: 12px;">
          Crown Coffee
        </div>
      </div>
    </div>
  `

  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: member.email,
    subject: 'Crown Coffee - Application Received',
    html
  })
}

export async function sendMemberApproved(member, cardNumber) {
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #2E7D32; font-size: 28px; margin: 0 0 8px 0;">Welcome to Crown Coffee!</h1>
          <p style="color: #9C8A76; margin: 0;">Your membership is active</p>
        </div>

        <!-- Card -->
        <div style="background: linear-gradient(135deg, #6B3A2A 0%, #8B5E3C 100%); border-radius: 16px; padding: 32px; color: white; margin-bottom: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          
          <div style="margin-bottom: 24px;">
            <div style="font-size: 36px; font-weight: 900; letter-spacing: -1px; margin-bottom: 8px;">CC</div>
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9;">Crown Coffee</div>
          </div>

          <div style="margin-bottom: 24px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 24px;">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; margin-bottom: 6px;">Member Name</div>
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">${member.full_name}</div>

            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; margin-bottom: 6px;">Card Number</div>
            <div style="font-size: 24px; font-weight: 900; letter-spacing: 2px; font-family: 'Courier New', monospace;">${cardNumber}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 24px;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; margin-bottom: 6px;">Tier</div>
              <div style="font-size: 16px; font-weight: 700;">Silver</div>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; margin-bottom: 6px;">Lifetime Discount</div>
              <div style="font-size: 16px; font-weight: 700;">5%</div>
            </div>
          </div>
        </div>

        <!-- Benefits -->
        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="color: #1F1F1F; font-size: 16px; font-weight: 800; margin: 0 0 16px 0;">Your Benefits</h2>
          
          <div style="display: flex; gap: 16px; margin-bottom: 12px;">
            <div style="color: #2E7D32; font-size: 20px;">✓</div>
            <div>
              <div style="color: #1F1F1F; font-weight: 700; margin-bottom: 4px;">5% Lifetime Discount</div>
              <div style="color: #9C8A76; font-size: 13px;">On every purchase immediately</div>
            </div>
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 12px;">
            <div style="color: #2E7D32; font-size: 20px;">✓</div>
            <div>
              <div style="color: #1F1F1F; font-weight: 700; margin-bottom: 4px;">Free Coffee Every 5 Visits</div>
              <div style="color: #9C8A76; font-size: 13px;">Earn punch cards automatically</div>
            </div>
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 12px;">
            <div style="color: #2E7D32; font-size: 20px;">✓</div>
            <div>
              <div style="color: #1F1F1F; font-weight: 700; margin-bottom: 4px;">Special Date Offers</div>
              <div style="color: #9C8A76; font-size: 13px;">Custom offers on your birthday & anniversary</div>
            </div>
          </div>

          <div style="display: flex; gap: 16px;">
            <div style="color: #2E7D32; font-size: 20px;">✓</div>
            <div>
              <div style="color: #1F1F1F; font-weight: 700; margin-bottom: 4px;">Upgrade to Gold at 11 Visits</div>
              <div style="color: #9C8A76; font-size: 13px;">Enjoy 10% lifetime discount</div>
            </div>
          </div>
        </div>

        <!-- How to Use -->
        <div style="background: #FDF8F4; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #1F1F1F; font-size: 14px; font-weight: 800; margin: 0 0 12px 0; text-transform: uppercase;">How to Use Your Card</h3>
          <ol style="color: #5C4A36; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Show your card number to our manager</li>
            <li>Get your discount instantly</li>
            <li>Earn punches for every visit</li>
            <li>Enjoy free coffee at 5 punches</li>
          </ol>
        </div>

        <!-- Footer -->
        <div style="text-align: center; color: #9C8A76; font-size: 12px; border-top: 1px solid #E0E0E0; padding-top: 24px;">
          <p style="margin: 0;">Crown Coffee Membership</p>
          <p style="margin: 0; opacity: 0.7;">Visit us for premium coffee experience</p>
        </div>

      </div>
    </div>
  `

  try {
    // Send EMAIL
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: `Welcome to Crown Coffee! Your Card Number: ${cardNumber}`,
      html
    })

    // ALSO SEND WHATSAPP (don't block email if WhatsApp fails)
    if (member.phone) {
      const formattedPhone = member.phone.replace(/\D/g, '')

      try {
        await sendWhatsAppMembershipApproval(formattedPhone, member, cardNumber)
      } catch (waError) {
        console.log('WhatsApp send failed (email sent):', waError)
      }
    }
  } catch (error) {
    console.error('Email send error:', error)
    throw error
  }
}

export async function sendMemberOffer(member, offer) {
  const offerDisplay = offer.offer_text || `${offer.discount_percent}% OFF`
  
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #C9943A; font-size: 24px; margin: 0 0 8px 0;">Special Offer for You!</h1>
          <p style="color: #9C8A76; margin: 0;">As a valued member</p>
        </div>

        <div style="background: linear-gradient(135deg, #C9943A 0%, #8B5E3C 100%); border-radius: 12px; padding: 24px; color: white; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 14px; margin-bottom: 12px;">${offer.title}</div>
          <div style="font-size: 32px; font-weight: 900; margin-bottom: 12px;">${offerDisplay}</div>
          <div style="font-size: 13px; opacity: 0.9;">Valid for ${offer.valid_days} days</div>
        </div>

        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #5C4A36; font-size: 14px; line-height: 1.6; margin: 0;">
            ${offer.description}
          </p>
        </div>

        <div style="text-align: center; color: #9C8A76; font-size: 12px;">
          Visit Crown Coffee to claim your offer!
        </div>
      </div>
    </div>
  `

  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: `Exclusive Offer: ${offerDisplay} at Crown Coffee`,
      html
    })
  } catch (error) {
    console.error('Email send error:', error)
    return null
  }
}

// ===== VISIT CONFIRMATION EMAIL =====

export async function sendVisitConfirmationEmail(member, freeCoffeeProgress, goldUpgradeEligible) {
  const freeCoffeeLeft = 5 - freeCoffeeProgress.current_punch
  const visitsLeft = 11 - member.total_visits

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="background: #E8F5E9; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px;">
            ✓
          </div>
          <h1 style="color: #2E7D32; font-size: 24px; margin: 0 0 8px 0;">Visit Recorded!</h1>
          <p style="color: #9C8A76; margin: 0;">Thank you for visiting Crown Coffee</p>
        </div>

        <!-- Today's Visit -->
        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <div style="text-align: center;">
            <div style="color: #9C8A76; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Visits</div>
            <div style="color: #1F1F1F; font-size: 32px; font-weight: 900; margin-bottom: 16px;">${member.total_visits}</div>
            <div style="font-size: 14px; color: #5C4A36;">You visited us ${member.total_visits} times</div>
          </div>
        </div>

        <!-- Free Coffee Progress -->
        <div style="background: #E3F2FD; border: 1px solid #90CAF9; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #1976D2;">
          <div style="color: #1976D2; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
            Free Coffee Progress
          </div>
          
          <!-- Punch Card Visual -->
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px;">
            ${[...Array(5)].map((_, i) => `
              <div style="aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; ${i < freeCoffeeProgress.current_punch ? 'background: #1976D2;' : 'background: #E0E0E0; color: #9C8A76;'}">
                ${i + 1}
              </div>
            `).join('')}
          </div>

          <div style="text-align: center;">
            <div style="color: #1976D2; font-size: 16px; font-weight: 700; margin-bottom: 4px;">
              ${freeCoffeeLeft} visits left
            </div>
            <div style="color: #9C8A76; font-size: 13px;">
              Complete ${freeCoffeeLeft} more visits to avail a free coffee!
            </div>
          </div>
        </div>

        <!-- Gold Upgrade Progress -->
        ${!goldUpgradeEligible ? `
          <div style="background: #FFF3E0; border: 1px solid #FFE0B2; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #F57C00;">
            <div style="color: #F57C00; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
              Gold Membership Coming Soon
            </div>
            
            <!-- Progress Bar -->
            <div style="background: #E0E0E0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
              <div style="background: #F57C00; height: 100%; width: ${Math.min(100, Math.round((member.total_visits / 11) * 100))}%; transition: width 0.3s;"></div>
            </div>

            <div style="text-align: center;">
              <div style="color: #F57C00; font-size: 16px; font-weight: 700; margin-bottom: 4px;">
                ${visitsLeft} visits left
              </div>
              <div style="color: #9C8A76; font-size: 13px;">
                Reach 11 visits to upgrade to Gold tier and enjoy 10% lifetime discount!
              </div>
            </div>
          </div>
        ` : `
          <div style="background: #E8F5E9; border: 1px solid #C8E6C9; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #2E7D32;">
            <div style="text-align: center;">
              <div style="color: #2E7D32; font-size: 20px; margin-bottom: 8px;">🎉</div>
              <div style="color: #2E7D32; font-size: 16px; font-weight: 700; margin-bottom: 4px;">Congratulations!</div>
              <div style="color: #9C8A76; font-size: 13px;">
                You've reached Gold tier! Enjoy 10% lifetime discount on all purchases.
              </div>
            </div>
          </div>
        `}

        <!-- Footer -->
        <div style="text-align: center; color: #9C8A76; font-size: 12px; border-top: 1px solid #E0E0E0; padding-top: 24px;">
          <p style="margin: 0;">Thank you for being part of Crown Coffee family</p>
        </div>

      </div>
    </div>
  `

  try {
    // Send EMAIL
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: `Your Visit Recorded - ${freeCoffeeLeft} visits left for free coffee!`,
      html
    })

    // ALSO SEND WHATSAPP (don't block email if WhatsApp fails)
    if (member.phone) {
      const formattedPhone = member.phone.replace(/\D/g, '')

      try {
        await sendWhatsAppVisitConfirmation(
          formattedPhone,
          member,
          freeCoffeeLeft,
          visitsLeft,
          goldUpgradeEligible
        )
      } catch (waError) {
        console.log('WhatsApp send failed (email sent):', waError)
      }
    }
  } catch (error) {
    console.error('Email send error:', error)
    throw error
  }
}

// ===== FEEDBACK EMAIL =====

export async function sendFeedbackRequest(member, visitId) {
  const ratingLinks = [1, 2, 3, 4, 5].map(rating =>
    `https://ccadmin.online/api/members/feedback?visit_id=${visitId}&rating=${rating}`
  )

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #6B3A2A; font-size: 24px; margin: 0 0 8px 0;">How was your visit?</h1>
          <p style="color: #9C8A76; margin: 0;">Please share your feedback</p>
        </div>

        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 32px; text-align: center;">
          <div style="font-size: 13px; color: #9C8A76; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Rate your experience</div>
          
          <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 24px;">
            ${ratingLinks.map((link, idx) => `
              <a href="${link}" style="text-decoration: none; font-size: 32px; opacity: 0.5; transition: opacity 0.2s;">
                ${idx + 1}⭐
              </a>
            `).join('')}
          </div>

          <div style="font-size: 13px; color: #9C8A76;">
            Click on any star to rate us
          </div>
        </div>

        <div style="text-align: center; color: #9C8A76; font-size: 12px; margin-top: 24px;">
          Your feedback helps us improve
        </div>
      </div>
    </div>
  `

  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: member.email,
    subject: 'How was your visit to Crown Coffee?',
    html
  })
}

// ===== TIER UPGRADE EMAIL =====

export async function sendTierUpgradeEmail(member) {
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="background: #FFF3E0; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px;">
            ✨
          </div>
          <h1 style="color: #F57C00; font-size: 24px; margin: 0 0 8px 0;">You're Now Gold!</h1>
          <p style="color: #9C8A76; margin: 0;">Congratulations on reaching Gold tier</p>
        </div>

        <div style="background: linear-gradient(135deg, #F57C00 0%, #E65100 100%); border-radius: 12px; padding: 24px; color: white; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 14px; margin-bottom: 12px;">Your New Discount</div>
          <div style="font-size: 40px; font-weight: 900;">10%</div>
          <div style="font-size: 12px; margin-top: 12px;">Lifetime Discount</div>
        </div>

        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px;">
          <p style="color: #5C4A36; font-size: 14px; line-height: 1.6; margin: 0;">
            Amazing! You've completed 11 visits and unlocked Gold membership.<br><br>
            Your 10% lifetime discount is now active on every purchase. Enjoy premium benefits!
          </p>
        </div>

        <div style="text-align: center; color: #9C8A76; font-size: 12px; margin-top: 24px;">
          Thank you for your loyalty
        </div>
      </div>
    </div>
  `

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: 'You\'ve upgraded to Gold! Enjoy 10% discount',
      html
    })

    if (member.phone) {
      const formattedPhone = member.phone.replace(/\D/g, '')
      try {
        await sendWhatsAppTierUpgrade(formattedPhone, member)
      } catch (waError) {
        console.log('WhatsApp tier upgrade failed:', waError)
      }
    }
  } catch (error) {
    console.error('Email send error:', error)
    throw error
  }
}

// ===== SPECIAL DATE EMAIL =====

export async function sendSpecialDateEmail(member, occasion) {
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #C9943A; font-size: 24px; margin: 0 0 8px 0;">Happy ${occasion}!</h1>
          <p style="color: #9C8A76; margin: 0;">Special offer just for you</p>
        </div>

        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 32px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
          <div style="font-size: 18px; font-weight: 700; color: #6B3A2A; margin-bottom: 12px;">
            ${occasion} Special
          </div>
          <div style="font-size: 32px; font-weight: 900; color: #C9943A; margin-bottom: 12px;">
            15% OFF
          </div>
          <div style="font-size: 13px; color: #9C8A76; margin-bottom: 24px;">
            Valid today only
          </div>
          <p style="color: #5C4A36; font-size: 14px; margin: 0;">
            Visit us today to enjoy your special discount. Show your card number to our manager!
          </p>
        </div>

        <div style="text-align: center; color: #9C8A76; font-size: 12px; margin-top: 24px;">
          Crown Coffee wishes you a wonderful day
        </div>
      </div>
    </div>
  `

  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: `Happy ${occasion}! 15% off at Crown Coffee`,
      html
    })
  } catch (error) {
    console.error('Email send error:', error)
    return null
  }
}
export async function sendBroadcastEmail({ to, name, subject, message }) {
  const htmlContent = `
    <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#FDF8F4;padding:20px">
      <div style="background:#6B3A2A;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:24px">Crown Coffee</h1>
      </div>
      
      <div style="background:white;padding:40px;border-radius:0 0 8px 8px">
        <p style="color:#5C4A36;font-size:16px;margin-bottom:24px">Dear ${name},</p>
        
        <div style="background:#FDF8F4;padding:24px;border-left:4px solid #C9943A;border-radius:6px;margin-bottom:24px">
          <p style="color:#5C4A36;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap">${message}</p>
        </div>
        
        <p style="color:#9C8A76;font-size:12px;margin-top:32px">
          Best regards,<br>
          Crown Coffee Team
        </p>
      </div>
    </div>
  `
  
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      html: htmlContent
    })
  } catch (error) {
    console.error('Broadcast Email send error:', error)
  }
}

export async function sendAdminMemberAlert({ name, email, phone, special_dates_count }) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>New Membership Application</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Special Dates Provided:</strong> ${special_dates_count}</p>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: `New Member Application: ${name}`,
      html
    })
  } catch (error) {
    console.error('Admin Email alert error:', error)
    return null
  }
}

// ===== LEAVE REQUEST EMAILS =====

export async function sendLeaveRequestAdminAlert({ staffName, leaveType, startDate, endDate, reason }) {
  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6B3A2A 0%, #8B5E3C 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; font-size: 22px; margin: 0;">☕ Crown Coffee</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0 0; font-size: 13px;">Staff Leave Request</p>
        </div>
        <div style="background: white; border: 1px solid #E0E0E0; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
            <p style="color: #92400E; font-weight: 700; font-size: 14px; margin: 0;">⚠️ New Leave Request Pending Approval</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #F0F0F0;">
              <td style="padding: 10px 0; color: #9C8A76; width: 130px;">Staff Name</td>
              <td style="padding: 10px 0; color: #1C1410; font-weight: 700;">${staffName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0F0F0;">
              <td style="padding: 10px 0; color: #9C8A76;">Leave Type</td>
              <td style="padding: 10px 0; color: #1C1410; font-weight: 700; text-transform: capitalize;">${leaveType}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0F0F0;">
              <td style="padding: 10px 0; color: #9C8A76;">From</td>
              <td style="padding: 10px 0; color: #1C1410; font-weight: 700;">${new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0F0F0;">
              <td style="padding: 10px 0; color: #9C8A76;">To</td>
              <td style="padding: 10px 0; color: #1C1410; font-weight: 700;">${new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0F0F0;">
              <td style="padding: 10px 0; color: #9C8A76;">Duration</td>
              <td style="padding: 10px 0; color: #1C1410; font-weight: 700;">${days} day${days > 1 ? 's' : ''}</td>
            </tr>
            ${reason ? `
            <tr>
              <td style="padding: 10px 0; color: #9C8A76;">Reason</td>
              <td style="padding: 10px 0; color: #5C4A36;">${reason}</td>
            </tr>` : ''}
          </table>
          <div style="margin-top: 24px; background: #F5F0E8; border-radius: 8px; padding: 14px; text-align: center;">
            <p style="color: #6B3A2A; font-size: 13px; margin: 0;">Please log in to the admin panel to approve or reject this request.</p>
          </div>
        </div>
        <div style="text-align: center; color: #9C8A76; font-size: 11px; margin-top: 16px;">Crown Coffee — Staff Management System</div>
      </div>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: 'crowncoffeebangladesh@gmail.com',
      subject: `Leave Request: ${staffName} — ${days} day${days > 1 ? 's' : ''} (${leaveType})`,
      html
    })
  } catch (error) {
    console.error('Leave admin alert email error:', error)
    return null
  }
}

export async function sendLeaveResponseEmail({ staffEmail, staffName, action, leaveType, startDate, endDate, adminNote }) {
  const approved = action === 'approved'
  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6B3A2A 0%, #8B5E3C 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; font-size: 22px; margin: 0;">☕ Crown Coffee</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0 0; font-size: 13px;">Leave Request Update</p>
        </div>
        <div style="background: white; border: 1px solid #E0E0E0; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
          <div style="background: ${approved ? '#D1FAE5' : '#FEE2E2'}; border-left: 4px solid ${approved ? '#10B981' : '#EF4444'}; border-radius: 6px; padding: 16px; margin-bottom: 20px; text-align: center;">
            <div style="font-size: 28px; margin-bottom: 6px;">${approved ? '✅' : '❌'}</div>
            <p style="color: ${approved ? '#065F46' : '#991B1B'}; font-weight: 700; font-size: 16px; margin: 0;">
              Your leave request has been ${approved ? 'Approved' : 'Rejected'}
            </p>
          </div>
          <p style="color: #5C4A36; font-size: 14px; margin-bottom: 20px;">Dear ${staffName},</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #F0F0F0;">
              <td style="padding: 10px 0; color: #9C8A76; width: 130px;">Leave Type</td>
              <td style="padding: 10px 0; color: #1C1410; font-weight: 700; text-transform: capitalize;">${leaveType}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0F0F0;">
              <td style="padding: 10px 0; color: #9C8A76;">From</td>
              <td style="padding: 10px 0; color: #1C1410; font-weight: 700;">${new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0F0F0;">
              <td style="padding: 10px 0; color: #9C8A76;">To</td>
              <td style="padding: 10px 0; color: #1C1410; font-weight: 700;">${new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0F0F0;">
              <td style="padding: 10px 0; color: #9C8A76;">Duration</td>
              <td style="padding: 10px 0; color: #1C1410; font-weight: 700;">${days} day${days > 1 ? 's' : ''}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0F0F0;">
              <td style="padding: 10px 0; color: #9C8A76;">Status</td>
              <td style="padding: 10px 0; font-weight: 700; color: ${approved ? '#10B981' : '#EF4444'};">${approved ? 'Approved ✓' : 'Rejected ✗'}</td>
            </tr>
            ${adminNote ? `
            <tr>
              <td style="padding: 10px 0; color: #9C8A76; vertical-align: top;">Admin Note</td>
              <td style="padding: 10px 0; color: #5C4A36; font-style: italic;">"${adminNote}"</td>
            </tr>` : ''}
          </table>
          ${approved ? `
          <div style="margin-top: 20px; background: #F5F0E8; border-radius: 8px; padding: 14px;">
            <p style="color: #6B3A2A; font-size: 13px; margin: 0;">Your leave has been recorded in the attendance system. Please make sure to hand over your duties before your leave starts.</p>
          </div>` : `
          <div style="margin-top: 20px; background: #FFF5F5; border-radius: 8px; padding: 14px;">
            <p style="color: #991B1B; font-size: 13px; margin: 0;">If you have questions about this decision, please speak directly with the management.</p>
          </div>`}
        </div>
        <div style="text-align: center; color: #9C8A76; font-size: 11px; margin-top: 16px;">Crown Coffee — Staff Management System</div>
      </div>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: staffEmail,
      subject: `Leave Request ${approved ? 'Approved ✅' : 'Rejected ❌'} — Crown Coffee`,
      html
    })
  } catch (error) {
    console.error('Leave response email error:', error)
    return null
  }
}

// ===== STAFF → ADMIN MESSAGE EMAIL =====

export async function sendStaffMessageAlert({ staffName, message, sentAt }) {
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6B3A2A 0%, #8B5E3C 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; font-size: 22px; margin: 0;">☕ Crown Coffee</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0 0; font-size: 13px;">Staff Message</p>
        </div>
        <div style="background: white; border: 1px solid #E0E0E0; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
          <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
            <p style="color: #1E40AF; font-weight: 700; font-size: 14px; margin: 0;">💬 New Message from ${staffName}</p>
            <p style="color: #3B82F6; font-size: 12px; margin: 4px 0 0 0;">${sentAt}</p>
          </div>
          <div style="background: #F5F0E8; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #1C1410; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <div style="text-align: center; background: #F9FAFB; border-radius: 8px; padding: 14px;">
            <p style="color: #6B3A2A; font-size: 13px; margin: 0;">Log in to the admin panel to view and reply to staff messages.</p>
          </div>
        </div>
        <div style="text-align: center; color: #9C8A76; font-size: 11px; margin-top: 16px;">Crown Coffee — Staff Management System</div>
      </div>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: 'crowncoffeebangladesh@gmail.com',
      subject: `💬 Staff Message from ${staffName} — Crown Coffee`,
      html
    })
  } catch (error) {
    console.error('Staff message email error:', error)
    return null
  }
}

// ===== STAFF TASK EMAILS =====

export async function sendTaskAssignmentEmail({ to, staffName, taskTitle, description, priority, dueDate }) {
  const priorityColor = priority === 'urgent' ? '#EF4444' : priority === 'high' ? '#F59E0B' : '#10B981'
  const priorityLabel = priority === 'urgent' ? '🔴 URGENT' : priority === 'high' ? '🟡 HIGH PRIORITY' : '🟢 Normal'
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #F2F5FA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6B3A2A 0%, #D4933A 100%); border-radius: 16px 16px 0 0; padding: 28px 32px; text-align: center;">
          <h1 style="color: white; font-size: 22px; margin: 0 0 4px 0; font-weight: 800;">☕ Crown Coffee</h1>
          <p style="color: rgba(255,255,255,0.80); margin: 0; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">New Task Assigned</p>
        </div>
        <div style="background: white; border-radius: 0 0 16px 16px; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.10);">
          <p style="font-size: 15px; color: #374151; margin: 0 0 20px 0;">Hi <strong>${staffName}</strong>,</p>
          <p style="font-size: 14px; color: #6B7280; margin: 0 0 24px 0;">You have been assigned a new task. Please review and complete it before the due date.</p>

          <div style="background: #FAFAFA; border: 1px solid #E5E7EB; border-left: 4px solid ${priorityColor}; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h2 style="font-size: 18px; color: #0D1117; margin: 0; font-weight: 800;">${taskTitle}</h2>
              <span style="background: ${priorityColor}20; color: ${priorityColor}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">${priorityLabel}</span>
            </div>
            ${description ? `<p style="font-size: 14px; color: #374151; margin: 0 0 12px 0; line-height: 1.6;">${description}</p>` : ''}
            ${dueDate ? `<p style="font-size: 13px; color: #6B7280; margin: 0;">📅 Due: <strong style="color: #0D1117;">${new Date(dueDate).toLocaleDateString('en-GB', { dateStyle: 'long' })}</strong></p>` : ''}
          </div>

          <div style="background: #FEF3C7; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #92400E; margin: 0; font-weight: 600;">⚠️ Please log in to your staff portal to update the status of this task once completed.</p>
          </div>

          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://crowncoffee.vercel.app'}/staff-portal" style="display: block; background: linear-gradient(135deg, #6B3A2A, #D4933A); color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 10px; font-weight: 700; font-size: 14px;">Open Staff Portal →</a>
        </div>
        <div style="text-align: center; color: #9CA3AF; font-size: 11px; margin-top: 20px;">Crown Coffee — Staff Management System</div>
      </div>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject: `📋 New Task: ${taskTitle} — Crown Coffee`,
      html
    })
  } catch (error) {
    console.error('Task assignment email error:', error)
    return null
  }
}

export async function sendTaskStatusUpdateEmail({ staffName, taskTitle, status, staffNote }) {
  const statusColor = status === 'done' ? '#10B981' : '#EF4444'
  const statusLabel = status === 'done' ? '✅ Marked as Done' : '❌ Marked as Not Done'
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #F2F5FA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0F1A2B 0%, #1E2E44 100%); border-radius: 16px 16px 0 0; padding: 28px 32px; text-align: center;">
          <h1 style="color: white; font-size: 22px; margin: 0 0 4px 0; font-weight: 800;">☕ Crown Coffee</h1>
          <p style="color: rgba(255,255,255,0.70); margin: 0; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">Task Status Updated</p>
        </div>
        <div style="background: white; border-radius: 0 0 16px 16px; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.10);">
          <p style="font-size: 15px; color: #374151; margin: 0 0 6px 0;">Admin,</p>
          <p style="font-size: 14px; color: #6B7280; margin: 0 0 24px 0;"><strong>${staffName}</strong> has updated the status of a task.</p>

          <div style="background: #FAFAFA; border: 1px solid #E5E7EB; border-left: 4px solid ${statusColor}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <p style="font-size: 12px; color: #9CA3AF; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700;">Task</p>
            <h2 style="font-size: 17px; color: #0D1117; margin: 0 0 12px 0; font-weight: 800;">${taskTitle}</h2>
            <span style="background: ${statusColor}15; color: ${statusColor}; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px;">${statusLabel}</span>
          </div>

          ${staffNote ? `
          <div style="background: #F0F4FF; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
            <p style="font-size: 12px; color: #6B7280; margin: 0 0 6px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Staff Note</p>
            <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.6;">${staffNote}</p>
          </div>` : ''}

          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://crowncoffee.vercel.app'}/admin/tasks" style="display: block; background: linear-gradient(135deg, #1E2E44, #2563EB); color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 10px; font-weight: 700; font-size: 14px;">Review in Admin Panel →</a>
        </div>
        <div style="text-align: center; color: #9CA3AF; font-size: 11px; margin-top: 20px;">Crown Coffee — Staff Management System</div>
      </div>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: 'crowncoffeebangladesh@gmail.com',
      subject: `Task Update: ${taskTitle} - ${staffName}`,
      html
    })
  } catch (error) {
    console.error('Task status email error:', error)
    return null
  }
}

// ===== MEMBER RFID EMAIL NOTIFICATIONS (NO EMOJIS) =====

export async function sendRfidCardIssuedEmail(member, cardNumber, rfidCode, expiresAt) {
  if (!member.email) return null
  const formattedExpiry = expiresAt ? new Date(expiresAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '36 Months'
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #6B3A2A; font-size: 24px; margin: 0 0 8px 0;">Crown Coffee Member RFID Card Issued</h1>
          <p style="color: #9C8A76; margin: 0;">Your official physical membership card is ready</p>
        </div>

        <div style="background: linear-gradient(135deg, #1E110A 0%, #4A2810 100%); border-radius: 16px; padding: 32px; color: white; margin-bottom: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <div style="margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 16px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8;">Crown Coffee Official Card</div>
            <div style="font-size: 20px; font-weight: 800; margin-top: 4px;">${member.full_name}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7;">Card Number</div>
              <div style="font-size: 18px; font-weight: 800; font-family: monospace;">${cardNumber || 'CC-MEM'}</div>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7;">Valid Until</div>
              <div style="font-size: 16px; font-weight: 700;">${formattedExpiry}</div>
            </div>
          </div>

          <div style="font-size: 11px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 12px;">
            RFID Tag Encoded: ${rfidCode ? rfidCode.slice(-6) : 'Linked'} | Card Validity: 36 Months
          </div>
        </div>

        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="color: #1F1F1F; font-size: 16px; font-weight: 800; margin: 0 0 16px 0;">Membership Benefits</h2>
          <p style="color: #5C4A36; font-size: 14px; line-height: 1.8; margin: 0;">
            - Lifetime 10% base discount on food and beverages.<br>
            - 1 Free Handcrafted Coffee for every 5 visits.<br>
            - Exclusive discounts on special occasions (birthdays and anniversaries).
          </p>
        </div>

        <div style="text-align: center; color: #9C8A76; font-size: 12px;">
          Crown Coffee Membership Platform
        </div>
      </div>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: `Crown Coffee Membership Card Issued - ${cardNumber}`,
      html
    })
  } catch (err) {
    console.error('sendRfidCardIssuedEmail error:', err)
    return null
  }
}

export async function sendRfidCardStatusEmail(member, cardNumber, status, reason) {
  if (!member.email) return null
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6B3A2A; font-size: 22px; margin: 0 0 8px 0;">Membership Card Status Updated</h1>
          <p style="color: #9C8A76; margin: 0;">Notice regarding Card Number: ${cardNumber}</p>
        </div>

        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #1C1410; font-size: 14px; line-height: 1.7; margin: 0;">
            Dear ${member.full_name},<br><br>
            The status of your Crown Coffee membership card has been updated to: <strong>${status.toUpperCase()}</strong>.<br>
            ${reason ? `Details / Reason: ${reason}<br><br>` : ''}
            If your card was replaced or re-issued, your lifetime perks and visit counts have been securely transferred to your new RFID card.
          </p>
        </div>

        <div style="text-align: center; color: #9C8A76; font-size: 12px;">
          Crown Coffee Customer Support
        </div>
      </div>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: `Crown Coffee Card Status Update: ${status.toUpperCase()}`,
      html
    })
  } catch (err) {
    console.error('sendRfidCardStatusEmail error:', err)
    return null
  }
}

export async function sendRfidTapVisitEmail(member, totalVisits, punchCount, freeCoffeeEarned) {
  if (!member.email) return null
  const punchesNeeded = 5 - punchCount
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2E7D32; font-size: 22px; margin: 0 0 8px 0;">Visit Recorded</h1>
          <p style="color: #9C8A76; margin: 0;">Thank you for visiting Crown Coffee</p>
        </div>

        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <div style="color: #9C8A76; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Total Visits</div>
          <div style="color: #1F1F1F; font-size: 32px; font-weight: 800; margin: 8px 0 16px 0;">${totalVisits}</div>

          <div style="background: #F5F0E8; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <div style="font-size: 14px; font-weight: 700; color: #6B3A2A;">5-Visit Reward Punch Progress</div>
            <div style="font-size: 18px; font-weight: 800; color: #1F1F1F; margin: 8px 0;">Punch ${punchCount} of 5</div>
            ${punchesNeeded > 0 
              ? `<div style="font-size: 13px; color: #9C8A76;">${punchesNeeded} more visit${punchesNeeded > 1 ? 's' : ''} until your next free coffee.</div>` 
              : `<div style="font-size: 13px; color: #2E7D32; font-weight: 700;">You have earned 1 Free Coffee Reward!</div>`}
          </div>
        </div>

        <div style="text-align: center; color: #9C8A76; font-size: 12px;">
          Crown Coffee Membership Platform
        </div>
      </div>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: `Crown Coffee Visit Recorded - Visit #${totalVisits}`,
      html
    })
  } catch (err) {
    console.error('sendRfidTapVisitEmail error:', err)
    return null
  }
}

export async function sendFreeCoffeeEarnedEmail(member) {
  if (!member.email) return null
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2E7D32; font-size: 24px; margin: 0 0 8px 0;">Free Coffee Reward Unlocked</h1>
          <p style="color: #9C8A76; margin: 0;">Congratulations on completing 5 visits!</p>
        </div>

        <div style="background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); border-radius: 12px; padding: 32px; color: white; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Reward Voucher</div>
          <div style="font-size: 28px; font-weight: 900; margin: 12px 0;">1 Free Handcrafted Coffee</div>
          <div style="font-size: 13px; opacity: 0.9;">Redeemable at the counter for yourself or a friend</div>
        </div>

        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px;">
          <p style="color: #5C4A36; font-size: 14px; line-height: 1.6; margin: 0;">
            Hi ${member.full_name},<br><br>
            You have successfully completed 5 visits! 1 Free Coffee Reward has been added to your profile.<br>
            Simply tap your RFID card or show your card number at the counter to redeem.
          </p>
        </div>
      </div>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: `Free Coffee Reward Unlocked - Crown Coffee`,
      html
    })
  } catch (err) {
    console.error('sendFreeCoffeeEarnedEmail error:', err)
    return null
  }
}

export async function sendRewardRedeemedEmail(member, rewardName) {
  if (!member.email) return null
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6B3A2A; font-size: 22px; margin: 0 0 8px 0;">Reward Redeemed</h1>
          <p style="color: #9C8A76; margin: 0;">Receipt confirmation</p>
        </div>

        <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #1C1410; font-size: 14px; line-height: 1.6; margin: 0;">
            Hi ${member.full_name},<br><br>
            Your reward <strong>${rewardName || 'Free Coffee'}</strong> was successfully redeemed at the counter.<br>
            Thank you for being a valued member of Crown Coffee!
          </p>
        </div>
      </div>
    </div>
  `
  try {
    return await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: `Reward Redemption Receipt - Crown Coffee`,
      html
    })
  } catch (err) {
    console.error('sendRewardRedeemedEmail error:', err)
    return null
  }
}

