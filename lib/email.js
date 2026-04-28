import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

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
    console.log('Remark email sent to:', to)
  } catch (err) {
    console.error('Remark email failed:', err)
  }
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
    console.log('Payroll email sent to:', to)
  } catch (err) {
    console.error('Payroll email failed:', err)
  }
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
    console.log('Payment email sent to:', to)
  } catch (err) {
    console.error('Payment email failed:', err)
  }
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
    console.log('Advance email sent to:', to)
  } catch (err) {
    console.error('Advance email failed:', err)
  }
}
