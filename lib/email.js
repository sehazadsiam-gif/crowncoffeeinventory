import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendRemarkEmail({ to, name, note_type, note, date }) {
  if (!to) return
  await resend.emails.send({
    from: 'Crown Coffee <onboarding@resend.dev>',
    to,
    subject: 'ক্রাউন কফি — নতুন মন্তব্য',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #6B3A2A;">ক্রাউন কফি</h2>
        <p>প্রিয় ${name},</p>
        <p>আপনার জন্য ম্যানেজমেন্ট থেকে একটি নতুন মন্তব্য যোগ করা হয়েছে।</p>
        <div style="background: #FAF7F2; border-left: 4px solid #6B3A2A; padding: 16px; margin: 16px 0;">
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
}

export async function sendPayrollEmail({ to, name, month, year, breakdown }) {
  if (!to) return
  await resend.emails.send({
    from: 'Crown Coffee <onboarding@resend.dev>',
    to,
    subject: `ক্রাউন কফি — ${month} মাসের বেতন বিবরণী`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #6B3A2A;">ক্রাউন কফি</h2>
        <p>প্রিয় ${name},</p>
        <p>${month} ${year} মাসের আপনার বেতন চূড়ান্ত করা হয়েছে।</p>
        <div style="background: #FAF7F2; padding: 16px; margin: 16px 0; border-radius: 8px;">
          <p><strong>বেতনের বিবরণ:</strong></p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td>মূল বেতন</td><td align="right">৳${breakdown.base}</td></tr>
            <tr><td>ওভারটাইম</td><td align="right">+৳${breakdown.overtime}</td></tr>
            <tr><td>সার্ভিস চার্জ</td><td align="right">+৳${breakdown.service_charge}</td></tr>
            <tr><td>বোনাস</td><td align="right">+৳${breakdown.bonus}</td></tr>
            <tr><td>লাঞ্চ + ডিনার</td><td align="right">+৳${breakdown.lunch_dinner}</td></tr>
            <tr><td>মর্নিং ফুড</td><td align="right">+৳${breakdown.morning_food}</td></tr>
            <tr><td>অ্যাডভান্স কাটা</td><td align="right" style="color: red;">-৳${breakdown.advance}</td></tr>
            <tr><td>অন্যান্য কাটা</td><td align="right" style="color: red;">-৳${breakdown.others}</td></tr>
            <tr style="border-top: 2px solid #6B3A2A; font-weight: bold;">
              <td>মোট বেতন</td>
              <td align="right" style="color: #6B3A2A;">৳${breakdown.final}</td>
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
}

export async function sendPaymentEmail({ to, name, month, year, amount, remaining }) {
  if (!to) return
  await resend.emails.send({
    from: 'Crown Coffee <onboarding@resend.dev>',
    to,
    subject: 'ক্রাউন কফি — বেতন পরিশোধ নিশ্চিত',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #6B3A2A;">ক্রাউন কফি</h2>
        <p>প্রিয় ${name},</p>
        <p>${month} ${year} মাসের আপনার বেতন পরিশোধ করা হয়েছে।</p>
        <div style="background: #FAF7F2; padding: 16px; margin: 16px 0; border-radius: 8px;">
          <p><strong>পরিশোধিত:</strong> ৳${amount}</p>
          <p><strong>বাকি:</strong> ৳${remaining}</p>
        </div>
        <p>বিস্তারিত দেখতে লগইন করুন:</p>
        <a href="https://ccinventory.vercel.app" style="color: #6B3A2A;">ccinventory.vercel.app</a>
        <br/><br/>
        <p>ধন্যবাদ,<br/>ক্রাউন কফি ম্যানেজমেন্ট</p>
      </div>
    `
  })
}

export async function sendAdvanceEmail({ to, name, amount, reason, date }) {
  if (!to) return
  await resend.emails.send({
    from: 'Crown Coffee <onboarding@resend.dev>',
    to,
    subject: 'ক্রাউন কফি — অ্যাডভান্স অনুমোদন',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #6B3A2A;">ক্রাউন কফি</h2>
        <p>প্রিয় ${name},</p>
        <p>আপনার অ্যাডভান্স অনুমোদন করা হয়েছে।</p>
        <div style="background: #FAF7F2; padding: 16px; margin: 16px 0; border-radius: 8px;">
          <p><strong>পরিমাণ:</strong> ৳${amount}</p>
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
}
