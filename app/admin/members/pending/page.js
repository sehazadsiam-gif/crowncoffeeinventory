'use client'

import { useState, useEffect } from 'react'

export default function PendingMembersPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const fetchPending = async () => {
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/pending?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setMembers(data.members || [])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
    const interval = setInterval(fetchPending, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleApprove = async (id, name) => {
    if (!window.confirm(`Approve ${name}?`)) return

    setProcessingId(id)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()

      if (res.ok) {
        alert('✓ Approved! Card: ' + data.card_number)
        // Remove from list immediately
        setMembers(m => m.filter(x => x.id !== id))
      } else {
        alert('Error: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id, name) => {
    if (!window.confirm(`Reject ${name}?`)) return

    setProcessingId(id)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      if (res.ok) {
        alert('Rejected')
        // Remove from list immediately
        setMembers(m => m.filter(x => x.id !== id))
      } else {
        alert('Error')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Pending Approvals</h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px' }}>{members.length} members waiting</p>

      {members.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '12px', color: '#9C8A76' }}>
          ✓ No pending members!
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {members.map(m => (
            <div key={m.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '16px' }}>{m.full_name}</div>
                <div style={{ fontSize: '12px', color: '#9C8A76', marginBottom: '4px' }}>📧 {m.email}</div>
                <div style={{ fontSize: '12px', color: '#9C8A76' }}>📱 {m.phone}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleApprove(m.id, m.full_name)}
                  disabled={processingId === m.id}
                  style={{ padding: '10px 16px', background: '#2E7D32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', opacity: processingId === m.id ? 0.6 : 1 }}
                >
                  {processingId === m.id ? '...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(m.id, m.full_name)}
                  disabled={processingId === m.id}
                  style={{ padding: '10px 16px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', opacity: processingId === m.id ? 0.6 : 1 }}
                >
                  {processingId === m.id ? '...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
