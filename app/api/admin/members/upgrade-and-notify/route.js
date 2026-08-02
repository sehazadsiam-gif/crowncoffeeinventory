export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { validateSession } from '../../../../../lib/auth'
import nodemailer from 'nodemailer'

export async function POST(request) {
  // Create transporter inside handler so env vars are guaranteed available at runtime
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD
    }
  })

  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || (session.role !== 'admin' && session.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch all active members
    const { data: members, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')

    if (fetchError) throw fetchError

    let upgradedCount = 0
    let emailCount = 0

    const results = []

    for (const member of members) {
      let upgraded = false
      // 2. Check for tier upgrade (Silver -> Gold if visits >= 11)
      if (member.tier === 'silver' && member.total_visits >= 11) {
        const { error: updateError } = await supabase
          .from('members')
          .update({ tier: 'gold' })
          .eq('id', member.id)
        
        if (!updateError) {
          upgraded = true
          upgradedCount++
        }
      }

      // 3. Send Notification Email
      const html = `
        <div style="font-family: 'Segoe UI', sans-serif; background: #FAFAFA; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #6B3A2A; font-size: 26px; margin: 0 0 8px 0;">Exciting Membership Updates!</h1>
              <p style="color: #9C8A76; margin: 0;">We've enhanced your Crown Coffee benefits</p>
            </div>

            <div style="background: white; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <p style="color: #5C4A36; font-size: 15px; line-height: 1.6; margin: 0;">
                Hi ${member.full_name},<br><br>
                We are thrilled to announce that we have made it <b>even easier</b> for you to enjoy your rewards at Crown Coffee!<br><br>
                Effective immediately, your membership benefits have been upgraded:
              </p>

              <div style="margin: 24px 0; display: grid; gap: 16px;">
                <div style="background: #E3F2FD; padding: 16px; border-radius: 8px; border-left: 4px solid #1976D2;">
                  <div style="color: #1976D2; font-weight: 800; font-size: 14px; text-transform: uppercase; margin-bottom: 4px;">FREE COFFEE FASTER</div>
                  <div style="color: #1F1F1F; font-size: 16px;">Now earn a <b>FREE coffee every 6 visits</b> (was 10)!</div>
                </div>

                <div style="background: #FFF3E0; padding: 16px; border-radius: 8px; border-left: 4px solid #F57C00;">
                  <div style="color: #F57C00; font-weight: 800; font-size: 14px; text-transform: uppercase; margin-bottom: 4px;">GOLD TIER UPGRADE</div>
                  <div style="color: #1F1F1F; font-size: 16px;">Now upgrade to <b>Gold Tier at just 11 visits</b> (was 25)!</div>
                </div>
              </div>

              ${upgraded ? `
                <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; border: 1px solid #C8E6C9; text-align: center; margin-bottom: 24px;">
                  <div style="font-size: 24px; margin-bottom: 8px;">🎉</div>
                  <div style="color: #2E7D32; font-weight: 800; font-size: 18px; margin-bottom: 4px;">Congratulations!</div>
                  <div style="color: #5C4A36; font-size: 14px;">Based on your visit history, <b>you have been automatically upgraded to GOLD TIER!</b> Enjoy your 10% lifetime discount starting from your next visit.</div>
                </div>
              ` : ''}

              <p style="color: #5C4A36; font-size: 14px; line-height: 1.6; margin: 0;">
                Thank you for being a loyal member of the Crown Coffee family. We look forward to seeing you soon!<br><br>
                Best regards,<br>
                <b>Crown Coffee Team</b>
              </p>
            </div>

            <div style="text-align: center; color: #9C8A76; font-size: 12px;">
              Crown Coffee Membership Portal
            </div>
          </div>
        </div>
      `

      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: member.email,
          subject: upgraded 
            ? '🎉 Congratulations! You\'ve been upgraded to Gold + New Benefits'
            : '✨ Exciting News: Your Crown Coffee Benefits just got Better!',
          html
        })
        emailCount++
        results.push({ email: member.email, status: 'sent', upgraded })
      } catch (err) {
        console.error(`Failed to send email to ${member.email}:`, err)
        results.push({ email: member.email, status: 'failed', error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_members: members.length,
        emails_sent: emailCount,
        tiers_upgraded: upgradedCount
      },
      details: results
    })

  } catch (error) {
    console.error('Upgrade and notify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
