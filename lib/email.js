import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

const MONTHS_BN = ['', 'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর']
const MONTHS_EN = ['', 'January','February','March','April','May','June','July','August','September','October','November','December']

export async function sendRemarkEmail({ to, name, note_type, note, date }) {
  if (!to) return
  try {
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: 'ক্রাউন কফি — নতুন মন্তব্য',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #6B3A2A;">ক্রাউন কফি</h2>
          <p>প্রিয় ${name},</p>
          <p>আপনার জন্য ম্যানেজমেন্ট থেকে একটি নতুন মন্তব্য যোগ করা হয়েছে।</p>
          <div style="background: #FAF7F2; border-left: 4px solid #6B3A2A; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p><strong>ধরন:</strong> ${note_type}</p>
            <p><strong>মন্তব্য:</strong> ${note}</p>
            <p><strong>তারিখ:</strong> ${date}</p>
          </div>
          <p>বিস্তারিত দেখতে লগইন করুন:</p>
          <a href="https://ccinventory.vercel.app" style="color: #6B3A2A;">ccinventory.vercel.app</a>
          <br/><br/>
          <p>ধন্যবাদ,<br/>ক্রাউন কফি ম্যানেজমেন্ট</p>
        </div>
      `
    })
  } catch (err) { console.error('Remark email failed:', err) }
}

export async function sendPayrollEmail({ to, name, month, year, breakdown }) {
  if (!to) return
  try {
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: `ক্রাউন কফি — ${month} মাসের বেতন বিবরণী`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #6B3A2A;">ক্রাউন কফি</h2>
          <p>প্রিয় ${name},</p>
          <p>${month} ${year} মাসের আপনার বেতন চূড়ান্ত করা হয়েছে।</p>
          <div style="background: #FAF7F2; padding: 16px; margin: 16px 0; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 6px 0;">মূল বেতন</td><td align="right">৳${breakdown.base}</td></tr>
              <tr><td style="padding: 6px 0;">ওভারটাইম</td><td align="right" style="color: green;">+৳${breakdown.overtime}</td></tr>
              <tr><td style="padding: 6px 0;">সার্ভিস চার্জ</td><td align="right" style="color: green;">+৳${breakdown.service_charge}</td></tr>
              <tr><td style="padding: 6px 0;">বোনাস</td><td align="right" style="color: green;">+৳${breakdown.bonus}</td></tr>
              <tr><td style="padding: 6px 0;">লাঞ্চ + ডিনার</td><td align="right" style="color: green;">+৳${breakdown.lunch_dinner}</td></tr>
              <tr><td style="padding: 6px 0;">মর্নিং ফুড</td><td align="right" style="color: green;">+৳${breakdown.morning_food}</td></tr>
              <tr><td style="padding: 6px 0;">অ্যাডভান্স কাটা</td><td align="right" style="color: red;">-৳${breakdown.advance}</td></tr>
              <tr><td style="padding: 6px 0;">অন্যান্য কাটা</td><td align="right" style="color: red;">-৳${breakdown.others}</td></tr>
              <tr style="border-top: 2px solid #6B3A2A; font-weight: bold;">
                <td style="padding: 10px 0;">মোট বেতন</td>
                <td align="right" style="color: #6B3A2A; font-size: 18px;">৳${breakdown.final}</td>
              </tr>
            </table>
          </div>
          <p>বিস্তারিত দেখতে লগইন করুন:</p>
          <a href="https://ccinventory.vercel.app" style="color: #6B3A2A;">ccinventory.vercel.app</a>
          <br/><br/>
          <p>ধন্যবাদ,<br/>ক্রাউন কফি ম্যানেজমেন্ট</p>
        </div>
      `
    })
  } catch (err) { console.error('Payroll email failed:', err) }
}

