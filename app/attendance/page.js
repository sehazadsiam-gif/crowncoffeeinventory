'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { 
  Users, CheckCircle2, Clock, XCircle, Calendar, AlertTriangle, 
  Wifi, RefreshCw, Sparkles, Search, ShieldCheck, Edit3, Check
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
  const [currentTime, setCurrentTime] = useState(new Date())

  // Department & Search Filters
  const [departmentFilter, setDepartmentFilter] = useState('all') // 'all' | 'front' | 'kitchen'
  const [searchQuery, setSearchQuery] = useState('')
  const [lastTapEvent, setLastTapEvent] = useState(null)

  useEffect(() => {
    // Clock Ticker
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)

    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    const isKiosk = typeof window !== 'undefined' && (window.location.search.includes('kiosk=true') || role === 'kiosk')
    setIsKioskMode(isKiosk)

    if (!isKiosk && (!token || (role !== 'admin' && role !== 'sub_admin' && role !== 'manager'))) {
      router.replace('/')
      return () => clearInterval(clockTimer)
    }

    fetchTodayData()

    // Supabase Realtime WebSocket subscription for live updates
    const channel = supabase.channel('attendance_kiosk_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_log' }, (payload) => {
        fetchTodayData(true)
        if (payload.new) triggerTapToast(payload.new)
      })
      .subscribe()

    const timer = setInterval(() => fetchTodayData(true), 12000)

    return () => {
      clearInterval(clockTimer)
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
        buffer = ''
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
      const res = await fetch(`/api/attendance/today?t=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) {
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch today attendance:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  function triggerTapToast(entry) {
    const timeStr = entry.check_in_at
      ? new Date(entry.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    setLastTapEvent({
      name: entry.employee_id || 'Staff Member',
      status: (entry.status || 'present').toUpperCase(),
      time: timeStr
    })
    setTimeout(() => setLastTapEvent(null), 6000)
  }

  async function handleCheckin(identifier, overrideStatus = null, source = 'manual') {
    if (!identifier) {
      return addToast('Please enter an Employee ID or RFID card code', 'error')
    }

    try {
      setCheckingIn(true)
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          source,
          adminOverride: !!overrideStatus,
          forceStatus: overrideStatus
        })
      })

      const json = await res.json()
      if (res.ok) {
        addToast(
          json.alreadyCheckedOut
            ? `Checked OUT: ${json.staff.name} (${json.hoursWorked} hrs duty)`
            : `Checked IN: ${json.staff.name} (${json.status.toUpperCase()})`,
          'success'
        )
        setQrCodeInput('')
        setQrModalOpen(false)
        fetchTodayData(true)
      } else {
        addToast(json.error || 'Check-in failed', 'error')
      }
    } catch (err) {
      addToast('Error logging attendance', 'error')
    } finally {
      setCheckingIn(false)
    }
  }

  const records = data.records || []
  
  // Filter by department & search
  const filteredRecords = records.filter(r => {
    const matchesDept = departmentFilter === 'all' || (r.department || 'front') === departmentFilter
    const matchesSearch = !searchQuery || 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.employee_id && r.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesDept && matchesSearch
  })

  const presentCount = records.filter(r => r.status === 'present').length
  const lateCount = records.filter(r => r.status === 'late').length
  const totalCount = records.length
  const absentCount = totalCount - (presentCount + lateCount)

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {!isKioskMode && <Navbar />}

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: isKioskMode ? '24px' : '32px 24px 60px' }}>
        
        {/* Top Header & Live Clock */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '20px',
          padding: '24px 32px',
          color: 'white',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 10px 30px rgba(15,23,42,0.12)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#D4933A', color: '#0F172A', padding: '6px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '15px', letterSpacing: '1px' }}>
                CROWN COFFEE
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#F8FAFC' }}>
                Attendance & RFID Kiosk
              </h1>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#94A3B8' }}>
              Tap RFID card anytime on USB reader to check in/out. Realtime WebSocket sync enabled.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setQrModalOpen(true)}
              style={{
                background: '#D4933A',
                color: '#0F172A',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Wifi size={18} /> Tap Card / Manual Code
            </button>

            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '10px 20px', textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '1px', color: '#38BDF8' }}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                {currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>
        </div>

        {/* Live RFID Tap Alert Toast */}
        {lastTapEvent && (
          <div style={{
            background: '#065F46',
            color: 'white',
            borderRadius: '14px',
            padding: '16px 24px',
            marginBottom: '24px',
            fontWeight: 800,
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(6,95,70,0.3)'
          }}>
            <Sparkles size={22} />
            <span>🟢 REALTIME CARD TAP: <strong>{lastTapEvent.name}</strong> — {lastTapEvent.status} at {lastTapEvent.time}</span>
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ background: '#F1F5F9', color: '#475569', padding: '12px', borderRadius: '12px' }}><Users size={24} /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Active Staff</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A' }}>{totalCount}</div>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ background: '#DCFCE7', color: '#166534', padding: '12px', borderRadius: '12px' }}><CheckCircle2 size={24} /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present Today</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#166534' }}>{presentCount + lateCount}</div>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ background: '#FEF3C7', color: '#92400E', padding: '12px', borderRadius: '12px' }}><Clock size={24} /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Late Arrivals</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#92400E' }}>{lateCount}</div>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px', borderRadius: '12px' }}><AlertTriangle size={24} /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Not Checked In</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#991B1B' }}>{absentCount}</div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar: Department Tabs & Search Bar */}
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'all', label: 'All Staff' },
              { id: 'front', label: '☕ Front Staff' },
              { id: 'kitchen', label: '🍳 Kitchen Staff' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDepartmentFilter(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: departmentFilter === tab.id ? '#0F172A' : '#F1F5F9',
                  color: departmentFilter === tab.id ? 'white' : '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search staff by name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Staff Grid */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading Staff Directory & RFID Attendance…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredRecords.map(r => {
              const isPresent = r.status === 'present'
              const isLate = r.status === 'late'
              const isOff = r.status === 'off'
              const isLeave = r.status === 'on_leave'
              const isCheckedIn = isPresent || isLate

              let statusBg = '#F1F5F9'
              let statusColor = '#475569'
              let statusText = 'NOT CHECKED IN'

              if (isPresent) { statusBg = '#DCFCE7'; statusColor = '#15803D'; statusText = 'PRESENT' }
              else if (isLate) { statusBg = '#FEF3C7'; statusColor = '#B45309'; statusText = `LATE (${r.minutes_late || 0}m)` }
              else if (isLeave) { statusBg = '#DBEAFE'; statusColor = '#1D4ED8'; statusText = 'ON LEAVE' }
              else if (isOff) { statusBg = '#F3E8FF'; statusColor = '#7E22CE'; statusText = 'DAY OFF' }

              return (
                <div key={r.staff_id} style={{
                  background: 'white',
                  border: isCheckedIn ? '2px solid #16A34A' : '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  boxShadow: isCheckedIn ? '0 4px 14px rgba(22,163,74,0.08)' : '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {r.photo_url ? (
                          <img src={r.photo_url} alt={r.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9', border: '2px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#475569', fontSize: '16px' }}>
                            {r.name ? r.name.slice(0, 2).toUpperCase() : 'CC'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{r.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{r.employee_id} • {r.designation}</div>
                        </div>
                      </div>

                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: statusBg,
                        color: statusColor,
                        letterSpacing: '0.03em'
                      }}>
                        {statusText}
                      </span>
                    </div>

                    {/* Department Tag & Card Status */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: r.department === 'kitchen' ? '#FEF3C7' : '#E0F2FE',
                        color: r.department === 'kitchen' ? '#92400E' : '#0369A1',
                        fontWeight: 700
                      }}>
                        {r.department === 'kitchen' ? '🍳 Kitchen Staff' : '☕ Front Staff'}
                      </span>

                      {r.rfid_code ? (
                        <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
                          💳 RFID Active
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                          ⚠️ Card Unpaired
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timing & Check In Action */}
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '14px', color: '#334155' }}>
                      <div>
                        <span style={{ color: '#94A3B8', fontSize: '10px', display: 'block', fontWeight: 700 }}>CHECK-IN</span>
                        <strong style={{ fontSize: '13px' }}>
                          {r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: '#94A3B8', fontSize: '10px', display: 'block', fontWeight: 700 }}>CHECK-OUT</span>
                        <strong style={{ fontSize: '13px' }}>
                          {r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                        </strong>
                      </div>

                      {r.hours_worked > 0 && (
                        <div>
                          <span style={{ color: '#94A3B8', fontSize: '10px', display: 'block', fontWeight: 700 }}>DUTY</span>
                          <strong style={{ fontSize: '13px', color: '#16A34A' }}>{r.hours_worked}h</strong>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCheckin(r.staff_id, null, 'manual')}
                      disabled={checkingIn || (r.check_in_at && r.check_out_at)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: r.check_in_at && !r.check_out_at ? '#DC2626' : (r.check_out_at ? '#F1F5F9' : '#0F172A'),
                        color: r.check_out_at ? '#64748B' : 'white',
                        border: r.check_out_at ? '1px solid #CBD5E1' : 'none',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: r.check_in_at && r.check_out_at ? 'default' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {r.check_in_at && !r.check_out_at
                        ? '🔴 Clock Out Now'
                        : (r.check_out_at ? '✅ Shift Completed' : '🟢 Clock In Now')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal: Manual RFID Tap Input */}
        {qrModalOpen && (
          <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} title="Tap RFID Card or Enter Code">
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ background: '#F1F5F9', border: '2px dashed #CBD5E1', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
                <Wifi size={40} color="#0F172A" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#0F172A' }}>Ready for RFID Card Tap</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Tap your RFID card on the USB reader or enter code manually</div>
              </div>

              <input
                id="rfid-kiosk-input"
                type="text"
                placeholder="RFID Code or Employee ID..."
                value={qrCodeInput}
                onChange={e => setQrCodeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCheckin(qrCodeInput, null, 'rfid')
                }}
                autoFocus
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '16px', textAlign: 'center', marginBottom: '16px', outline: 'none' }}
              />

              <button
                onClick={() => handleCheckin(qrCodeInput, null, 'rfid')}
                disabled={checkingIn}
                style={{ width: '100%', padding: '12px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
              >
                {checkingIn ? 'Processing...' : 'Submit Check-In'}
              </button>
            </div>
          </Modal>
        )}

      </main>
    </div>
  )
}
