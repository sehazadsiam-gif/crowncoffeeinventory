'use client'

import { useState, useEffect } from 'react'
import Navbar from '../../../components/Navbar'
import { ArrowLeftRight, CheckCircle, XCircle, Clock, Calendar, UserCheck, ShieldAlert } from 'lucide-react'

export default function AdminShiftSwapsPage() {
  const [swaps, setSwaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending_admin')
  const [actionNotes, setActionNotes] = useState('')
  const [selectedSwapId, setSelectedSwapId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetchSwaps()
  }, [filterStatus])

  const fetchSwaps = async () => {
    try {
      setLoading(true)
      const url = filterStatus ? `/api/staff/shift-swaps?status=${filterStatus}` : '/api/staff/shift-swaps'
      const res = await fetch(url)
      const data = await res.json()
      setSwaps(data.swaps || [])
    } catch (err) {
      console.error('Error fetching shift swaps:', err)
      showToast('Failed to fetch shift swap requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (swapId, action) => {
    try {
      const res = await fetch('/api/staff/shift-swaps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swap_id: swapId,
          action,
          admin_notes: actionNotes
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      showToast(action === 'admin_approve' ? 'Shift swap approved & Roster updated!' : 'Shift swap rejected')
      setSelectedSwapId(null)
      setActionNotes('')
      fetchSwaps()
    } catch (err) {
      console.error('Error updating shift swap:', err)
      showToast(err.message || 'Failed to update swap request', 'error')
    }
  }

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#0F172A' }}>
      <Navbar />

      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#FFF',
          padding: '12px 20px', borderRadius: '10px', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ArrowLeftRight size={32} color="#2563EB" />
              Staff Shift Swap Approvals
            </h1>
            <p style={{ color: '#64748B', marginTop: '4px', fontSize: '14px', margin: '4px 0 0 0' }}>
              Review shift swap requests from staff. 1-click approval automatically updates the Weekly Duty Roster.
            </p>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', background: '#FFFFFF', padding: '4px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            {[
              { id: 'pending_admin', label: 'Pending Approval' },
              { id: 'pending_peer', label: 'Waiting Peer' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: '', label: 'All' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', background: filterStatus === tab.id ? '#2563EB' : 'transparent',
                  color: filterStatus === tab.id ? '#FFFFFF' : '#64748B', transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
            Loading shift swap requests...
          </div>
        ) : swaps.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#64748B' }}>
            <Clock size={40} color="#94A3B8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#334155', margin: 0 }}>No Shift Swap Requests Found</h3>
            <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>No pending requests match the selected status filter.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {swaps.map((item) => (
              <div key={item.id} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  
                  {/* Requester & Target Information */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                        {item.requester?.name || 'Staff'} ({item.requester?.designation})
                      </span>
                      <ArrowLeftRight size={18} color="#2563EB" />
                      <span style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                        {item.target_staff?.name || 'Teammate'} ({item.target_staff?.designation})
                      </span>
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '13px', color: '#475569', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div>
                        📅 Requester Shift Date: <strong>{item.requester_date}</strong>
                      </div>
                      {item.target_date && (
                        <div>
                          🔄 Target Swap Date: <strong>{item.target_date}</strong>
                        </div>
                      )}
                    </div>

                    {item.reason && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: '#64748B', fontStyle: 'italic', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px' }}>
                        Reason: "{item.reason}"
                      </div>
                    )}
                  </div>

                  {/* Status Badge & Action Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase',
                      background: item.status === 'approved' ? '#DCFCE7' : item.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                      color: item.status === 'approved' ? '#15803D' : item.status === 'rejected' ? '#DC2626' : '#B45309'
                    }}>
                      {item.status === 'pending_admin' ? 'Pending Admin Approval' : item.status}
                    </span>

                    {item.status === 'pending_admin' && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleAction(item.id, 'admin_reject')}
                          style={{ padding: '8px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <XCircle size={15} /> Reject
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'admin_approve')}
                          style={{ padding: '8px 16px', borderRadius: '8px', background: '#16A34A', border: 'none', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <CheckCircle size={15} /> 1-Click Approve & Swap
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
