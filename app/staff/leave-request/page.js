'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Calendar, Clock, CheckCircle2, XCircle, Send } from 'lucide-react'

export default function LeaveRequestPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [staffId, setStaffId] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
    leave_type: 'annual',
    reason: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const sid = localStorage.getItem('cc_staff_id')
    if (!token) {
      router.replace('/')
      return
    }
    setStaffId(sid)
    fetchRequests(sid)
  }, [router])

  async function fetchRequests(sid) {
    try {
      setLoading(true)
      const res = await fetch(`/api/leave-requests${sid ? `?staff_id=${sid}` : ''}`)
      const json = await res.json()
      if (res.ok) {
        setRequests(json.requests || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.start_date || !form.end_date) {
      addToast('Please select start and end dates', 'error')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffId,
          ...form
        })
      })
      const json = await res.json()
      if (res.ok) {
        addToast('Leave request submitted successfully!', 'success')
        setForm({ start_date: '', end_date: '', leave_type: 'annual', reason: '' })
        fetchRequests(staffId)
      } else {
        addToast(json.error || 'Failed to submit leave request', 'error')
      }
    } catch (err) {
      addToast('Error submitting leave request', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={26} color="#D4933A" /> Leave Application Portal
        </h1>

        {/* Submit Form */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: 0, marginBottom: '16px' }}>Apply for Leave</h2>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Leave Type</label>
                <select
                  value={form.leave_type}
                  onChange={e => setForm({ ...form, leave_type: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 700 }}
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Reason</label>
                <input
                  type="text"
                  placeholder="Reason for leave..."
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#0F172A',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>

        {/* Requests History */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: 0, marginBottom: '16px' }}>My Applications</h2>

          {loading ? (
            <div style={{ color: '#94A3B8', fontSize: '14px' }}>Loading requests...</div>
          ) : requests.length === 0 ? (
            <div style={{ color: '#94A3B8', fontSize: '14px' }}>No leave applications found.</div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {requests.map(r => (
                <div key={r.id} style={{ background: '#F8FAFC', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                      {r.start_date} to {r.end_date} <span style={{ fontSize: '12px', color: '#64748B', textTransform: 'capitalize' }}>({r.leave_type})</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{r.reason || 'No reason specified'}</div>
                  </div>

                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: r.status === 'approved' ? '#DCFCE7' : r.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                    color: r.status === 'approved' ? '#15803D' : r.status === 'rejected' ? '#B91C1C' : '#B45309'
                  }}>
                    {r.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
