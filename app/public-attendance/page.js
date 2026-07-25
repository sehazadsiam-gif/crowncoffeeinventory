'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Head from 'next/head'


function AnalogClock({ size = 52, time = new Date() }) {
  const seconds = time.getSeconds()
  const minutes = time.getMinutes()
  const hours = time.getHours() % 12

  const secDeg = (seconds / 60) * 360
  const minDeg = ((minutes + seconds / 60) / 60) * 360
  const hourDeg = ((hours + minutes / 60) / 12) * 360

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '10px 18px' }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: '#0F172A',
        border: '2.5px solid #D4933A',
        boxShadow: '0 4px 12px rgba(0,0,0,0.35), inset 0 0 8px rgba(0,0,0,0.5)',
        position: 'relative',
        flexShrink: 0
      }}>
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            style={{
              position: 'absolute',
              width: '2px',
              height: '5px',
              background: '#D4933A',
              top: '3px',
              left: 'calc(50% - 1px)',
              transformOrigin: `50% ${size / 2 - 3}px`,
              transform: `rotate(${deg}deg)`
            }}
          />
        ))}
        {/* Hour Hand */}
        <div style={{
          position: 'absolute',
          width: '3px',
          height: `${size * 0.26}px`,
          background: '#F8FAFC',
          borderRadius: '4px',
          top: `${size * 0.24}px`,
          left: `calc(50% - 1.5px)`,
          transformOrigin: '50% 100%',
          transform: `rotate(${hourDeg}deg)`
        }} />
        {/* Minute Hand */}
        <div style={{
          position: 'absolute',
          width: '2px',
          height: `${size * 0.36}px`,
          background: '#38BDF8',
          borderRadius: '4px',
          top: `${size * 0.14}px`,
          left: `calc(50% - 1px)`,
          transformOrigin: '50% 100%',
          transform: `rotate(${minDeg}deg)`
        }} />
        {/* Second Hand */}
        <div style={{
          position: 'absolute',
          width: '1.5px',
          height: `${size * 0.42}px`,
          background: '#D4933A',
          borderRadius: '2px',
          top: `${size * 0.08}px`,
          left: `calc(50% - 0.75px)`,
          transformOrigin: '50% 100%',
          transform: `rotate(${secDeg}deg)`,
          transition: 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
        }} />
        {/* Pivot */}
        <div style={{
          position: 'absolute',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#D4933A',
          border: '1.5px solid #0F172A',
          top: 'calc(50% - 3px)',
          left: 'calc(50% - 3px)',
          zIndex: 10
        }} />
      </div>

      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: '17px', fontWeight: 900, color: '#38BDF8', letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
          {time.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>
    </div>
  )
}

