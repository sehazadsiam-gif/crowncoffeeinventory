'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

function isWithinFetchHours() {
  const now = new Date()
  const options = { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: 'numeric', hour12: false }
  const formatter = new Intl.DateTimeFormat('en-US', options)
  const parts = formatter.formatToParts(now)
  
  let hour = 0
  let minute = 0
  parts.forEach(part => {
    if (part.type === 'hour') {
      let h = parseInt(part.value, 10)
      if (h === 24) h = 0
      hour = h
    }
    if (part.type === 'minute') minute = parseInt(part.value, 10)
  })

  const timeVal = hour * 60 + minute

  const ranges = [
    [7 * 60 + 30, 9 * 60],      // 7:30am - 9am
    [10 * 60 + 30, 12 * 60],    // 10:30am - 12pm
    [12 * 60 + 30, 14 * 60],    // 12:30pm - 2pm
    [17 * 60 + 30, 19 * 60],    // 5:30pm - 7pm
    [20 * 60 + 30, 22 * 60],    // 8:30pm - 10pm
    [23 * 60, 24 * 60],         // 11pm - 12am
    [0, 1 * 60]                 // 12am - 1am
  ]

  return ranges.some(([start, end]) => timeVal >= start && timeVal <= end)
}

// ── 3. Extreme Far-Right Minimalist Digital Clock ──────
function HeaderDigitalClock({ time = new Date() }) {
  const timeString = time.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka'
  })
  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Dhaka'
  })

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px',
      marginLeft: 'auto', flexShrink: 0, textAlign: 'right'
    }}>
      <div style={{
        fontSize: 'clamp(28px, 2.5vw, 42px)',
        fontWeight: 800,
        color: '#1C1917',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.02em',
        lineHeight: 1
      }}>
        {timeString}
      </div>
      <div style={{
        fontSize: 'clamp(11px, 0.9vw, 14px)',
        fontWeight: 700,
        color: '#8B6E30',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginTop: '2px'
      }}>
        {dateString} · <span style={{ color: '#D4933A' }}>BST</span>
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
  const [breakToggles, setBreakToggles] = useState({})
  const [isOffline, setIsOffline] = useState(false)
  const [offlineQueueCount, setOfflineQueueCount] = useState(0)

  // ── Offline Queue helpers (IndexedDB key: cc_offline_tap_queue) ──
  const OFFLINE_QUEUE_KEY = 'cc_offline_tap_queue'
  function loadOfflineQueue() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]') } catch { return [] }
  }
  function saveOfflineQueue(q) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q))
    setOfflineQueueCount(q.length)
  }
  function addToOfflineQueue(identifier, enableBreak) {
    const q = loadOfflineQueue()
    q.push({ identifier, enableBreak, timestamp: new Date().toISOString() })
    saveOfflineQueue(q)
  }
  async function drainOfflineQueue() {
    const q = loadOfflineQueue()
    if (!q.length) return
    const remaining = []
    for (const tap of q) {
      try {
        const res = await fetch('/api/attendance/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: tap.identifier, source: 'rfid', enableBreak: tap.enableBreak, timestamp: tap.timestamp })
        })
        if (!res.ok) remaining.push(tap) // keep failed ones
      } catch {
        remaining.push(tap) // still offline
      }
    }
    saveOfflineQueue(remaining)
    if (remaining.length < q.length) fetchTodayData(true, true) // refresh after sync (forced)
  }


  // 2. 4 Collapsible section states (On Shift, On Break, Late, Not Checked In)
  const [openSections, setOpenSections] = useState({
    onShift: true,
    onBreak: true,
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
    setIsOffline(!navigator.onLine)
    setOfflineQueueCount(loadOfflineQueue().length)

    // Drain any queued offline taps when we come back online
    function handleOnline() {
      setIsOffline(false)
      drainOfflineQueue()
    }
    function handleOffline() { setIsOffline(true) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const channel = supabase.channel('kiosk_v11')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_log' }, () => {
        fetchTodayData(true)
      })
      .subscribe()

    const pollTimer = setInterval(() => fetchTodayData(true), 60000)
    return () => {
      clearInterval(pollTimer)
      supabase.removeChannel(channel)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
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

  // Passive RFID Scan Handler
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
      const isBreakOn = !!breakToggles[staffKey]

      // Visual Glow Reaction
      setScannedStaffId(staffKey)
      setTimeout(() => setScannedStaffId(null), 3000)

      // ── Offline Guard: save tap locally if server is unreachable ──
      if (!navigator.onLine) {
        addToOfflineQueue(staffKey, isBreakOn)
        const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
        setTapFlash({
          name: matchedStaff?.name || 'Staff Member',
          id: matchedStaff?.employee_id || '',
          time: t,
          type: 'offline',
          subText: '📡 No internet — tap saved offline, will sync automatically'
        })
        setTimeout(() => setTapFlash(null), 4000)
        return
      }

      let res, json
      try {
        res = await fetch('/api/attendance/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: staffKey, source: 'rfid', enableBreak: isBreakOn })
        })
        json = await res.json()
      } catch (netErr) {
        // Network failure mid-request — queue offline
        addToOfflineQueue(staffKey, isBreakOn)
        const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
        setTapFlash({
          name: matchedStaff?.name || 'Staff Member',
          id: matchedStaff?.employee_id || '',
          time: t,
          type: 'offline',
          subText: '📡 Server unreachable — tap queued, will sync on reconnect'
        })
        setIsOffline(true)
        setTimeout(() => setTapFlash(null), 4000)
        return
      }

      const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })

      if (res.ok) {
        setBreakToggles(prev => ({ ...prev, [staffKey]: false }))
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

      fetchTodayData(true, true) // refresh after scan (forced)
      setTimeout(() => setTapFlash(null), 3500)
    } catch (err) {
      console.error(err)
    }
  }

  const [fetchError, setFetchError] = useState(null)

  async function fetchTodayData(silent = false, force = false) {
    if (silent && !force && !isWithinFetchHours()) {
      return
    }
    try {
      if (!silent) setLoading(true)
      const res = await fetch(`/api/attendance/today?t=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok && json.records) {
        setData(json)
        setFetchError(null)
        setLastUpdatedSecs(0)
      } else {
        const errMsg = json.error || `HTTP ${res.status}: Failed to fetch attendance data`
        console.error('Attendance API Error:', errMsg)
        setFetchError(errMsg)
      }
    } catch (e) {
      console.error('Attendance Fetch Exception:', e)
      setFetchError(e.message || 'Network connection error')
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

  // ── 2. Group records into 4 Collapsible Sections ──
  // 1. On Shift Now: Present/checked in on time, back from break, or checked out
  const onShiftRecords = filtered.filter(r => (r.status === 'present' || !!r.check_in_at) && r.status !== 'late' && !(r.break_start_at && !r.break_end_at))
  // 2. On Break: Currently on break
  const onBreakRecords = filtered.filter(r => !!r.check_in_at && !!r.break_start_at && !r.break_end_at)
  // 3. Late: Checked in late (past grace period)
  const lateRecords = filtered.filter(r => r.status === 'late' && !(r.break_start_at && !r.break_end_at))
  // 4. Not Checked In: Haven't checked in yet
  const notInRecords = filtered.filter(r => r.status === 'absent' && !r.check_in_at)

  // 10. Stat Bar Counters
  const totalStaff = records.length
  const onBreakCount = records.filter(r => !!r.check_in_at && !!r.break_start_at && !r.break_end_at).length
  const totalIn = records.filter(r => (r.status === 'present' || r.status === 'late' || !!r.check_in_at) && !r.check_out_at && !(r.break_start_at && !r.break_end_at)).length
  const lateCount = records.filter(r => r.status === 'late').length
  const absentCount = records.filter(r => r.status === 'absent' && !r.check_in_at).length

  const flashConfig = {
    in: { bg: '#10B981', heading: 'RFID CHECK-IN', sub: 'Scan registered live!' },
    late: { bg: '#DC2626', heading: 'RFID CHECK-IN (LATE)', sub: 'Logged late arrival.' },
    break_start: { bg: '#D97706', heading: 'RFID BREAK STARTED', sub: 'Break logged.' },
    break_end: { bg: '#0284C7', heading: 'RFID BACK FROM BREAK', sub: 'Welcome back to shift!' },
    out: { bg: '#2563EB', heading: 'RFID CHECK-OUT', sub: 'Shift ended!' },
    blocked: { bg: '#64748B', heading: 'COOLDOWN ACTIVE', sub: 'Scan ignored.' }
  }

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: '#F8F6F0', // Premium light-mode warm cream background
        fontFamily: "'Outfit', 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
        color: '#1C1917',
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

        {/* ── 4. FULLY RESPONSIVE LIGHT HEADER ── */}
        <div style={{ background: '#F8F6F0', borderBottom: '1px solid #E2D1A9' }}>
          <div className="header-container" style={{
            maxWidth: '1800px', margin: '0 auto', padding: '16px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
          }}>
            {/* Left: Official Logo & Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 0%', justifyContent: 'flex-start' }}>
              <img
                src="/crown-coffee-logo.jpg"
                alt="Crown Coffee Logo"
                style={{
                  width: 'clamp(56px, 4vw, 72px)',
                  height: 'clamp(56px, 4vw, 72px)',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  background: '#000000',
                  border: '2px solid #D4933A',
                  boxShadow: '0 4px 12px rgba(212,175,55,0.2)',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
              />
              <div>
                <div style={{ color: '#1C1917', fontWeight: 900, fontSize: 'clamp(18px, 1.6vw, 24px)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Crown Coffee</div>
                <div style={{ color: '#B8860B', fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em', marginTop: '3px' }}>RFID ATTENDANCE BOARD</div>
              </div>
            </div>

            {/* 10. Center: 5 Stat Chips Bar (Middle Centered) */}
            <div className="header-stats-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', margin: '0 auto', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <HeaderStatChip label="IN TODAY" value={totalIn} color="#16A34A" />
                <HeaderStatChip label="ON BREAK" value={onBreakCount} color="#D97706" />
                <HeaderStatChip label="LATE" value={lateCount} color="#DC2626" />
                <HeaderStatChip label="NOT IN" value={absentCount} color="#8B6E30" />
                <HeaderStatChip label="TOTAL STAFF" value={totalStaff} color="#475569" />
              </div>
              {/* Offline Status Pill */}
              {(isOffline || offlineQueueCount > 0) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: isOffline ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
                  border: `1px solid ${isOffline ? '#DC2626' : '#16A34A'}`,
                  borderRadius: '20px', padding: '3px 12px',
                  animation: isOffline ? 'pulse 2s infinite' : 'none'
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isOffline ? '#DC2626' : '#16A34A', display: 'inline-block' }} />
                  <span style={{ fontSize: '10px', fontWeight: 800, color: isOffline ? '#DC2626' : '#16A34A', letterSpacing: '0.06em' }}>
                    {isOffline
                      ? `OFFLINE${offlineQueueCount > 0 ? ` · ${offlineQueueCount} TAP${offlineQueueCount > 1 ? 'S' : ''} QUEUED` : ''}`
                      : `BACK ONLINE · SYNCING ${offlineQueueCount} TAP${offlineQueueCount > 1 ? 'S' : ''}...`}
                  </span>
                </div>
              )}
            </div>

            {/* 3. EXTREME FAR-RIGHT: Digital Clock Pinned Flush Right */}
            <div style={{ flex: '1 1 0%', display: 'flex', justifyContent: 'flex-end' }}>
              <HeaderDigitalClock time={currentTime} />
            </div>
          </div>
        </div>

        {/* Responsive Filter Bar & Search */}
        <div style={{ background: '#F8F6F0', borderBottom: '1px solid #E2D1A9' }}>
          <div className="filter-container" style={{
            maxWidth: '1800px', margin: '0 auto', padding: '12px 24px',
            display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'
          }}>
            {[
              ['all', 'All Staff'],
              ['front', 'Front of House'],
              ['kitchen', 'Kitchen']
            ].map(([id, label]) => (
              <button key={id} onClick={() => setDepartmentFilter(id)} style={{
                padding: '8px 18px', borderRadius: '12px', border: '1px solid #E2D1A9', cursor: 'pointer',
                fontWeight: 800, fontSize: '12px', transition: 'all 0.15s',
                background: departmentFilter === id ? '#B8860B' : '#FFFFFF',
                color: departmentFilter === id ? '#FFFFFF' : '#8B6E30',
                boxShadow: departmentFilter === id ? '0 4px 12px rgba(184,134,11,0.2)' : 'none'
              }}>{label}</button>
            ))}

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '180px', flex: '1', maxWidth: '280px' }}>
              <input
                type="text"
                placeholder="Search staff name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', background: '#FFFFFF', border: '1px solid #E2D1A9',
                  borderRadius: '10px', padding: '8px 12px 8px 34px', fontSize: '12px',
                  fontWeight: 700, color: '#1C1917', outline: 'none',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B6E30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '10px' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            {/* 9. Live Indicator & Ticking Timestamp */}
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#8B6E30', display: 'flex', alignItems: 'center', gap: '14px', fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 800 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 8px rgba(22,163,74,0.4)', animation: 'pulse 2s infinite' }}></span>
                Live Sync
              </span>
              <span style={{ fontSize: '11px', color: '#8B6E30', opacity: 0.8, fontFamily: "'JetBrains Mono', monospace" }}>
                Updated {lastUpdatedSecs}s ago
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Grouped 4 Collapsible Sections (Max 1800px Centered) ── */}
        <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {fetchError && (
            <div style={{
              background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B',
              borderRadius: '16px', padding: '16px 24px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>⚠️ Sync Connection Warning</div>
                <div style={{ fontSize: '12px', marginTop: '2px', opacity: 0.9 }}>{fetchError}</div>
              </div>
              <button
                onClick={() => fetchTodayData(false)}
                style={{
                  background: '#991B1B', color: 'white', border: 'none', borderRadius: '10px',
                  padding: '8px 16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer'
                }}
              >
                🔄 Retry Sync Now
              </button>
            </div>
          )}

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
                breakToggles={breakToggles}
                onToggleBreak={(key, val) => setBreakToggles(prev => ({ ...prev, [key]: val }))}
              />

              {/* SECTION 2: ON BREAK (Soft Tan / Amber) */}
              <CollapsibleGroupSection
                title="ON BREAK"
                count={onBreakRecords.length}
                color="#B45309"
                bgColor="#FFFBEB"
                borderColor="#FCD34D"
                isOpen={openSections.onBreak}
                onToggle={() => setOpenSections(prev => ({ ...prev, onBreak: !prev.onBreak }))}
                records={onBreakRecords}
                scannedStaffId={scannedStaffId}
                breakToggles={breakToggles}
                onToggleBreak={(key, val) => setBreakToggles(prev => ({ ...prev, [key]: val }))}
              />

              {/* SECTION 3: LATE (Red) */}
              <CollapsibleGroupSection
                title="LATE"
                count={lateRecords.length}
                color="#DC2626"
                bgColor="#FEF2F2"
                borderColor="#FCA5A5"
                isOpen={openSections.late}
                onToggle={() => setOpenSections(prev => ({ ...prev, late: !prev.late }))}
                records={lateRecords}
                scannedStaffId={scannedStaffId}
                breakToggles={breakToggles}
                onToggleBreak={(key, val) => setBreakToggles(prev => ({ ...prev, [key]: val }))}
              />

              {/* SECTION 4: NOT CHECKED IN (Neutral Slate Gray) */}
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
                breakToggles={breakToggles}
                onToggleBreak={(key, val) => setBreakToggles(prev => ({ ...prev, [key]: val }))}
              />
            </>
          )}
        </main>

        <style>{`
          /* Responsive Layout Rules across Phone (~390px), Tablet (~768px), Laptop (~1440px), TV (~1920px+) */
          .clock-dial {
            width: clamp(65px, 6vw, 105px);
            height: clamp(65px, 6vw, 105px);
          }

          @media (max-width: 768px) {
            .header-container {
              flex-wrap: wrap;
              gap: 12px;
            }
            .header-stats-bar {
              order: 3;
              width: 100%;
              justify-content: space-around;
              margin-top: 4px;
            }
          }

          .fluid-cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(clamp(270px, 20vw, 360px), 1fr));
            gap: 18px;
          }

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
      background: '#FFFFFF',
      border: '1px solid #E2D1A9',
      borderRadius: '12px', padding: '8px 14px', textAlign: 'center', minWidth: '70px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
    }}>
      <div style={{ fontSize: 'clamp(16px, 1.2vw, 22px)', fontWeight: 900, color, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#8B6E30', letterSpacing: '0.06em', marginTop: '4px', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

function CollapsibleGroupSection({ title, count, color, bgColor, borderColor, isOpen, onToggle, records, scannedStaffId, breakToggles, onToggleBreak }) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      border: '1px solid #E2D1A9',
      boxShadow: '0 4px 12px rgba(139,110,48,0.04)',
      overflow: 'hidden'
    }}>
      {/* Section Header */}
      <div
        onClick={onToggle}
        style={{
          padding: '16px 20px',
          background: bgColor,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}66` }} />
          <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A', letterSpacing: '0.04em', margin: 0 }}>
            {title}
          </h2>
          <span style={{
            background: '#FFFFFF', color: color, border: `1px solid ${borderColor}`,
            fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {count}
          </span>
        </div>

        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Fluid Grid Content */}
      {isOpen && (
        <div style={{ padding: '20px', borderTop: `1px solid ${borderColor}` }}>
          {records.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, textAlign: 'center', padding: '16px' }}>
              No staff members in this section.
            </div>
          ) : (
            <div className="fluid-cards-grid">
              {records.map(r => {
                const staffKey = r.staff_id || r.id || r.employee_id
                return (
                  <RfidDisplayCard
                    key={staffKey}
                    r={r}
                    isScanned={scannedStaffId === staffKey}
                    isBreakOn={!!(breakToggles && breakToggles[staffKey])}
                    onToggleBreak={(val) => onToggleBreak && onToggleBreak(staffKey, val)}
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

// ── 1. Passive RFID Display Card ──
function RfidDisplayCard({ r, isScanned, isBreakOn = false, onToggleBreak }) {
  const hasCheckedIn = !!r.check_in_at
  const isOut = hasCheckedIn && !!r.check_out_at
  const isOnBreak = hasCheckedIn && !!r.break_start_at && !r.break_end_at
  const isBackFromBreak = hasCheckedIn && !!r.break_end_at && !r.check_out_at
  const isLate = r.status === 'late' && !isOut && !isOnBreak && !isBackFromBreak
  const isIn = hasCheckedIn && !isOut && !isOnBreak && !isBackFromBreak

  const isBreakTrackingOn = r.is_rostered !== false && r.break_tracking !== false

  // Status System Colors
  let borderColor = '#E2D1A9'
  let statusDot = '#CBD5E1'
  let statusText = 'Not Checked In'
  let statusColor = '#8B6E30'
  let badgeBg = '#FDFBF7'
  let badgeBorder = '#E2D1A9'
  let cardBg = '#FFFFFF'

  if (isOut) {
    borderColor = '#BFDBFE'; statusDot = '#3B82F6'
    statusText = 'Checked Out'; statusColor = '#1D4ED8'; badgeBg = '#EFF6FF'; badgeBorder = '#BFDBFE'; cardBg = '#FFFFFF'
  } else if (isOnBreak) {
    borderColor = '#FCD34D'; statusDot = '#B45309'
    statusText = 'On Break'; statusColor = '#92400E'; badgeBg = '#FEF3C7'; badgeBorder = '#FDE68A'; cardBg = '#FFFDF9'
  } else if (isBackFromBreak) {
    borderColor = '#BAE6FD'; statusDot = '#0284C7'
    statusText = 'Back From Break'; statusColor = '#0369A1'; badgeBg = '#E0F2FE'; badgeBorder = '#BAE6FD'; cardBg = '#F7FCFF'
  } else if (isLate) {
    borderColor = '#FCA5A5'; statusDot = '#DC2626'
    statusText = 'Late'; statusColor = '#DC2626'; badgeBg = '#FEF2F2'; badgeBorder = '#FCA5A5'; cardBg = '#FFFDFD'
  } else if (isIn) {
    borderColor = '#86EFAC'; statusDot = '#16A34A'
    statusText = 'Checked In'; statusColor = '#15803D'; badgeBg = '#DCFCE7'; badgeBorder = '#86EFAC'; cardBg = '#FAFFFA'
  }

  const fmtTime = (ts) => ts
    ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
    : null

  const formatShiftTime = (timeStr) => {
    if (!timeStr) return '11:00 AM'
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr
    const [h, m] = timeStr.split(':')
    if (!h) return timeStr
    let hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12 || 12
    return `${hour}:${m || '00'} ${ampm}`
  }

  const dutyTimeText = r.is_off ? 'OFF' : r.is_leave ? 'LEAVE' : formatShiftTime(r.shift_start)
  const avatarBg = getRoleAvatarBg(r.department, r.designation)

  return (
    <div
      style={{
        background: cardBg,
        border: `1.5px solid ${isScanned ? '#10B981' : borderColor}`,
        borderRadius: '18px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: isScanned ? '0 0 24px rgba(16,185,129,0.3)' : '0 6px 18px -4px rgba(139,110,48,0.02)',
        animation: isScanned ? 'rfidGlow 1.5s ease-in-out infinite' : 'none',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      <div>
        {/* Top Header Row: Avatar + Name + Role & Duty Time + Status Dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          {r.photo_url ? (
            <img
              src={r.photo_url} alt={r.name}
              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${borderColor}`, boxShadow: '0 4px 8px rgba(0,0,0,0.04)' }}
            />
          ) : (
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
              background: avatarBg, border: `2px solid ${borderColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '16px', color: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.04)'
            }}>
              {r.name ? r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CC'}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            <div style={{ fontSize: '11px', color: '#8B6E30', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span>{r.designation}</span>
              <span style={{ fontSize: '9px', opacity: 0.6 }}>·</span>
              <span style={{
                fontSize: '10.5px', fontWeight: 800, color: '#4338CA', background: '#EEF2FF', border: '1px solid #C7D2FE',
                padding: '1px 7px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px'
              }}>
                Duty: {dutyTimeText}
              </span>
            </div>
          </div>

          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusDot, flexShrink: 0, boxShadow: `0 0 8px ${statusDot}44` }} />
        </div>

        {/* Status Badge + Interactive Take Break Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em',
            color: statusColor, background: badgeBg, border: `1px solid ${badgeBorder}`,
            padding: '3px 10px', borderRadius: '16px'
          }}>
            {statusText}
            {isLate && !isOut && r.minutes_late > 0 && ` · ${r.minutes_late}m late`}
          </span>

          {/* Interactive Staff Take Break Toggle Switch */}
          {hasCheckedIn && !isOut && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleBreak(!isBreakOn)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: isBreakOn ? '#FEF3C7' : '#FDFBF7',
                border: isBreakOn ? '1.5px solid #F59E0B' : '1.5px solid #E2D1A9',
                padding: '3px 8px', borderRadius: '16px',
                cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none'
              }}
            >
              <div style={{
                width: '22px', height: '12px', borderRadius: '10px',
                background: isBreakOn ? '#D4933A' : '#CBD5E1',
                position: 'relative', transition: 'all 0.2s ease'
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', background: 'white',
                  position: 'absolute', top: '2px', left: isBreakOn ? '12px' : '2px',
                  transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 800, color: isBreakOn ? '#92400E' : '#8B6E30' }}>
                {isBreakOn ? 'Take Break ON ☕' : 'Take Break'}
              </span>
            </button>
          )}
        </div>

        {/* ALWAYS-OPEN FULL TIMELINE (NO COLLAPSE / EXPAND TOGGLE) */}
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
            <TimeChip label="IN" time={fmtTime(r.check_in_at)} color="#16A34A" />
            <TimeChip label="B.START" time={fmtTime(r.break_start_at)} color="#D97706" />
            <TimeChip label="B.END" time={fmtTime(r.break_end_at)} color="#0284C7" />
            <TimeChip label="OUT" time={fmtTime(r.check_out_at)} color="#2563EB" />
            <TimeChip label="DUTY" time={r.hours_worked > 0 ? `${r.hours_worked}h` : r.duty_hours ? `${r.duty_hours}h` : '—'} color="#7C3AED" />
          </div>
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
      borderRadius: '8px',
      padding: '6px 2px',
      textAlign: 'center',
      border: isSet ? `1px solid ${color}33` : '1px solid #F1F5F9'
    }}>
      <div style={{ fontSize: '7.5px', fontWeight: 800, color: isSet ? color : '#94A3B8', letterSpacing: '0.06em', marginBottom: '2px' }}>{label}</div>
      <div style={{
        fontSize: '10.5px', fontWeight: 800, color: isSet ? '#1C1917' : '#CBD5E1',
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }}>
        {time || '—'}
      </div>
    </div>
  )
}
