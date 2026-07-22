'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react'

export default function AdminLeaveRequestsPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      router.replace('/')
      return
    }
    fetchRequests()
  }, [router])

  async function fetchRequests() {
    try {
      setLoading(true)
      const res = await fetch('/api/leave-requests')
      const json = await res.json()
      if (res.ok) {
        setRequests(json.requests || [])
      }
    } catch (err) {
      addToast('Error loading leave requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(requestId, action) {
    try {
      setUpdatingId(requestId)
      const res = await fetch('/api/leave-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action })
      })
      const json = await res.json()
      if (res.ok) {
        addToast(`Leave request ${action}d successfully!`, 'success')
        fetchRequests()
      } else {
        addToast(json.error || 'Action failed', 'error')
      }
    } catch (err) {
      addToast('Failed to update leave request', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2' }}>
      <Navbar />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={28} color="#D4933A" /> Admin Leave Request Approval
        </h1>

        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>Loading requests...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No leave requests found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #0F172A', color: '#0F172A', textTransform: 'uppercase', fontSize: '12px' }}>
                    <th style={{ padding: '12px' }}>Staff</th>
                    <th style={{ padding: '12px' }}>Type</th>
                    <th style={{ padding: '12px' }}>Dates</th>
                    <th style={{ padding: '12px' }}>Reason</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A' }}>
                        {r.staff?.name || 'Staff'} <div style={{ fontSize: '11px', color: '#64748B' }}>{r.staff?.employee_id}</div>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, textTransform: 'capitalize', color: '#475569' }}>{r.leave_type}</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A' }}>{r.start_date} → {r.end_date}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{r.reason || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: r.status === 'approved' ? '#DCFCE7' : r.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                          color: r.status === 'approved' ? '#15803D' : r.status === 'rejected' ? '#B91C1C' : '#B45309'
                        }}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {r.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleAction(r.id, 'approve')}
                              disabled={updatingId === r.id}
                              style={{ background: '#16A34A', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleAction(r.id, 'reject')}
                              disabled={updatingId === r.id}
                              style={{ background: '#DC2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
