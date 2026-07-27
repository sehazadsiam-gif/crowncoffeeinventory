'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Head from 'next/head'

function HeaderClock({ time = new Date() }) {
  const seconds = time.getSeconds()
  const minutes = time.getMinutes()
  const hours = time.getHours() % 12

  const secDeg = (seconds / 60) * 360
  const minDeg = ((minutes + seconds / 60) / 60) * 360
  const hourDeg = ((hours + minutes / 60) / 12) * 360

  const timeString = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
  const dateString = time.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Dhaka' })

  const sz = 52

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

      {/* 52px mini analog dial — fits inside 80px dark header */}
      <div style={{
        width: `${sz}px`, height: `${sz}px`,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%)',
        border: '2px solid #D4933A',
        boxShadow: '0 0 16px rgba(212,147,58,0.3), inset 0 1px 4px rgba(0,0,0,0.6)',
        position: 'relative', flexShrink: 0
      }}>
        {/* 12 ticks */}
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => (
          <div key={deg} style={{
            position: 'absolute',
            width: deg % 90 === 0 ? '2px' : '1px',
            height: deg % 90 === 0 ? '5px' : '3px',
            background: deg % 90 === 0 ? '#D4933A' : 'rgba(255,255,255,0.3)',
            top: '3px',
            left: `calc(50% - ${deg % 90 === 0 ? 1 : 0.5}px)`,
            transformOrigin: `50% ${sz / 2 - 3}px`,
            transform: `rotate(${deg}deg)`
          }} />
        ))}
        {/* Hour */}
        <div style={{
          position: 'absolute', width: '3px', height: `${sz * 0.25}px`,
          background: '#F8FAFC', borderRadius: '2px',
          top: `${sz * 0.25}px`, left: 'calc(50% - 1.5px)',
          transformOrigin: '50% 100%', transform: `rotate(${hourDeg}deg)`, zIndex: 3
        }} />
        {/* Minute */}
        <div style={{
          position: 'absolute', width: '2px', height: `${sz * 0.35}px`,
          background: '#38BDF8', borderRadius: '2px',
          top: `${sz * 0.15}px`, left: 'calc(50% - 1px)',
          transformOrigin: '50% 100%', transform: `rotate(${minDeg}deg)`, zIndex: 4
        }} />
        {/* Second */}
        <div style={{
          position: 'absolute', width: '1px', height: `${sz * 0.4}px`,
          background: '#EF4444', borderRadius: '1px',
          top: `${sz * 0.1}px`, left: 'calc(50% - 0.5px)',
          transformOrigin: '50% 100%', transform: `rotate(${secDeg}deg)`,
          transition: 'transform 0.15s cubic-bezier(0.4, 2.2, 0.55, 0.44)', zIndex: 5
        }} />
        {/* Center */}
        <div style={{
          position: 'absolute', width: '6px', height: '6px', borderRadius: '50%',
          background: '#D4933A', border: '1px solid #0F172A',
          top: 'calc(50% - 3px)', left: 'calc(50% - 3px)', zIndex: 10
        }} />
      </div>

      {/* Digital time + date */}
      <div>
        <div style={{
          fontSize: '22px', fontWeight: 800, color: '#F8FAFC',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: 1, letterSpacing: '-0.5px'
        }}>
          {timeString}
        </div>
        <div style={{
          fontSize: '11px', color: '#94A3B8', fontWeight: 700, marginTop: '5px',
          display: 'flex', alignItems: 'center', gap: '6px',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          <span style={{ color: '#E2E8F0' }}>{dateString}</span>
          <span style={{
            fontSize: '9px', background: 'rgba(212,147,58,0.2)', color: '#F59E0B',
            padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(245,158,11,0.4)', fontWeight: 800
          }}>BST</span>
        </div>
      </div>
    </div>
  )
}

