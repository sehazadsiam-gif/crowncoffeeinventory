'use client'

import { useState, useEffect } from 'react'
import Navbar from '../../../components/Navbar'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../components/Toast'
import {
  Clock, CheckCircle2, AlertTriangle, Users, Calendar,
  Radio, Sparkles, RefreshCw, Coffee, Monitor, ShieldCheck,
  Check, Edit3, Award, DollarSign, Trash2
} from 'lucide-react'

export default function AttendanceCheckPage() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('live') // 'live' | 'monthly' | 'trends'

  // Today Live Data state
  const [todayData, setTodayData] = useState({ date: '', summary: {}, records: [] })
  const [liveLoading, setLiveLoading] = useState(true)
  const [lastTapEvent, setLastTapEvent] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Monthly Diagnostic Data state
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [monthlyData, setMonthlyData] = useState([])
  const [calculations, setCalculations] = useState({})
  const [monthlyLoading, setMonthlyLoading] = useState(false)

  // Late Trend Data state
  const [trendsData, setTrendsData] = useState([])
  const [trendsLoading, setTrendsLoading] = useState(false)

  // Manual Override Modal state
  const [selectedStaffForOverride, setSelectedStaffForOverride] = useState(null)
  const [overrideForm, setOverrideForm] = useState({ date: '', check_in_time: '08:00', check_out_time: '18:00', status: 'present', notes: '' })
  const [overrideSubmitting, setOverrideSubmitting] = useState(false)

  useEffect(() => {
    // 1. Live Ticker Clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)

    // 2. Fetch today's live data
    fetchTodayData()

    // 3. Supabase Realtime Subscription on attendance_log for instant sync with PWA
    const channel = supabase.channel('admin_live_attendance_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_log' }, (payload) => {
        fetchTodayData(true)
        if (payload.new) {
          triggerLiveBanner(payload.new)
        }
      })
      .subscribe()

    // Fallback polling every 10 seconds
    const poll = setInterval(() => fetchTodayData(true), 10000)

    return () => {
      clearInterval(timer)
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyDiagnostic()
    } else if (activeTab === 'trends') {
      fetchLateTrends()
    }
  }, [activeTab, month, year])

  async function fetchLateTrends() {
    setTrendsLoading(true)
    try {
      const res = await fetch(`/api/attendance/late-trend?month=${month}&year=${year}`)
      const data = await res.json()
      setTrendsData(data.trends || [])
    } catch (error) {
      console.error('Error fetching trends:', error)
      addToast('Error loading late trend data', 'error')
    } finally {
      setTrendsLoading(false)
    }
  }

  async function fetchTodayData(silent = false) {
    try {
      if (!silent) setLiveLoading(true)
      const res = await fetch(`/api/attendance/today?t=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) {
        setTodayData(json)
      }
    } catch (err) {
      console.error('Failed to fetch today live attendance', err)
    } finally {
      if (!silent) setLiveLoading(false)
    }
  }

  function triggerLiveBanner(entry) {
    const timeStr = entry.check_in_at
      ? new Date(entry.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    setLastTapEvent({
      name: entry.employee_id || 'Staff Member',
      status: (entry.status || 'present').toUpperCase(),
      time: timeStr
    })

    setTimeout(() => setLastTapEvent(null), 8000)
  }

  async function fetchMonthlyDiagnostic() {
    setMonthlyLoading(true)
    try {
      const res = await fetch(`/api/attendance/diagnostic?month=${month}&year=${year}`)
      const data = await res.json()
      setMonthlyData(data.attendance || [])
      calculateMetrics(data.attendance || [])
    } catch (error) {
      console.error('Error fetching diagnostic:', error)
      addToast('Error loading monthly diagnostic data', 'error')
    } finally {
      setMonthlyLoading(false)
    }
  }

  function calculateMetrics(records) {
    const metrics = {}

    records.forEach(record => {
      if (!metrics[record.staff_id]) {
        metrics[record.staff_id] = {
          staff_name: record.staff_name,
          present: 0,
          late: 0,
          absent: 0,
          morning_food: 0,
          morning_food_details: [],
          late_details: []
        }
      }

      const stat = metrics[record.staff_id]
      if (record.status === 'present') stat.present++
      if (record.status === 'late') stat.late++
      if (record.status === 'absent') stat.absent++

      // Morning food calculation: Check-in between 7:30 AM - 9:00 AM = 40 TK
      if (record.check_in_time && (record.status === 'present' || record.status === 'late')) {
        const time = parseTime(record.check_in_time)
        if (time >= 7.5 && time <= 9.0) {
          stat.morning_food += 40
          stat.morning_food_details.push({
            date: record.date,
            time: record.check_in_time,
            amount: 40,
            status: record.status
          })
        }
      }

      if (record.status === 'late') {
        stat.late_details.push({
          date: record.date,
          check_in: record.check_in_time,
          status: 'LATE'
        })
      }
    })

    setCalculations(metrics)
  }

  function parseTime(timeStr) {
    if (!timeStr) return 0
    const [time, period] = timeStr.split(' ')
    if (!time || !period) return 0
    let [hours, mins] = time.split(':').map(Number)
    if (period === 'PM' && hours < 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return hours + (mins || 0) / 60
  }

  async function handleRunAutoClose() {
    const dateStr = prompt('Enter Date for Auto-Close & Absent Flag (YYYY-MM-DD):', new Date().toISOString().split('T')[0])
    if (!dateStr) return
    try {
      const res = await fetch(`/api/attendance/auto-flag?date=${dateStr}`)
      const json = await res.json()
      if (res.ok) {
        addToast(`Auto-Close Complete! Flagged Absent: ${json.result?.flagged || 0}, Auto-Closed Checkouts: ${json.result?.autoClosed || 0}`, 'success')
        fetchTodayData(true)
        if (activeTab === 'monthly') fetchMonthlyDiagnostic()
      } else {
        addToast(json.error || 'Auto-Close routine failed', 'error')
      }
    } catch (err) {
      addToast('Error running auto-close routine', 'error')
    }
  }

  async function handleDeleteDayAttendance() {
    const defaultDate = todayData.date || new Date().toISOString().split('T')[0]
    const dateStr = prompt('TESTING FEATURE: Enter Date to Delete ALL Check-In/Out Timings (YYYY-MM-DD):', defaultDate)
    if (!dateStr) return

    if (!confirm(`⚠️ ARE YOU SURE?\nThis will completely erase all check-in and check-out timings for ALL staff on ${dateStr} for testing.`)) {
      return
    }

    try {
      const res = await fetch('/api/attendance/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr })
      })
      const json = await res.json()
      if (res.ok) {
        addToast(`Deleted ${json.deletedCount || 0} attendance record(s) for ${dateStr}!`, 'success')
        fetchTodayData(true)
        if (activeTab === 'monthly') fetchMonthlyDiagnostic()
      } else {
        addToast(json.error || 'Failed to delete day attendance', 'error')
      }
    } catch (err) {
      addToast('Error deleting day attendance', 'error')
    }
  }

  async function handleDeleteStaffTiming(staff) {
    const targetDate = todayData.date || new Date().toISOString().split('T')[0]
    if (!confirm(`Delete check-in/out timing for ${staff.name} on ${targetDate}?`)) {
      return
    }

    try {
      const res = await fetch('/api/attendance/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate, staffId: staff.staff_id })
      })
      const json = await res.json()
      if (res.ok) {
        addToast(`Cleared attendance timing for ${staff.name}!`, 'success')
        fetchTodayData(true)
        if (activeTab === 'monthly') fetchMonthlyDiagnostic()
      } else {
        addToast(json.error || 'Failed to clear attendance timing', 'error')
      }
    } catch (err) {
      addToast('Error clearing attendance timing', 'error')
    }
  }

  async function handleSaveOverride(e) {
    e.preventDefault()
    if (!selectedStaffForOverride) return
    try {
      setOverrideSubmitting(true)
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: selectedStaffForOverride.staff_id,
          timestamp: `${overrideForm.date || new Date().toISOString().split('T')[0]}T${overrideForm.check_in_time}:00`,
          source: 'manual',
          notes: overrideForm.notes || 'Admin manual override',
          adminOverride: true,
          forceStatus: overrideForm.status
        })
      })

      const json = await res.json()
      if (res.ok) {
        addToast(`Successfully set attendance for ${selectedStaffForOverride.name}!`, 'success')
        setSelectedStaffForOverride(null)
        fetchTodayData(true)
      } else {
        addToast(json.error || 'Failed to save attendance override', 'error')
      }
    } catch (err) {
      addToast('Error saving override', 'error')
    } finally {
      setOverrideSubmitting(false)
    }
  }

  async function handleQuickCheckin(staff) {
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: staff.staff_id,
          source: 'manual'
        })
      })
      const json = await res.json()
      if (res.ok) {
        addToast(`Checked In ${staff.name}!`, 'success')
        fetchTodayData(true)
      } else {
        addToast(json.error || 'Quick check-in failed', 'error')
      }
    } catch (e) {
      addToast('Check-in error', 'error')
    }
  }

  async function handleQuickCheckout(staff) {
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: staff.staff_id,
          source: 'manual'
        })
      })
      const json = await res.json()
      if (res.ok) {
        addToast(`Checked Out ${staff.name}!`, 'success')
        fetchTodayData(true)
      } else {
        addToast(json.error || 'Quick check-out failed', 'error')
      }
    } catch (e) {
      addToast('Check-out error', 'error')
    }
  }

  const records = todayData.records || []
  const presentCount = records.filter(r => r.status === 'present').length
  const lateCount = records.filter(r => r.status === 'late').length
  const totalCount = records.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base, #FAF7F2)', color: 'var(--text-primary, #1C1410)' }}>
      <Navbar />

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '32px 24px 60px' }}>
        
        {/* Header Title & Clock */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                Live Attendance Command Center
              </h1>
              <span style={{ background: '#059669', color: 'white', padding: '3px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Radio size={14} className="pulse-dot" /> LIVE PWA SYNC
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-muted, #786C60)' }}>
              Real-time monitoring synced with cafe RFID readers & PWA public display kiosk.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href={`/api/attendance/export-csv?month=${month}&year=${year}`}
              download
              style={{ background: '#059669', color: 'white', textDecoration: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Award size={16} /> Export Monthly CSV
            </a>

            <button
              onClick={handleRunAutoClose}
              style={{ background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={16} /> Run Midnight Auto-Close
            </button>


            <button
              onClick={handleDeleteDayAttendance}
              style={{ background: '#DC2626', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Delete check-in and check-out timings for an entire day for testing"
            >
              <Trash2 size={16} /> Delete Day Timings (Testing)
            </button>

            <div style={{ background: 'var(--bg-surface, #FFF)', border: '1px solid var(--border-light, #E8E0D4)', borderRadius: '10px', padding: '8px 16px', textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#6B3A2A' }}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>
                {currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>
        </div>

        {/* Live Tap Flash Banner */}
        {lastTapEvent && (
          <div style={{
            background: '#065F46',
            color: 'white',
            borderRadius: '12px',
            padding: '14px 24px',
            marginBottom: '24px',
            fontWeight: 800,
            fontSize: '16px',
            boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Sparkles size={20} />
            <span>🟢 REALTIME RFID SCAN: <strong>{lastTapEvent.name}</strong> — {lastTapEvent.status} at {lastTapEvent.time}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid var(--border-light, #E8E0D4)', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'live' ? '#6B3A2A' : 'transparent',
              color: activeTab === 'live' ? 'white' : 'var(--text-muted, #786C60)',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Monitor size={18} /> Today's Live Realtime Feed
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'monthly' ? '#6B3A2A' : 'transparent',
              color: activeTab === 'monthly' ? 'white' : 'var(--text-muted, #786C60)',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Award size={18} /> Monthly Diagnostic & Morning Allowance
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'trends' ? '#6B3A2A' : 'transparent',
              color: activeTab === 'trends' ? 'white' : 'var(--text-muted, #786C60)',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertTriangle size={18} /> Late Trends & Frequency
          </button>
        </div>


        {/* TAB 1: TODAY LIVE FEED */}
        {activeTab === 'live' && (
          <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div style={{ background: 'var(--bg-surface, #FFF)', border: '1px solid var(--border-light, #E8E0D4)', borderRadius: '14px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#0284C7', padding: '12px', borderRadius: '10px' }}><Users size={24} /></div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Active Staff</div>
                  <div style={{ fontSize: '24px', fontWeight: 900 }}>{totalCount}</div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface, #FFF)', border: '1px solid var(--border-light, #E8E0D4)', borderRadius: '14px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669', padding: '12px', borderRadius: '10px' }}><CheckCircle2 size={24} /></div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Present Today</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669' }}>{presentCount + lateCount}</div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface, #FFF)', border: '1px solid var(--border-light, #E8E0D4)', borderRadius: '14px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#D97706', padding: '12px', borderRadius: '10px' }}><Clock size={24} /></div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Late Arrivals</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#D97706' }}>{lateCount}</div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface, #FFF)', border: '1px solid var(--border-light, #E8E0D4)', borderRadius: '14px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#DC2626', padding: '12px', borderRadius: '10px' }}><AlertTriangle size={24} /></div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Not Checked In</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#DC2626' }}>{totalCount - (presentCount + lateCount)}</div>
                </div>
              </div>
            </div>

            {/* Live Staff Cards Grid */}
            {liveLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>
                Fetching Live RFID & Attendance Feed…
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {records.map(r => {
                  const isPresent = r.status === 'present'
                  const isLate = r.status === 'late'
                  const isOff = r.status === 'off'
                  const isLeave = r.status === 'on_leave'
                  const isCheckedIn = isPresent || isLate

                  let statusBg = '#F3F4F6'
                  let statusColor = '#6B7280'
                  let statusText = 'Not Checked In'

                  if (isPresent) { statusBg = '#D1FAE5'; statusColor = '#065F46'; statusText = 'PRESENT' }
                  else if (isLate) { statusBg = '#FEF3C7'; statusColor = '#92400E'; statusText = `LATE (${r.minutes_late || 0}m)` }
                  else if (isLeave) { statusBg = '#DBEAFE'; statusColor = '#1E40AF'; statusText = 'ON LEAVE' }
                  else if (isOff) { statusBg = '#F3E8FF'; statusColor = '#6B21A8'; statusText = 'DAY OFF' }

                  return (
                    <div key={r.staff_id} style={{
                      background: 'var(--bg-surface, #FFF)',
                      border: isCheckedIn ? '2px solid #059669' : '1px solid var(--border-light, #E8E0D4)',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontSize: '18px', fontWeight: 800 }}>{r.name}</div>
                            <div style={{ fontSize: '12px', color: '#786C60', marginTop: '2px' }}>
                              {r.employee_id} • {r.designation}
                            </div>
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: statusBg,
                            color: statusColor
                          }}>
                            {statusText}
                          </span>
                        </div>

                        {/* Department Tag & RFID Indicator */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
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

                          {r.rfid_code ? (
                            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              RFID Paired
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                              No Card Paired
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Timings & Override Button */}
                      <div style={{ borderTop: '1px solid var(--border-light, #E8E0D4)', paddingTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px' }}>
                          <div>
                            <span style={{ color: '#888', fontSize: '10px', display: 'block' }}>CHECK-IN</span>
                            <strong style={{ fontSize: '13px' }}>
                              {r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                            </strong>
                          </div>

                          <div>
                            <span style={{ color: '#888', fontSize: '10px', display: 'block' }}>CHECK-OUT</span>
                            <strong style={{ fontSize: '13px' }}>
                              {r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                            </strong>
                          </div>

                          {r.hours_worked > 0 && (
                            <div>
                              <span style={{ color: '#888', fontSize: '10px', display: 'block' }}>DUTY</span>
                              <strong style={{ fontSize: '13px', color: '#059669' }}>{r.hours_worked}h</strong>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {!r.check_in_at ? (
                            <button
                              onClick={() => handleQuickCheckin(r)}
                              style={{
                                flex: 1,
                                padding: '8px',
                                background: '#16A34A',
                                border: 'none',
                                color: 'white',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={14} /> Check In Now
                            </button>
                          ) : !r.check_out_at ? (
                            <button
                              onClick={() => handleQuickCheckout(r)}
                              style={{
                                flex: 1,
                                padding: '8px',
                                background: '#2563EB',
                                border: 'none',
                                color: 'white',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={14} /> Check Out Now
                            </button>
                          ) : (
                            <div style={{ flex: 1, fontSize: '11px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              Shift Complete
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setSelectedStaffForOverride(r)
                              setOverrideForm({
                                date: todayData.date || new Date().toISOString().split('T')[0],
                                check_in_time: '08:00',
                                check_out_time: '18:00',
                                status: 'present',
                                notes: 'Admin manual time override'
                              })
                            }}
                            style={{
                              padding: '8px 12px',
                              background: '#FAF7F2',
                              border: '1px solid #6B3A2A',
                              color: '#6B3A2A',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <Edit3 size={14} /> Edit Time
                          </button>

                          {(r.check_in_at || r.check_out_at) && (
                            <button
                              onClick={() => handleDeleteStaffTiming(r)}
                              style={{
                                padding: '8px 10px',
                                background: '#FEF2F2',
                                border: '1px solid #EF4444',
                                color: '#DC2626',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                              title="Delete today check-in/out timing for testing"
                            >
                              <Trash2 size={14} /> Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MONTHLY DIAGNOSTICS & MORNING ALLOWANCE */}
        {activeTab === 'monthly' && (
          <div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
              <label style={{ fontWeight: 700, fontSize: '14px' }}>Select Month:</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: '8px', fontWeight: 700 }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: '8px', width: '90px', fontWeight: 700 }}
              />
            </div>

            {monthlyLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading monthly diagnostic metrics…</div>
            ) : (
              <div style={{ display: 'grid', gap: '24px' }}>
                {Object.entries(calculations).length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#FFF', borderRadius: '12px', color: '#888' }}>
                    No diagnostic records found for this month.
                  </div>
                ) : (
                  Object.entries(calculations).map(([staffId, data]) => (
                    <div key={staffId} style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1F1F1F', marginBottom: '16px', borderBottom: '1px solid #F5F5F5', paddingBottom: '12px' }}>
                        {data.staff_name}
                      </h2>

                      {/* Summary Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ background: '#E8F5E9', padding: '14px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '10px', color: '#2E7D32', fontWeight: 800, textTransform: 'uppercase' }}>PRESENT</div>
                          <div style={{ fontSize: '24px', fontWeight: 900, color: '#2E7D32' }}>{data.present}</div>
                        </div>

                        <div style={{ background: '#FFF3E0', padding: '14px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '10px', color: '#F57C00', fontWeight: 800, textTransform: 'uppercase' }}>LATE</div>
                          <div style={{ fontSize: '24px', fontWeight: 900, color: '#F57C00' }}>{data.late}</div>
                        </div>

                        <div style={{ background: '#FFEBEE', padding: '14px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '10px', color: '#D32F2F', fontWeight: 800, textTransform: 'uppercase' }}>ABSENT</div>
                          <div style={{ fontSize: '24px', fontWeight: 900, color: '#D32F2F' }}>{data.absent}</div>
                        </div>

                        <div style={{ background: '#E3F2FD', padding: '14px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '10px', color: '#1976D2', fontWeight: 800, textTransform: 'uppercase' }}>MORNING FOOD</div>
                          <div style={{ fontSize: '24px', fontWeight: 900, color: '#1976D2' }}>৳ {data.morning_food}</div>
                        </div>
                      </div>

                      {/* Morning Food Breakdown */}
                      {data.morning_food_details.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#555', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Morning Food Allowance History (7:30 AM - 9:00 AM)
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ background: '#F8F9FA', textTransform: 'uppercase', fontSize: '10px', color: '#888' }}>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Check-In Time</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                                  <th style={{ padding: '8px', textAlign: 'right' }}>Allowance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.morning_food_details.map((detail, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                                    <td style={{ padding: '8px' }}>{detail.date}</td>
                                    <td style={{ padding: '8px', fontWeight: 700 }}>{detail.time}</td>
                                    <td style={{ padding: '8px' }}>
                                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, background: detail.status === 'late' ? '#FFF3E0' : '#E8F5E9', color: detail.status === 'late' ? '#F57C00' : '#2E7D32' }}>
                                        {detail.status.toUpperCase()}
                                      </span>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#1976D2' }}>৳ {detail.amount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LATE TRENDS & FREQUENCY REPORT */}
        {activeTab === 'trends' && (
          <div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
              <label style={{ fontWeight: 700, fontSize: '14px' }}>Select Month:</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: '8px', fontWeight: 700 }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: '8px', width: '90px', fontWeight: 700 }}
              />
            </div>

            {trendsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading late trend analytics…</div>
            ) : (
              <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #E8E0D4', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1C1410', marginBottom: '16px' }}>
                  📊 Staff Punctuality & Late Frequency Analysis
                </h3>
                {trendsData.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No attendance records found for this period.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#F8F6F0', textAlign: 'left', fontSize: '12px', color: '#64748B', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px' }}>Staff Name</th>
                        <th style={{ padding: '12px' }}>Department</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Late Count</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Late %</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Avg Late Mins</th>
                        <th style={{ padding: '12px' }}>Recent Late Dates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendsData.map((row) => (
                        <tr key={row.staff_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px', fontWeight: 800 }}>
                            {row.name}
                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>{row.designation}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: row.department === 'kitchen' ? '#FEF3C7' : '#E0F2FE', color: row.department === 'kitchen' ? '#92400E' : '#0369A1', fontWeight: 700 }}>
                              {row.department.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 900, color: row.late_count > 3 ? '#DC2626' : row.late_count > 0 ? '#D97706' : '#16A34A' }}>
                            {row.late_count} times
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800 }}>
                            {row.late_percent}%
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#D97706' }}>
                            {row.avg_minutes_late > 0 ? `+${row.avg_minutes_late}m` : '0m'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>
                            {row.late_dates && row.late_dates.length > 0 ? row.late_dates.join(', ') : 'None 🎉'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}


        {/* MANUAL OVERRIDE MODAL */}
        {selectedStaffForOverride && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
            <div style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#6B3A2A' }}>
                  Manual Time Override / Fix
                </h3>
                <button onClick={() => setSelectedStaffForOverride(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
              </div>

              <div style={{ background: '#FAF7F2', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
                <strong>Staff Member:</strong> {selectedStaffForOverride.name} ({selectedStaffForOverride.employee_id})
              </div>

              <form onSubmit={handleSaveOverride} style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#555', marginBottom: '4px' }}>Date</label>
                  <input
                    type="date"
                    value={overrideForm.date}
                    onChange={e => setOverrideForm({ ...overrideForm, date: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#555', marginBottom: '4px' }}>Check-In Time</label>
                    <input
                      type="time"
                      value={overrideForm.check_in_time}
                      onChange={e => setOverrideForm({ ...overrideForm, check_in_time: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#555', marginBottom: '4px' }}>Status Override</label>
                    <select
                      value={overrideForm.status}
                      onChange={e => setOverrideForm({ ...overrideForm, status: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '8px', fontSize: '14px', fontWeight: 700 }}
                    >
                      <option value="present">Present (On Time)</option>
                      <option value="late">Late Arrival</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#555', marginBottom: '4px' }}>Reason / Admin Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Forgot RFID card at home"
                    value={overrideForm.notes}
                    onChange={e => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedStaffForOverride(null)}
                    style={{ flex: 1, padding: '10px', background: '#E2E8F0', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={overrideSubmitting}
                    style={{ flex: 1, padding: '10px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {overrideSubmitting ? 'Saving…' : 'Save Attendance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
