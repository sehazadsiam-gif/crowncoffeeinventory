'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getMemberCycleReward } from '../../lib/membership-rewards'

export default function MemberProgressViewPage() {
  const [rfidInput, setRfidInput] = useState('')
  const [activeMember, setActiveMember] = useState(null)
  const [tapHistory, setTapHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dailyVisits, setDailyVisits] = useState([])

  useEffect(() => {
    fetchTodayTaps()
    fetchVisitsByDate(selectedDate)
  }, [selectedDate])

  const fetchTodayTaps = async () => {
    try {
      const res = await fetch('/api/members/rfid/manage')
      const data = await res.json()
      if (data.success) {
        setTapHistory(data.logs || [])
      }
    } catch (err) {
      console.error('Error fetching taps:', err)
    }
  }

  const fetchVisitsByDate = async (dateStr) => {
    try {
      const res = await fetch(`/api/members/visits/list?date=${dateStr}`)
      const data = await res.json()
      if (data.success) {
        setDailyVisits(data.visits || [])
      }
    } catch (err) {
      console.error('Error fetching daily visits:', err)
    }
  }

  const handleManualRfidTap = async (e, override = false) => {
    if (e) e.preventDefault()
    if (!rfidInput.trim()) return

    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/members/rfid/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid_code: rfidInput.trim(), override_today_limit: override })
      })

      const data = await res.json()
      if (data.success && data.member) {
        setActiveMember(data.member)
        setMessage(`Visit #${data.member.total_visits} recorded for ${data.member.full_name}! Customer notified via email.`)
        setRfidInput('')
        fetchTodayTaps()
        fetchVisitsByDate(selectedDate)
      } else {
        setMessage(`${data.error || 'RFID Tag not found'}`)
      }
    } catch (err) {
      setMessage('Failed to process RFID tap')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeemReward = async (memberId) => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/members/rfid/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redeem_coffee',
          member_id: memberId
        })
      })

      const data = await res.json()
      if (data.success && data.member) {
        setActiveMember(data.member)
        setMessage(`Free Coffee reward redeemed for ${data.member.full_name}! Remaining rewards: ${data.member.free_coffee_rewards_available || 0}`)
        fetchTodayTaps()
      } else {
        setMessage(`Redeem Error: ${data.error}`)
      }
    } catch (err) {
      setMessage('Failed to redeem reward')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#120A06',
      color: '#FFFFFF',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '24px'
    }}>
      
      {/* Top Header */}
      <header style={{
        maxWidth: '1100px',
        margin: '0 auto 28px auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #2C180E',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#D4AF37', margin: 0 }}>
            Crown Coffee Member Progress Terminal
          </h1>
          <p style={{ fontSize: '13px', color: '#A89284', margin: '4px 0 0 0' }}>
            Manager View — ccadmin.online/memberprogressview
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href="/admin/managemember"
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              backgroundColor: '#382215',
              color: '#E0C870',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 800
            }}
          >
            Admin Manage Members →
          </Link>
        </div>
      </header>

      {/* Container */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '380px 1fr', gap: '28px' }}>
        
        {/* Left Side: RFID Scanner Input */}
        <div style={{
          backgroundColor: '#1E110A',
          padding: '28px',
          borderRadius: '16px',
          border: '1px solid #382215'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginTop: 0, color: '#F3EAD8' }}>
            Tap Card or Manual Entry
          </h2>
          <p style={{ fontSize: '12px', color: '#A89284', marginBottom: '20px' }}>
            Member taps RFID card at reader. If card fails, type RFID code, Card # (CC-MEM-XXXX), or Phone #.
          </p>

          <form onSubmit={handleManualRfidTap} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                RFID Code / Card # / Phone # Input
              </label>
              <input
                type="text"
                value={rfidInput}
                onChange={(e) => setRfidInput(e.target.value)}
                placeholder="Scan RFID or type Card # / Phone #..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: '#120A06',
                  border: '1px solid #4A2810',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#D4AF37',
                color: '#120A06',
                fontSize: '14px',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              {loading ? 'Processing Visit Tap...' : 'Record Visit Punch →'}
            </button>
          </form>

          {message && (
            <div style={{
              marginTop: '20px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: message.includes('Error') ? '#3B1212' : '#14381C',
              border: `1px solid ${message.includes('Error') ? '#7F1D1D' : '#15803D'}`,
              color: message.includes('Error') ? '#FCA5A5' : '#86EFAC',
              fontSize: '13px',
              fontWeight: 700
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Right Side: Tapped Member Progress Card Display */}
        <div>
          {activeMember ? (
            <div style={{
              backgroundColor: '#1E110A',
              padding: '32px',
              borderRadius: '16px',
              border: '1px solid #4A2810'
            }}>
              {/* Member Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Active Member Profile
                  </div>
                  <h2 style={{ fontSize: '26px', fontWeight: 900, margin: '4px 0 0 0', color: '#FFFFFF' }}>
                    {activeMember.full_name}
                  </h2>
                  <div style={{ fontSize: '14px', color: '#A89284', fontFamily: 'monospace', marginTop: '2px' }}>
                    {activeMember.card_number} • RFID: {activeMember.rfid_code || 'Encoded'}
                  </div>
                </div>

                <div style={{
                  padding: '6px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#2E1A0F',
                  border: '1px solid #5A331B',
                  color: '#E0C870',
                  fontSize: '12px',
                  fontWeight: 800
                }}>
                  {activeMember.tier || 'VIP MEMBER'}
                </div>
              </div>

              {/* Perks Badge Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                <div style={{ backgroundColor: '#120A06', padding: '16px', borderRadius: '12px', border: '1px solid #2C180E', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#A89284', fontWeight: 700, textTransform: 'uppercase' }}>Total Visits</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#D4AF37', marginTop: '2px' }}>
                    #{activeMember.total_visits || 0}
                  </div>
                </div>

                <div style={{ backgroundColor: '#120A06', padding: '16px', borderRadius: '12px', border: '1px solid #2C180E', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#A89284', fontWeight: 700, textTransform: 'uppercase' }}>Lifetime Discount</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#4ADE80', marginTop: '6px' }}>
                    10% OFF
                  </div>
                </div>

                <div style={{ backgroundColor: '#120A06', padding: '16px', borderRadius: '12px', border: '1px solid #2C180E', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#A89284', fontWeight: 700, textTransform: 'uppercase' }}>Card Expiry (24M)</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#E2E8F0', marginTop: '8px' }}>
                    {activeMember.card_expires_at 
                      ? new Date(activeMember.card_expires_at).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })
                      : '24 Months'}
                  </div>
                </div>
              </div>

              {/* 5-Visit Auto-Rotating Reward Cycle Roadmap */}
              {(() => {
                const currentReward = getMemberCycleReward(activeMember.total_visits || 1)
                return (
                  <div style={{
                    backgroundColor: '#120A06',
                    padding: '24px',
                    borderRadius: '14px',
                    border: '1px solid #4A2810',
                    marginBottom: '28px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#F3EAD8' }}>
                          5-Visit Reward Cycle Roadmap (Cycle #{currentReward.cycleNumber})
                        </span>
                        <div style={{ fontSize: '12px', color: '#D4AF37', marginTop: '2px', fontWeight: 700 }}>
                          Current Visit: #{currentReward.total_visits} (Step {currentReward.visitInCycle} of 5) — {currentReward.rewardTitle}
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#86EFAC', background: '#064E3B', padding: '4px 10px', borderRadius: '8px' }}>
                        Auto-Rotates Every 5 Visits
                      </span>
                    </div>

                    {/* 5-Step Visual Roadmap Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '16px' }}>
                      {currentReward.roadmap.map(r => (
                        <div
                          key={r.step}
                          style={{
                            padding: '12px 8px',
                            borderRadius: '10px',
                            backgroundColor: r.isCurrent ? '#D4AF37' : r.step < currentReward.visitInCycle ? '#2E1A0F' : '#1E110A',
                            color: r.isCurrent ? '#120A06' : r.step < currentReward.visitInCycle ? '#A89284' : '#6B4E3D',
                            border: r.isCurrent ? '2px solid #FFF' : '1px solid #382215',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', opacity: 0.8 }}>
                            Visit {r.step} {r.isCurrent ? '★ TODAY' : ''}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 900, marginTop: '4px' }}>
                            {r.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Free Coffee Reward Redemption Box */}
              <div style={{
                backgroundColor: '#2A180C',
                padding: '20px 24px',
                borderRadius: '14px',
                border: '1px solid #6E4022',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#FFFFFF' }}>
                    Free Coffee Rewards Available: {activeMember.free_coffee_rewards_available || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#C4A897', marginTop: '2px' }}>
                    Member or guest companion can claim 1 free coffee.
                  </div>
                </div>

                <button
                  onClick={() => handleRedeemReward(activeMember.id)}
                  disabled={(activeMember.free_coffee_rewards_available || 0) <= 0 || loading}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: (activeMember.free_coffee_rewards_available || 0) > 0 ? '#4ADE80' : '#47362B',
                    color: (activeMember.free_coffee_rewards_available || 0) > 0 ? '#052E16' : '#8C7465',
                    fontSize: '13px',
                    fontWeight: 900,
                    cursor: (activeMember.free_coffee_rewards_available || 0) > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  Redeem 1 Free Coffee
                </button>
              </div>

            </div>
          ) : (
            <div style={{
              backgroundColor: '#1E110A',
              padding: '60px',
              borderRadius: '16px',
              border: '1px solid #382215',
              textAlign: 'center',
              color: '#8C7465'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37', marginBottom: '8px' }}>
                Waiting for Member Card Scan...
              </div>
              <div>Tap member card on the reader to view progress and redeem perks.</div>
            </div>
          )}
        </div>

      </div>

      {/* Daily Member Visits Log */}
      <div style={{ maxWidth: '1100px', margin: '32px auto 0 auto', backgroundColor: '#1E110A', padding: '28px', borderRadius: '16px', border: '1px solid #382215' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#F3EAD8' }}>
              Daily Member Visits Log ({dailyVisits.length} Visits)
            </h2>
            <p style={{ fontSize: '12px', color: '#A89284', margin: '4px 0 0 0' }}>
              Select a date to view members who visited on that specific day.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#D4AF37' }}>Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#120A06',
                border: '1px solid #4A2810',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#F3EAD8' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #382215', textAlign: 'left', color: '#D4AF37' }}>
                <th style={{ padding: '12px' }}>Visit Time</th>
                <th style={{ padding: '12px' }}>Member Name</th>
                <th style={{ padding: '12px' }}>Card Number</th>
                <th style={{ padding: '12px' }}>Phone</th>
                <th style={{ padding: '12px' }}>Punches</th>
                <th style={{ padding: '12px' }}>Total Visits</th>
                <th style={{ padding: '12px' }}>Recorded Via</th>
              </tr>
            </thead>
            <tbody>
              {dailyVisits.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #2B180C' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#E0C870', fontWeight: 700 }}>
                    {new Date(v.visited_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#FFFFFF' }}>
                    {v.members?.full_name || 'Member'}
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#D4AF37' }}>
                    {v.members?.card_number || '-'}
                  </td>
                  <td style={{ padding: '12px', color: '#A89284' }}>{v.members?.phone || '-'}</td>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#4ADE80' }}>
                    {v.members?.visit_punch_count || 0}/5
                  </td>
                  <td style={{ padding: '12px', fontWeight: 800 }}>#{v.members?.total_visits || 0}</td>
                  <td style={{ padding: '12px', fontSize: '11px', textTransform: 'uppercase', color: '#A89284' }}>
                    {v.recorded_by || 'RFID Tap'}
                  </td>
                </tr>
              ))}
              {dailyVisits.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#A89284' }}>
                    No member visits recorded for {selectedDate}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
