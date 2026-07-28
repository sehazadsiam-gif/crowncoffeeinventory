import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { 
  sendRfidCardIssuedEmail, 
  sendRfidCardStatusEmail,
  sendRewardRedeemedEmail
} from '../../../../../lib/email'

export async function POST(req) {
  try {
    const body = await req.json()
    const { action, member_id, rfid_code, status, reason, reward_name, performed_by = 'admin' } = body

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 })
    }

    // 1. PAIR / ISSUE RFID CARD TO MEMBER
    if (action === 'pair') {
      if (!member_id || !rfid_code) {
        return NextResponse.json({ success: false, error: 'member_id and rfid_code are required' }, { status: 400 })
      }

      const cleanRfid = rfid_code.trim()

      // Check if rfid_code is already assigned to another member
      const { data: existing } = await supabase
        .from('members')
        .select('id, full_name')
        .eq('rfid_code', cleanRfid)
        .neq('id', member_id)
        .single()

      if (existing) {
        return NextResponse.json({
          success: false,
          error: `This RFID card is already assigned to ${existing.full_name}. Please deactivate it first.`
        }, { status: 400 })
      }

      // Check target member existing details
      const { data: targetMember } = await supabase
        .from('members')
        .select('*')
        .eq('id', member_id)
        .single()

      let generatedCardNumber = targetMember?.card_number
      if (!generatedCardNumber) {
        generatedCardNumber = `CC-MEM-${Math.floor(1000 + Math.random() * 9000)}`
      }

      // Calculate 24 months expiration from application/issuance date
      const now = new Date()
      const expiresAt = new Date(now.setMonth(now.getMonth() + 24)).toISOString()
      const issuedAt = new Date().toISOString()

      const { data: member, error: updateErr } = await supabase
        .from('members')
        .update({
          rfid_code: cleanRfid,
          card_number: generatedCardNumber,
          status: 'active',
          card_status: 'active',
          card_issued_at: issuedAt,
          card_expires_at: expiresAt
        })
        .eq('id', member_id)
        .select()
        .single()

      if (updateErr || !member) {
        return NextResponse.json({ success: false, error: updateErr?.message || 'Failed to update member' }, { status: 500 })
      }

      // Log in member_card_logs
      await supabase.from('member_card_logs').insert({
        member_id: member.id,
        card_number: member.card_number,
        rfid_code: cleanRfid,
        action: 'issued',
        reason: reason || 'Initial RFID Card Issuance',
        performed_by
      })

      // Send email
      sendRfidCardIssuedEmail(member, member.card_number, cleanRfid, expiresAt).catch(e => console.error(e))

      return NextResponse.json({
        success: true,
        message: 'RFID Card successfully paired and issued',
        member
      })
    }

    // 2. UPDATE CARD STATUS (active, lost, replaced, deactivated)
    if (action === 'update_status') {
      if (!member_id || !status) {
        return NextResponse.json({ success: false, error: 'member_id and status are required' }, { status: 400 })
      }

      const { data: member, error: updateErr } = await supabase
        .from('members')
        .update({ card_status: status })
        .eq('id', member_id)
        .select()
        .single()

      if (updateErr || !member) {
        return NextResponse.json({ success: false, error: 'Failed to update card status' }, { status: 500 })
      }

      // Log in member_card_logs
      await supabase.from('member_card_logs').insert({
        member_id: member.id,
        card_number: member.card_number,
        rfid_code: member.rfid_code,
        action: status,
        reason: reason || `Card status changed to ${status}`,
        performed_by
      })

      sendRfidCardStatusEmail(member, member.card_number, status, reason).catch(e => console.error(e))

      return NextResponse.json({
        success: true,
        message: `Card status updated to ${status}`,
        member
      })
    }

    // 3. REDEEM FREE COFFEE REWARD
    if (action === 'redeem_reward') {
      if (!member_id) {
        return NextResponse.json({ success: false, error: 'member_id is required' }, { status: 400 })
      }

      const { data: member } = await supabase
        .from('members')
        .select('*')
        .eq('id', member_id)
        .single()

      if (!member || (member.free_coffee_rewards_available || 0) <= 0) {
        return NextResponse.json({ success: false, error: 'No free coffee rewards available to redeem' }, { status: 400 })
      }

      const newRewardsCount = member.free_coffee_rewards_available - 1

      const { data: updatedMember, error: updateErr } = await supabase
        .from('members')
        .update({ free_coffee_rewards_available: newRewardsCount })
        .eq('id', member_id)
        .select()
        .single()

      if (updateErr) {
        return NextResponse.json({ success: false, error: 'Failed to redeem reward' }, { status: 500 })
      }

      sendRewardRedeemedEmail(member, reward_name || 'Free Coffee').catch(e => console.error(e))

      return NextResponse.json({
        success: true,
        message: 'Reward redeemed successfully',
        rewards_remaining: newRewardsCount,
        member: updatedMember
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid action parameter' }, { status: 400 })

  } catch (error) {
    console.error('RFID Manage error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const member_id = searchParams.get('member_id')

    let query = supabase.from('member_card_logs').select('*, members(full_name, email, card_number)').order('created_at', { ascending: false })

    if (member_id) {
      query = query.eq('member_id', member_id)
    }

    const { data: logs, error } = await query

    if (error) {
      console.warn('RFID card logs query notice:', error.message)
      return NextResponse.json({ success: true, logs: [] })
    }

    return NextResponse.json({ success: true, logs: logs || [] })

  } catch (error) {
    console.error('RFID GET Logs error:', error)
    return NextResponse.json({ success: true, logs: [] })
  }
}
