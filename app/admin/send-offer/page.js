'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SendOfferPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('offer')
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [discount, setDiscount] = useState(5)
  const [validDays, setValidDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      router.push('/admin/login')
    } else {
      setIsAdmin(true)
      setPageLoading(false)
    }
  }, [router])

  const handleSearch = async (q) => {
    setSearch(q)
    if (!q.trim()) {
      setMembers([])
      return
    }

    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/manager/search-members?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setMembers(data.members || [])
    } catch (e) {
      console.error('Search error:', e)
    }
  }

  const handleBroadcastMessage = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      alert('Please fill in both subject and message')
      return
    }

    if (!confirm(`Send this message to ALL active members?\n\nSubject: ${broadcastSubject}`)) {
      return
    }

    setBroadcastLoading(true)
    setBroadcastResult(null)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/admin/broadcast-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: broadcastSubject,
          message: broadcastMessage
        })
      })

      const data = await res.json()
      console.log('Response:', res.status, data)
      
      if (res.ok) {
        setBroadcastResult({
          success: true,
          message: `✅ Message sent to ${data.sent}/${data.totalMembers} members`
        })
        setBroadcastSubject('')
        setBroadcastMessage('')
      } else {
        setBroadcastResult({
          success: false,
          message: `❌ Error: ${data.error}`
        })
      }
    } catch (e) {
      console.error('Broadcast error:', e)
      setBroadcastResult({
        success: false,
        message: `❌ Error: ${e.message}`
      })
    } finally {
      setBroadcastLoading(false)
    }
  }

  if (pageLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  if (!isAdmin) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Unauthorized</div>
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Communication Hub</h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px' }}>Send offers or broadcast messages to members</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid #E0E0E0' }}>
        <button
          onClick={() => setActiveTab('offer')}
          style={{
            padding: '12px 20px',
            background: activeTab === 'offer' ? '#6B3A2A' : 'transparent',
            color: activeTab === 'offer' ? 'white' : '#9C8A76',
            border: 'none',
            borderBottom: activeTab === 'offer' ? '2px solid #6B3A2A' : 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px'
          }}
        >
          Send Offer
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          style={{
            padding: '12px 20px',
            background: activeTab === 'broadcast' ? '#6B3A2A' : 'transparent',
            color: activeTab === 'broadcast' ? 'white' : '#9C8A76',
            border: 'none',
            borderBottom: activeTab === 'broadcast' ? '2px solid #6B3A2A' : 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px'
          }}
        >
          Broadcast Message
        </button>
      </div>

      {activeTab === 'broadcast' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Broadcast to All Members</h2>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Subject</label>
            <input
              type="text"
              placeholder="e.g., Special Weekend Promotion"
              value={broadcastSubject}
              onChange={e => setBroadcastSubject(e.target.value)}
              maxLength={100}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: '11px', color: '#9C8A76', marginTop: '4px' }}>{broadcastSubject.length}/100</div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Message</label>
            <textarea
              placeholder="Type your message here..."
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '14px',
                minHeight: '150px',
                boxSizing: 'border-box',
                fontFamily: 'Arial'
              }}
            />
          </div>

          {broadcastResult && (
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              background: broadcastResult.success ? '#E8F5E9' : '#FFEBEE',
              border: `1px solid ${broadcastResult.success ? '#4CAF50' : '#F44336'}`,
              color: broadcastResult.success ? '#1B5E20' : '#C62828'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{broadcastResult.message}</div>
            </div>
          )}

          <button
            onClick={handleBroadcastMessage}
            disabled={broadcastLoading || !broadcastSubject.trim() || !broadcastMessage.trim()}
            style={{
              width: '100%',
              padding: '12px',
              background: broadcastLoading || !broadcastSubject.trim() || !broadcastMessage.trim() ? '#9C8A76' : '#2E7D32',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: broadcastLoading || !broadcastSubject.trim() || !broadcastMessage.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {broadcastLoading ? 'Sending to all members...' : 'Send to All Members'}
          </button>
        </div>
      )}
    </div>
  )
}
