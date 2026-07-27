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
          {time.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>
    </div>
  )
}

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
      })
      .subscribe()

    return () => {
      clearInterval(clockTimer)
      supabase.removeChannel(channel)
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

  async function handleCheckin(staffIdOrRfid, manualStatus = null, method = 'manual', enableBreak = false) {
    if (!staffIdOrRfid) return
    try {
      setCheckingIn(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('cc_token') : null
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          identifier: staffIdOrRfid,
          source: method,
          adminOverride: !!manualStatus,
          forceStatus: manualStatus,
          enableBreak: !!enableBreak,
          token
        })
      })
      const json = await res.json()
      if (res.ok && (json.success || json.alreadyCheckedOut)) {
        let actionMsg = 'Attendance updated!'
        if (json.action === 'break_start') actionMsg = 'Break Started ☕'
        else if (json.action === 'break_end') actionMsg = 'Break Ended — Back On Shift 🟢'
        else if (json.action === 'checkout') actionMsg = 'Checked Out successfully! 👋'
        else if (json.action === 'checkin') actionMsg = 'Checked In successfully! ⏰'

        addToast(json.message || actionMsg, 'success')
        setQrModalOpen(false)
        setQrCodeInput('')
        fetchTodayData(true)
        if (json.staff) {
          setLastTapEvent({
            name: json.staff.name || 'Staff Member',
            status: json.action ? json.action.toUpperCase() : (json.status ? json.status.toUpperCase() : 'UPDATED'),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
          })
          setTimeout(() => setLastTapEvent(null), 5000)
        }
      } else if (json.blocked) {
        addToast(json.error || `Attendance already complete for today`, 'warning')
      } else {
        addToast(json.error || 'Failed to update attendance', 'error')
      }
    } catch (err) {
      addToast('Network error updating attendance', 'error')
    } finally {
      setCheckingIn(false)
    }
  }

  const records = data.records || []
  
  // Filter by department & search
  const filteredRecords = records.filter(r => {
    const matchesDept = departmentFilter === 'all' || r.department === departmentFilter
    const matchesSearch = searchQuery === '' ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.employee_id && r.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesDept && matchesSearch
  })

  const presentCount = records.filter(r => r.status === 'present').length
  const lateCount = records.filter(r => r.status === 'late').length
  const onBreakCount = records.filter(r => r.check_in_at && r.break_start_at && !r.break_end_at).length
  const absentCount = records.filter(r => r.status === 'absent').length
  const totalCount = records.length

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', fontFamily: 'var(--font-sans)' }}>
      {!isKioskMode && <Navbar />}

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: isKioskMode ? '24px' : '32px 24px 60px' }}>
        
        {/* Top Header & Live Analog Clock */}
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
              Tap RFID card anytime on USB reader to check in/out. Admin/Manager can manage breaks & attendance manually.
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

            {/* Round Ticking Analog Clock */}
            <AnalogClock time={currentTime} />
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
            <span>REALTIME CARD TAP: <strong>{lastTapEvent.name}</strong> — {lastTapEvent.status} at {lastTapEvent.time}</span>
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
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
            <div style={{ background: '#FEF3C7', color: '#B45309', padding: '12px', borderRadius: '12px' }}><Clock size={24} /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>On Break</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#B45309' }}>{onBreakCount}</div>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ background: '#FFF7ED', color: '#92400E', padding: '12px', borderRadius: '12px' }}><Clock size={24} /></div>
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
              { id: 'front', label: 'Front Staff' },
              { id: 'kitchen', label: 'Kitchen Staff' }
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
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>Loading Staff Directory & RFID Attendance…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
            {filteredRecords.map(r => {
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
                borderColor = '#E2E8F0'; statusDot = '#64748B'
                statusText = 'Day Off'; statusColor = '#64748B'
              }

              const fmtTime = (ts) => ts
                ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
                : null

              return (
                <div key={r.staff_id} style={{
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}>
                  <div>
                    {/* Top: Avatar + Name + Status Dot */}
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
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '1px' }}>
                          {r.employee_id ? `${r.employee_id} • ` : ''}{r.designation}
                        </div>
                      </div>
                      {/* Status Dot */}
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: statusDot, flexShrink: 0, boxShadow: `0 0 0 3px ${statusDot}22` }} />
                    </div>

                    {/* Status Badge & Department */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em',
                        color: statusColor, background: `${borderColor}55`,
                        padding: '4px 10px', borderRadius: '20px'
                      }}>
                        {statusText}
                        {isLate && !isOut && r.minutes_late > 0 && ` · ${r.minutes_late}m late`}
                      </span>

                      <span style={{
                        fontSize: '10px', padding: '3px 8px', borderRadius: '12px',
                        background: r.department === 'kitchen' ? '#FFF3E0' : '#E0F2FE',
                        color: r.department === 'kitchen' ? '#92400E' : '#0369A1',
                        fontWeight: 700
                      }}>
                        {r.department === 'kitchen' ? 'Kitchen' : 'Front'}
                      </span>
                    </div>

                    {/* 5-Column Metric Grid: IN | B.START | B.END | OUT | DUTY */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '14px' }}>
                      <div style={{
                        background: '#F8FAFC', borderRadius: '6px', padding: '6px 2px', textAlign: 'center',
                        border: r.check_in_at ? '1px solid #16A34A33' : '1px solid #F1F5F9'
                      }}>
                        <div style={{ fontSize: '8px', fontWeight: 800, color: r.check_in_at ? '#16A34A' : '#CBD5E1' }}>IN</div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: r.check_in_at ? '#0F172A' : '#CBD5E1', fontFamily: 'monospace' }}>
                          {fmtTime(r.check_in_at) || '—'}
                        </div>
                      </div>

                      <div style={{
                        background: '#F8FAFC', borderRadius: '6px', padding: '6px 2px', textAlign: 'center',
                        border: r.break_start_at ? '1px solid #B4530933' : '1px solid #F1F5F9'
                      }}>
                        <div style={{ fontSize: '8px', fontWeight: 800, color: r.break_start_at ? '#B45309' : '#CBD5E1' }}>B.START</div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: r.break_start_at ? '#92400E' : '#CBD5E1', fontFamily: 'monospace' }}>
                          {fmtTime(r.break_start_at) || '—'}
                        </div>
                      </div>

                      <div style={{
                        background: '#F8FAFC', borderRadius: '6px', padding: '6px 2px', textAlign: 'center',
                        border: r.break_end_at ? '1px solid #0369A133' : '1px solid #F1F5F9'
                      }}>
                        <div style={{ fontSize: '8px', fontWeight: 800, color: r.break_end_at ? '#0369A1' : '#CBD5E1' }}>B.END</div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: r.break_end_at ? '#0369A1' : '#CBD5E1', fontFamily: 'monospace' }}>
                          {fmtTime(r.break_end_at) || '—'}
                        </div>
                      </div>

                      <div style={{
                        background: '#F8FAFC', borderRadius: '6px', padding: '6px 2px', textAlign: 'center',
                        border: r.check_out_at ? '1px solid #2563EB33' : '1px solid #F1F5F9'
                      }}>
                        <div style={{ fontSize: '8px', fontWeight: 800, color: r.check_out_at ? '#2563EB' : '#CBD5E1' }}>OUT</div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: r.check_out_at ? '#0F172A' : '#CBD5E1', fontFamily: 'monospace' }}>
                          {fmtTime(r.check_out_at) || '—'}
                        </div>
                      </div>

                      <div style={{
                        background: '#F8FAFC', borderRadius: '6px', padding: '6px 2px', textAlign: 'center',
                        border: '1px solid #7C3AED33'
                      }}>
                        <div style={{ fontSize: '8px', fontWeight: 800, color: '#7C3AED' }}>DUTY</div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                          {r.hours_worked > 0 ? `${r.hours_worked}h` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Give Break / End Break / Clock Out / Clock In */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    {r.check_in_at && !r.check_out_at ? (
                      <>
                        {isOnBreak ? (
                          <button
                            onClick={() => handleCheckin(r.staff_id, null, 'manual', true)}
                            disabled={checkingIn}
                            style={{
                              flex: 1, padding: '10px',
                              background: '#0D9488', color: 'white', border: 'none',
                              borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer'
                            }}
                          >
                            End Break ☕
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCheckin(r.staff_id, null, 'manual', true)}
                            disabled={checkingIn}
                            style={{
                              flex: 1, padding: '10px',
                              background: '#FEF3C7', color: '#92400E', border: '1.5px solid #F59E0B',
                              borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer'
                            }}
                          >
                            Give Break ☕
                          </button>
                        )}

                        <button
                          onClick={() => handleCheckin(r.staff_id, null, 'manual', false)}
                          disabled={checkingIn}
                          style={{
                            flex: 1, padding: '10px',
                            background: '#DC2626', color: 'white', border: 'none',
                            borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer'
                          }}
                        >
                          Clock Out
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleCheckin(r.staff_id, null, 'manual', false)}
                        disabled={checkingIn || !!r.check_out_at}
                        style={{
                          width: '100%', padding: '10px',
                          background: r.check_out_at ? '#F1F5F9' : '#0F172A',
                          color: r.check_out_at ? '#64748B' : 'white',
                          border: r.check_out_at ? '1px solid #CBD5E1' : 'none',
                          borderRadius: '10px', fontSize: '13px', fontWeight: 800,
                          cursor: r.check_out_at ? 'default' : 'pointer'
                        }}
                      >
                        {r.check_out_at ? 'Shift Completed' : 'Clock In'}
                      </button>
                    )}
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
