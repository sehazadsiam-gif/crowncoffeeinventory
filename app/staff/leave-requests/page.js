'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import { supabase } from '../../../lib/supabase'
import {
  Clock, CheckCircle2, XCircle, Filter, CalendarDays,
  User, MessageSquare, ChevronDown, RefreshCw, AlertCircle
} from 'lucide-react'

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  approved: { label: 'Approved', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

const LEAVE_TYPE_LABELS = {
  sick: 'Sick Leave',
  casual: 'Casual Leave',
  annual: 'Annual Leave',
  unpaid: 'Unpaid Leave',
}

export default function LeaveRequestsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [allRequests, setAllRequests] = useState([])   // all requests from DB
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [actionLoading, setActionLoading] = useState(null)
  const [noteModal, setNoteModal] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) { router.replace('/'); return }
    setAuthorized(true)
  }, [router])

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, staff:staff_id(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setAllRequests(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])  // stable — no deps, fetches everything

  useEffect(() => {
    if (!authorized) return
    fetchRequests()

    // One stable realtime channel — not recreated on filter change
    const channel = supabase.channel('leave_requests_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, fetchRequests)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [authorized, fetchRequests])

  // Filter client-side so channel is never torn down
  const requests = filter === 'all' ? allRequests : allRequests.filter(r => r.status === filter)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleAction = async (id, action, adminNote = '') => {
    setActionLoading(id + action)
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: action, admin_note: adminNote || null })
        .eq('id', id)
      if (error) throw error
      showToast(`Leave request ${action} successfully.`)
      setNoteModal(null)
      fetchRequests()
    } catch (err) {
      console.error(err)
      showToast('Failed to update request.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const getDays = (start, end) => {
    const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)
    return Math.max(1, diff + 1)
  }

  // Counts always calculated from full dataset
  const counts = {
    all: allRequests.length,
    pending: allRequests.filter(r => r.status === 'pending').length,
    approved: allRequests.filter(r => r.status === 'approved').length,
    rejected: allRequests.filter(r => r.status === 'rejected').length,
  }


  if (!authorized) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="loader" />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>Leave Requests</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>Review and manage staff leave applications.</p>
          </div>
          <button onClick={fetchRequests} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-surface)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-light)', width: 'fit-content' }}>
          {['pending', 'approved', 'rejected', 'all'].map(tab => {
            const isActive = filter === tab
            const cfg = STATUS_CONFIG[tab] || { color: 'var(--text-primary)', bg: 'white', border: 'transparent' }
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '13px', transition: 'all 0.15s',
                  background: isActive ? (tab === 'all' ? 'var(--primary)' : cfg.color) : 'transparent',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span style={{ marginLeft: '6px', background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)', color: isActive ? 'white' : 'var(--text-muted)', padding: '1px 7px', borderRadius: '20px', fontSize: '11px' }}>
                  {tab === 'all' ? requests.length : requests.filter(r => r.status === tab).length}
                </span>
              </button>
            )
          })}
        </div>

        {/* Request Cards */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
            <div className="loader" />
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--success)', opacity: 0.4, margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', margin: '0 0 4px' }}>No {filter === 'all' ? '' : filter} requests</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              {filter === 'pending' ? 'All leave requests have been reviewed!' : `No ${filter} leave requests found.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {requests.map(req => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
              const days = getDays(req.start_date, req.end_date)
              const isPending = req.status === 'pending'
              return (
                <div key={req.id} style={{
                  background: 'white', borderRadius: '16px', border: `1px solid ${isPending ? '#fde68a' : 'var(--border-light)'}`,
                  boxShadow: isPending ? '0 4px 16px rgba(245,158,11,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden', transition: 'box-shadow 0.2s'
                }}>
                  {/* Card Top Bar */}
                  <div style={{ height: '4px', background: cfg.color, opacity: 0.8 }} />

                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      
                      {/* Left Info */}
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, padding: '12px', borderRadius: '12px', color: cfg.color, flexShrink: 0 }}>
                          <CalendarDays size={22} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {req.staff?.name || 'Unknown Staff'}
                            </h3>
                            {req.staff?.position && (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                {req.staff.position}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: '20px' }}>
                              {cfg.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              📅 {new Date(req.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {req.start_date !== req.end_date && ` → ${new Date(req.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700 }}>
                              {days} day{days > 1 ? 's' : ''}
                            </span>
                            <span style={{ fontSize: '13px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 10px', borderRadius: '6px', fontWeight: 600 }}>
                              {LEAVE_TYPE_LABELS[req.leave_type] || req.leave_type}
                            </span>
                          </div>

                          {req.reason && (
                            <p style={{ margin: '10px 0 0', fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <MessageSquare size={14} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--text-muted)' }} />
                              {req.reason}
                            </p>
                          )}

                          {req.admin_note && (
                            <p style={{ margin: '8px 0 0', fontSize: '12px', color: cfg.color, background: cfg.bg, padding: '6px 12px', borderRadius: '6px', border: `1px solid ${cfg.border}` }}>
                              <strong>Admin note:</strong> {req.admin_note}
                            </p>
                          )}

                          <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                            Submitted {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Right Actions */}
                      {isPending && (
                        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                          <button
                            onClick={() => setNoteModal({ id: req.id, action: 'rejected', note: '' })}
                            disabled={!!actionLoading}
                            style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                          >
                            <XCircle size={15} /> Reject
                          </button>
                          <button
                            onClick={() => setNoteModal({ id: req.id, action: 'approved', note: '' })}
                            disabled={!!actionLoading}
                            style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#16a34a', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(22,163,74,0.25)' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
                            onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}
                          >
                            <CheckCircle2 size={15} /> Approve
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
      </main>

      {/* Note Modal */}
      {noteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: noteModal.action === 'approved' ? '#f0fdf4' : '#fef2f2', padding: '10px', borderRadius: '10px', color: noteModal.action === 'approved' ? '#16a34a' : '#dc2626' }}>
                {noteModal.action === 'approved' ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {noteModal.action} Leave Request
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Optionally add a note for the staff member.</p>
              </div>
            </div>

            <textarea
              placeholder="Add an optional note (e.g. 'Please ensure handover before leaving')"
              rows={4}
              value={noteModal.note}
              onChange={e => setNoteModal(prev => ({ ...prev, note: e.target.value }))}
              className="input"
              style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setNoteModal(null)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'white', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                Cancel
              </button>
              <button
                onClick={() => handleAction(noteModal.id, noteModal.action, noteModal.note)}
                disabled={actionLoading === noteModal.id + noteModal.action}
                style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: noteModal.action === 'approved' ? '#16a34a' : '#dc2626', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '14px', opacity: actionLoading ? 0.7 : 1 }}
              >
                {actionLoading ? 'Saving...' : `Confirm ${noteModal.action.charAt(0).toUpperCase() + noteModal.action.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000,
          background: toast.type === 'error' ? '#dc2626' : '#16a34a',
          color: 'white', padding: '14px 20px', borderRadius: '12px',
          fontWeight: 600, fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: '10px', animation: 'slideIn 0.3s ease'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
