'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

export default function PendingMembersPage() {
  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  const load = async () => {
    try {
      const res = await fetch(`/api/members/pending?t=${Date.now()}`)
      const data = await res.json()
      console.log('Loaded pending members:', data.members?.length || 0)
      setMembers(data.members || [])
    } catch (e) {
      console.error('Load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Auto-refresh every 60 seconds
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!search) {
      setFilteredMembers(members)
    } else {
      const s = search.toLowerCase()
      setFilteredMembers(members.filter(m => 
        m.full_name.toLowerCase().includes(s) || 
        m.email.toLowerCase().includes(s) || 
        m.phone.includes(search)
      ))
    }
  }, [search, members])

  const approve = async (id) => {
    if (!window.confirm('Approve this member?')) return

    setProcessing(id)
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
      console.log('Approve response:', res.status, data)

      if (res.ok) {
        alert('Approved! Card: ' + data.card_number)
        // Remove from list immediately
        setMembers(m => m.filter(x => x.id !== id))
      } else {
        alert('Error: ' + (data.error || 'Unknown error'))
      }
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setProcessing(null)
    }
  }

  const reject = async (id) => {
    if (!window.confirm('Reject this member?')) return

    setProcessing(id)
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
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Pending Approvals</h1>
      <p style={{ color: '#9C8A76', marginBottom: '24px' }}>{members.length} members waiting</p>

      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9C8A76' }} />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>

      <button onClick={load} style={{ marginBottom: '24px', padding: '10px 16px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
        Manual Refresh
      </button>

      {filteredMembers.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '12px', color: '#9C8A76' }}>
          {search ? 'No matching members found' : 'No pending members'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredMembers.map(m => (
            <div key={m.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>{m.full_name}</div>
                <div style={{ fontSize: '12px', color: '#9C8A76', marginBottom: '4px' }}>{m.email}</div>
                <div style={{ fontSize: '12px', color: '#9C8A76' }}>{m.phone}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => approve(m.id)}
                  disabled={processing === m.id}
                  style={{ padding: '10px 16px', background: '#2E7D32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', opacity: processing === m.id ? 0.6 : 1 }}
                >
                  {processing === m.id ? '...' : 'Approve'}
                </button>
                <button
                  onClick={() => reject(m.id)}
                  disabled={processing === m.id}
                  style={{ padding: '10px 16px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', opacity: processing === m.id ? 0.6 : 1 }}
                >
                  {processing === m.id ? '...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
