'use client'

import { useState, useEffect } from 'react'

export default function PendingMembersPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [approveId, setApproveId] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/members/pending', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setMembers(data.members || [])
    } catch (err) {
      console.error('Error:', err)
      alert('Error loading members')
    } finally {
      setLoading(false)
    }
  }

  const approve = async (memberId) => {
    setApproveId(memberId)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/${memberId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()
      
      if (res.ok) {
        alert('✓ Approved! Card: ' + data.card_number)
        setMembers(m => m.filter(x => x.id !== memberId))
        setConfirmModal(null)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setApproveId(null)
    }
  }

  const reject = async (memberId) => {
    setApproveId(memberId)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/${memberId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        alert('Rejected')
        setMembers(m => m.filter(x => x.id !== memberId))
      } else {
        alert('Error')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setApproveId(null)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', marginBottom: '8px' }}>
        Pending Approvals
      </h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px' }}>
        {members.length} members waiting
      </p>

      {members.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#9C8A76' }}>
          No pending members
        </div>
      ) : (
        members.map(m => (
          <div key={m.id} style={{ background: 'white', padding: '20px', marginBottom: '16px', borderRadius: '12px', border: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px' }}>{m.full_name}</div>
              <div style={{ fontSize: '13px', color: '#9C8A76' }}>📧 {m.email}</div>
              <div style={{ fontSize: '13px', color: '#9C8A76' }}>📱 {m.phone}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setConfirmModal({ id: m.id, type: 'approve', name: m.full_name })}
                disabled={approveId === m.id}
                style={{ padding: '8px 16px', background: '#2E7D32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, opacity: approveId === m.id ? 0.5 : 1 }}
              >
                Approve
              </button>
              <button
                onClick={() => setConfirmModal({ id: m.id, type: 'reject', name: m.full_name })}
                disabled={approveId === m.id}
                style={{ padding: '8px 16px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, opacity: approveId === m.id ? 0.5 : 1 }}
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      {confirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: confirmModal.type === 'approve' ? '#2E7D32' : '#D32F2F' }}>
              {confirmModal.type === 'approve' ? 'Approve' : 'Reject'} {confirmModal.name}?
            </h2>
            <p style={{ color: '#9C8A76', marginBottom: '24px' }}>
              {confirmModal.type === 'approve' ? 'Send card + email + 30-day free coffee' : 'Reject this application'}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '10px', background: '#E0E0E0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal.type === 'approve') {
                    approve(confirmModal.id)
                  } else {
                    reject(confirmModal.id)
                  }
                }}
                style={{ flex: 1, padding: '10px', background: confirmModal.type === 'approve' ? '#2E7D32' : '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
