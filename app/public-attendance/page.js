'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Clock, CheckCircle2, AlertTriangle, Users, TrendingUp, Shield, Wifi, Activity } from 'lucide-react'

export default function PublicAttendancePage() {
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [data, setData] = useState({ date: '', summary: {}, records: [] })
  const [lastTapEvent, setLastTapEvent] = useState(null)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [tapPulse, setTapPulse] = useState(false)

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)
    fetchTodayData()

    const channel = supabase.channel('public_attendance_kiosk_v2')
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

  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    function handleGlobalKeyDown(e) {
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'TEXTAREA' || activeTag === 'INPUT') return

      const now = Date.now()
      if (now - lastKeyTime > 120) buffer = ''
      lastKeyTime = now

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
      if (res.ok) setData(json)
    } catch (err) {
      console.error('Failed to fetch attendance', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function handleRfidCheckin(identifier) {
    setTapPulse(true)
    setTimeout(() => setTapPulse(false), 600)
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, source: 'rfid' })
      })
      const json = await res.json()
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      if (res.ok) {
        setLastTapEvent({
          name: json.staff?.name || 'Staff Member',
          employeeId: json.staff?.employee_id || '',
          type: json.alreadyCheckedOut ? 'checkout' : json.status === 'late' ? 'late' : 'checkin',
          label: json.alreadyCheckedOut
            ? `Checked Out — ${json.hoursWorked || 0}h Duty`
            : json.status === 'late'
              ? `Present — Late`
              : 'Checked In — On Time',
          time: timeStr,
          success: true
        })
      } else {
        setLastTapEvent({ name: 'RFID Error', type: 'error', label: json.error || 'Unknown error', time: timeStr, success: false })
      }
      fetchTodayData(true)
      setTimeout(() => setLastTapEvent(null), 8000)
    } catch (err) {
      console.error('RFID checkin error', err)
    }
  }

  function triggerTapBanner(entry) {
    const timeStr = entry.check_in_at
      ? new Date(entry.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    setLastTapEvent({ name: entry.employee_id || 'Staff', type: entry.status === 'late' ? 'late' : 'checkin', label: (entry.status || 'present').toUpperCase(), time: timeStr, success: true })
    setTimeout(() => setLastTapEvent(null), 8000)
  }

  const records = data.records || []
  const filteredRecords = departmentFilter === 'all' ? records : records.filter(r => (r.department || 'front') === departmentFilter)
  const presentCount = records.filter(r => r.status === 'present').length
  const lateCount = records.filter(r => r.status === 'late').length
  const checkedOutCount = records.filter(r => r.check_out_at).length
  const totalCount = records.length
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0

  const tapColors = {
    checkin: { bg: '#052E16', accent: '#22C55E', label: 'CHECKED IN' },
    checkout: { bg: '#172554', accent: '#60A5FA', label: 'CHECKED OUT' },
    late: { bg: '#431407', accent: '#FB923C', label: 'LATE ARRIVAL' },
    error: { bg: '#450A0A', accent: '#F87171', label: 'ERROR' }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: '"Inter", "SF Pro Display", system-ui, -apple-system, sans-serif', color: '#0A0A0A' }}>

      {/* RFID Tap Flash Banner */}
      {lastTapEvent && (() => {
        const colors = tapColors[lastTapEvent.type] || tapColors.checkin
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: colors.bg,
            borderBottom: `3px solid ${colors.accent}`,
            padding: '16px 40px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            animation: 'slideDown 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={26} color="#000" />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '2px', color: colors.accent, marginBottom: '2px' }}>
                  {colors.label}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  {lastTapEvent.name}
                  {lastTapEvent.employeeId && <span style={{ marginLeft: '12px', fontSize: '14px', fontWeight: 500, opacity: 0.6 }}>{lastTapEvent.employeeId}</span>}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: colors.accent, marginBottom: '2px' }}>TIME RECORDED</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', fontFamily: 'monospace', letterSpacing: '2px' }}>{lastTapEvent.time}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{lastTapEvent.label}</div>
            </div>
          </div>
        )
      })()}

      {/* Header */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '0 40px',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: lastTapEvent ? '84px' : 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', background: '#0A0A0A', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={20} color="#D4933A" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.01em' }}>Crown Coffee</div>
              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, letterSpacing: '0.03em' }}>ATTENDANCE KIOSK</div>
            </div>
          </div>

          <div style={{ height: '32px', width: '1px', background: '#E5E7EB' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 0 3px rgba(22,163,74,0.15)' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', letterSpacing: '0.05em' }}>LIVE SYNC</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F3F4F6', padding: '4px 12px', borderRadius: '6px' }}>
            <Wifi size={13} color="#6B7280" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>RFID Active</span>
          </div>
        </div>

        {/* Live Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#0A0A0A', fontFamily: 'monospace', letterSpacing: '2px', lineHeight: 1 }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '36px 40px' }}>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>

          {/* Total Staff */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#0A0A0A', borderRadius: '16px 16px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ background: '#F3F4F6', padding: '10px', borderRadius: '10px' }}><Users size={20} color="#374151" /></div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#6B7280', letterSpacing: '0.08em' }}>TOTAL STAFF</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: '#0A0A0A', letterSpacing: '-0.03em', lineHeight: 1 }}>{totalCount}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px', fontWeight: 500 }}>Active employees today</div>
          </div>

          {/* Present */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#16A34A', borderRadius: '16px 16px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ background: '#DCFCE7', padding: '10px', borderRadius: '10px' }}><CheckCircle2 size={20} color="#16A34A" /></div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#16A34A', letterSpacing: '0.08em' }}>PRESENT</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: '#16A34A', letterSpacing: '-0.03em', lineHeight: 1 }}>{presentCount + lateCount}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px', fontWeight: 500 }}>{lateCount} late arrival{lateCount !== 1 ? 's' : ''}</div>
          </div>

          {/* Checked Out */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#2563EB', borderRadius: '16px 16px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ background: '#DBEAFE', padding: '10px', borderRadius: '10px' }}><TrendingUp size={20} color="#2563EB" /></div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', letterSpacing: '0.08em' }}>CHECKED OUT</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: '#2563EB', letterSpacing: '-0.03em', lineHeight: 1 }}>{checkedOutCount}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px', fontWeight: 500 }}>Duty completed</div>
          </div>

          {/* Attendance Rate */}
          <div style={{ background: '#0A0A0A', border: '1px solid #1F2937', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#D4933A', borderRadius: '16px 16px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(212,147,58,0.15)', padding: '10px', borderRadius: '10px' }}><Activity size={20} color="#D4933A" /></div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#D4933A', letterSpacing: '0.08em' }}>ATTENDANCE RATE</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1 }}>{attendanceRate}%</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px', fontWeight: 500 }}>Of total staff today</div>
          </div>
        </div>

        {/* Filter Tabs & Shift Info Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '4px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '4px' }}>
            {[
              { id: 'all', label: 'All Staff' },
              { id: 'front', label: 'Front of House' },
              { id: 'kitchen', label: 'Kitchen' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDepartmentFilter(tab.id)}
                style={{
                  padding: '8px 20px', borderRadius: '7px', border: 'none',
                  background: departmentFilter === tab.id ? '#0A0A0A' : 'transparent',
                  color: departmentFilter === tab.id ? '#FFFFFF' : '#6B7280',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontWeight: 600 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 16px', color: '#374151' }}>
              Morning Shift: <strong>8:00 AM</strong> <span style={{ color: '#D97706' }}>(Grace: 8:15 AM)</span>
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 16px', color: '#374151' }}>
              Afternoon Shift: <strong>1:00 PM</strong> <span style={{ color: '#D97706' }}>(Grace: 1:15 PM)</span>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        {loading ? (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '80px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.05em' }}>LOADING ATTENDANCE DATA...</div>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 130px 130px 130px 120px 110px',
              padding: '0 24px', height: '44px', alignItems: 'center',
              background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
              fontSize: '11px', fontWeight: 800, color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase'
            }}>
              <div>#</div>
              <div>Employee</div>
              <div>Department</div>
              <div>Check-In</div>
              <div>Check-Out</div>
              <div>Duty Hours</div>
              <div>Status</div>
            </div>

            {/* Table Rows */}
            {filteredRecords.map((r, idx) => {
              const isPresent = r.status === 'present'
              const isLate = r.status === 'late'
              const isLeave = r.status === 'on_leave'
              const isOff = r.status === 'off'
              const isCheckedIn = isPresent || isLate
              const isCheckedOut = !!r.check_out_at

              let statusBg, statusColor, statusText
              if (isPresent && isCheckedOut) { statusBg = '#DBEAFE'; statusColor = '#1D4ED8'; statusText = 'CHECKED OUT' }
              else if (isPresent) { statusBg = '#DCFCE7'; statusColor = '#15803D'; statusText = 'PRESENT' }
              else if (isLate && isCheckedOut) { statusBg = '#DBEAFE'; statusColor = '#1D4ED8'; statusText = 'CHECKED OUT' }
              else if (isLate) { statusBg = '#FEF3C7'; statusColor = '#B45309'; statusText = 'LATE' }
              else if (isLeave) { statusBg = '#EDE9FE'; statusColor = '#6D28D9'; statusText = 'ON LEAVE' }
              else if (isOff) { statusBg = '#F3F4F6'; statusColor = '#374151'; statusText = 'DAY OFF' }
              else { statusBg = '#FEE2E2'; statusColor = '#B91C1C'; statusText = 'ABSENT' }

              return (
                <div
                  key={r.staff_id}
                  style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr 130px 130px 130px 120px 110px',
                    padding: '0 24px', minHeight: '60px', alignItems: 'center',
                    borderBottom: '1px solid #F3F4F6',
                    background: isCheckedIn ? 'rgba(22,163,74,0.02)' : '#FFFFFF',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF' }}>{idx + 1}</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {r.photo_url ? (
                      <img src={r.photo_url} alt={r.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E7EB' }} />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F3F4F6', border: '2px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#374151' }}>
                        {r.name ? r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CC'}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0A0A0A' }}>{r.name}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 500 }}>{r.employee_id} · {r.designation}</div>
                    </div>
                  </div>

                  <div>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px',
                      background: r.department === 'kitchen' ? '#FEF3C7' : '#EFF6FF',
                      color: r.department === 'kitchen' ? '#92400E' : '#1D4ED8'
                    }}>
                      {r.department === 'kitchen' ? 'KITCHEN' : 'FRONT'}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 700, color: isCheckedIn ? '#0A0A0A' : '#D1D5DB', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                    {r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                    {isLate && r.minutes_late > 0 && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 800, color: '#B45309', background: '#FEF3C7', padding: '1px 5px', borderRadius: '4px', fontFamily: 'system-ui' }}>
                        +{r.minutes_late}m
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 700, color: isCheckedOut ? '#0A0A0A' : '#D1D5DB', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                    {r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 700, color: r.hours_worked > 0 ? '#2563EB' : '#D1D5DB', fontFamily: 'monospace' }}>
                    {r.hours_worked > 0 ? `${r.hours_worked}h` : '—'}
                    {r.overtime_minutes > 0 && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 800, color: '#7C3AED', background: '#EDE9FE', padding: '1px 5px', borderRadius: '4px', fontFamily: 'system-ui' }}>
                        OT
                      </span>
                    )}
                  </div>

                  <div>
                    <span style={{
                      fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px',
                      letterSpacing: '0.06em', background: statusBg, color: statusColor
                    }}>
                      {statusText}
                    </span>
                  </div>
                </div>
              )
            })}

            {filteredRecords.length === 0 && (
              <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', fontWeight: 500 }}>
                No staff records found.
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>
          <div>Auto-refreshes every 10 seconds · Resets daily at 12:00 AM midnight</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
            Crown Coffee Attendance System · {currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
