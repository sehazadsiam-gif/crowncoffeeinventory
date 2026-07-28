'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AdminMemberViewPage() {
  const [members, setMembers] = useState([])
  const [cardLogs, setCardLogs] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [rfidInput, setRfidInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('studio') // 'studio', 'pair', 'logs'
  const [cardTheme, setCardTheme] = useState('dark') // 'dark', 'gold', 'silver'

  useEffect(() => {
    fetchMembers()
    fetchLogs()
  }, [])

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members/list')
      const data = await res.json()
      if (data.success) {
        setMembers(data.members || [])
        if (data.members && data.members.length > 0 && !selectedMember) {
          setSelectedMember(data.members[0])
        }
      }
    } catch (err) {
      console.error('Error fetching members:', err)
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/members/rfid/manage')
      const data = await res.json()
      if (data.success) {
        setCardLogs(data.logs || [])
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
    }
  }

  const handlePairCard = async (e) => {
    e.preventDefault()
    if (!selectedMember || !rfidInput.trim()) {
      setMessage('Please select a member and enter an RFID card code.')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/members/rfid/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pair',
          member_id: selectedMember.id,
          rfid_code: rfidInput.trim(),
          reason: 'Paired via Admin Studio'
        })
      })

      const data = await res.json()
      if (data.success) {
        setMessage(`RFID Card successfully paired and issued to ${selectedMember.full_name}! Valid for 36 months.`)
        setRfidInput('')
        fetchMembers()
        fetchLogs()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (err) {
      setMessage('Failed to pair RFID card')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (memberId, status, reasonText) => {
    setLoading(true)
    try {
      const res = await fetch('/api/members/rfid/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          member_id: memberId,
          status,
          reason: reasonText || `Card marked as ${status}`
        })
      })

      const data = await res.json()
      if (data.success) {
        setMessage(`Card status updated to ${status.toUpperCase()}`)
        fetchMembers()
        fetchLogs()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (err) {
      setMessage('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getThemeStyles = () => {
    if (cardTheme === 'gold') {
      return {
        bg: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)',
        textColor: '#2A1800',
        subColor: '#4A3200',
        borderColor: '#AA771C'
      }
    }
    if (cardTheme === 'silver') {
      return {
        bg: 'linear-gradient(135deg, #E0E0E0 0%, #F5F5F5 30%, #BDBDBD 60%, #EEEEEE 100%)',
        textColor: '#1A1A1A',
        subColor: '#424242',
        borderColor: '#9E9E9E'
      }
    }
    // Dark Espresso theme (default)
    return {
      bg: 'linear-gradient(135deg, #1A0D07 0%, #3B2012 50%, #150A05 100%)',
      textColor: '#FFFFFF',
      subColor: '#D4AF37',
      borderColor: '#4A2810'
    }
  }

  const activeTheme = getThemeStyles()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F4',
      color: '#1C1917',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      {/* Hide controls when printing PVC card */}
      <style>{`
        @media print {
          body { background: white !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-area { margin: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      {/* Top Navbar */}
      <header className="no-print" style={{
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
            Crown Coffee Admin Member Hub
          </h1>
          <span style={{
            fontSize: '12px',
            backgroundColor: '#382215',
            color: '#E0C870',
            padding: '4px 10px',
            borderRadius: '12px',
            fontWeight: 700
          }}>
            RFID & Plastic ID Card Studio
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href="/memberview"
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
            Counter Manager View →
          </Link>
          <Link
            href="/guestview"
            target="_blank"
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
            Customer Kiosk →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="no-print" style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 20px' }}>

        {/* Feedback Alert Message */}
        {message && (
          <div style={{
            padding: '14px 20px',
            borderRadius: '10px',
            backgroundColor: message.includes('Error') ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${message.includes('Error') ? '#FCA5A5' : '#86EFAC'}`,
            color: message.includes('Error') ? '#991B1B' : '#166534',
            fontWeight: 700,
            fontSize: '14px',
            marginBottom: '24px'
          }}>
            {message}
          </div>
        )}

        {/* Global Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E7E5E4', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Total Members</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#1C1917', marginTop: '4px' }}>{members.length}</div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E7E5E4', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Active RFID Cards</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#15803D', marginTop: '4px' }}>
              {members.filter(m => m.rfid_code && m.card_status === 'active').length}
            </div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E7E5E4', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Cards Issued / Replaced</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#1E110A', marginTop: '4px' }}>{cardLogs.length}</div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E7E5E4', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Card Validity</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#D4AF37', marginTop: '4px' }}>36 Months</div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('studio')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'studio' ? '#1E110A' : '#E7E5E4',
              color: activeTab === 'studio' ? '#FFFFFF' : '#44403C',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Credit-Card ID Studio & Print
          </button>
          <button
            onClick={() => setActiveTab('pair')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'pair' ? '#1E110A' : '#E7E5E4',
              color: activeTab === 'pair' ? '#FFFFFF' : '#44403C',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Pair / Encode RFID Card
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'logs' ? '#1E110A' : '#E7E5E4',
              color: activeTab === 'logs' ? '#FFFFFF' : '#44403C',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Card Status Audit Logs ({cardLogs.length})
          </button>
        </div>

        {/* TAB 1: ID CARD STUDIO & PRINT PREVIEW */}
        {activeTab === 'studio' && (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>
            
            {/* Member Selection Panel */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E7E5E4' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginTop: 0, marginBottom: '16px' }}>Select Member</h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '6px' }}>Member Profile</label>
                <select
                  value={selectedMember?.id || ''}
                  onChange={(e) => {
                    const m = members.find(item => item.id === e.target.value)
                    if (m) setSelectedMember(m)
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px', outline: 'none' }}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.status === 'pending' ? 'Pending Application' : m.card_number || 'CC-MEM'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Theme Customizer */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '8px' }}>Plastic Card Theme</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {['dark', 'gold', 'silver'].map(t => (
                    <button
                      key={t}
                      onClick={() => setCardTheme(t)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '6px',
                        border: cardTheme === t ? '2px solid #1E110A' : '1px solid #D6D3D1',
                        backgroundColor: t === 'gold' ? '#EAB308' : t === 'silver' ? '#E5E7EB' : '#1C1917',
                        color: t === 'dark' ? '#FFF' : '#000',
                        fontSize: '12px',
                        fontWeight: 800,
                        textTransform: 'capitalize',
                        cursor: 'pointer'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handlePrint}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#1E110A',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Print Plastic Card (CR80)
              </button>
            </div>

            {/* CR80 Plastic Card Visual Preview */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E7E5E4' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginTop: 0, marginBottom: '20px' }}>
                CR80 Plastic ID Card Preview (85.6mm x 53.98mm)
              </h3>

              {selectedMember ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', alignItems: 'center' }}>
                  
                  {/* FRONT SIDE OF CARD */}
                  <div className="print-area" style={{
                    width: '337px', // Exact CR80 proportion ratio in pixels (85.6mm * 3.937)
                    height: '212px', // (53.98mm * 3.937)
                    borderRadius: '14px',
                    background: activeTheme.bg,
                    color: activeTheme.textColor,
                    padding: '20px 24px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                    border: `1px solid ${activeTheme.borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    {/* Top Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}>CROWN COFFEE</div>
                        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1.5px', color: activeTheme.subColor, fontWeight: 700 }}>
                          Official Membership Card
                        </div>
                      </div>
                      <div style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        border: `1px solid ${activeTheme.subColor}`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        color: activeTheme.subColor
                      }}>
                        {selectedMember.tier || 'VIP MEMBER'}
                      </div>
                    </div>

                    {/* RFID Chip Mock / Microchip Icon */}
                    <div style={{
                      width: '38px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #FFE082 0%, #FFB300 100%)',
                      border: '1px solid #D4AF37',
                      position: 'relative'
                    }} />

                    {/* Member Details */}
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {selectedMember.full_name}
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        marginTop: '4px'
                      }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1.5px' }}>
                          {selectedMember.card_number || 'CC-MEM-8042'}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: activeTheme.subColor }}>
                          EXP:{' '}
                          {selectedMember.card_expires_at 
                            ? new Date(selectedMember.card_expires_at).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })
                            : '36/MOS'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BACK SIDE OF CARD */}
                  <div className="print-area" style={{
                    width: '337px',
                    height: '212px',
                    borderRadius: '14px',
                    background: activeTheme.bg,
                    color: activeTheme.textColor,
                    boxSizing: 'border-box',
                    position: 'relative',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                    border: `1px solid ${activeTheme.borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    {/* Magnetic Stripe Bar */}
                    <div style={{ width: '100%', height: '36px', backgroundColor: '#111', marginTop: '16px' }} />

                    {/* Back Text & Terms */}
                    <div style={{ padding: '0 24px 16px 24px', fontSize: '9px', lineHeight: '1.4', color: activeTheme.subColor }}>
                      <div>- This card is the property of Crown Coffee.</div>
                      <div>- Tap card at counter to enjoy 10% lifetime discount & earn 5-visit rewards.</div>
                      <div>- Non-transferable. Valid for 36 months from issue date.</div>
                      <div style={{ marginTop: '6px', fontWeight: 800, color: activeTheme.textColor }}>
                        RFID Code: {selectedMember.rfid_code || 'Encoded'}
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div>No member selected</div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: PAIR / ENCODE RFID CARD */}
        {activeTab === 'pair' && (
          <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E7E5E4' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: 0, marginBottom: '16px' }}>
              Pair Physical RFID Tag with Member Profile
            </h3>

            <form onSubmit={handlePairCard} style={{ maxWidth: '500px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '6px' }}>Select Member</label>
                <select
                  value={selectedMember?.id || ''}
                  onChange={(e) => {
                    const m = members.find(item => item.id === e.target.value)
                    if (m) setSelectedMember(m)
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px' }}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.phone}) - RFID: {m.rfid_code || 'Unassigned'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '6px' }}>
                  Tap Physical RFID Card on Scanner or Type Digits
                </label>
                <input
                  type="text"
                  value={rfidInput}
                  onChange={(e) => setRfidInput(e.target.value)}
                  placeholder="Scan physical RFID card tag..."
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px' }}
                />
                <span style={{ fontSize: '12px', color: '#78716C', marginTop: '4px', display: 'block' }}>
                  Pairing will automatically activate card and calculate 36-month validity (`card_expires_at`).
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#1E110A',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Pairing Card...' : 'Pair & Issue RFID Card'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: AUDIT LOGS & STATUS REPLACEMENT HISTORY */}
        {activeTab === 'logs' && (
          <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E7E5E4' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: 0, marginBottom: '16px' }}>
              Card Issuance & Replacement Audit Logs
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F5F5F4', textAlign: 'left', color: '#78716C' }}>
                    <th style={{ padding: '12px' }}>Timestamp</th>
                    <th style={{ padding: '12px' }}>Member</th>
                    <th style={{ padding: '12px' }}>Card #</th>
                    <th style={{ padding: '12px' }}>RFID Code</th>
                    <th style={{ padding: '12px' }}>Action</th>
                    <th style={{ padding: '12px' }}>Reason / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cardLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #E7E5E4' }}>
                      <td style={{ padding: '12px', color: '#78716C', fontSize: '12px' }}>
                        {new Date(log.created_at).toLocaleString('en-GB')}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>
                        {log.members?.full_name || 'Member'}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace' }}>{log.card_number || '-'}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace' }}>{log.rfid_code || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          backgroundColor: log.action === 'issued' ? '#DCFCE7' : log.action === 'lost' ? '#FEE2E2' : '#FEF3C7',
                          color: log.action === 'issued' ? '#15803D' : log.action === 'lost' ? '#991B1B' : '#92400E'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#57534E' }}>{log.reason || '-'}</td>
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