export async function sendPaymentEmail({ to, name, month, year, amount, remaining }) {
  if (!to) return
  try {
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: 'ক্রাউন কফি — বেতন পরিশোধ নিশ্চিত',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #6B3A2A;">ক্রাউন কফি</h2>
          <p>প্রিয় ${name},</p>
          <p>${month} ${year} মাসের আপনার বেতন পরিশোধ করা হয়েছে।</p>
          <div style="background: #FAF7F2; padding: 16px; margin: 16px 0; border-radius: 8px;">
            <p style="font-size: 16px;"><strong>পরিশোধিত:</strong> <span style="color: green; font-size: 20px; font-weight: bold;">৳${amount}</span></p>
            <p><strong>বাকি:</strong> <span style="color: ${remaining === '0' ? 'green' : 'red'};">৳${remaining}</span></p>
          </div>
          <p>বিস্তারিত দেখতে লগইন করুন:</p>
          <a href="https://ccinventory.vercel.app" style="color: #6B3A2A;">ccinventory.vercel.app</a>
          <br/><br/>
          <p>ধন্যবাদ,<br/>ক্রাউন কফি ম্যানেজমেন্ট</p>
        </div>
      `
    })
  } catch (err) { console.error('Payment email failed:', err) }
}

export async function sendAdvanceEmail({ to, name, amount, reason, date }) {
  if (!to) return
  try {
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: 'ক্রাউন কফি — অ্যাডভান্স অনুমোদন',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #6B3A2A;">ক্রাউন কফি</h2>
          <p>প্রিয় ${name},</p>
          <p>আপনার অ্যাডভান্স অনুমোদন করা হয়েছে।</p>
          <div style="background: #FAF7F2; padding: 16px; margin: 16px 0; border-radius: 8px;">
            <p><strong>পরিমাণ:</strong> <span style="color: red; font-size: 18px; font-weight: bold;">৳${amount}</span></p>
            <p><strong>কারণ:</strong> ${reason || 'উল্লেখ নেই'}</p>
            <p><strong>তারিখ:</strong> ${date}</p>
          </div>
          <p>বিস্তারিত দেখতে লগইন করুন:</p>
          <a href="https://ccinventory.vercel.app" style="color: #6B3A2A;">ccinventory.vercel.app</a>
          <br/><br/>
          <p>ধন্যবাদ,<br/>ক্রাউন কফি ম্যানেজমেন্ট</p>
        </div>
      `
    })
  } catch (err) { console.error('Advance email failed:', err) }
}

// ====== MEMBERSHIP EMAIL FUNCTIONS ======

export async function sendMemberApplicationConfirm({ to, name }) {
  if (!to) return
  try {
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: 'ক্রাউন কফি — সদস্যপদ আবেদন প্রাপ্ত',
      html: `
        <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto;">
          <div style="background: #6B3A2A; padding: 24px 32px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #C9943A; font-size: 24px; margin: 0 0 4px;">CROWN COFFEE</h1>
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0; letter-spacing: 2px;">MEMBERSHIP</p>
          </div>
          <div style="background: #FFFFFF; padding: 32px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #334155; margin: 0 0 16px;">প্রিয় ${name},</p>
            <p style="font-size: 15px; color: #334155; line-height: 1.7; margin: 0 0 24px;">
              আপনার সদস্যপদ আবেদন আমরা সফলভাবে পেয়েছি। আমরা ২৪ ঘণ্টার মধ্যে আপনার আবেদন পর্যালোচনা করে মেম্বারশিপ কার্ড পাঠাব।
            </p>
            <div style="background: #FAF7F2; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
              <p style="font-size: 14px; font-weight: 700; color: #6B3A2A; margin: 0 0 12px;">আপনার সুবিধাসমূহ:</p>
              <ul style="padding-left: 20px; margin: 0; color: #334155; font-size: 14px;">
                <li style="margin-bottom: 6px;">সিলভার সদস্য: সকল খাবারে ৫% ছাড়</li>
                <li style="margin-bottom: 6px;">গোল্ড সদস্য (২৫+ ভিজিট): ১০% ছাড়</li>
                <li>প্রতি ১০ ভিজিটে ১টি বিনামূল্যে কফি</li>
              </ul>
            </div>
            <p style="font-size: 14px; color: #334155; margin: 0;">ধন্যবাদ,<br/>ক্রাউন কফি</p>
          </div>
        </div>
      `
    })
  } catch (err) { console.error('Member apply email failed:', err) }
}

