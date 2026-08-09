import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { 
  sendRfidTapVisitEmail, 
  sendFreeCoffeeEarnedEmail 
} from '../../../../../lib/email'

export async function POST(req) {
  try {
    const body = await req.json()
    const { rfid_code, location = 'Counter', is_manual = false } = body

    if (!rfid_code || typeof rfid_code !== 'string') {
      return NextResponse.json({ success: false, error: 'RFID code is required' }, { status: 400 })
    }

    const cleanCode = rfid_code.trim()

    // 1. Fetch member by RFID code, card_number, or phone
    const { data: members, error: fetchErr } = await supabase
      .from('members')
      .select('*')
      .or(`rfid_code.eq.${cleanCode},card_number.eq.${cleanCode},phone.eq.${cleanCode}`)
      .limit(1)

    const member = members && members.length > 0 ? members[0] : null

    if (fetchErr || !member) {
      return NextResponse.json({
        success: false,
        error: 'Member not found. Check RFID code, Card #, or Phone Number.'
      }, { status: 404 })
    }

    // 2. Check card status
    if (member.card_status && member.card_status !== 'active') {
      return NextResponse.json({
        success: false,
        error: `Card is ${member.card_status.toUpperCase()}. Please contact manager.`
      }, { status: 403 })
    }

    // 3. Check card expiration (12-month validity)
    if (member.card_expires_at && new Date(member.card_expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        error: `Card expired on ${new Date(member.card_expires_at).toLocaleDateString('en-GB')}. Please renew at counter.`
      }, { status: 403 })
    }

    // 3.5 Enforce 1 Punch Per Day Rule
    const { override_today_limit = false } = body
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfTodayISO = startOfToday.toISOString()

    const { data: todayVisits } = await supabase
      .from('member_visits')
      .select('id, visited_at')
      .eq('member_id', member.id)
      .gte('visited_at', startOfTodayISO)
      .limit(1)

    if (todayVisits && todayVisits.length > 0 && !override_today_limit) {
      const lastVisitTime = new Date(todayVisits[0].visited_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      return NextResponse.json({
        success: false,
        already_punched_today: true,
        error: `Visit already recorded for ${member.full_name} today at ${lastVisitTime}! Maximum 1 punch per day allowed.`
      }, { status: 429 })
    }

    // 4. Calculate new visit counts
    const newTotalVisits = (member.total_visits || 0) + 1
    let newPunchCount = (member.visit_punch_count || 0) + 1
    let newFreeCoffees = member.free_coffee_rewards_available || 0
    let rewardUnlocked = false

    if (newPunchCount >= 5) {
      newPunchCount = 0
      newFreeCoffees += 1
      rewardUnlocked = true
    }

    // 5. Update member record in DB
    const { error: updateErr } = await supabase
      .from('members')
      .update({
        total_visits: newTotalVisits,
        visit_punch_count: newPunchCount,
        punch_count: newPunchCount,
        free_coffee_rewards_available: newFreeCoffees
      })
      .eq('id', member.id)

    if (updateErr) {
      console.error('Member update error:', updateErr)
      return NextResponse.json({ success: false, error: 'Failed to record visit' }, { status: 500 })
    }

    // 6. Log visit in member_visits
    await supabase.from('member_visits').insert({
      member_id: member.id,
      visited_at: new Date().toISOString(),
      recorded_by: is_manual ? 'manager_manual' : 'rfid_tap',
      notes: `RFID Tap at ${location}`
    })

    // 7. Log tap event in member_rfid_taps
    await supabase.from('member_rfid_taps').insert({
      member_id: member.id,
      rfid_code: cleanCode,
      tapped_at: new Date().toISOString(),
      location,
      visit_number: newTotalVisits,
      reward_earned: rewardUnlocked
    })

    // 8. Dispatch Email Notifications asynchronously
    const updatedMemberObj = { ...member, total_visits: newTotalVisits }
    sendRfidTapVisitEmail(updatedMemberObj, newTotalVisits, newPunchCount, rewardUnlocked).catch(e => console.error(e))
    
    if (rewardUnlocked) {
      sendFreeCoffeeEarnedEmail(updatedMemberObj).catch(e => console.error(e))
    }

    // 9. Check Special Date Discounts (Birthdays / Anniversaries)
    let specialDateNotice = null
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    const { data: specialDates } = await supabase
      .from('member_special_dates')
      .select('*')
      .eq('member_id', member.id)
      .eq('month', currentMonth)
      .eq('day', currentDay)

    if (specialDates && specialDates.length > 0) {
      specialDateNotice = specialDates[0].occasion_name
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        full_name: member.full_name,
        card_number: member.card_number,
        tier: member.tier || 'silver',
        total_visits: newTotalVisits,
        visit_punch_count: newPunchCount,
        free_coffee_rewards_available: newFreeCoffees,
        card_expires_at: member.card_expires_at,
        lifetime_discount_percent: 10
      },
      visit_recorded: {
        total_visits: newTotalVisits,
        punch_count: newPunchCount,
        reward_unlocked: rewardUnlocked,
        free_coffees_available: newFreeCoffees,
        special_date_notice: specialDateNotice
      }
    })

  } catch (error) {
    console.error('RFID Tap processing error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
