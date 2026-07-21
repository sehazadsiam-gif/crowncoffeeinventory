'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { 
  Users, CheckCircle2, Clock, XCircle, Calendar, AlertTriangle, 
  QrCode, RefreshCw, Sparkles, Send, ShieldAlert, FileText, Check, X
} from 'lucide-react'

import { supabase } from '../../lib/supabase'

export default function AttendanceDashboardPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ date: '', summary: {}, records: [] })
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrCodeInput, setQrCodeInput] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [isKioskMode, setIsKioskMode] = useState(false)

  // AI Assistant Chat & Anomalies state
  const [anomalies, setAnomalies] = useState([])
  const [aiQuery, setAiQuery] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    const isKiosk = typeof window !== 'undefined' && (window.location.search.includes('kiosk=true') || role === 'kiosk')
    setIsKioskMode(isKiosk)

    if (!isKiosk && (!token || (role !== 'admin' && role !== 'sub_admin' && role !== 'manager'))) {
      router.replace('/')
      return
    }

    fetchTodayData()
    if (!isKiosk) fetchAnomalies()

    // Supabase Realtime WebSocket subscription for live updates
    const channel = supabase.channel('attendance_kiosk_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_log' }, () => {
        fetchTodayData(true)
      })
      .subscribe()

    // Real-time live polling fallback every 15s
    const timer = setInterval(() => {
      fetchTodayData(true)
    }, 15000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [router])

  // USB RFID Hardware Reader Keydown Listener
  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    function handleGlobalKeyDown(e) {
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'TEXTAREA' || (activeTag === 'INPUT' && document.activeElement?.id !== 'rfid-kiosk-input')) {
        return
      }

      const currentTime = Date.now()
      if (currentTime - lastKeyTime > 120) {
        buffer = '' // Reset buffer if typing speed is too slow (human typing)
      }
      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault()
          handleCheckin(buffer.trim(), null, 'rfid')
          buffer = ''
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  async function fetchTodayData(silent = false) {
    try {
      if (!silent) setLoading(true)
      const res = await fetch('/api/attendance/today')
      const json = await res.json()
      if (res.ok) {
        setData(json)
      } else {
        if (!silent) addToast(json.error || 'Failed to load attendance', 'error')
      }
    } catch (err) {
      if (!silent) addToast('Error fetching attendance data', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function fetchAnomalies() {
    try {
      const res = await fetch('/api/attendance/agent/anomalies')
      const json = await res.json()
      if (res.ok) setAnomalies(json.anomalies || [])
    } catch (e) {
      console.error('Failed to fetch anomalies', e)
    }
  }

  async function handleCheckin(identifier, statusOverride = null, source = 'manual') {
    try {
      setCheckingIn(true)
      const payload = {
        identifier,
        source: source || (isKioskMode ? 'rfid' : 'manual'),
        adminOverride: !!statusOverride,
        forceStatus: statusOverride
      }

      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Check-in failed')

      addToast(`Logged: ${json.staff.name} is ${json.status.toUpperCase()}`, 'success')
      setQrCodeInput('')
      setQrModalOpen(false)
      fetchTodayData()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setCheckingIn(false)
    }
  }

  async function handleAskAI(e) {
    e.preventDefault()
    if (!aiQuery.trim()) return

    try {
      setAiLoading(true)
      setAiAnswer('')
      const res = await fetch('/api/attendance/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuery })
      })
      const json = await res.json()
      if (res.ok) {
        setAiAnswer(json.answer)
      } else {
        addToast(json.error || 'AI Query failed', 'error')
      }
    } catch (err) {
      addToast('Error asking AI assistant', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleDismissAnomaly(id) {
    try {
      await fetch('/api/attendance/agent/anomalies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      setAnomalies(anomalies.filter(a => a.id !== id))
    } catch (err) {
      addToast('Error dismissing anomaly', 'error')
    }
  }

  const statusCards = [
    { title: 'Present', count: data.summary?.present || 0, icon: <CheckCircle2 size={24} color="#2e7d32" />, bg: '#e8f5e9', border: '#2e7d32', color: '#1b5e20' },
    { title: 'Late', count: data.summary?.late || 0, icon: <Clock size={24} color="#ed6c02" />, bg: '#fff3e0', border: '#ed6c02', color: '#e65100' },
    { title: 'Absent', count: data.summary?.absent || 0, icon: <XCircle size={24} color="#d32f2f" />, bg: '#ffebee', border: '#d32f2f', color: '#c62828' },
    { title: 'On Leave', count: data.summary?.on_leave || 0, icon: <Calendar size={24} color="#0288d1" />, bg: '#e1f5fe', border: '#0288d1', color: '#01579b' }
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #faf7f2)' }}>
      <Navbar />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px 60px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Live Attendance Dashboard
              </h1>
              <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', background: '#e8f5e9', color: '#2e7d32', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2e7d32', display: 'inline-block' }}></span> Realtime
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
              Today is {data.date ? new Date(data.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : '...'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => fetchTodayData()}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white' }}
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={() => setQrModalOpen(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#6B3A2A', border: 'none', color: 'white' }}
            >
              <QrCode size={18} /> Quick Check-In / Scan
            </button>
          </div>
        </div>

        {/* AI Anomalies Digest Banner */}
        {anomalies.length > 0 && (
          <div style={{ background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#B78103', fontWeight: 700, fontSize: '15px' }}>
              <ShieldAlert size={20} /> AI Attendance Anomaly Digest ({anomalies.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {anomalies.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #FFF3E0', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#333' }}>{a.staff?.name || a.detail?.staff_name}: </span>
                    <span style={{ color: '#555' }}>
                      {a.type === 'repeated_lateness' && `Late ${a.detail?.late_count} times in last 30 days`}
                      {a.type === 'overtime_risk' && `High hours (${a.detail?.hours_worked}h in 30 days) — overtime risk`}
                      {a.type === 'high_absence' && `Absent ${a.detail?.absent_count} times in last 30 days`}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDismissAnomaly(a.id)}
                    style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '12px', padding: '2px 8px' }}
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4 Status Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {statusCards.map((c, i) => (
            <div key={i} style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: '16px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.color }}>{c.title}</p>
                <h2 style={{ margin: '8px 0 0 0', fontSize: '36px', fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.count}</h2>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                {c.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content: Live Staff Status Grid + Natural Language AI Box */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          
          {/* Left: Live Staff Table */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8E0D4', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1C1410', margin: '0 0 16px 0' }}>
              Today's Roster & Live Status
            </h3>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}><div className="loader"></div></div>
            ) : data.records?.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>No active staff found.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F0EAE1', color: '#8C7A6B', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '12px' }}>Employee</th>
                      <th style={{ padding: '12px' }}>Shift</th>
                      <th style={{ padding: '12px' }}>Check In</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map(r => {
                      let badgeBg = '#f5f5f5'
                      let badgeColor = '#666'
                      if (r.status === 'present') { badgeBg = '#e8f5e9'; badgeColor = '#2e7d32'; }
                      if (r.status === 'late') { badgeBg = '#fff3e0'; badgeColor = '#e65100'; }
                      if (r.status === 'absent') { badgeBg = '#ffebee'; badgeColor = '#c62828'; }
                      if (r.status === 'on_leave') { badgeBg = '#e1f5fe'; badgeColor = '#01579b'; }
                      if (r.status === 'off') { badgeBg = '#f3e5f5'; badgeColor = '#7b1fa2'; }

                      return (
                        <tr key={r.staff_id} style={{ borderBottom: '1px solid #F7F3EE' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 700, color: '#1C1410' }}>{r.name}</div>
                            <div style={{ fontSize: '11px', color: '#9C8A76' }}>{r.employee_id} • {r.designation}</div>
                          </td>
                          <td style={{ padding: '12px', color: '#555', fontWeight: 500 }}>
                            {r.shift_start ? r.shift_start.slice(0, 5) : '10:00'}
                          </td>
                          <td style={{ padding: '12px', color: '#333' }}>
                            {r.check_in_at ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>{new Date(r.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                {r.minutes_late > 0 && <span style={{ fontSize: '11px', color: '#e65100' }}>({r.minutes_late}m late)</span>}
                              </div>
                            ) : (
                              <span style={{ color: '#ccc', fontStyle: 'italic' }}>Not logged</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', background: badgeBg, color: badgeColor, fontWeight: 700, fontSize: '12px', textTransform: 'capitalize' }}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleCheckin(r.staff_id, 'present')}
                                title="Mark Present"
                                style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '6px', padding: '4px 8px', color: '#2e7d32', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleCheckin(r.staff_id, 'late')}
                                title="Mark Late"
                                style={{ background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: '6px', padding: '4px 8px', color: '#e65100', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                              >
                                Late
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: AI Natural Language Coordinator Widget */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8E0D4', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Sparkles size={20} color="#C9943A" />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1C1410' }}>AI Assistant Query</h4>
              </div>
              <p style={{ fontSize: '12px', color: '#8C7A6B', margin: '0 0 16px 0' }}>
                Ask natural language questions about lateness, hours, or attendance trends.
              </p>

              <form onSubmit={handleAskAI} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  placeholder="e.g. Who was late more than 2 times this month?"
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E0D6C8', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#6B3A2A', color: 'white', border: 'none', padding: '10px' }}
                >
                  <Send size={14} /> {aiLoading ? 'Analyzing...' : 'Ask Assistant'}
                </button>
              </form>

              {aiAnswer && (
                <div style={{ marginTop: '16px', background: '#FAF7F2', borderRadius: '8px', padding: '12px', border: '1px solid #E8E0D4', fontSize: '13px', color: '#4A3B32', lineHeight: '1.5' }}>
                  <strong>AI Response:</strong>
                  <p style={{ margin: '6px 0 0 0', whiteSpace: 'pre-wrap' }}>{aiAnswer}</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* QR Checkin Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Check-In via QR Code / Employee ID"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            Enter or scan the Employee ID (e.g. <code>CC-001</code>) to record check-in instantly.
          </p>

          <input
            type="text"
            placeholder="Enter Employee ID (e.g. CC-001)"
            value={qrCodeInput}
            onChange={e => setQrCodeInput(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', width: '100%', textTransform: 'uppercase' }}
            onKeyDown={e => { if (e.key === 'Enter' && qrCodeInput) handleCheckin(qrCodeInput) }}
          />

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setQrModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCheckin(qrCodeInput)}
              disabled={checkingIn || !qrCodeInput}
              className="btn-primary"
              style={{ background: '#6B3A2A', color: 'white', border: 'none' }}
            >
              {checkingIn ? 'Logging...' : 'Submit Check-In'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