export async function sendMemberApproved({ to, name, card_number, member_since, tier, special_dates }) {
  if (!to) return
  try {
    const formattedDate = new Date(member_since).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const tierLabel = tier === 'gold' ? 'Gold Member' : 'Silver Member'
    const discount = tier === 'gold' ? '10%' : '5%'

    let specialDatesHtml = ''
    if (special_dates && special_dates.length > 0) {
      const rows = special_dates.map(d =>
        `<tr><td style="padding: 6px 12px; font-size: 14px; color: #334155;">${d.occasion_name}</td><td style="padding: 6px 12px; font-size: 14px; color: #64748B;">${MONTHS_EN[d.month]} ${d.day}</td></tr>`
      ).join('')
      specialDatesHtml = `<div style="margin: 24px 0;"><p style="font-size: 14px; font-weight: 700; color: #6B3A2A; margin: 0 0 8px;">আপনার বিশেষ তারিখসমূহ:</p><table style="width: 100%; border-collapse: collapse;">${rows}</table></div>`
    }

    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: 'ক্রাউন কফি — আপনার মেম্বারশিপ অনুমোদিত!',
      html: `
        <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto;">
          <table width="100%" style="border-collapse: collapse; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.15);">
            <tr><td style="background: #6B3A2A; padding: 20px; text-align: center;"><h1 style="color: #C9943A; font-size: 22px; margin: 0;">CROWN COFFEE</h1><p style="color: #fff; font-size: 11px; margin: 0; letter-spacing: 2px;">MEMBERSHIP CARD</p></td></tr>
            <tr><td style="background: linear-gradient(135deg, #4A2518, #6B3A2A); padding: 28px 32px;">
              <p style="color: #C9943A; font-size: 22px; font-weight: 700; margin: 0 0 20px; font-family: monospace;">${card_number}</p>
              <p style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 0 0 4px;">${name}</p>
              <p style="color: #FFFFFF; font-size: 13px; margin: 0 0 16px;">${tierLabel.toUpperCase()} • Member Since: ${formattedDate}</p>
              <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 16px;">
                <p style="color: #C9943A; font-size: 15px; font-weight: 700; margin: 0;">Lifetime Discount: ${discount}</p>
              </div>
            </td></tr>
          </table>
          <div style="background: #FFFFFF; padding: 28px 32px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px;">
            ${specialDatesHtml}
            <div style="background: #FAF7F2; padding: 20px; border-radius: 8px;"><p style="font-size: 14px; font-weight: 700; color: #6B3A2A; margin: 0 0 8px;">কিভাবে ব্যবহার করবেন:</p><p style="font-size: 14px; color: #334155; margin: 0;">ক্রাউন কফিতে এসে আপনার কার্ড নম্বর দিন এবং ডিসকাউন্ট উপভোগ করুন।</p></div>
          </div>
        </div>
      `
    })
  } catch (err) { console.error('Member approve email failed:', err) }
}

export async function sendMemberOffer({ to, name, card_number, subject, message, discount, valid_days }) {
  if (!to) return
  try {
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: subject || 'ক্রাউন কফি — বিশেষ অফার',
      html: `
        <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto;">
          <div style="background: #6B3A2A; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;"><h1 style="color: #C9943A; font-size: 24px; margin: 0;">CROWN COFFEE</h1></div>
          <div style="background: #FFFFFF; padding: 32px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #334155; margin: 0 0 16px;">প্রিয় ${name},</p>
            <p style="font-size: 15px; color: #334155; line-height: 1.7; margin: 0 0 24px;">${message}</p>
            <div style="background: #FAF7F2; border: 2px solid #C9943A; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="font-size: 36px; font-weight: 800; color: #6B3A2A; margin: 0 0 4px;">${discount}% ছাড়</p>
              <p style="font-size: 14px; color: #64748B; margin: 0;">বৈধতা: ${valid_days} দিন • কার্ড: ${card_number}</p>
            </div>
          </div>
        </div>
      `
    })
  } catch (err) { console.error('Member offer email failed:', err) }
}

export async function sendAdminMemberAlert({ name, email, phone, occupation, special_dates_count }) {
  try {
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `New Membership Application - ${name}`,
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2 style="color: #6B3A2A;">New Member Application</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Occupation:</strong> ${occupation}</p><p><strong>Special Dates:</strong> ${special_dates_count}</p></div>`
    })
  } catch (err) { console.error('Admin alert email failed:', err) }
}

// ====== NEW EMAIL FUNCTIONS (PART 2+3) ======

export async function sendFreeCoffeeEmail({ to, name, card_number }) {
  if (!to) return
  try {
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: 'ক্রাউন কফি — বিনামূল্যে কফি অর্জিত!',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="background: #6B3A2A; padding: 24px; text-align: center;"><h1 style="color: #C9943A; margin: 0;">CROWN COFFEE</h1></div>
          <div style="padding: 32px; background: #fff; border: 1px solid #E2E8F0;">
            <h2 style="color: #6B3A2A; text-align: center;">অভিনন্দন ${name}!</h2>
            <div style="background: #FAF7F2; border: 2px dashed #C9943A; padding: 24px; text-align: center; margin: 24px 0;">
              <p style="font-size: 18px; font-weight: 700; color: #6B3A2A; margin: 0 0 8px;">১০ ভিজিট সম্পন্ন</p>
              <p style="font-size: 24px; font-weight: 800; color: #C9943A; margin: 0;">১টি বিনামূল্যে কফি</p>
              <p style="font-size: 13px; color: #64748B; margin: 12px 0 0;">কার্ড নম্বর: <strong>${card_number}</strong></p>
            </div>
            <p style="color: #334155; font-size: 14px; text-align: center;">এই অফারটি আগামী ৭ দিনের মধ্যে ব্যবহার করুন।</p>
          </div>
        </div>
      `
    })
  } catch (err) { console.error('Free coffee email failed:', err) }
}

