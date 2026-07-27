'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Head from 'next/head'

// ── 2. Large Analog Clock Right-Side Header Centerpiece (100px Smooth Sweeping Dial) ──────
function RightAnalogClock({ time = new Date() }) {
  const ms = time.getMilliseconds()
  const seconds = time.getSeconds() + ms / 1000
  const minutes = time.getMinutes() + seconds / 60
  const hours = (time.getHours() % 12) + minutes / 60

  const secDeg = seconds * 6
  const minDeg = minutes * 6
  const hourDeg = hours * 30

  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Dhaka'
  })

  const sz = 90 // 90px dial centerpiece on far right

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {/* 90px Luxury Analog Dial */}
      <div style={{
        width: `${sz}px`, height: `${sz}px`,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #FFFFFF 0%, #F8FAFC 70%, #E2E8F0 100%)',
        border: '3px solid #D4933A',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 6px rgba(0,0,0,0.1)',
        position: 'relative', flexShrink: 0
      }}>
        {/* 12 Hour Ticks */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
          <div key={deg} style={{
            position: 'absolute',
            width: deg % 90 === 0 ? '3px' : '1px',
            height: deg % 90 === 0 ? '7px' : '3.5px',
            background: deg % 90 === 0 ? '#0F172A' : '#94A3B8',
            top: '4px',
            left: `calc(50% - ${deg % 90 === 0 ? 1.5 : 0.5}px)`,
            transformOrigin: `50% ${sz / 2 - 4}px`,
            transform: `rotate(${deg}deg)`
          }} />
        ))}

        {/* Hour Hand (Brass/Navy) */}
        <div style={{
          position: 'absolute', width: '3.5px', height: `${sz * 0.26}px`,
          background: '#0F172A', borderRadius: '3px',
          top: `${sz * 0.24}px`, left: 'calc(50% - 1.75px)',
          transformOrigin: '50% 100%', transform: `rotate(${hourDeg}deg)`, zIndex: 3,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />

        {/* Minute Hand (Navy) */}
        <div style={{
          position: 'absolute', width: '2.5px', height: `${sz * 0.38}px`,
          background: '#1E293B', borderRadius: '2px',
          top: `${sz * 0.12}px`, left: 'calc(50% - 1.25px)',
          transformOrigin: '50% 100%', transform: `rotate(${minDeg}deg)`, zIndex: 4,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />

        {/* Second Hand (Gold Sweeping) */}
        <div style={{
          position: 'absolute', width: '1.5px', height: `${sz * 0.44}px`,
          background: '#D4933A', borderRadius: '1px',
          top: `${sz * 0.06}px`, left: 'calc(50% - 0.75px)',
          transformOrigin: '50% 100%', transform: `rotate(${secDeg}deg)`,
          zIndex: 5
        }} />

        {/* Center Cap */}
        <div style={{
          position: 'absolute', width: '7px', height: '7px', borderRadius: '50%',
          background: '#D4933A', border: '1.5px solid #0F172A',
          top: 'calc(50% - 3.5px)', left: 'calc(50% - 3.5px)', zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }} />
      </div>

      {/* Date Label Right of Clock */}
      <div>
        <div style={{
          fontSize: '18px', fontWeight: 800, color: '#F8FAFC',
          fontFamily: "'JetBrains Mono', monospace", lineHeight: 1
        }}>
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })}
        </div>
        <div style={{
          fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginTop: '4px',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          {dateString} · <span style={{ color: '#D4933A' }}>BST</span>
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
  const [departmentFilter, setDepartmentFilter] = useState('all') // 'all', 'front', 'kitchen'
  const [searchQuery, setSearchQuery] = useState('')
  const [lastUpdatedSecs, setLastUpdatedSecs] = useState(0)
  const [scannedStaffId, setScannedStaffId] = useState(null)

  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    onShift: true,
    late: true,
    notIn: true
  })

  // Smooth Sweeping Clock Animation Frame
  useEffect(() => {
    let animFrame
    function loop() {
      setCurrentTime(new Date())
      animFrame = requestAnimationFrame(loop)
    }
    animFrame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrame)
  }, [])

  // Ticking timestamp timer (Updated Xs ago)
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdatedSecs(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Realtime Data Fetching & Subscriptions
  useEffect(() => {
    fetchTodayData()

    const channel = supabase.channel('kiosk_v9')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_log' }, () => {
        fetchTodayData(true)
      })
      .subscribe()

    const pollTimer = setInterval(() => fetchTodayData(true), 5000)
    return () => {
      clearInterval(pollTimer)
      supabase.removeChannel(channel)
    }
  }, [])

  // ── 1. RFID-ONLY Hardware Keydown Reader Listener ──
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
        if (buffer.length >= 3) {
          e.preventDefault()
          handleRfidScan(buffer.trim())
          buffer = ''
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // RFID Scan Handler (Passive Visual Reaction)
  async function handleRfidScan(identifier) {
    try {
      const normId = String(identifier || '').trim().replace(/^0+/, '')
      const upperId = String(identifier || '').trim().toUpperCase()

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

      // ── 1. Visual Card Glow & Highlight Reaction ──
      setScannedStaffId(staffKey)
      setTimeout(() => setScannedStaffId(null), 3000)

      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: staffKey, source: 'rfid' })
      })
      const json = await res.json()
      const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })

      if (res.ok) {
        let flashType = 'in'
        if (json.action === 'break_start') flashType = 'break_start'
        else if (json.action === 'break_end') flashType = 'break_end'
        else if (json.alreadyCheckedOut || json.action === 'check_out') flashType = 'out'
        else if (json.status === 'late') flashType = 'late'

        setTapFlash({
          name: json.staff?.name || matchedStaff?.name || 'Staff Member',
          id: json.staff?.employee_id || '',
          time: t,
          type: flashType,
          subText: json.message || 'RFID Scan Registered'
        })
      } else if (json.blocked) {
        setTapFlash({
          name: matchedStaff?.name || 'Staff Member',
          id: matchedStaff?.employee_id || '',
          time: t,
          type: 'blocked',
          subText: json.error || 'Scan cooldown active.'
        })
      }

      fetchTodayData(true)
      setTimeout(() => setTapFlash(null), 3500)
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchTodayData(silent = false) {
    try {
      if (!silent) setLoading(true)
      const res = await fetch(`/api/attendance/today?t=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) {
        setData(json)
        setLastUpdatedSecs(0)
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const records = data.records || []

  // Filter records by search query and role filter
  const filtered = records.filter(r => {
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery = !q || r.name.toLowerCase().includes(q) || String(r.employee_id || '').toLowerCase().includes(q)
    if (!matchesQuery) return false
    if (departmentFilter === 'front') return r.department === 'front'
    if (departmentFilter === 'kitchen') return r.department === 'kitchen'
    return true
  })

  // ── 7. Grouped Collapsible Sections ──
  // 1. On Shift Now: Present on time, on break, back from break, or checked out
  const onShiftRecords = filtered.filter(r => (r.status === 'present' || !!r.check_in_at) && r.status !== 'late')
  // 2. Late: Checked in late
  const lateRecords = filtered.filter(r => r.status === 'late')
  // 3. Not Checked In: Haven't checked in yet
  const notInRecords = filtered.filter(r => r.status === 'absent' && !r.check_in_at)

  const totalStaff = records.length
  const totalIn = records.filter(r => (r.status === 'present' || r.status === 'late' || !!r.check_in_at) && !r.check_out_at).length
  const lateCount = records.filter(r => r.status === 'late').length
  const absentCount = records.filter(r => r.status === 'absent' && !r.check_in_at).length

  const flashConfig = {
    in: { bg: '#10B981', heading: 'RFID CHECK-IN', sub: 'Scan registered live!' },
    late: { bg: '#F59E0B', heading: 'RFID CHECK-IN (LATE)', sub: 'Logged late arrival.' },
    break_start: { bg: '#D97706', heading: 'RFID BREAK STARTED', sub: 'Break logged.' },
    break_end: { bg: '#0284C7', heading: 'RFID BACK FROM BREAK', sub: 'Welcome back to shift!' },
    out: { bg: '#2563EB', heading: 'RFID CHECK-OUT', sub: 'Shift ended!' },
    blocked: { bg: '#64748B', heading: 'COOLDOWN ACTIVE', sub: 'Scan ignored.' }
  }

  return (
    <>
      <Head>
        <title>Crown Coffee — RFID Attendance Board</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&family=Outfit:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: '#FAF9F6', // 3. Warm cream background
        fontFamily: "'Outfit', 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
        color: '#0F172A',
        userSelect: 'none'
      }}>

        {/* RFID Scan Notification Toast */}
        {tapFlash && (() => {
          const cfg = flashConfig[tapFlash.type] || flashConfig.in
          return (
            <div style={{
              position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
              background: cfg.bg, color: 'white',
              borderRadius: '16px', padding: '16px 24px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', gap: '14px',
              animation: 'bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900
              }}>RFID</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900 }}>{tapFlash.name}</div>
                <div style={{ fontSize: '12px', opacity: 0.95, fontWeight: 700 }}>{tapFlash.heading} · {tapFlash.subText}</div>
              </div>
            </div>
          )
        })()}

        {/* ── 2. Navy Header with Right-Side Analog Clock Centerpiece ── */}
        <div style={{
          background: '#0F172A',
          padding: '16px 40px',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          borderBottom: '3px solid #D4933A',
          boxShadow: '0 6px 24px rgba(15, 23, 42, 0.2)'
        }}>
          {/* Left: Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D4933A 100%)',
              borderRadius: '14px', padding: '10px 16px', fontSize: '18px', fontWeight: 900,
              color: '#0F172A', letterSpacing: '1px', boxShadow: '0 4px 14px rgba(212,147,58,0.4)'
            }}>CC</div>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.02em' }}>Crown Coffee</div>
              <div style={{ color: '#D4933A', fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', marginTop: '1px' }}>RFID ATTENDANCE BOARD</div>
            </div>
          </div>

          {/* Center: Header Stats Bar (10. Recolored Stats Bar) */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <HeaderStatChip label="IN TODAY" value={totalIn} color="#22C55E" />
            <HeaderStatChip label="LATE" value={lateCount} color="#FBBF24" />
            <HeaderStatChip label="NOT IN" value={absentCount} color="#94A3B8" />
            <HeaderStatChip label="TOTAL STAFF" value={totalStaff} color="#64748B" />
          </div>

          {/* Far Right: Right-Side Analog Clock Centerpiece + Manual Refresh */}
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

            {/* 2. Large Analog Clock Right Centerpiece */}
            <RightAnalogClock time={currentTime} />
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '14px 40px',
          display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'
        }}>
          {[
            ['all', 'All Staff'],
            ['front', 'Front of House'],
            ['kitchen', 'Kitchen']
          ].map(([id, label]) => (
            <button key={id} onClick={() => setDepartmentFilter(id)} style={{
              padding: '8px 22px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: '13px', transition: 'all 0.15s',
              background: departmentFilter === id ? '#0F172A' : '#F1F5F9',
              color: departmentFilter === id ? 'white' : '#64748B',
              boxShadow: departmentFilter === id ? '0 4px 12px rgba(15,23,42,0.12)' : 'none'
            }}>{label}</button>
          ))}

          {/* Search Input */}
          <div style={{ position: 'relative', width: '220px', marginLeft: '8px' }}>
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: '10px', padding: '8px 12px 8px 34px', fontSize: '12px',
                fontWeight: 700, color: '#0F172A', outline: 'none'
              }}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '10px' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          {/* 9. Live Indicator & Ticking Timestamp */}
          <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '16px', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 800 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 8px rgba(22,163,74,0.6)', animation: 'pulse 2s infinite' }}></span>
              Live Sync
            </span>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
              Updated {lastUpdatedSecs}s ago
            </span>
          </div>
        </div>

        {/* ── 7. Grouped Collapsible Sections ── */}
        <main style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#94A3B8', fontSize: '15px', fontWeight: 700 }}>
              Loading RFID Attendance Feed...
            </div>
          ) : (
            <>
              {/* SECTION 1: ON SHIFT NOW (Green) */}
              <CollapsibleGroupSection
                title="ON SHIFT NOW"
                count={onShiftRecords.length}
                color="#16A34A"
                bgColor="#F0FDF4"
                borderColor="#86EFAC"
                isOpen={openSections.onShift}
                onToggle={() => setOpenSections(prev => ({ ...prev, onShift: !prev.onShift }))}
                records={onShiftRecords}
                scannedStaffId={scannedStaffId}
              />

              {/* SECTION 2: LATE (Amber) */}
              <CollapsibleGroupSection
                title="LATE"
                count={lateRecords.length}
                color="#D97706"
                bgColor="#FFFBEB"
                borderColor="#FDE68A"
                isOpen={openSections.late}
                onToggle={() => setOpenSections(prev => ({ ...prev, late: !prev.late }))}
                records={lateRecords}
                scannedStaffId={scannedStaffId}
              />

              {/* SECTION 3: NOT CHECKED IN (Neutral Slate Gray) */}
              <CollapsibleGroupSection
                title="NOT CHECKED IN"
                count={notInRecords.length}
                color="#64748B"
                bgColor="#F8FAFC"
                borderColor="#CBD5E1"
                isOpen={openSections.notIn}
                onToggle={() => setOpenSections(prev => ({ ...prev, notIn: !prev.notIn }))}
                records={notInRecords}
                scannedStaffId={scannedStaffId}
              />
            </>
          )}
        </main>

        <style>{`
          @keyframes bounceIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes spin { 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
          @keyframes rfidGlow { 0%, 100% { box-shadow: 0 0 24px rgba(16,185,129,0.6); transform: scale(1.02); } 50% { box-shadow: 0 0 8px rgba(16,185,129,0.3); transform: scale(1); } }
        `}</style>
      </div>
    </>
  )
}

function HeaderStatChip({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '12px', padding: '6px 14px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '20px', fontWeight: 900, color, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: '9px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function CollapsibleGroupSection({ title, count, color, bgColor, borderColor, isOpen, onToggle, records, scannedStaffId }) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '20px',
      border: `1.5px solid ${borderColor}`,
      boxShadow: '0 8px 24px -4px rgba(15,23,42,0.04)',
      overflow: 'hidden'
    }}>
      {/* Header Bar */}
      <div
        onClick={onToggle}
        style={{
          padding: '18px 24px',
          background: bgColor,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}66` }} />
          <h2 style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', letterSpacing: '0.04em', margin: 0 }}>
            {title}
          </h2>
          <span style={{
            background: '#FFFFFF', color: color, border: `1px solid ${borderColor}`,
            fontSize: '12px', fontWeight: 800, padding: '2px 10px', borderRadius: '12px',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {count}
          </span>
        </div>

        {/* Toggle Arrow */}
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Grid Content */}
      {isOpen && (
        <div style={{ padding: '24px', borderTop: `1px solid ${borderColor}` }}>
          {records.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, textAlign: 'center', padding: '16px' }}>
              No staff members in this section.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
              {records.map(r => {
                const staffKey = r.staff_id || r.id || r.employee_id
                return (
                  <RfidDisplayCard
                    key={staffKey}
                    r={r}
                    isScanned={scannedStaffId === staffKey}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 8. Avatar Role Color Mapping ──
function getRoleAvatarBg(dept, role) {
  const d = String(dept || '').toLowerCase()
  const r = String(role || '').toLowerCase()
  if (d.includes('kitchen') || r.includes('chef') || r.includes('cook')) return '#EA580C' // Warm Orange
  if (d.includes('front') || r.includes('service') || r.includes('waiter')) return '#0D9488' // Teal
  if (r.includes('barista') || r.includes('coffee')) return '#78350F' // Coffee Brown
  if (r.includes('manager') || r.includes('admin')) return '#1E293B' // Navy Slate
  return '#475569' // Default Slate
}

// ── 1. Passive RFID-Only Display Card Component (Read-Only) ──
function RfidDisplayCard({ r, isScanned }) {
  const hasCheckedIn = !!r.check_in_at
  const isOut = hasCheckedIn && !!r.check_out_at
  const isOnBreak = hasCheckedIn && !!r.break_start_at && !r.break_end_at
  const isBackFromBreak = hasCheckedIn && !!r.break_end_at && !r.check_out_at
  const isLate = r.status === 'late' && !isOut && !isOnBreak && !isBackFromBreak
  const isIn = hasCheckedIn && !isOut && !isOnBreak && !isBackFromBreak

  // Status System Colors
  let borderColor = '#E2E8F0'
  let statusDot = '#CBD5E1'
  let statusText = 'Not Checked In'
  let statusColor = '#64748B' // 4. Neutral Slate Gray (Not an alarm state)
  let badgeBg = '#F1F5F9'
  let badgeBorder = '#CBD5E1'
  let cardBg = '#FFFFFF'

  if (isOut) {
    borderColor = '#93C5FD'; statusDot = '#3B82F6'
    statusText = 'Checked Out'; statusColor = '#1D4ED8'; badgeBg = '#EFF6FF'; badgeBorder = '#BFDBFE'
  } else if (isOnBreak) {
    borderColor = '#FDE68A'; statusDot = '#F59E0B'
    statusText = 'On Break'; statusColor = '#92400E'; badgeBg = '#FEF3C7'; badgeBorder = '#FDE68A'; cardBg = '#FFFBFA'
  } else if (isBackFromBreak) {
    borderColor = '#BAE6FD'; statusDot = '#0284C7'
    statusText = 'Back From Break'; statusColor = '#0369A1'; badgeBg = '#E0F2FE'; badgeBorder = '#BAE6FD'; cardBg = '#F0F9FF'
  } else if (isLate) {
    borderColor = '#FDE68A'; statusDot = '#D97706'
    statusText = 'Late'; statusColor = '#D97706'; badgeBg = '#FEF3C7'; badgeBorder = '#FDE68A'; cardBg = '#FFFBFA'
  } else if (isIn) {
    borderColor = '#86EFAC'; statusDot = '#16A34A'
    statusText = 'Checked In'; statusColor = '#15803D'; badgeBg = '#DCFCE7'; badgeBorder = '#86EFAC'; cardBg = '#F0FDF4'
  }

  const fmtTime = (ts) => ts
    ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
    : null

  const avatarBg = getRoleAvatarBg(r.department, r.designation)

  return (
    <div
      style={{
        background: cardBg,
        border: `1.5px solid ${isScanned ? '#10B981' : borderColor}`,
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        boxShadow: isScanned ? '0 0 24px rgba(16,185,129,0.5)' : '0 6px 18px -4px rgba(15,23,42,0.04)',
        animation: isScanned ? 'rfidGlow 1.5s ease-in-out infinite' : 'none',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      <div>
        {/* Top Header Row: Avatar + Name + Role + Status Dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          {r.photo_url ? (
            <img
              src={r.photo_url} alt={r.name}
              style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${borderColor}`, boxShadow: '0 4px 8px rgba(0,0,0,0.06)' }}
            />
          ) : (
            /* 8. Role-consistent colored initials circle */
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
              background: avatarBg, border: `2.5px solid ${borderColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '18px', color: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.08)'
            }}>
              {r.name ? r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CC'}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>{r.designation}</div>
          </div>

          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: statusDot, flexShrink: 0, boxShadow: `0 0 8px ${statusDot}44` }} />
        </div>

        {/* 5. COLLAPSED VIEW FOR AWAITING RFID SCAN STAFF */}
        {!hasCheckedIn ? (
          <div style={{
            marginTop: '12px',
            background: '#F8FAFC',
            border: '1.5px dashed #CBD5E1',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center',
            color: '#64748B',
            fontWeight: 800,
            fontSize: '12px',
            letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
            Awaiting RFID Scan
          </div>
        ) : (
          /* EXPANDED FULL VIEW FOR CHECKED-IN STAFF */
          <div>
            {/* Status Badge + 6. Display-Only Break Status Pill */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em',
                color: statusColor, background: badgeBg, border: `1px solid ${badgeBorder}`,
                padding: '4px 12px', borderRadius: '20px'
              }}>
                {statusText}
                {isLate && !isOut && r.minutes_late > 0 && ` · ${r.minutes_late}m late`}
              </span>

              {/* Display Break Status Pill (Display-Only) */}
              {isOnBreak && (
                <span style={{
                  fontSize: '11px', fontWeight: 800, color: '#92400E',
                  background: '#FEF3C7', border: '1px solid #FDE68A',
                  padding: '4px 10px', borderRadius: '20px'
                }}>
                  On Break ☕
                </span>
              )}
            </div>

            {/* Metric Time Row */}
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
        )}
      </div>
    </div>
  )
}

function TimeChip({ label, time, color }) {
  const isSet = time && time !== '—'
  return (
    <div style={{
      background: isSet ? `${color}08` : '#F8FAFC',
      borderRadius: '10px',
      padding: '8px 4px',
      textAlign: 'center',
      border: isSet ? `1px solid ${color}33` : '1px solid #F1F5F9'
    }}>
      <div style={{ fontSize: '9px', fontWeight: 800, color: isSet ? color : '#94A3B8', letterSpacing: '0.08em', marginBottom: '3px' }}>{label}</div>
      <div style={{
        fontSize: '12px', fontWeight: 800, color: isSet ? '#0F172A' : '#CBD5E1',
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }}>
        {time || '—'}
      </div>
    </div>
  )
}
