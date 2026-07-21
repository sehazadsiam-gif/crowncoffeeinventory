'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Check, X, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react'

export default function AttendanceRequestsPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [dutyRequests, setDutyRequests] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [actioningId, setActioningId] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      router.replace('/')
      return
    }

    fetchAllRequests()
  }, [router])

  async function fetchAllRequests() {
    try {
      setLoading(true)
      const [dutyRes, leaveRes] = await Promise.all([
        fetch('/api/attendance/duty-change'),
        fetch('/api/staff/leave-requests')
      ])

      const dutyJson = await dutyRes.json()
      const leaveJson = await leaveRes.json()

      if (dutyRes.ok) setDutyRequests(dutyJson.requests || [])
      if (leaveRes.ok) setLeaveRequests(leaveJson.requests || leaveJson.leave_requests || [])
    } catch (err) {
      addToast('Error fetching requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDutyChangeAction(id, status) {
    try {
      setActioningId(id)
      const res = await fetch('/api/attendance/duty-change', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      const json = await res.json()

      if (res.ok) {
        addToast(`Duty Change Request ${status}!`, 'success')
        if (json.autoUpdatedRoster) addToast('Roster automatically updated!', 'info')
        if (json.rosterConflict) addToast('Coverage gap detected — check roster grid for override.', 'warning')
        fetchAllRequests()
      } else {
        addToast(json.error || 'Failed to update request', 'error')
      }
    } catch (err) {
      addToast('Error updating duty change request', 'error')
    } finally {
      setActioningId(null)
    }
  }

  async function handleLeaveAction(id, status) {
    try {
      setActioningId(id)
      const res = await fetch('/api/staff/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: status })
      })

      if (res.ok) {
        addToast(`Leave Request ${status}!`, 'success')
        fetchAllRequests()
      } else {
        addToast('Failed to update leave request', 'error')
      }
    } catch (err) {
      addToast('Error updating leave request', 'error')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #faf7f2)' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 60px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Staff Requests & Approvals
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
              Approve or reject duty-changes and leaves with AI resolution suggestions.
            </p>
          </div>

          <button
            onClick={fetchAllRequests}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}><div className="loader"></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Section 1: Duty Change Requests */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1C1410', marginBottom: '16px' }}>
                Duty Swap / Off-Day Swap Requests ({dutyRequests.filter(r => r.status === 'pending').length} Pending)
              </h2>

              {dutyRequests.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#999', border: '1px solid #E8E0D4' }}>
                  No duty change requests submitted yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {dutyRequests.map(req => {
                    const isPending = req.status === 'pending'
                    return (
                      <div key={req.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E8E0D4', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '16px', color: '#1C1410' }}>
                              {req.staff?.name} <span style={{ fontSize: '12px', color: '#9C8A76' }}>({req.staff?.employee_id})</span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                              Requested: <strong style={{ color: '#6B3A2A' }}>{req.request_type === 'day_off_swap' ? 'Day Off Swap' : 'Shift Swap'}</strong> on {req.request_date}
                              {req.new_shift_start && ` to start at ${req.new_shift_start}`}
                            </div>
                            {req.reason && (
                              <div style={{ fontSize: '13px', color: '#777', fontStyle: 'italic', marginTop: '6px' }}>
                                Reason: "{req.reason}"
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, background: isPending ? '#FFF3E0' : req.status === 'approved' ? '#E8F5E9' : '#FFEBEE', color: isPending ? '#E65100' : req.status === 'approved' ? '#2E7D32' : '#C62828', textTransform: 'capitalize' }}>
                              {req.status}
                            </span>

                            {isPending && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleDutyChangeAction(req.id, 'approved')}
                                  disabled={actioningId === req.id}
                                  style={{ background: '#2E7D32', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Check size={14} /> Approve
                                </button>
                                <button
                                  onClick={() => handleDutyChangeAction(req.id, 'rejected')}
                                  disabled={actioningId === req.id}
                                  style={{ background: '#C62828', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <X size={14} /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Proactive AI Resolution Suggestion Box */}
                        {req.ai_suggestion && (
                          <div style={{ marginTop: '16px', background: req.conflict_flag ? '#FFF3E0' : '#F4F9F4', border: `1px solid ${req.conflict_flag ? '#FFE0B2' : '#C8E6C9'}`, borderRadius: '8px', padding: '12px 14px', fontSize: '13px' }}>
                            <div style={{ fontWeight: 700, color: req.conflict_flag ? '#E65100' : '#2E7D32', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Sparkles size={16} /> AI Coordinator Proactive Suggestion
                            </div>
                            <div style={{ color: '#444', marginTop: '4px' }}>
                              {req.ai_suggestion.notes}
                            </div>
                            {req.conflict_flag && (
                              <div style={{ marginTop: '6px', color: '#C62828', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={14} /> Coverage Gap Warning: {req.ai_suggestion.conflict_reason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Leave Requests Sync */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1C1410', marginBottom: '16px' }}>
                Staff Leave Requests ({leaveRequests.filter(r => r.status === 'pending').length} Pending)
              </h2>

              {leaveRequests.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#999', border: '1px solid #E8E0D4' }}>
                  No leave requests found.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {leaveRequests.map(req => {
                    const isPending = req.status === 'pending'
                    return (
                      <div key={req.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E8E0D4' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '16px', color: '#1C1410' }}>
                              {req.staff?.name || 'Staff Member'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                              Dates: <strong>{req.start_date}</strong> to <strong>{req.end_date}</strong> ({req.leave_type || 'Leave'})
                            </div>
                            {req.reason && (
                              <div style={{ fontSize: '13px', color: '#777', fontStyle: 'italic', marginTop: '4px' }}>
                                Reason: "{req.reason}"
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, background: isPending ? '#FFF3E0' : req.status === 'approved' ? '#E8F5E9' : '#FFEBEE', color: isPending ? '#E65100' : req.status === 'approved' ? '#2E7D32' : '#C62828', textTransform: 'capitalize' }}>
                              {req.status}
                            </span>

                            {isPending && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleLeaveAction(req.id, 'approve')}
                                  disabled={actioningId === req.id}
                                  style={{ background: '#2E7D32', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Approve & Sync Roster
                                </button>
                                <button
                                  onClick={() => handleLeaveAction(req.id, 'reject')}
                                  disabled={actioningId === req.id}
                                  style={{ background: '#C62828', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  )
}