export async function sendFeedbackRequest({ to, name, visit_id }) {
  if (!to) return
  try {
    const baseUrl = 'https://ccinventory.vercel.app/api/members/feedback'
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: 'ক্রাউন কফি — আপনার মতামত জানান',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; text-align: center;">
          <h2 style="color: #6B3A2A;">প্রিয় ${name},</h2>
          <p style="color: #334155;">আজকের ভিজিট আপনার কেমন লেগেছে? আপনার রেটিং দিন:</p>
          <div style="margin: 32px 0; display: flex; justify-content: center; gap: 10px;">
            ${[1, 2, 3, 4, 5].map(n => `
              <a href="${baseUrl}?visit_id=${visit_id}&rating=${n}" style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: #6B3A2A; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 18px; margin: 0 4px;">${n}</a>
            `).join('')}
          </div>
          <p style="color: #94A3B8; font-size: 12px;">১ = খুব খারাপ, ৫ = অসাধারণ</p>
        </div>
      `
    })
  } catch (err) { console.error('Feedback request email failed:', err) }
}

export async function sendTierUpgradeEmail({ to, name, card_number }) {
  if (!to) return
  try {
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: 'ক্রাউন কফি — আপনি গোল্ড সদস্য হয়েছেন!',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="background: #C9943A; padding: 24px; text-align: center;"><h1 style="color: #6B3A2A; margin: 0;">GOLD MEMBER</h1></div>
          <div style="padding: 32px; background: #fff; border: 1px solid #E2E8F0;">
            <h2 style="color: #6B3A2A; text-align: center;">অভিনন্দন ${name}!</h2>
            <p style="color: #334155; text-align: center; line-height: 1.6;">আপনি ২৫+ ভিজিট সম্পন্ন করে গোল্ড মেম্বারশিপে উন্নীত হয়েছেন।</p>
            <div style="background: #FAF7F2; padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0;">
              <p style="font-size: 20px; font-weight: 800; color: #6B3A2A; margin: 0;">এখন থেকে ১০% ছাড়</p>
              <p style="font-size: 13px; color: #64748B; margin: 8px 0 0;">কার্ড নম্বর: <strong>${card_number}</strong></p>
            </div>
            <p style="color: #334155; font-size: 14px; text-align: center;">ক্রাউন কফিতে আপনাকে স্বাগতম।</p>
          </div>
        </div>
      `
    })
  } catch (err) { console.error('Tier upgrade email failed:', err) }
}

export async function sendSpecialDateEmail({ to, name, card_number, occasion_name, days_until }) {
  if (!to) return
  try {
    const message = days_until === 0 
      ? `আজ আপনার ${occasion_name}! ক্রাউন কফির পক্ষ থেকে শুভেচ্ছা।`
      : `${days_until} দিন পরে আপনার ${occasion_name}। আমাদের সাথে উদযাপন করুন!`
    
    const offer = days_until === 0 ? 'আজ অতিরিক্ত ৫% ছাড়' : 'বিশেষ অফার নিয়ে আসুন'

    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: 'ক্রাউন কফি — আপনার বিশেষ দিন আসছে',
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2 style="color: #6B3A2A;">শুভেচ্ছা ${name}!</h2><p>${message}</p><div style="background: #FAF7F2; padding: 16px; border-radius: 8px;"><p><strong>অফার:</strong> ${offer}</p><p><strong>কার্ড:</strong> ${card_number}</p></div></div>`
    })
  } catch (err) { console.error('Special date email failed:', err) }
}

export async function sendAnniversaryEmail({ to, name, card_number, years }) {
  if (!to) return
  try {
    await transporter.sendMail({
      from: `Crown Coffee <${process.env.GMAIL_USER}>`,
      to,
      subject: 'ক্রাউন কফি — সদস্যপদ বার্ষিকী',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #fff; border: 1px solid #E2E8F0; text-align: center;">
          <h1 style="color: #6B3A2A;">শুভ বার্ষিকী!</h1>
          <p style="color: #334155;">আপনি <strong>${years}</strong> বছর ধরে আমাদের সাথে আছেন।</p>
          <div style="background: #6B3A2A; color: #fff; padding: 24px; border-radius: 12px; margin: 24px 0;">
            <p style="font-size: 18px; margin: 0 0 8px;">বিশেষ উপহার</p>
            <p style="font-size: 22px; font-weight: 800; color: #C9943A; margin: 0;">আজ বিনামূল্যে একটি পানীয়</p>
          </div>
          <p style="font-size: 14px; color: #64748B;">কার্ড নম্বর: ${card_number}</p>
        </div>
      `
    })
  } catch (err) { console.error('Anniversary email failed:', err) }
}
