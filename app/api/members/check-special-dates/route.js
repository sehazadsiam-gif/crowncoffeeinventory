import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { sendSpecialDateEmail, sendAnniversaryEmail } from '../../../../lib/email'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    // 0. Secret key check
    if (key !== 'cc2026cron') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Get today's date
    const today = new Date()
    const todayMonth = today.getMonth() + 1
    const todayDay = today.getDate()

    // 2. Get date 3 days from now
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(today.getDate() + 3)
    const threeDaysMonth = threeDaysFromNow.getMonth() + 1
    const threeDaysDay = threeDaysFromNow.getDate()

    let sentCount = 0
    const currentYear = today.getFullYear()

    // 3. Query active member special dates matching today or 3 days from now
    const { data: specialDates, error: sdError } = await supabase
      .from('member_special_dates')
      .select(`
        *,
        members!inner (
          id,
          full_name,
          email,
          card_number,
          status
        )
      `)
      .eq('members.status', 'active')
      .or(`and(month.eq.${todayMonth},day.eq.${todayDay}),and(month.eq.${threeDaysMonth},day.eq.${threeDaysDay})`)

    if (sdError) throw sdError

    // 4. For each special date: Check not already sent this year
    for (const sd of specialDates) {
      const isToday = sd.month === todayMonth && sd.day === todayDay
      const daysUntil = isToday ? 0 : 3

      const { data: existing } = await supabase
        .from('member_notifications')
        .select('id')
        .eq('member_id', sd.members.id)
        .eq('type', 'special_date')
        .eq('subject', sd.occasion_name)
        .eq('message', `${currentYear}`)
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
          member_id: sd.members.id,
          type: 'special_date',
          subject: sd.occasion_name,
          message: `${currentYear}`
        }])
        sentCount++
      }
    }

    // 5. Check active member anniversaries
    const { data: members, error: annError } = await supabase
      .from('members')
      .select('id, full_name, email, card_number, member_since')
      .eq('status', 'active')
      .not('member_since', 'is', null)

    if (annError) throw annError

    for (const m of members) {
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
            .eq('message', `${currentYear}`)
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
              message: `${currentYear}`
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