export default function PublicAttendancePage() {
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [data, setData] = useState({ date: '', month_name: 'July', summary: {}, records: [] })
  const [tapFlash, setTapFlash] = useState(null)
  const [departmentFilter, setDepartmentFilter] = useState('all') // 'all', 'grouped', 'front', 'kitchen'
  const [searchQuery, setSearchQuery] = useState('')
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)
    fetchTodayData()

    function updateOnlineStatus() {
      setIsOffline(!navigator.onLine)
    }
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    const channel = supabase.channel('kiosk_v7')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_log' }, () => {
        fetchTodayData(true)
      })
      .subscribe()

    const pollTimer = setInterval(() => fetchTodayData(true), 5000)
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
      const normId = String(identifier || '').trim().replace(/^0+/, '')
      const upperId = String(identifier || '').trim().toUpperCase()

      // Matching against rfid_code, employee_id, or staff_id
      const matchedStaff = records.find(r => {
        const normRfid = String(r.rfid_code || '').trim().replace(/^0+/, '')
        const upperEmp = String(r.employee_id || '').trim().toUpperCase()
        return (
          (normRfid && normRfid === normId) ||
          (upperEmp && upperEmp === upperId) ||
          r.staff_id === identifier ||
          r.id === identifier
        )
      })

      const staffKey = matchedStaff ? (matchedStaff.staff_id || matchedStaff.id || matchedStaff.employee_id) : identifier
      const isBreakOn = !!breakToggles[staffKey] || Object.entries(breakToggles).some(([k, v]) => v && (k === identifier || String(identifier).includes(k)))

      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, source: 'rfid', enableBreak: isBreakOn })
      })
      const json = await res.json()
      const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
      if (res.ok) {
        setIsOffline(false)
        setBreakToggles(prev => ({ ...prev, [staffKey]: false }))
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
          type: 'blocked',
          subText: json.error || 'Attendance already completed today.'
        })
      } else {
        setTapFlash({
          name: 'Scan Warning',
          id: '',
          time: t,
          type: 'error',
          subText: json.error || 'API Error'
        })
      }

      fetchTodayData(true)
      setTimeout(() => setTapFlash(null), 3500)
    } catch (err) {
      setTapFlash({
        name: 'Connection Error',
        id: '',
        time: '',
        type: 'error',
        subText: err.message || 'Server network error'
      })
      setTimeout(() => setTapFlash(null), 3500)
    }
  }

  const records = data.records || []
  const monthName = data.month_name || new Date().toLocaleDateString('en-US', { month: 'long', timeZone: 'Asia/Dhaka' })

  // Search & Filter
  const filtered = records.filter(r => {
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery = !q || r.name.toLowerCase().includes(q) || String(r.employee_id || '').toLowerCase().includes(q)
    if (!matchesQuery) return false
    if (departmentFilter === 'front') return r.department === 'front'
    if (departmentFilter === 'kitchen') return r.department === 'kitchen'
    return true
  })

  // Categorize staff members
  const presentGroup = filtered.filter(r => (r.status === 'present' || !!r.check_in_at) && r.status !== 'late')
  const lateGroup = filtered.filter(r => r.status === 'late')
  const absentGroup = filtered.filter(r => r.status === 'absent' && !r.check_in_at)
  const leaveGroup = filtered.filter(r => r.status === 'on_leave' || r.status === 'off')

  const totalStaff = records.length
  const totalIn = records.filter(r => (r.status === 'present' || r.status === 'late' || !!r.check_in_at) && !r.check_out_at).length
  const lateCount = records.filter(r => r.status === 'late').length
  const absentCount = records.filter(r => r.status === 'absent' && !r.check_in_at).length

  const flashConfig = {
    in: {
      bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      glow: '#10B981',
      icon: <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>,
      heading: 'CHECKED IN',
      sub: 'Have a great shift!'
    },
    late: {
      bg: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
      glow: '#F59E0B',
      icon: <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>,
      heading: 'CHECKED IN (LATE)',
      sub: 'Logged late arrival.'
    },
    break_start: {
      bg: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
      glow: '#F59E0B',
      icon: <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>,
      heading: 'BREAK STARTED',
      sub: 'Enjoy your break!'
    },
    break_end: {
      bg: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
      glow: '#0EA5E9',
      icon: <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>,
      heading: 'BACK FROM BREAK',
      sub: 'Welcome back to duty!'
    },
    out: {
      bg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
      glow: '#3B82F6',
      icon: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>,
      heading: 'CHECKED OUT',
      sub: 'Thank you for your hard work!'
    },
    blocked: {
      bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
      glow: '#94A3B8',
      icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
      heading: 'COOLDOWN / COMPLETE',
      sub: 'Scan ignored.'
    },
    error: {
      bg: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
      icon: <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>,
      heading: 'SYSTEM ERROR',
      sub: 'Please try again.'
    }
  }

  return (
    <>
      <Head>
        <title>Crown Coffee — Premium Attendance Kiosk</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.04) 0%, transparent 40%),
          radial-gradient(circle at 90% 10%, rgba(212, 147, 58, 0.06) 0%, transparent 40%),
          radial-gradient(circle at 50% 90%, rgba(14, 165, 233, 0.04) 0%, transparent 50%)
        `,
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#0F172A',
        userSelect: 'none'
      }}>

        {/* Offline Alert Notification */}
        {isOffline && (
          <div style={{
            background: '#EF4444', color: 'white',
            padding: '10px 24px', textAlign: 'center',
            fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', animation: 'pulse 1s infinite' }} />
            OFFLINE MODE — RECONNECTING TO CROWN COFFEE CLOUD...
          </div>
        )}

        {/* Tap Flash HUD Overlay */}
        {tapFlash && (() => {
          const cfg = flashConfig[tapFlash.type]
          return (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: cfg.bg,
              backdropFilter: 'blur(20px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div style={{
                width: '128px', height: '128px', borderRadius: '50%',
                border: '4px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', marginBottom: '28px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
              }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {cfg.icon}
                </svg>
              </div>

              <div style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '4px', color: 'rgba(255,255,255,0.85)', marginBottom: '10px', textTransform: 'uppercase' }}>
                {cfg.heading}
              </div>

              <div style={{ fontSize: '52px', fontWeight: 900, color: 'white', letterSpacing: '-1px', marginBottom: '8px', textAlign: 'center', padding: '0 24px' }}>
                {tapFlash.name}
              </div>

              {tapFlash.id && (
                <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: '24px' }}>
                  ID: {tapFlash.id}
                </div>
              )}

              {tapFlash.time && (
                <div style={{
                  background: 'rgba(0,0,0,0.25)', borderRadius: '12px',
                  padding: '12px 28px', fontSize: '24px', fontWeight: 800,
                  color: 'white', letterSpacing: '1px', fontFamily: "'JetBrains Mono', monospace",
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  {tapFlash.time}
                </div>
              )}

              <div style={{ marginTop: '20px', fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{tapFlash.subText || cfg.sub}</div>
            </div>
          )
        })()}

        {/* Top Dark Header */}
        <div style={{
          background: '#0F172A',
          padding: '0 40px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #D4933A',
          boxShadow: '0 4px 25px rgba(15, 23, 42, 0.15)',
          position: 'sticky', top: 0, zIndex: 100
        }}>
          {/* Left: Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D4933A 100%)', borderRadius: '12px',
              padding: '8px 14px', fontSize: '15px', fontWeight: 900,
              color: '#0F172A', letterSpacing: '1px', boxShadow: '0 4px 12px rgba(212,147,58,0.3)'
            }}>CC</div>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: '19px', letterSpacing: '-0.02em' }}>Crown Coffee</div>
              <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', marginTop: '1px' }}>ATTENDANCE KIOSK</div>
            </div>
          </div>

          {/* Center: Stats */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <Stat label="IN TODAY" value={totalIn} color="#22C55E" />
            <Stat label="LATE" value={lateCount} color="#FBBF24" />
            <Stat label="ABSENT" value={absentCount} color="#F87171" />
            <Stat label="TOTAL STAFF" value={totalStaff} color="#94A3B8" />
          </div>

          {/* Right: Clock & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              onClick={() => fetchTodayData(false)}
              title="Refresh Attendance Data"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#94A3B8',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s'
              }}
            >
              <svg
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              Refresh
            </button>

            <HeaderClock time={currentTime} />
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '14px 40px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            ['all', 'All Staff'],
            ['grouped', 'Grouped View'],
            ['front', 'Front of House'],
            ['kitchen', 'Kitchen']
          ].map(([id, label]) => (
            <button key={id} onClick={() => setDepartmentFilter(id)} style={{
              padding: '8px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: '13px', transition: 'all 0.15s',
              background: departmentFilter === id ? '#0F172A' : '#F1F5F9',
              color: departmentFilter === id ? 'white' : '#64748B',
              boxShadow: departmentFilter === id ? '0 4px 12px rgba(15,23,42,0.15)' : 'none'
            }}>{label}</button>
          ))}

          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px', marginLeft: '12px' }}>
            <input
              type="text"
              placeholder="Search staff name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '8px 12px 8px 34px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#0F172A',
                outline: 'none'
              }}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '10px' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '18px', fontWeight: 700 }}>
            <span>Morning grace: <strong style={{ color: '#D97706' }}>8:15 AM</strong></span>
            <span>Afternoon grace: <strong style={{ color: '#D97706' }}>1:15 PM</strong></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 800 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 8px rgba(22,163,74,0.6)', animation: 'pulse 2s infinite' }}></span>
              Live Sync
            </span>
          </div>
        </div>

        {/* Main Content View */}
        <main style={{ padding: '36px 40px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#94A3B8', fontSize: '16px', fontWeight: 700 }}>
              Loading Crown Coffee Kiosk...
            </div>
          ) : departmentFilter === 'grouped' ? (
            /* Explicit Grouped View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
              
              {/* PRESENT GROUP */}
              {presentGroup.length > 0 && (
                <StaffGroupSection
                  title="Present & On Duty"
                  count={presentGroup.length}
                  color="#16A34A"
                  bgColor="#F0FDF4"
                  borderColor="#86EFAC"
                  records={presentGroup}
                  breakToggles={breakToggles}
                  onToggleBreak={(key, val) => setBreakToggles(prev => ({ ...prev, [key]: val }))}
                  monthName={monthName}
                />
              )}

              {/* LATE GROUP */}
              {lateGroup.length > 0 && (
                <StaffGroupSection
                  title="Late Arrivals"
                  count={lateGroup.length}
                  color="#D97706"
                  bgColor="#FFFBEB"
                  borderColor="#FDE68A"
                  records={lateGroup}
                  breakToggles={breakToggles}
                  onToggleBreak={(key, val) => setBreakToggles(prev => ({ ...prev, [key]: val }))}
                  monthName={monthName}
                />
              )}

              {/* ABSENT GROUP */}
              {absentGroup.length > 0 && (
                <StaffGroupSection
                  title="Absent / Not In"
                  count={absentGroup.length}
                  color="#DC2626"
                  bgColor="#FEF2F2"
                  borderColor="#FCA5A5"
                  records={absentGroup}
                  breakToggles={breakToggles}
                  onToggleBreak={(key, val) => setBreakToggles(prev => ({ ...prev, [key]: val }))}
                  monthName={monthName}
                />
              )}

              {/* LEAVE / OFF GROUP */}
              {leaveGroup.length > 0 && (
                <StaffGroupSection
                  title="On Leave / Day Off"
                  count={leaveGroup.length}
                  color="#64748B"
                  bgColor="#F8FAFC"
                  borderColor="#E2E8F0"
                  records={leaveGroup}
                  breakToggles={breakToggles}
                  onToggleBreak={(key, val) => setBreakToggles(prev => ({ ...prev, [key]: val }))}
                  monthName={monthName}
                />
              )}
            </div>
          ) : (
            /* All Staff / Department Grid View (Grouped Intelligently into Sections) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
              
              {/* 1. PRESENT & ON DUTY SECTION */}
              {filtered.filter(r => (r.status === 'present' || !!r.check_in_at) && r.status !== 'late').length > 0 && (
                <div>
                  <SectionHeader title="PRESENT & ON DUTY" count={filtered.filter(r => (r.status === 'present' || !!r.check_in_at) && r.status !== 'late').length} color="#16A34A" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '22px' }}>
                    {filtered.filter(r => (r.status === 'present' || !!r.check_in_at) && r.status !== 'late').map(r => {
                      const staffKey = r.staff_id || r.id || r.employee_id
                      return (
                        <StaffCard
                          key={staffKey}
                          r={r}
                          isBreakOn={!!breakToggles[staffKey]}
                          onToggleBreak={(val) => setBreakToggles(prev => ({ ...prev, [staffKey]: val }))}
                          monthName={monthName}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 2. LATE ARRIVALS SECTION */}
              {filtered.filter(r => r.status === 'late').length > 0 && (
                <div>
                  <SectionHeader title="LATE ARRIVALS" count={filtered.filter(r => r.status === 'late').length} color="#D97706" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '22px' }}>
                    {filtered.filter(r => r.status === 'late').map(r => {
                      const staffKey = r.staff_id || r.id || r.employee_id
                      return (
                        <StaffCard
                          key={staffKey}
                          r={r}
                          isBreakOn={!!breakToggles[staffKey]}
                          onToggleBreak={(val) => setBreakToggles(prev => ({ ...prev, [staffKey]: val }))}
                          monthName={monthName}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 3. ABSENT SECTION */}
              {filtered.filter(r => r.status === 'absent' && !r.check_in_at).length > 0 && (
                <div>
                  <SectionHeader title="ABSENT / NOT IN" count={filtered.filter(r => r.status === 'absent' && !r.check_in_at).length} color="#DC2626" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '22px' }}>
                    {filtered.filter(r => r.status === 'absent' && !r.check_in_at).map(r => {
                      const staffKey = r.staff_id || r.id || r.employee_id
                      return (
                        <StaffCard
                          key={staffKey}
                          r={r}
                          isBreakOn={!!breakToggles[staffKey]}
                          onToggleBreak={(val) => setBreakToggles(prev => ({ ...prev, [staffKey]: val }))}
                          monthName={monthName}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 4. LEAVE / OFF SECTION */}
              {filtered.filter(r => r.status === 'on_leave' || r.status === 'off').length > 0 && (
                <div>
                  <SectionHeader title="ON LEAVE / DAY OFF" count={filtered.filter(r => r.status === 'on_leave' || r.status === 'off').length} color="#64748B" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '22px' }}>
                    {filtered.filter(r => r.status === 'on_leave' || r.status === 'off').map(r => {
                      const staffKey = r.staff_id || r.id || r.employee_id
                      return (
                        <StaffCard
                          key={staffKey}
                          r={r}
                          isBreakOn={!!breakToggles[staffKey]}
                          onToggleBreak={(val) => setBreakToggles(prev => ({ ...prev, [staffKey]: val }))}
                          monthName={monthName}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
          @keyframes spin { 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
        `}</style>
      </div>
    </>
  )
}

