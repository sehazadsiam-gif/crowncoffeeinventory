'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Clock, CheckCircle2, AlertTriangle, Users, Calendar, Sparkles, Monitor, Wifi, Search, ShieldCheck } from 'lucide-react'

export default function PublicAttendancePage() {
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [data, setData] = useState({ date: '', summary: {}, records: [] })
  const [lastTapEvent, setLastTapEvent] = useState(null)
  const [showAutoStartGuide, setShowAutoStartGuide] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState('all')

  useEffect(() => {
    // 1. Live digital clock ticker (every second)
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)

    // 2. Fetch initial data
    fetchTodayData()

    // 3. Supabase Realtime WebSocket subscription
    const channel = supabase.channel('public_attendance_kiosk_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_log' }, (payload) => {
        fetchTodayData(true)
        if (payload.new && payload.new.employee_id) triggerTapBanner(payload.new)
      })
      .subscribe()

    const pollTimer = setInterval(() => fetchTodayData(true), 10000)

    return () => {
      clearInterval(clockTimer)
      clearInterval(pollTimer)
      supabase.removeChannel(channel)
    }
  }, [])

  // USB RFID Hardware Reader Keydown Listener
  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    function handleGlobalKeyDown(e) {
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'TEXTAREA' || activeTag === 'INPUT') return

      const currentTime = Date.now()
      if (currentTime - lastKeyTime > 120) {
        buffer = ''
      }
      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault()
          handleRfidCheckin(buffer.trim())
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
      console.error('Failed to fetch public attendance', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function handleRfidCheckin(identifier) {
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, source: 'rfid' })
      })

      const json = await res.json()
      if (res.ok) {
        setLastTapEvent({
          name: json.staff?.name || 'Staff Member',
          status: json.alreadyCheckedOut ? `CHECKED OUT (${json.hoursWorked}h)` : (json.status || 'present').toUpperCase(),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
          success: true
        })
        fetchTodayData(true)
      } else {
        setLastTapEvent({
          name: 'RFID Tap',
          status: json.error || 'Check-in failed',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
          success: false
        })
      }

      setTimeout(() => setLastTapEvent(null), 7000)
    } catch (err) {
      console.error('RFID checkin error', err)
    }
  }

  function triggerTapBanner(entry) {
    const timeStr = entry.check_in_at
      ? new Date(entry.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    setLastTapEvent({
      name: entry.employee_id || 'Staff Member',
      status: (entry.status || 'present').toUpperCase(),
      time: timeStr,
      success: true
    })

    setTimeout(() => setLastTapEvent(null), 7000)
  }

  const records = data.records || []
  const filteredRecords = records.filter(r => departmentFilter === 'all' || (r.department || 'front') === departmentFilter)

  const presentCount = records.filter(r => r.status === 'present').length
  const lateCount = records.filter(r => r.status === 'late').length
  const totalCount = records.length
  const absentCount = totalCount - (presentCount + lateCount)

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Banner Header - Light Executive Style */}
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '20px 32px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#0F172A', color: '#D4933A', padding: '6px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '15px', letterSpacing: '1px' }}>
                CROWN COFFEE
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Live Attendance Kiosk
              </h1>
              <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', display: 'inline-block' }}></span>
                REALTIME SYNC
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
              Tap RFID card on USB reader to check in/out live. Auto resets daily at 12:00 AM Midnight.
            </p>
          </div>

          {/* Clock & Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setShowAutoStartGuide(!showAutoStartGuide)}
              style={{ background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Monitor size={16} /> PC Auto-Start Guide
            </button>

            <div style={{ textAlign: 'right', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '10px 20px' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace', letterSpacing: '1px' }}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
                {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* RFID Tap Toast Banner */}
      {lastTapEvent && (
        <div style={{
          background: lastTapEvent.success ? '#059669' : '#DC2626',
          color: 'white',
          padding: '16px 32px',
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: 800,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Sparkles size={24} />
          <span>
            {lastTapEvent.success ? 'RFID TAP RECORDED: ' : 'CHECKIN NOTICE: '}
            <strong>{lastTapEvent.name}</strong> — {lastTapEvent.status} at {lastTapEvent.time}
          </span>
        </div>
      )}

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '32px' }}>

        {/* Auto-Start PC Guide Drawer */}
        {showAutoStartGuide && (
          <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '16px', padding: '24px', marginBottom: '32px', color: '#334155', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0F172A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Monitor size={20} color="#0F172A" /> How to Set Up Auto-Start on Cafe PC / Tablet
              </h3>
              <button onClick={() => setShowAutoStartGuide(false)} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '18px', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', fontSize: '13px', lineHeight: '1.6' }}>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#0F172A', fontSize: '14px' }}>Windows PC Auto-Startup:</strong>
                <ol style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
                  <li>Press <kbd>Win + R</kbd>, type <kbd>shell:startup</kbd> and press Enter.</li>
                  <li>Create a shortcut to Chrome with target:<br />
                    <code style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', color: '#0F172A', fontWeight: 700 }}>chrome.exe --app=https://ccadmin.online/public-attendance</code>
                  </li>
                  <li>Whenever the Windows PC turns on, Chrome opens in full-screen app mode!</li>
                </ol>
              </div>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#059669', fontSize: '14px' }}>Tablet / PWA App Install:</strong>
                <ol style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
                  <li>Open Chrome/Safari on your tablet/PC.</li>
                  <li>Click Chrome menu ➔ <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.</li>
                  <li>Enable "Kiosk Mode" or "Single App Mode" in Tablet Settings.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ background: '#F1F5F9', color: '#475569', padding: '14px', borderRadius: '12px' }}><Users size={28} /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Active Staff</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A' }}>{totalCount}</div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ background: '#DCFCE7', color: '#166534', padding: '14px', borderRadius: '12px' }}><CheckCircle2 size={28} /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present Today</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#166534' }}>{presentCount + lateCount}</div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ background: '#FEF3C7', color: '#92400E', padding: '14px', borderRadius: '12px' }}><Clock size={28} /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Late Arrivals</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#92400E' }}>{lateCount}</div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '14px', borderRadius: '12px' }}><AlertTriangle size={28} /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Not Checked In</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#991B1B' }}>{absentCount}</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { id: 'all', label: 'All Staff' },
            { id: 'front', label: 'Front Staff' },
            { id: 'kitchen', label: 'Kitchen Staff' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDepartmentFilter(tab.id)}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                background: departmentFilter === tab.id ? '#0F172A' : '#FFFFFF',
                color: departmentFilter === tab.id ? 'white' : '#475569',
                border: departmentFilter === tab.id ? 'none' : '1px solid #CBD5E1',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Staff Grid */}
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center', color: '#64748B' }}>Loading Live Kiosk Display…</div>
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
                  background: '#FFFFFF',
                  border: isCheckedIn ? '2px solid #16A34A' : '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  boxShadow: isCheckedIn ? '0 4px 14px rgba(22,163,74,0.08)' : '0 2px 6px rgba(0,0,0,0.02)'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {r.photo_url ? (
                          <img src={r.photo_url} alt={r.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #CBD5E1' }} />
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

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: r.department === 'kitchen' ? '#FEF3C7' : '#E0F2FE',
                        color: r.department === 'kitchen' ? '#92400E' : '#0369A1',
                        fontWeight: 700
                      }}>
                        {r.department === 'kitchen' ? 'Kitchen Staff' : 'Front Staff'}
                      </span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155' }}>
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
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
