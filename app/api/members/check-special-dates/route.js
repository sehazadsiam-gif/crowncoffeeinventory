import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { sendSpecialDateEmail, sendAnniversaryEmail } from '../../../../lib/email'

/**
 * Set up daily cron at cron-job.org:
 * GET https://ccinventory.vercel.app/api/members/check-special-dates
 */

export async function GET() {
  try {
    const today = new Date()
    const todayMonth = today.getMonth() + 1
    const todayDay = today.getDate()

    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(today.getDate() + 3)
    const threeDaysMonth = threeDaysFromNow.getMonth() + 1
    const threeDaysDay = threeDaysFromNow.getDate()

    let sentCount = 0

    // 1. Check Special Dates (Birthday, Anniversary etc.)
    const { data: specialDates, error: sdError } = await supabase
      .from('member_special_dates')
      .select(`
        *,
        members!inner (
          full_name,
          email,
          card_number,
          status
        )
      `)
      .eq('members.status', 'active')
      .or(`and(month.eq.${todayMonth},day.eq.${todayDay}),and(month.eq.${threeDaysMonth},day.eq.${threeDaysDay})`)

    if (sdError) throw sdError

    const currentYear = today.getFullYear()

    for (const sd of specialDates) {
      const isToday = sd.month === todayMonth && sd.day === todayDay
      const daysUntil = isToday ? 0 : 3

      // Check if already sent this year
      const { data: existing } = await supabase
        .from('member_notifications')
        .select('id')
        .eq('member_id', sd.member_id)
        .eq('type', 'special_date')
        .eq('subject', sd.occasion_name)
        .gte('sent_at', `${currentYear}-01-01`)
        .single()

      if (!existing) {
        await sendSpecialDateEmail({
          to: sd.members.email,
          name: sd.members.full_name,
          card_number: sd.members.card_number,
          occasion_name: sd.occasion_name,
          days_until: daysUntil
        })

        await supabase.from('member_notifications').insert([{
          member_id: sd.member_id,
          type: 'special_date',
          subject: sd.occasion_name,
          message: `${daysUntil === 0 ? 'Today' : '3 days until'} ${sd.occasion_name}`
        }])
        sentCount++
      }
    }

    // 2. Check Membership Anniversary
    const { data: anniversaries, error: annError } = await supabase
      .from('members')
      .select('id, full_name, email, card_number, member_since')
      .eq('status', 'active')
      .not('member_since', 'is', null)

    if (annError) throw annError

    for (const m of anniversaries) {
      const since = new Date(m.member_since)
      if (since.getMonth() + 1 === todayMonth && since.getDate() === todayDay) {
        const years = currentYear - since.getFullYear()
        if (years > 0) {
          // Check if already sent this year
          const { data: existing } = await supabase
            .from('member_notifications')
            .select('id')
            .eq('member_id', m.id)
            .eq('type', 'anniversary')
            .gte('sent_at', `${currentYear}-01-01`)
            .single()

          if (!existing) {
            await sendAnniversaryEmail({
              to: m.email,
              name: m.full_name,
              card_number: m.card_number,
              years
            })

            await supabase.from('member_notifications').insert([{
              member_id: m.id,
              type: 'anniversary',
              subject: 'Membership Anniversary',
              message: `${years} year(s) anniversary`
            }])
            sentCount++
          }
        }
      }
    }

    return NextResponse.json({ success: true, sent: sentCount })
  } catch (error) {
    console.error('Check special dates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