function SectionHeader({ title, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}66` }} />
      <h2 style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', letterSpacing: '0.04em', margin: 0, textTransform: 'uppercase' }}>
        {title}
      </h2>
      <span style={{
        background: `${color}15`, color: color, border: `1px solid ${color}33`,
        fontSize: '12px', fontWeight: 800, padding: '2px 10px', borderRadius: '12px',
        fontFamily: "'JetBrains Mono', monospace"
      }}>
        {count}
      </span>
      <div style={{ flex: 1, height: '1px', background: '#E2E8F0', marginLeft: '8px' }} />
    </div>
  )
}

function StaffGroupSection({ title, count, color, bgColor, borderColor, records, breakToggles, onToggleBreak, monthName }) {
  return (
    <div style={{ background: 'white', borderRadius: '24px', border: `1.5px solid ${borderColor}`, padding: '28px', boxShadow: '0 10px 30px -5px rgba(15,23,42,0.04)' }}>
      <SectionHeader title={title} count={count} color={color} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '22px' }}>
        {records.map(r => {
          const staffKey = r.staff_id || r.id || r.employee_id
          return (
            <StaffCard
              key={staffKey}
              r={r}
              isBreakOn={!!breakToggles[staffKey]}
              onToggleBreak={(val) => onToggleBreak(staffKey, val)}
              monthName={monthName}
            />
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '28px', fontWeight: 900, color, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

function StaffCard({ r, isBreakOn, onToggleBreak, monthName }) {
  const hasCheckedIn = !!r.check_in_at || r.status === 'present' || r.status === 'late'
  const isOut = hasCheckedIn && !!r.check_out_at
  const isOnBreak = hasCheckedIn && !!r.break_start_at && !r.break_end_at
  const isBackFromBreak = hasCheckedIn && !!r.break_end_at && !r.check_out_at
  const isLate = r.status === 'late' && !isOut && !isOnBreak && !isBackFromBreak
  const isIn = hasCheckedIn && !isOut && !isOnBreak && !isBackFromBreak
  const isAbsent = r.status === 'absent' && !hasCheckedIn
  const isLeave = r.status === 'on_leave'
  const isDayOff = r.status === 'off'

  // Monthly Warning Triggers
  const isLateWarning = (r.monthly_late_count || 0) >= 3
  const isZeroHolidayAlert = (r.monthly_absent_count || 0) >= 4

  let ringColor = '#CBD5E1'
  let ringGlow = 'rgba(203,213,225,0.4)'
  let statusText = 'Not In'
  let statusColor = '#64748B'
  let badgeBg = '#F1F5F9'
  let badgeBorder = '#CBD5E1'
  let cardBg = '#FFFFFF'

  if (isOut) {
    ringColor = '#3B82F6'; ringGlow = 'rgba(59,130,246,0.3)'
    statusText = 'Checked Out'; statusColor = '#1D4ED8'; badgeBg = '#EFF6FF'; badgeBorder = '#BFDBFE'
  } else if (isOnBreak) {
    ringColor = '#F59E0B'; ringGlow = 'rgba(245,158,11,0.35)'
    statusText = 'On Break'; statusColor = '#92400E'; badgeBg = '#FEF3C7'; badgeBorder = '#FDE68A'; cardBg = '#FFFBFA'
  } else if (isBackFromBreak) {
    ringColor = '#0284C7'; ringGlow = 'rgba(2,132,199,0.35)'
    statusText = 'Back From Break'; statusColor = '#0369A1'; badgeBg = '#E0F2FE'; badgeBorder = '#BAE6FD'; cardBg = '#F0F9FF'
  } else if (isLate) {
    ringColor = '#D97706'; ringGlow = 'rgba(217,119,6,0.35)'
    statusText = 'Late'; statusColor = '#92400E'; badgeBg = '#FEF3C7'; badgeBorder = '#FDE68A'; cardBg = '#FFFBFA'
  } else if (isIn) {
    ringColor = '#16A34A'; ringGlow = 'rgba(22,163,74,0.35)'
    statusText = 'Present'; statusColor = '#15803D'; badgeBg = '#DCFCE7'; badgeBorder = '#86EFAC'; cardBg = '#F0FDF4'
  } else if (isAbsent) {
    ringColor = '#DC2626'; ringGlow = 'rgba(220,38,38,0.35)'
    statusText = 'Absent'; statusColor = '#991B1B'; badgeBg = '#FEE2E2'; badgeBorder = '#FCA5A5'
  } else if (isLeave) {
    ringColor = '#7C3AED'; ringGlow = 'rgba(124,58,237,0.35)'
    statusText = 'On Leave'; statusColor = '#6D28D9'; badgeBg = '#F3E8FF'; badgeBorder = '#DDD6FE'
  } else if (isDayOff) {
    statusText = 'Day Off'; statusColor = '#64748B'
  }

  const fmtTime = (ts) => ts
    ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
    : null

  return (
    <div style={{
      background: cardBg,
      border: `1.5px solid ${ringColor}66`,
      borderRadius: '24px',
      padding: '22px',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex',
      flexDirection: 'column',
      justify: 'space-between',
      boxShadow: '0 12px 30px -5px rgba(15,23,42,0.06), 0 4px 6px -2px rgba(15,23,42,0.02)',
      position: 'relative'
    }}>
      <div>
        {/* Top: Avatar with Ring Light + Name + Status Dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          {r.photo_url ? (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={r.photo_url} alt={r.name}
                style={{
                  width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover',
                  border: `3px solid ${ringColor}`,
                  boxShadow: `0 0 16px ${ringGlow}`
                }} />
            </div>
          ) : (
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', flexShrink: 0,
              background: '#F1F5F9', border: `3px solid ${ringColor}`,
              boxShadow: `0 0 16px ${ringGlow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '20px', color: '#334155'
            }}>
              {r.name ? r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CC'}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{r.name}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>{r.designation}</div>
          </div>

          {/* Status Dot */}
          <div style={{
            width: '12px', height: '12px', borderRadius: '50%', background: ringColor, flexShrink: 0,
            boxShadow: `0 0 12px ${ringGlow}`
          }} />
        </div>

        {/* Warnings & Alerts */}
        {isZeroHolidayAlert && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B',
            borderRadius: '12px', padding: '8px 12px', fontSize: '11px', fontWeight: 800,
            marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>You have 0 holiday remaining for {r.month_name || monthName || 'this month'}</span>
          </div>
        )}

        {isLateWarning && !isZeroHolidayAlert && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E',
            borderRadius: '12px', padding: '8px 12px', fontSize: '11px', fontWeight: 800,
            marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Late Warning ({r.monthly_late_count} days late in {r.month_name || monthName || 'this month'})</span>
          </div>
        )}

        {/* Status Badge + Tactile iOS Style Break Switch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em',
            color: statusColor, background: badgeBg, border: `1px solid ${badgeBorder}`,
            padding: '4px 12px', borderRadius: '20px'
          }}>
            {statusText}
            {isLate && !isOut && r.minutes_late > 0 && ` · ${r.minutes_late}m late`}
          </span>

          {/* iOS Style Break Switch Pill */}
          <button
            onClick={() => onToggleBreak(!isBreakOn)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: isBreakOn ? '#FEF3C7' : '#F8FAFC',
              border: isBreakOn ? '1.5px solid #F59E0B' : '1.5px solid #E2E8F0',
              padding: '4px 10px',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            <div style={{
              width: '24px', height: '14px', borderRadius: '10px',
              background: isBreakOn ? '#D4933A' : '#CBD5E1',
              position: 'relative', transition: 'all 0.2s ease'
            }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%', background: 'white',
                position: 'absolute', top: '2px', left: isBreakOn ? '12px' : '2px',
                transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: isBreakOn ? '#92400E' : '#64748B' }}>
              Take Break
            </span>
          </button>
        </div>

        {/* Recessed Light Metric Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          <TimeChip label="IN" time={fmtTime(r.check_in_at)} color="#16A34A" />
          <TimeChip
            label="BREAK"
            time={r.break_duration_minutes > 0 ? `${(r.break_duration_minutes / 60).toFixed(2).replace(/\.00$/, '')}h` : fmtTime(r.break_start_at) || '—'}
            color="#D97706"
          />
          <TimeChip label="OUT" time={fmtTime(r.check_out_at)} color="#2563EB" />
          <TimeChip label="DUTY" time={r.hours_worked > 0 ? `${r.hours_worked}h` : '—'} color="#7C3AED" />
        </div>
      </div>
    </div>
  )
}

function TimeChip({ label, time, color }) {
  const isSet = time && time !== '—'
  return (
    <div style={{
      background: isSet ? `${color}08` : '#F8FAFC',
      borderRadius: '12px',
      padding: '8px 4px',
      textAlign: 'center',
      border: isSet ? `1px solid ${color}33` : '1px solid #F1F5F9'
    }}>
      <div style={{ fontSize: '9px', fontWeight: 800, color: isSet ? color : '#94A3B8', letterSpacing: '0.08em', marginBottom: '3px' }}>{label}</div>
      <div style={{
        fontSize: '12px',
        fontWeight: 800,
        color: isSet ? '#0F172A' : '#CBD5E1',
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {time || '—'}
      </div>
    </div>
  )
}
