'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function MemberViewPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [rfidInput, setRfidInput] = useState('')
  const [membersList, setMembersList] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('tap') // 'tap', 'directory'

  // USB Barcode/RFID scanner listener
  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    const handleKeyDown = (e) => {
      // Ignore if user is typing in search input
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return

      const currentTime = Date.now()
      if (currentTime - lastKeyTime > 100) buffer = ''
      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        if (buffer.trim()) {
          handleRfidTap(buffer.trim())
          buffer = ''
        }
      } else if (e.key.length === 1) {
        buffer += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members/list')
      const data = await res.json()
      if (data.success) {
        setMembersList(data.members || [])
      }
    } catch (err) {
      console.error('Fetch members list error:', err)
    }
  }

  const handleRfidTap = async (code) => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/members/rfid/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid_code: code, location: 'Manager Counter' })
      })

      const data = await res.json()

      if (data.success) {
        setSelectedMember(data.member)
        setMessage(`Visit Recorded for ${data.member.full_name}. Visit #${data.member.total_visits}`)
      } else {
        setMessage(`Notice: ${data.error}`)
      }
    } catch (err) {
      setMessage('Error scanning RFID card')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const found = membersList.find(m => 
      (m.full_name && m.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.phone && m.phone.includes(searchQuery)) ||
      (m.card_number && m.card_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.rfid_code && m.rfid_code.includes(searchQuery))
    )

    if (found) {
      setSelectedMember(found)
      setMessage(`Found member: ${found.full_name}`)
    } else {
      setMessage('No matching member found')
    }
  }

  const handleRedeemReward = async (memberId, rewardTitle) => {
    setLoading(true)
    try {
      const res = await fetch('/api/members/rfid/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redeem_reward',
          member_id: memberId,
          reward_name: rewardTitle
        })
      })

      const data = await res.json()
      if (data.success) {
        setSelectedMember(prev => ({
          ...prev,
          free_coffee_rewards_available: data.rewards_remaining
        }))
        setMessage(`Reward "${rewardTitle}" redeemed successfully for member/guest!`)
        fetchMembers()
      } else {
        setMessage(`Redemption error: ${data.error}`)
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
      backgroundColor: '#F8F9FA',
      color: '#1C1917',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      {/* Top Navbar */}
      <header style={{
        backgroundColor: '#1E110A',
        color: '#FFFFFF',
        padding: '16px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#D4AF37' }}>
            Crown Coffee Counter Manager
          </h1>
          <span style={{
            fontSize: '12px',
            backgroundColor: '#382215',
            color: '#E0C870',
            padding: '4px 10px',
            borderRadius: '12px',
            fontWeight: 700
          }}>
            Member Operations
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href="/guestview"
            target="_blank"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#382215',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 700
            }}
          >
            Open Customer Display →
          </Link>
          <Link
            href="/admin/memberview"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#D4AF37',
              color: '#100803',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 800
            }}
          >
            Admin Studio →
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 20px' }}>

        {/* Feedback Alert Message */}
        {message && (
          <div style={{
            padding: '14px 20px',
            borderRadius: '10px',
            backgroundColor: message.includes('Notice') || message.includes('error') ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${message.includes('Notice') || message.includes('error') ? '#FCA5A5' : '#86EFAC'}`,
            color: message.includes('Notice') || message.includes('error') ? '#991B1B' : '#166534',
            fontWeight: 700,
            fontSize: '14px',
            marginBottom: '24px'
          }}>
            {message}
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('tap')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'tap' ? '#1E110A' : '#E7E5E4',
              color: activeTab === 'tap' ? '#FFFFFF' : '#44403C',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Live RFID Tap & Quick Punch
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'directory' ? '#1E110A' : '#E7E5E4',
              color: activeTab === 'directory' ? '#FFFFFF' : '#44403C',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Member Directory ({membersList.length})
          </button>
        </div>

        {activeTab === 'tap' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

            {/* Left Panel: Search / RFID Scanner Input */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              border: '1px solid #E7E5E4'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginTop: 0, marginBottom: '16px' }}>
                Member RFID Scan / Search
              </h2>

              <div style={{
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontWeight: 800, color: '#92400E', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Hardware RFID Listener Active
                </div>
                <div style={{ fontSize: '13px', color: '#78350F' }}>
                  Tap physical Member RFID card on reader anytime, or enter code below.
                </div>
              </div>

              {/* Manual RFID Code Test */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#78716C', display: 'block', marginBottom: '6px' }}>
                  Manual RFID Code Input
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={rfidInput}
                    onChange={(e) => setRfidInput(e.target.value)}
                    placeholder="Enter scanned RFID digits..."
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => {
                      if (rfidInput.trim()) {
                        handleRfidTap(rfidInput.trim())
                        setRfidInput('')
                      }
                    }}
                    disabled={loading}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#1E110A',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Tap Card
                  </button>
                </div>
              </div>

              {/* Search Member by Name / Phone */}
              <form onSubmit={handleManualSearch}>
                <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#78716C', display: 'block', marginBottom: '6px' }}>
                  Lookup Member by Name / Phone / Card #
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, phone, or card #..."
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      backgroundColor: '#F5F5F4',
                      color: '#1C1917',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>

            {/* Right Panel: Selected Member Profile & Actions */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              border: '1px solid #E7E5E4'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginTop: 0, marginBottom: '16px' }}>
                Active Member Overview
              </h2>

              {selectedMember ? (
                <div>
                  {/* Member Card Banner */}
                  <div style={{
                    backgroundColor: '#1E110A',
                    color: '#FFFFFF',
                    borderRadius: '14px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: 900 }}>{selectedMember.full_name}</div>
                        <div style={{ fontSize: '13px', color: '#D4AF37', fontFamily: 'monospace', marginTop: '2px' }}>
                          {selectedMember.card_number || 'CC-MEM'}
                        </div>
                      </div>
                      <span style={{
                        backgroundColor: selectedMember.card_status === 'active' ? '#15803D' : '#B91C1C',
                        color: '#FFF',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        textTransform: 'uppercase'
                      }}>
                        {selectedMember.card_status || 'Active'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', borderTop: '1px solid #382215', paddingTop: '12px', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#A8A29E' }}>Validity:</span>{' '}
                        <strong>
                          {selectedMember.card_expires_at 
                            ? new Date(selectedMember.card_expires_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                            : '36 Months'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#A8A29E' }}>Discount:</span>{' '}
                        <strong style={{ color: '#86EFAC' }}>10% Lifetime</strong>
                      </div>
                    </div>
                  </div>

                  {/* Visit Punch Counter & Free Coffees Available */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div style={{
                      backgroundColor: '#F5F5F4',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>
                        Total Visits
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#1C1917' }}>
                        {selectedMember.total_visits || 0}
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
                        Free Coffees Unlocked
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#78350F' }}>
                        {selectedMember.free_coffee_rewards_available || 0}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      onClick={() => handleRfidTap(selectedMember.rfid_code || selectedMember.card_number || 'manual')}
                      disabled={loading}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#1E110A',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Record Visit Punch for {selectedMember.full_name}
                    </button>

                    <button
                      onClick={() => handleRedeemReward(selectedMember.id, 'Free Coffee')}
                      disabled={loading || (selectedMember.free_coffee_rewards_available || 0) <= 0}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: (selectedMember.free_coffee_rewards_available || 0) > 0 ? '#15803D' : '#E7E5E4',
                        color: (selectedMember.free_coffee_rewards_available || 0) > 0 ? '#FFFFFF' : '#A8A29E',
                        fontWeight: 800,
                        fontSize: '14px',
                        cursor: (selectedMember.free_coffee_rewards_available || 0) > 0 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {(selectedMember.free_coffee_rewards_available || 0) > 0 
                        ? 'Redeem 1 Free Coffee (For Member or Guest)' 
                        : 'No Free Coffee Rewards Available'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#78716C',
                  fontSize: '14px',
                  backgroundColor: '#F5F5F4',
                  borderRadius: '12px'
                }}>
                  No member selected. Tap an RFID card or search above to load member details.
                </div>
              )}
            </div>

          </div>
        )}

        {/* Directory Tab */}
        {activeTab === 'directory' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid #E7E5E4'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginTop: 0, marginBottom: '16px' }}>
              All Registered Cafe Members
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F5F5F4', textAlign: 'left', color: '#78716C' }}>
                    <th style={{ padding: '12px' }}>Member Name</th>
                    <th style={{ padding: '12px' }}>Card #</th>
                    <th style={{ padding: '12px' }}>RFID Code</th>
                    <th style={{ padding: '12px' }}>Total Visits</th>
                    <th style={{ padding: '12px' }}>Punches</th>
                    <th style={{ padding: '12px' }}>Free Coffees</th>
                    <th style={{ padding: '12px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {membersList.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #E7E5E4' }}>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{m.full_name}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace' }}>{m.card_number || '-'}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace' }}>{m.rfid_code || 'Unassigned'}</td>
                      <td style={{ padding: '12px', fontWeight: 800 }}>{m.total_visits || 0}</td>
                      <td style={{ padding: '12px' }}>{m.visit_punch_count || 0}/5</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: (m.free_coffee_rewards_available || 0) > 0 ? '#15803D' : 'inherit' }}>
                        {m.free_coffee_rewards_available || 0}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => {
                            setSelectedMember(m)
                            setActiveTab('tap')
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #D6D3D1',
                            backgroundColor: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
