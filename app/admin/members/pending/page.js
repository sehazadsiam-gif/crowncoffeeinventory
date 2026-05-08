'use client'

import { useState, useEffect } from 'react'

export default function PendingMembersPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  const load = async () => {
    try {
      const res = await fetch('/api/members/pending')
      const data = await res.json()
      setMembers(data.members || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [])

  const approve = async (id) => {
    if (!confirm('Approve this member?')) return
    setProcessing(id)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        alert('Approved! Card: ' + data.card_number)
        setMembers(m => m.filter(x => x.id !== id))
      } else {
        alert('Error: ' + data.error)
      }
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setProcessing(null)
    }
  }

  const reject = async (id) => {
    if (!confirm('Reject this member?')) return
    setProcessing(id)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        alert('Rejected')
        setMembers(m => m.filter(x => x.id !== id))
      } else {
        alert('Error')
      }
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Pending Approvals</h1>
      <p style={{ color: '#9C8A76', marginBottom: '16px' }}>{members.length} waiting</p>

      <button onClick={load} style={{ marginBottom: '24px', padding: '8px 16px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
        Refresh
      </button>

      {members.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '12px', color: '#9C8A76' }}>
          No pending members
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {members.map(m => (
            <div key={m.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>{m.full_name}</div>
                <div style={{ fontSize: '13px', color: '#9C8A76' }}>{m.email}</div>
                <div style={{ fontSize: '13px', color: '#9C8A76' }}>{m.phone}</div>
                <div style={{ fontSize: '11px', color: '#BDBDBD', marginTop: '4px' }}>{new Date(m.created_at).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => approve(m.id)} disabled={processing === m.id}
                  style={{ padding: '10px 16px', background: '#2E7D32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
                  Approve
                </button>
                <button onClick={() => reject(m.id)} disabled={processing === m.id}
                  style={{ padding: '10px 16px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
