'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Mail, Phone, RefreshCw } from 'lucide-react'

export default function PendingMembersPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [approveConfirm, setApproveConfirm] = useState(null)
  const [rejectConfirm, setRejectConfirm] = useState(null)

  const fetchPendingMembers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/pending?_t=${Date.now()}`, {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      })
      const data = await res.json()
      console.log('Fetched pending members:', data)
      setMembers(data.members || [])
    } catch (error) {
      console.error('Error:', error)
      alert('Error loading pending members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingMembers()
  }, [])

  const handleApprove = async (memberId) => {
    try {
      setApproving(memberId)
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/${memberId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'approve' })
      })

      const data = await res.json()

      if (res.ok) {
        alert(`✓ Approved! Card: ${data.card_number}`)
        setApproveConfirm(null)
        // Wait 1 second then refresh
        setTimeout(() => {
          fetchPendingMembers()
        }, 1000)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Approve error:', error)
      alert('Error approving member')
    } finally {
      setApproving(null)
    }
  }

  const handleReject = async (memberId) => {
    try {
      setRejecting(memberId)
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/${memberId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      if (res.ok) {
        alert('Member rejected')
        setRejectConfirm(null)
        // Wait 1 second then refresh
        setTimeout(() => {
          fetchPendingMembers()
        }, 1000)
      } else {
        alert('Error rejecting member')
      }
    } catch (error) {
      console.error('Reject error:', error)
      alert('Error rejecting member')
    } finally {
      setRejecting(null)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#9C8A76' }}>Loading pending members...</div>
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', marginBottom: '8px' }}>
            Pending Approvals
          </h1>
          <p style={{ color: '#9C8A76', marginBottom: '0' }}>
            {members.length} member{members.length !== 1 ? 's' : ''} waiting for approval
          </p>
        </div>
        <button
          onClick={fetchPendingMembers}
          style={{ padding: '10px 16px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {members.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#9C8A76' }}>
          No pending members. All applications have been reviewed!
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {members.map(member => (
            <div key={member.id} style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'start' }}>
                
                {/* Member Info */}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F1F', margin: '0 0 16px 0' }}>
                    {member.full_name}
                  </h3>

                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#5C4A36', fontSize: '14px' }}>
                      <Mail size={16} style={{ color: '#9C8A76' }} />
                      {member.email}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#5C4A36', fontSize: '14px' }}>
                      <Phone size={16} style={{ color: '#9C8A76' }} />
                      {member.phone}
                    </div>

                    {member.occupation && (
                      <div style={{ color: '#5C4A36', fontSize: '13px' }}>
                        <strong>Occupation:</strong> {member.occupation}
                      </div>
                    )}

                    {member.address && (
                      <div style={{ color: '#5C4A36', fontSize: '13px' }}>
                        <strong>Address:</strong> {member.address}
                      </div>
                    )}

                    <div style={{ color: '#9C8A76', fontSize: '12px', marginTop: '8px' }}>
                      Applied: {new Date(member.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column', minWidth: '150px' }}>
                  <button
                    onClick={() => setApproveConfirm(member.id)}
                    disabled={approving === member.id}
                    style={{ padding: '12px 16px', background: '#2E7D32', color: 'white', border: 'none', borderRadius: '8px', cursor: approving === member.id ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: approving === member.id ? 0.6 : 1 }}
                  >
                    <CheckCircle size={16} />
                    {approving === member.id ? 'Approving...' : 'Approve'}
                  </button>

                  <button
                    onClick={() => setRejectConfirm(member.id)}
                    disabled={rejecting === member.id}
                    style={{ padding: '12px 16px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '8px', cursor: rejecting === member.id ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: rejecting === member.id ? 0.6 : 1 }}
                  >
                    <XCircle size={16} />
                    {rejecting === member.id ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approveConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '32px', maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ color: '#2E7D32', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Approve Member?</h2>
            <p style={{ color: '#9C8A76', marginBottom: '24px' }}>
              {members.find(m => m.id === approveConfirm)?.full_name} will be sent a membership card and welcome email + WhatsApp.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setApproveConfirm(null)}
                style={{ flex: 1, padding: '10px', background: '#E0E0E0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(approveConfirm)}
                disabled={approving === approveConfirm}
                style={{ flex: 1, padding: '10px', background: '#2E7D32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, opacity: approving === approveConfirm ? 0.6 : 1 }}
              >
                {approving === approveConfirm ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '32px', maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ color: '#D32F2F', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Reject Application?</h2>
            <p style={{ color: '#9C8A76', marginBottom: '24px' }}>
              {members.find(m => m.id === rejectConfirm)?.full_name}'s application will be rejected.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setRejectConfirm(null)}
                style={{ flex: 1, padding: '10px', background: '#E0E0E0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectConfirm)}
                disabled={rejecting === rejectConfirm}
                style={{ flex: 1, padding: '10px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, opacity: rejecting === rejectConfirm ? 0.6 : 1 }}
              >
                {rejecting === rejectConfirm ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