export default function PublicAttendancePage() {
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [data, setData] = useState({ date: '', summary: {}, records: [] })
  const [tapFlash, setTapFlash] = useState(null)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)
    fetchTodayData()

    function updateOnlineStatus() {
      setIsOffline(!navigator.onLine)
    }
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    const channel = supabase.channel('kiosk_v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_log' }, () => {
        fetchTodayData(true)
      })
      .subscribe()

    const pollTimer = setInterval(() => fetchTodayData(true), 10000)
    return () => {
      clearInterval(clockTimer)
      clearInterval(pollTimer)
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()
    function onKey(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const now = Date.now()
      if (now - lastKeyTime > 150) buffer = ''
      lastKeyTime = now
      if (e.key === 'Enter') {
        if (buffer.length >= 3) { e.preventDefault(); doCheckin(buffer.trim()); buffer = '' }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function fetchTodayData(silent = false) {
    try {
      if (!silent) setLoading(true)
      const res = await fetch(`/api/attendance/today?t=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) {
        setData(json)
        setIsOffline(false)
      } else {
        setIsOffline(true)
      }
    } catch (e) {
      console.error(e)
      setIsOffline(true)
    }
    finally { if (!silent) setLoading(false) }
  }

  const [breakToggles, setBreakToggles] = useState({})

  async function doCheckin(identifier) {
    try {
      // Find staff ID or employee_id key in breakToggles
      const isBreakOn = Object.entries(breakToggles).some(([k, v]) => v && (k === identifier || String(identifier).includes(k)))

      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, source: 'rfid', enableBreak: isBreakOn })
      })
      const json = await res.json()
      const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
      if (res.ok) {
        setIsOffline(false)
        let flashType = 'in'
        if (json.action === 'break_start') flashType = 'break_start'
        else if (json.action === 'break_end') flashType = 'break_end'
        else if (json.alreadyCheckedOut || json.action === 'check_out') flashType = 'out'
        else if (json.status === 'late') flashType = 'late'

        setTapFlash({
          name: json.staff?.name || 'Staff Member',
          id: json.staff?.employee_id || '',
          time: t,
          type: flashType,
          subText: json.message || json.subText
        })
      } else if (json.blocked) {
        setIsOffline(false)
        setTapFlash({
          name: json.staff?.name || 'Staff Member',
          id: json.staff?.employee_id || '',
          time: t,
          type: 'done'
        })
      } else {
        setTapFlash({ name: 'Card Not Recognised', id: '', time: t, type: 'error' })
      }
      fetchTodayData(true)
      setTimeout(() => setTapFlash(null), 2500)
    } catch (e) {
      console.error(e)
      setIsOffline(true)
      setTapFlash({ name: 'Connection Error (Offline)', id: '', time: new Date().toLocaleTimeString(), type: 'error' })
      setTimeout(() => setTapFlash(null), 3000)
    }
  }

  const records = data.records || []
  const filtered = departmentFilter === 'all' ? records : records.filter(r => (r.department || 'front') === departmentFilter)

  const totalIn = records.filter(r => r.status === 'present' || r.status === 'late').length
  const totalStaff = records.length
  const lateCount = records.filter(r => r.status === 'late').length
  const absentCount = records.filter(r => r.status === 'absent').length

  const flashConfig = {
    in:          { bg: '#16A34A', icon: '✓', heading: 'CHECKED IN',   sub: 'On Time' },
    late:        { bg: '#D97706', icon: '✓', heading: 'CHECKED IN',   sub: 'Late Arrival' },
    break_start: { bg: '#D97706', icon: '☕', heading: 'BREAK STARTED', sub: 'Enjoy your break! Tap card when returning.' },
    break_end:   { bg: '#2563EB', icon: '✓', heading: 'BREAK ENDED',   sub: 'Welcome back to your shift!' },
    out:         { bg: '#1D4ED8', icon: '✓', heading: 'CHECKED OUT',  sub: 'Duty Complete' },
    done:        { bg: '#475569', icon: '✓', heading: 'SHIFT COMPLETED', sub: 'Check-in & check-out recorded for today' },
    error:       { bg: '#DC2626', icon: '✕', heading: 'NOT FOUND',    sub: 'Card not paired to any staff' },
  }

  return (
    <>
      <Head>
        <link rel="manifest" href="/attendance-manifest.json" />
        <meta name="theme-color" content="#D4933A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="CC Attendance" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>
    <div style={{ minHeight: '100vh', background: '#F1F5F9', fontFamily: 'var(--font-sans)' }}>

      {/* Offline Alert Banner */}
      {isOffline && (
        <div style={{ background: '#DC2626', color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px', textAlign: 'center', fontWeight: 800, fontSize: '13px', position: 'sticky', top: 0, zIndex: 10000, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
          OFFLINE — Taps cannot be recorded. Check your internet connection.
        </div>
      )}
      {tapFlash && (() => {
        const cfg = flashConfig[tapFlash.type]
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: cfg.bg,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '64px', color: 'white', marginBottom: '32px'
            }}>{cfg.icon}</div>

            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '4px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
              {cfg.heading}
            </div>

            <div style={{ fontSize: '56px', fontWeight: 900, color: 'white', letterSpacing: '-1px', marginBottom: '8px' }}>
              {tapFlash.name}
            </div>

            {tapFlash.id && (
              <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: '24px' }}>
                {tapFlash.id}
              </div>
            )}

            <div style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: '12px',
              padding: '12px 28px', fontSize: '24px', fontWeight: 800,
              color: 'white', letterSpacing: '1px', fontFamily: 'monospace'
            }}>
              {tapFlash.time}
            </div>

            <div style={{ marginTop: '20px', fontSize: '15px', color: 'rgba(255,255,255,0.5)' }}>{cfg.sub}</div>
          </div>
        )
      })()}

      {/* Top Header */}
      <div style={{
        background: '#0F172A',
        padding: '0 40px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Left: Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: '#D4933A', borderRadius: '10px',
            padding: '8px 14px', fontSize: '14px', fontWeight: 900,
            color: '#0F172A', letterSpacing: '1px'
          }}>CC</div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em' }}>Crown Coffee</div>
            <div style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>ATTENDANCE KIOSK</div>
          </div>
        </div>

        {/* Center: Stats */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <Stat label="IN TODAY" value={totalIn} color="#22C55E" />
          <Stat label="LATE" value={lateCount} color="#FBBF24" />
          <Stat label="ABSENT" value={absentCount} color="#F87171" />
          <Stat label="TOTAL" value={totalStaff} color="#94A3B8" />
        </div>

        {/* Right: Clock & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => fetchTodayData(false)}
            title="Refresh Attendance Data"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            Refresh
          </button>

          <AnalogClock time={currentTime} />
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '12px 40px', display: 'flex', gap: '8px' }}>
        {[['all', 'All Staff'], ['front', 'Front of House'], ['kitchen', 'Kitchen']].map(([id, label]) => (
          <button key={id} onClick={() => setDepartmentFilter(id)} style={{
            padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '13px', transition: 'all 0.15s',
            background: departmentFilter === id ? '#0F172A' : '#F1F5F9',
            color: departmentFilter === id ? 'white' : '#64748B'
          }}>{label}</button>
        ))}

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '16px', fontWeight: 600 }}>
          <span>Morning grace: <strong style={{ color: '#F59E0B' }}>8:15 AM</strong></span>
          <span>Afternoon grace: <strong style={{ color: '#F59E0B' }}>1:15 PM</strong></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }}></span>
            Live
          </span>
        </div>
      </div>

      {/* Staff Grid */}
      <main style={{ padding: '32px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#94A3B8', fontSize: '16px', fontWeight: 600 }}>
            Loading...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '16px' }}>
            {filtered.map(r => {
              const staffKey = r.staff_id || r.id || r.employee_id
              return (
                <StaffCard
                  key={staffKey}
                  r={r}
                  isBreakOn={!!breakToggles[staffKey]}
                  onToggleBreak={(val) => setBreakToggles(prev => ({ ...prev, [staffKey]: val }))}
                />
              )
            })}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
    </>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '28px', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '0.1em', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function StaffCard({ r, isBreakOn, onToggleBreak }) {
  const isIn = r.status === 'present'
  const isLate = r.status === 'late'
  const isOut = (isIn || isLate) && !!r.check_out_at
  const isOnBreak = (isIn || isLate) && !!r.break_start_at && !r.break_end_at
  const isBackFromBreak = (isIn || isLate) && !!r.break_end_at && !r.check_out_at
  const isAbsent = r.status === 'absent'
  const isLeave = r.status === 'on_leave'
  const isDayOff = r.status === 'off'

  let borderColor = '#E2E8F0'
  let statusDot = '#CBD5E1'
  let statusText = 'Not In'
  let statusColor = '#94A3B8'
  let bgColor = 'white'

  if (isOut) {
    borderColor = '#93C5FD'; statusDot = '#3B82F6'
    statusText = 'Checked Out'; statusColor = '#1D4ED8'
  } else if (isOnBreak) {
    borderColor = '#FCD34D'; statusDot = '#F59E0B'
    statusText = 'On Break ☕'; statusColor = '#B45309'; bgColor = '#FFFBEB'
  } else if (isBackFromBreak) {
    borderColor = '#93C5FD'; statusDot = '#2563EB'
    statusText = 'Back From Break'; statusColor = '#1D4ED8'; bgColor = '#F0F9FF'
  } else if (isIn) {
    borderColor = '#86EFAC'; statusDot = '#16A34A'
    statusText = 'Present'; statusColor = '#15803D'; bgColor = '#F0FDF4'
  } else if (isLate) {
    borderColor = '#FCD34D'; statusDot = '#D97706'
    statusText = 'Late'; statusColor = '#B45309'; bgColor = '#FFFBEB'
  } else if (isAbsent) {
    borderColor = '#FCA5A5'; statusDot = '#DC2626'
    statusText = 'Absent'; statusColor = '#991B1B'
  } else if (isLeave) {
    borderColor = '#C4B5FD'; statusDot = '#7C3AED'
    statusText = 'On Leave'; statusColor = '#6D28D9'
  } else if (isDayOff) {
    statusText = 'Day Off'; statusColor = '#64748B'
  }

  const fmtTime = (ts) => ts
    ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
    : null

  return (
    <div style={{
      background: bgColor,
      border: `2px solid ${borderColor}`,
      borderRadius: '16px',
      padding: '20px',
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        {/* Top: Avatar + Name + Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          {r.photo_url ? (
            <img src={r.photo_url} alt={r.name}
              style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${borderColor}` }} />
          ) : (
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
              background: '#F1F5F9', border: `3px solid ${borderColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '18px', color: '#475569'
            }}>
              {r.name ? r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CC'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '1px' }}>{r.designation}</div>
          </div>
          {/* Status Dot */}
          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: statusDot, flexShrink: 0, boxShadow: `0 0 0 3px ${statusDot}22` }} />
        </div>

        {/* Status Badge + Individual Break Toggle Checkbox */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em',
            color: statusColor, background: `${borderColor}55`,
            padding: '4px 10px', borderRadius: '20px'
          }}>
            {statusText}
            {isLate && !isOut && r.minutes_late > 0 && ` · ${r.minutes_late}m late`}
          </span>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', background: isBreakOn ? '#FEF3C7' : '#F8FAFC', border: isBreakOn ? '1px solid #F59E0B' : '1px solid #E2E8F0', padding: '3px 8px', borderRadius: '8px', transition: 'all 0.15s' }}>
            <input
              type="checkbox"
              checked={isBreakOn}
              onChange={e => onToggleBreak(e.target.checked)}
              style={{ width: '14px', height: '14px', accentColor: '#D4933A', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', fontWeight: 800, color: isBreakOn ? '#B45309' : '#64748B' }}>
              Take Break ☕
            </span>
          </label>
        </div>

        {/* Time Row */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <TimeChip label="IN" time={fmtTime(r.check_in_at)} color="#16A34A" />
          {(r.break_start_at || isBreakOn) && (
            <TimeChip
              label="BREAK"
              time={r.break_duration_minutes > 0 ? `${r.break_duration_minutes}m` : fmtTime(r.break_start_at) || '—'}
              color="#D97706"
            />
          )}
          <TimeChip label="OUT" time={fmtTime(r.check_out_at)} color="#2563EB" />
          {r.hours_worked > 0 && <TimeChip label="DUTY" time={`${r.hours_worked}h`} color="#7C3AED" />}
        </div>
      </div>
    </div>
  )
}

function TimeChip({ label, time, color }) {
  return (
    <div style={{
      flex: 1, background: '#F8FAFC', borderRadius: '8px',
      padding: '8px 10px', textAlign: 'center',
      border: time ? `1px solid ${color}33` : '1px solid #F1F5F9'
    }}>
      <div style={{ fontSize: '9px', fontWeight: 800, color: time ? color : '#CBD5E1', letterSpacing: '0.08em', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 800, color: time ? '#0F172A' : '#D1D5DB', fontFamily: 'monospace' }}>
        {time || '—'}
      </div>
    </div>
  )
}
