'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  ArrowLeft,
  Coffee,
  Navigation,
  RefreshCw,
  Search,
  Filter,
  Users,
  Compass,
  Battery,
  BatteryWarning,
  BatteryCharging,
  Phone,
  Clock,
  Shield,
  MapPin,
  Settings,
  AlertTriangle,
  Calendar,
  X,
  Radio,
  CheckCircle2,
  ClipboardList,
  Check,
  TrendingUp,
  ShieldAlert,
  ShoppingBag,
  Award,
  Flame,
  WifiOff,
  AlertCircle
} from 'lucide-react'

// Dynamic import with SSR disabled for Leaflet
const LiveTrackingMap = dynamic(() => import('../../../components/LiveTrackingMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F172A',
        color: '#94A3B8',
        gap: '12px'
      }}
    >
      <RefreshCw size={28} className="animate-spin" color="#107C41" />
      <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading 24/7 Live Map...</span>
    </div>
  )
})

// Play a short beep using Web Audio API for geofence exit alerts
function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
    // Play second beep after 0.15s
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1046, ctx.currentTime + 0.15) // C6 note
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.65)
  } catch (e) {
    // Web Audio not available
  }
}

export default function LiveTrackingPage() {
  const [locations, setLocations] = useState([])
  const [staffList, setStaffList] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'cafe' | 'transit' | 'offsite' | 'offline'
  const [selectedStaffId, setSelectedStaffId] = useState(null)

  // Track previous geofence states for exit detection (improvement #3)
  const prevGeofenceStateRef = useRef({})

  // Route playback state
  const [routePoints, setRoutePoints] = useState([])
  const [routeStaff, setRouteStaff] = useState(null)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Geofence settings modal
  const [showGeofenceModal, setShowGeofenceModal] = useState(false)
  const [geofenceForm, setGeofenceForm] = useState({
    name: 'Crown Coffee Main',
    latitude: 23.8759,
    longitude: 90.3795,
    radius_m: 120
  })
  const [savingZone, setSavingZone] = useState(false)

  // Geofence attendance review modal state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [attendanceProposals, setAttendanceProposals] = useState([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [attReviewDate, setAttReviewDate] = useState(new Date().toISOString().split('T')[0])
  const [attActionMsg, setAttActionMsg] = useState(null)

  // Overtime GPS audit modal state
  const [showOvertimeModal, setShowOvertimeModal] = useState(false)
  const [overtimeAudits, setOvertimeAudits] = useState([])
  const [loadingOvertime, setLoadingOvertime] = useState(false)
  const [otReviewDate, setOtReviewDate] = useState(new Date().toISOString().split('T')[0])
  const [otActionMsg, setOtActionMsg] = useState(null)

  // ── PHASE 3 & 4 ADVANCED STATES ──
  // Emergency SOS Alerts state
  const [sosAlerts, setSosAlerts] = useState([])
  const [showSosModal, setShowSosModal] = useState(false)
  const [loadingSos, setLoadingSos] = useState(false)

  // Errand / Bazar Trip state
  const [showErrandModal, setShowErrandModal] = useState(false)
  const [errands, setErrands] = useState([])
  const [loadingErrands, setLoadingErrands] = useState(false)
  const [errandForm, setErrandForm] = useState({ staffId: '', destination: '', purpose: '', estimatedCost: '' })
  const [dispatchingErrand, setDispatchingErrand] = useState(false)

  // Monthly Punctuality & Geofence Scores state
  const [showPunctualityModal, setShowPunctualityModal] = useState(false)
  const [punctualityScores, setPunctualityScores] = useState([])
  const [loadingPunctuality, setLoadingPunctuality] = useState(false)
  const [scoreMonth, setScoreMonth] = useState(new Date().getMonth() + 1)
  const [scoreYear, setScoreYear] = useState(new Date().getFullYear())

  // Telemetry & Offline / Low Battery Drawer state
  const [showOfflineDrawer, setShowOfflineDrawer] = useState(false)
  const [offlineData, setOfflineData] = useState({ offlineAlerts: [], lowBatteryAlerts: [] })
  const [loadingOffline, setLoadingOffline] = useState(false)

  // Movement Heatmap density mode
  const [heatmapMode, setHeatmapMode] = useState(false)

  // ── IMPROVEMENT #3: Detect geofence exits and play alert sound ──
  useEffect(() => {
    if (locations.length === 0) return
    const prev = prevGeofenceStateRef.current
    const exitedStaff = []

    locations.forEach((loc) => {
      const sid = loc.staff_id
      const wasInside = prev[sid]
      const isNowInside = loc.is_inside_geofence

      // Check if staff was previously inside and now outside
      if (wasInside === true && isNowInside === false) {
        const staffName = loc.staff?.name || sid
        exitedStaff.push(staffName)
      }

      // Update tracked state
      if (isNowInside !== undefined && isNowInside !== null) {
        prev[sid] = isNowInside
      }
    })

    if (exitedStaff.length > 0) {
      playAlertBeep()
    }

    prevGeofenceStateRef.current = prev
  }, [locations])

  // Fetch Live Tracking Data
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await fetch('/api/staff/location', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        setLocations(data.locations || [])
        setStaffList(data.staffList || [])
        setZones(data.zones || [])

        if (data.zones && data.zones.length > 0) {
          setGeofenceForm({
            id: data.zones[0].id,
            name: data.zones[0].name || 'Crown Coffee Main',
            latitude: data.zones[0].latitude || 23.8759,
            longitude: data.zones[0].longitude || 90.3795,
            radius_m: data.zones[0].radius_m || 120
          })
        }
      }
    } catch (err) {
      console.error('[LiveTracking] Fetch error:', err)
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    // 24/7 background interval polling every 15 seconds
    const interval = setInterval(() => {
      fetchData()
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  // Merge full staff list with their latest location record
  const enrichedStaff = useMemo(() => {
    const locMap = new Map()
    locations.forEach((loc) => {
      locMap.set(loc.staff_id, loc)
    })

    const now = new Date().getTime()

    return staffList.map((staff) => {
      const loc = locMap.get(staff.id)
      let status = 'offline'
      let timeAgo = 'Never'
      let lastSeenExact = '' // Improvement #2: exact timestamp
      let isOffline = true
      let isAtCafe = false
      let isMoving = false

      if (loc && loc.last_updated) {
        const lastUpdate = new Date(loc.last_updated).getTime()
        const diffMs = now - lastUpdate
        isOffline = diffMs > 10 * 60 * 1000 // > 10 minutes is offline
        timeAgo = formatTimeAgo(loc.last_updated)
        // Exact time like "2:15 AM"
        lastSeenExact = new Date(loc.last_updated).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Dhaka'
        })
        isAtCafe = loc.is_inside_geofence
        isMoving = (loc.speed || 0) > 1.2

        if (isOffline) {
          status = 'offline'
        } else if (isMoving) {
          status = 'transit'
        } else if (isAtCafe) {
          status = 'cafe'
        } else {
          status = 'offsite'
        }
      }

      return {
        ...staff,
        location: loc || null,
        status,
        isOffline,
        isAtCafe,
        isMoving,
        timeAgo,
        lastSeenExact,
        battery: loc?.battery_level !== undefined ? loc.battery_level : null,
        isCharging: loc?.is_charging || false,
        speed: loc?.speed || 0
      }
    })
  }, [staffList, locations])

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return enrichedStaff.filter((s) => {
      const matchesSearch =
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (activeFilter === 'cafe') return s.status === 'cafe'
      if (activeFilter === 'transit') return s.status === 'transit'
      if (activeFilter === 'offsite') return s.status === 'offsite'
      if (activeFilter === 'offline') return s.status === 'offline'
      return true
    })
  }, [enrichedStaff, searchQuery, activeFilter])

  // Quick Stats Counts
  const stats = useMemo(() => {
    let cafeCount = 0
    let transitCount = 0
    let offsiteCount = 0
    let offlineCount = 0

    enrichedStaff.forEach((s) => {
      if (s.status === 'cafe') cafeCount++
      else if (s.status === 'transit') transitCount++
      else if (s.status === 'offsite') offsiteCount++
      else offlineCount++
    })

    return {
      total: enrichedStaff.length,
      cafe: cafeCount,
      transit: transitCount,
      offsite: offsiteCount,
      offline: offlineCount,
      online: cafeCount + transitCount + offsiteCount
    }
  }, [enrichedStaff])

  // Load Route Playback for a Staff
  const handleLoadRoute = async (staff) => {
    setLoadingRoute(true)
    setRouteStaff(staff)
    try {
      const res = await fetch(
        `/api/staff/location-history?staffId=${staff.id}&date=${selectedDate}`
      )
      const data = await res.json()
      if (data.success) {
        setRoutePoints(data.points || [])
        if (!data.points || data.points.length === 0) {
          alert(`No movement logs found for ${staff.name} on ${selectedDate}`)
        }
      }
    } catch (e) {
      console.error('Route load error:', e)
    } finally {
      setLoadingRoute(false)
    }
  }

  // Save Geofence Zone Settings
  const handleSaveGeofence = async (e) => {
    e.preventDefault()
    setSavingZone(true)
    try {
      const res = await fetch('/api/geofence/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geofenceForm)
      })
      const data = await res.json()
      if (data.success) {
        setShowGeofenceModal(false)
        fetchData()
      } else {
        alert(data.error || 'Failed to save zone')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingZone(false)
    }
  }

  // Fetch Geofence Attendance Review
  const fetchAttendanceReview = async (d) => {
    setLoadingAttendance(true)
    setAttActionMsg(null)
    const targetDate = d || attReviewDate
    try {
      const res = await fetch(`/api/attendance/geofence-review?date=${targetDate}`)
      const data = await res.json()
      if (data.success) {
        setAttendanceProposals(data.proposals || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAttendance(false)
    }
  }

  // Manually Approve Geofence Check-in or Check-out
  const handleApproveAttendance = async (staffId, action, timestamp) => {
    try {
      const res = await fetch('/api/attendance/geofence-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, action, timestamp })
      })
      const data = await res.json()
      if (data.success) {
        setAttActionMsg(`✅ Successfully recorded ${action} for staff!`)
        fetchAttendanceReview(attReviewDate)
        fetchData()
      } else {
        alert(data.error || 'Failed to record attendance')
      }
    } catch (e) {
      alert(e.message)
    }
  }

  // Fetch Overtime GPS Audit
  const fetchOvertimeAudit = async (d) => {
    setLoadingOvertime(true)
    setOtActionMsg(null)
    const targetDate = d || otReviewDate
    try {
      const res = await fetch(`/api/admin/overtime/gps-audit?date=${targetDate}`)
      const data = await res.json()
      if (data.success) {
        setOvertimeAudits(data.audits || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingOvertime(false)
    }
  }

  // Manually Approve or Adjust Overtime Hours
  const handleApproveOvertime = async (attendanceId, hours) => {
    try {
      const res = await fetch('/api/admin/overtime/gps-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId, approvedOvertimeHours: hours })
      })
      const data = await res.json()
      if (data.success) {
        setOtActionMsg(`✅ Overtime approved & updated to ${hours} hrs!`)
        fetchOvertimeAudit(otReviewDate)
      } else {
        alert(data.error || 'Failed to update overtime')
      }
    } catch (e) {
      alert(e.message)
    }
  }

  // ── PHASE 3 & 4 ACTION HANDLERS ──
  // Fetch SOS Alerts
  const fetchSosAlerts = async () => {
    setLoadingSos(true)
    try {
      const res = await fetch('/api/staff/sos?status=active')
      const data = await res.json()
      if (data.success) {
        setSosAlerts(data.alerts || [])
      }
    } catch (e) {
      console.error('Fetch SOS error:', e)
    } finally {
      setLoadingSos(false)
    }
  }

  // Resolve SOS Alert
  const handleResolveSos = async (alertId) => {
    try {
      const res = await fetch('/api/staff/sos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, resolvedBy: 'Admin' })
      })
      const data = await res.json()
      if (data.success) {
        fetchSosAlerts()
      }
    } catch (e) {
      alert('Resolve error: ' + e.message)
    }
  }

  // Fetch Errands
  const fetchErrands = async () => {
    setLoadingErrands(true)
    try {
      const res = await fetch('/api/admin/tracking/errands?status=all')
      const data = await res.json()
      if (data.success) {
        setErrands(data.errands || [])
      }
    } catch (e) {
      console.error('Fetch errands error:', e)
    } finally {
      setLoadingErrands(false)
    }
  }

  // Dispatch New Errand
  const handleDispatchErrand = async (e) => {
    e.preventDefault()
    if (!errandForm.staffId || !errandForm.destination) {
      alert('Please select a staff member and enter destination')
      return
    }
    setDispatchingErrand(true)
    try {
      const res = await fetch('/api/admin/tracking/errands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errandForm)
      })
      const data = await res.json()
      if (data.success) {
        setErrandForm({ staffId: '', destination: '', purpose: '', estimatedCost: '' })
        fetchErrands()
      } else {
        alert(data.error || 'Failed to dispatch errand')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setDispatchingErrand(false)
    }
  }

  // Complete Errand
  const handleCompleteErrand = async (errandId) => {
    const actualCost = prompt('Enter actual purchase / expense amount in TK (or leave empty):', '0')
    try {
      const res = await fetch('/api/admin/tracking/errands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errandId,
          status: 'completed',
          actualCost: actualCost ? parseFloat(actualCost) : 0
        })
      })
      if (res.ok) {
        fetchErrands()
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // Fetch Punctuality Scores
  const fetchPunctuality = async (m = scoreMonth, y = scoreYear) => {
    setLoadingPunctuality(true)
    try {
      const res = await fetch(`/api/admin/tracking/punctuality-score?month=${m}&year=${y}`)
      const data = await res.json()
      if (data.success) {
        setPunctualityScores(data.scores || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPunctuality(false)
    }
  }

  // Fetch Telemetry & Offline / Low Battery Alerts
  const fetchOfflineAlerts = async () => {
    setLoadingOffline(true)
    try {
      const res = await fetch('/api/admin/tracking/offline-alerts')
      const data = await res.json()
      if (data.success) {
        setOfflineData(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingOffline(false)
    }
  }

  // Auto-poll SOS alerts every 10 seconds
  useEffect(() => {
    fetchSosAlerts()
    fetchOfflineAlerts()
    const sosTimer = setInterval(fetchSosAlerts, 10000)
    const offTimer = setInterval(fetchOfflineAlerts, 60000)
    return () => {
      clearInterval(sosTimer)
      clearInterval(offTimer)
    }
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0B0F19',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* ── LEFT SIDEBAR (STAFF LIST & CONTROLS) ── */}
      <div
        style={{
          width: '420px',
          minWidth: '380px',
          maxWidth: '460px',
          height: '100%',
          background: '#0F172A',
          borderRight: '1px solid #1E293B',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/admin/dashboard"
              style={{
                background: '#1E293B',
                color: '#94A3B8',
                border: '1px solid #334155',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none'
              }}
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                  24/7 Staff Radar
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#10B981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '999px'
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10B981'
                    }}
                  ></span>
                  LIVE
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                Crown Coffee Real-time HR Tracking
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setShowGeofenceModal(true)}
              style={{
                background: '#1E293B',
                color: '#94A3B8',
                border: '1px solid #334155',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Geofence Zone Settings"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              style={{
                background: '#107C41',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Refresh GPS positions"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Manual Geofence & OT Review Quick Actions */}
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(15, 23, 42, 0.8)',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Row 1: Attendance Review & OT Audit */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setShowAttendanceModal(true)
                fetchAttendanceReview()
              }}
              style={{
                flex: 1,
                background: '#1E293B',
                color: '#34D399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '7px 8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ClipboardList size={13} />
              <span>Attendance Review</span>
            </button>

            <button
              onClick={() => {
                setShowOvertimeModal(true)
                fetchOvertimeAudit()
              }}
              style={{
                flex: 1,
                background: '#1E293B',
                color: '#60A5FA',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '7px 8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Clock size={13} />
              <span>OT GPS Audit</span>
            </button>
          </div>

          {/* Row 2: SOS, Errands, Scores, Offline Telemetry */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <button
              onClick={() => {
                setShowSosModal(true)
                fetchSosAlerts()
              }}
              style={{
                background: sosAlerts.length > 0 ? '#DC2626' : '#1E293B',
                color: sosAlerts.length > 0 ? '#FFFFFF' : '#EF4444',
                border: `1px solid ${sosAlerts.length > 0 ? '#EF4444' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '6px',
                padding: '6px 4px',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              title="Emergency SOS Alerts"
            >
              <ShieldAlert size={12} />
              <span>SOS ({sosAlerts.length})</span>
            </button>

            <button
              onClick={() => {
                setShowErrandModal(true)
                fetchErrands()
              }}
              style={{
                background: '#1E293B',
                color: '#F59E0B',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '6px',
                padding: '6px 4px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              title="Bazar & Errand Tracking"
            >
              <ShoppingBag size={12} />
              <span>Errands</span>
            </button>

            <button
              onClick={() => {
                setShowPunctualityModal(true)
                fetchPunctuality()
              }}
              style={{
                background: '#1E293B',
                color: '#A855F7',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '6px',
                padding: '6px 4px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              title="Monthly Geofence Punctuality Score"
            >
              <Award size={12} />
              <span>Scores</span>
            </button>

            <button
              onClick={() => {
                setShowOfflineDrawer(true)
                fetchOfflineAlerts()
              }}
              style={{
                background: (offlineData.offlineAlerts?.length > 0 || offlineData.lowBatteryAlerts?.length > 0) ? '#B45309' : '#1E293B',
                color: '#FFFFFF',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '6px',
                padding: '6px 4px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              title="Offline & Low Battery Telemetry Warnings"
            >
              <BatteryWarning size={12} />
              <span>Alerts</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div
          style={{
            padding: '12px 16px',
            background: '#0B0F19',
            borderBottom: '1px solid #1E293B',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px'
          }}
        >
          <div
            onClick={() => setActiveFilter('cafe')}
            style={{
              background: activeFilter === 'cafe' ? 'rgba(16, 124, 65, 0.2)' : '#1E293B',
              border: activeFilter === 'cafe' ? '1px solid #107C41' : '1px solid #334155',
              borderRadius: '8px',
              padding: '6px',
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>{stats.cafe}</div>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>At Cafe</div>
          </div>

          <div
            onClick={() => setActiveFilter('transit')}
            style={{
              background: activeFilter === 'transit' ? 'rgba(59, 130, 246, 0.2)' : '#1E293B',
              border: activeFilter === 'transit' ? '1px solid #3B82F6' : '1px solid #334155',
              borderRadius: '8px',
              padding: '6px',
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#3B82F6' }}>{stats.transit}</div>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>In Transit</div>
          </div>

          <div
            onClick={() => setActiveFilter('offsite')}
            style={{
              background: activeFilter === 'offsite' ? 'rgba(245, 158, 11, 0.2)' : '#1E293B',
              border: activeFilter === 'offsite' ? '1px solid #F59E0B' : '1px solid #334155',
              borderRadius: '8px',
              padding: '6px',
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#F59E0B' }}>{stats.offsite}</div>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>Off-site</div>
          </div>

          <div
            onClick={() => setActiveFilter('offline')}
            style={{
              background: activeFilter === 'offline' ? 'rgba(107, 114, 128, 0.2)' : '#1E293B',
              border: activeFilter === 'offline' ? '1px solid #6B7280' : '1px solid #334155',
              borderRadius: '8px',
              padding: '6px',
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#94A3B8' }}>{stats.offline}</div>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Offline</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E293B' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              marginBottom: '10px'
            }}
          >
            <Search
              size={15}
              color="#64748B"
              style={{ position: 'absolute', left: '10px' }}
            />
            <input
              type="text"
              placeholder="Search staff, designation, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '7px 10px 7px 32px',
                fontSize: '12px',
                color: '#FFFFFF',
                outline: 'none'
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {['all', 'cafe', 'transit', 'offsite', 'offline'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  background: activeFilter === filter ? '#107C41' : '#1E293B',
                  color: activeFilter === filter ? '#FFFFFF' : '#94A3B8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap'
                }}
              >
                {filter === 'all' ? `All (${enrichedStaff.length})` : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Staff List Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredStaff.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B', fontSize: '13px' }}>
              No employees found matching filter.
            </div>
          ) : (
            filteredStaff.map((staff) => {
              const isSelected = selectedStaffId === staff.id
              let statusBadgeColor = '#10B981'
              let statusLabel = 'At Cafe'
              if (staff.status === 'transit') {
                statusBadgeColor = '#3B82F6'
                statusLabel = `In Transit (${Math.round((staff.speed || 0) * 3.6)} km/h)`
              } else if (staff.status === 'offsite') {
                statusBadgeColor = '#F59E0B'
                statusLabel = 'Off-site'
              } else if (staff.status === 'offline') {
                statusBadgeColor = '#6B7280'
                statusLabel = 'Offline'
              }

              return (
                <div
                  key={staff.id}
                  style={{
                    background: isSelected ? 'rgba(16, 124, 65, 0.15)' : '#1E293B',
                    border: isSelected ? '1px solid #107C41' : '1px solid #334155',
                    borderRadius: '10px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    if (staff.location) {
                      setSelectedStaffId(staff.id)
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <div
                      style={{
                        position: 'relative',
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: '#334155',
                        border: `2px solid ${statusBadgeColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '16px',
                        color: '#FFFFFF',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                    >
                      {staff.photo_url ? (
                        <img
                          src={staff.photo_url}
                          alt={staff.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        (staff.name || 'S').charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: '#FFFFFF',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {staff.name}
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: statusBadgeColor,
                            background: 'rgba(255,255,255,0.05)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        {staff.designation || 'Staff'} • ID: {staff.employee_id || 'N/A'}
                      </div>

                      {/* Footer Metrics */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '8px',
                          fontSize: '11px',
                          color: '#64748B'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {staff.timeAgo}{staff.lastSeenExact ? ` · ${staff.lastSeenExact}` : ''}
                        </span>

                        {staff.battery !== null && (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: staff.battery < 20 ? '#EF4444' : '#94A3B8',
                              fontWeight: 600
                            }}
                          >
                            {staff.isCharging ? (
                              <BatteryCharging size={13} color="#10B981" />
                            ) : staff.battery < 20 ? (
                              <BatteryWarning size={13} color="#EF4444" />
                            ) : (
                              <Battery size={13} />
                            )}
                            {staff.battery}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '10px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (staff.location) {
                          setSelectedStaffId(staff.id)
                        } else {
                          alert(`${staff.name} has not broadcasted their location yet.`)
                        }
                      }}
                      style={{
                        flex: 1,
                        background: '#334155',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <MapPin size={12} color="#10B981" />
                      <span>Locate</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLoadRoute(staff)
                      }}
                      disabled={loadingRoute}
                      style={{
                        flex: 1,
                        background: '#334155',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Navigation size={12} color="#3B82F6" />
                      <span>24h Route</span>
                    </button>

                    {staff.emergency_phone && (
                      <a
                        href={`tel:${staff.emergency_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: 'rgba(16, 124, 65, 0.2)',
                          color: '#10B981',
                          border: '1px solid #107C41',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none'
                        }}
                        title={`Call ${staff.emergency_phone}`}
                      >
                        <Phone size={12} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── RIGHT MAIN VIEW (INTERACTIVE MAP) ── */}
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        {/* Active Emergency SOS Banner */}
        {sosAlerts.length > 0 && (
          <div
            onClick={() => setShowSosModal(true)}
            style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1500,
              background: '#DC2626',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(220, 38, 38, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              border: '2px solid #FFFFFF'
            }}
          >
            <ShieldAlert size={20} />
            <span>🚨 EMERGENCY: {sosAlerts.length} Active Staff Distress Alert!</span>
            <span
              style={{
                background: '#FFFFFF',
                color: '#DC2626',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 900
              }}
            >
              VIEW NOW
            </span>
          </div>
        )}

        <LiveTrackingMap
          locations={locations}
          zones={zones}
          selectedStaffId={selectedStaffId}
          onSelectStaff={(id) => setSelectedStaffId(id)}
          routePoints={routePoints}
          routeStaff={routeStaff}
          onClearRoute={() => {
            setRoutePoints([])
            setRouteStaff(null)
          }}
          sosAlerts={sosAlerts}
          heatmapMode={heatmapMode}
          onToggleHeatmap={() => setHeatmapMode(!heatmapMode)}
        />
      </div>

      {/* ── GEOFENCE SETTINGS MODAL ── */}
      {showGeofenceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px',
              color: '#FFFFFF'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coffee size={20} color="#107C41" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Cafe Geofence Zone</h3>
              </div>
              <button
                onClick={() => setShowGeofenceModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGeofence}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                  Zone Name
                </label>
                <input
                  type="text"
                  required
                  value={geofenceForm.name}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#FFF',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={geofenceForm.latitude}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, latitude: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#FFF',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={geofenceForm.longitude}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, longitude: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#FFF',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                  Radius (meters)
                </label>
                <input
                  type="number"
                  min="20"
                  max="5000"
                  required
                  value={geofenceForm.radius_m}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, radius_m: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#FFF',
                    fontSize: '13px'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                  Employees within this distance are automatically marked as &quot;At Cafe&quot;.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowGeofenceModal(false)}
                  style={{
                    flex: 1,
                    background: '#334155',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingZone}
                  style={{
                    flex: 1,
                    background: '#107C41',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {savingZone ? 'Saving...' : 'Save Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── GEOFENCE ATTENDANCE MANUAL REVIEW MODAL ── */}
      {showAttendanceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              color: '#FFFFFF'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ClipboardList size={22} color="#10B981" />
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                    Geofence Attendance (Manual Review)
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                    Verify detected cafe arrivals/departures before recording attendance
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Date Selector & Messages */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', background: '#1E293B', padding: '10px 14px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Review Date:</span>
                <input
                  type="date"
                  value={attReviewDate}
                  onChange={(e) => {
                    setAttReviewDate(e.target.value)
                    fetchAttendanceReview(e.target.value)
                  }}
                  style={{
                    background: '#0F172A',
                    border: '1px solid #334155',
                    color: '#FFF',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px'
                  }}
                />
              </div>

              <button
                onClick={() => fetchAttendanceReview(attReviewDate)}
                style={{
                  background: '#334155',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Refresh List
              </button>
            </div>

            {attActionMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#34D399', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
                {attActionMsg}
              </div>
            )}

            {/* Proposals List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loadingAttendance ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px' }}>
                  Analyzing geofence entries...
                </div>
              ) : attendanceProposals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '13px' }}>
                  No cafe geofence arrivals found for {attReviewDate}.
                </div>
              ) : (
                attendanceProposals.map((prop) => (
                  <div
                    key={prop.staff_id}
                    style={{
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>{prop.name}</span>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>({prop.designation || 'Staff'})</span>
                        {prop.is_currently_inside && (
                          <span style={{ background: 'rgba(16, 124, 65, 0.2)', color: '#34D399', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            ● In Cafe
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
                        <span>Shift: <strong>{prop.rostered_shift_start}</strong></span>
                        <span>GPS In: <strong style={{ color: '#34D399' }}>{prop.geofence_arrival || 'None'}</strong></span>
                        <span>GPS Out: <strong style={{ color: '#60A5FA' }}>{prop.geofence_departure || 'None'}</strong></span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                        Attendance Status: {prop.is_attendance_recorded ? (
                          <span style={{ color: '#10B981', fontWeight: 700 }}>Recorded ({prop.attendance_status})</span>
                        ) : (
                          <span style={{ color: '#F59E0B', fontWeight: 700 }}>Pending Review</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {!prop.is_attendance_recorded && prop.geofence_arrival && (
                        <button
                          onClick={() => handleApproveAttendance(prop.staff_id, 'checkin', prop.geofence_arrival_raw)}
                          style={{
                            background: '#107C41',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Approve Check-in ({prop.geofence_arrival})
                        </button>
                      )}

                      {prop.is_attendance_recorded && !prop.existing_check_out && prop.geofence_departure && (
                        <button
                          onClick={() => handleApproveAttendance(prop.staff_id, 'checkout', prop.geofence_departure_raw)}
                          style={{
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Approve Check-out ({prop.geofence_departure})
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── OVERTIME GPS AUDIT MODAL ── */}
      {showOvertimeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '740px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              color: '#FFFFFF'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={22} color="#60A5FA" />
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                    Overtime GPS Verification & Audit
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                    Cross-reference overtime claims with actual cafe geofence departure times
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowOvertimeModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Date Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', background: '#1E293B', padding: '10px 14px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Date:</span>
                <input
                  type="date"
                  value={otReviewDate}
                  onChange={(e) => {
                    setOtReviewDate(e.target.value)
                    fetchOvertimeAudit(e.target.value)
                  }}
                  style={{
                    background: '#0F172A',
                    border: '1px solid #334155',
                    color: '#FFF',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px'
                  }}
                />
              </div>

              <button
                onClick={() => fetchOvertimeAudit(otReviewDate)}
                style={{
                  background: '#334155',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Refresh Audit
              </button>
            </div>

            {otActionMsg && (
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3B82F6', color: '#93C5FD', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
                {otActionMsg}
              </div>
            )}

            {/* Audit Table */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loadingOvertime ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px' }}>
                  Calculating GPS departure cross-references...
                </div>
              ) : overtimeAudits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '13px' }}>
                  No overtime claims found on {otReviewDate}.
                </div>
              ) : (
                overtimeAudits.map((item) => (
                  <div
                    key={item.attendance_id}
                    style={{
                      background: '#1E293B',
                      border: item.discrepancy_status === 'discrepancy' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #334155',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>{item.staff_name}</span>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>({item.designation})</span>
                        {item.discrepancy_status === 'discrepancy' ? (
                          <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            ⚠️ Overtime Exceeds GPS by {item.discrepancy_hours}h
                          </span>
                        ) : item.discrepancy_status === 'verified' ? (
                          <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            ✅ GPS Verified
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(107, 114, 128, 0.2)', color: '#94A3B8', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            ⚪ No GPS Data
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
                        <span>Claimed OT: <strong style={{ color: '#FBBF24' }}>{item.claimed_overtime_hours} hrs</strong></span>
                        <span>GPS Exit: <strong>{item.gps_departure_time || 'None recorded'}</strong></span>
                        {item.gps_verified_ot_hours !== null && (
                          <span>Max GPS OT: <strong style={{ color: '#60A5FA' }}>{item.gps_verified_ot_hours} hrs</strong></span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleApproveOvertime(item.attendance_id, item.claimed_overtime_hours)}
                        style={{
                          background: '#334155',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Keep Claimed ({item.claimed_overtime_hours}h)
                      </button>

                      {item.gps_verified_ot_hours !== null && (
                        <button
                          onClick={() => handleApproveOvertime(item.attendance_id, item.gps_verified_ot_hours)}
                          style={{
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Set to GPS ({item.gps_verified_ot_hours}h)
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ── EMERGENCY SOS DISTRESS ALERTS MODAL ──                 */}
      {/* ========================================================= */}
      {showSosModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#0F172A',
              border: '2px solid #DC2626',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.4)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #1E293B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#1E293B'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={22} color="#DC2626" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                    Emergency SOS Distress Log
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    Active alerts receive priority dispatch and WhatsApp broadcast
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSosModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingSos ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>Loading alerts...</div>
              ) : sosAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#10B981', fontSize: '14px', fontWeight: 700 }}>
                  ✓ No active emergency distress alerts. All staff safe!
                </div>
              ) : (
                sosAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      background: '#1E293B',
                      border: '1px solid #DC2626',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: '#FFFFFF' }}>
                          {alert.staff?.name || 'Staff Member'}
                        </span>
                        <span style={{ background: '#DC2626', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 900 }}>
                          EMERGENCY ACTIVE
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                        {alert.staff?.designation || 'Staff'} · Phone: {alert.staff?.phone || 'N/A'} · Battery:{' '}
                        {alert.battery_level ? `${alert.battery_level}%` : 'N/A'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                        Triggered at: {new Date(alert.created_at).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka' })} ({formatTimeAgo(alert.created_at)})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setSelectedStaffId(alert.staff_id)
                          setShowSosModal(false)
                        }}
                        style={{
                          background: '#DC2626',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <MapPin size={14} /> Locate Pin
                      </button>

                      <button
                        onClick={() => handleResolveSos(alert.id)}
                        style={{
                          background: '#107C41',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Mark Safe
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ── BAZAR & ERRAND TRIP TRACKER MODAL ──                   */}
      {/* ========================================================= */}
      {showErrandModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '740px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #1E293B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={20} color="#F59E0B" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                    Bazar & Errand Tracking
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    Dispatch staff for market supplies and track distance & return times
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowErrandModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
              {/* Dispatch Form */}
              <form
                onSubmit={handleDispatchErrand}
                style={{
                  background: '#1E293B',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  gap: '12px',
                  alignItems: 'end'
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>
                    Staff Member
                  </label>
                  <select
                    value={errandForm.staffId}
                    onChange={(e) => setErrandForm({ ...errandForm, staffId: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0F172A', color: '#FFF', border: '1px solid #334155', fontSize: '12px' }}
                  >
                    <option value="">Select staff</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>
                    Destination (e.g. Uttara Sector 3 Market)
                  </label>
                  <input
                    type="text"
                    value={errandForm.destination}
                    onChange={(e) => setErrandForm({ ...errandForm, destination: e.target.value })}
                    placeholder="Destination market/store"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0F172A', color: '#FFF', border: '1px solid #334155', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>
                    Purpose / Supplies
                  </label>
                  <input
                    type="text"
                    value={errandForm.purpose}
                    onChange={(e) => setErrandForm({ ...errandForm, purpose: e.target.value })}
                    placeholder="Milk, coffee beans, ice"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0F172A', color: '#FFF', border: '1px solid #334155', fontSize: '12px' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={dispatchingErrand}
                  style={{
                    padding: '8px 16px',
                    background: '#F59E0B',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {dispatchingErrand ? 'Dispatching...' : 'Dispatch'}
                </button>
              </form>

              {/* Errand List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Active & Recent Errand Trips ({errands.length})
                </div>

                {loadingErrands ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>Loading errands...</div>
                ) : errands.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>No errands recorded yet.</div>
                ) : (
                  errands.map((trip) => {
                    const isInProgress = trip.status === 'in_progress'
                    return (
                      <div
                        key={trip.id}
                        style={{
                          background: '#1E293B',
                          border: isInProgress ? '1px solid #F59E0B' : '1px solid #334155',
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: '#FFF' }}>
                              {trip.staff?.name || 'Staff Member'}
                            </span>
                            <span
                              style={{
                                background: isInProgress ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: isInProgress ? '#F59E0B' : '#10B981',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 800
                              }}
                            >
                              {isInProgress ? 'ON THE WAY' : 'COMPLETED'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                            📍 <strong>{trip.destination}</strong> — {trip.purpose || 'Supplies'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            Departed: {new Date(trip.departure_time).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka' })} ({formatTimeAgo(trip.departure_time)})
                            {trip.return_time && ` · Returned: ${new Date(trip.return_time).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka' })}`}
                          </div>
                        </div>

                        {isInProgress && (
                          <button
                            onClick={() => handleCompleteErrand(trip.id)}
                            style={{
                              background: '#107C41',
                              color: '#FFF',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 14px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Mark Returned
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ── MONTHLY GEOFENCE PUNCTUALITY SCORES MODAL ──           */}
      {/* ========================================================= */}
      {showPunctualityModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '840px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #1E293B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={20} color="#A855F7" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                    Monthly Geofence Punctuality Scorecard
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    Automated punctuality grading based on physical cafe arrival timestamps
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowPunctualityModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
              {loadingPunctuality ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>Calculating scores...</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#FFFFFF' }}>
                  <thead>
                    <tr style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Staff Member</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Scheduled Shift</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Present Days</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>On-Time</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Late</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Punctuality %</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {punctualityScores.map((score) => {
                      const gradeColor =
                        score.grade === 'A+' || score.grade === 'A'
                          ? '#10B981'
                          : score.grade === 'B'
                          ? '#3B82F6'
                          : score.grade === 'C'
                          ? '#F59E0B'
                          : '#EF4444'

                      return (
                        <tr key={score.staff_id} style={{ borderBottom: '1px solid #1E293B' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 700 }}>{score.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{score.designation}</div>
                          </td>
                          <td style={{ padding: '12px', color: '#94A3B8' }}>{score.scheduled_shift}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{score.present_days}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#34D399', fontWeight: 700 }}>{score.on_time_days}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: score.late_days > 0 ? '#F87171' : '#64748B' }}>{score.late_days}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800 }}>{score.punctuality_percent}%</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span
                              style={{
                                background: `${gradeColor}22`,
                                color: gradeColor,
                                border: `1px solid ${gradeColor}`,
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontWeight: 900,
                                fontSize: '12px'
                              }}
                            >
                              {score.grade}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ── OFFLINE & LOW BATTERY TELEMETRY DRAWER ──              */}
      {/* ========================================================= */}
      {showOfflineDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #1E293B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BatteryWarning size={20} color="#F59E0B" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                    Telemetry & Connectivity Warnings
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    Active alerts for staff phones with low battery (&lt;15%) or disconnected GPS
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowOfflineDrawer(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Low Battery Section */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Critical Battery Alert (&lt; 15%) ({offlineData.lowBatteryAlerts?.length || 0})
                </div>
                {(!offlineData.lowBatteryAlerts || offlineData.lowBatteryAlerts.length === 0) ? (
                  <div style={{ fontSize: '12px', color: '#10B981', padding: '8px 12px', background: '#1E293B', borderRadius: '8px' }}>
                    ✓ All staff devices have sufficient battery charge.
                  </div>
                ) : (
                  offlineData.lowBatteryAlerts.map((item) => (
                    <div
                      key={item.staff_id}
                      style={{
                        background: '#1E293B',
                        border: '1px solid #EF4444',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#FFF' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>Phone: {item.phone || 'N/A'}</div>
                      </div>
                      <span style={{ color: '#EF4444', fontWeight: 800, fontSize: '13px' }}>
                        🔋 {item.battery_level}% Battery
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Signal Lost Section */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', marginBottom: '8px' }}>
                  GPS Signal Lost &gt; 15 Mins ({offlineData.offlineAlerts?.length || 0})
                </div>
                {(!offlineData.offlineAlerts || offlineData.offlineAlerts.length === 0) ? (
                  <div style={{ fontSize: '12px', color: '#10B981', padding: '8px 12px', background: '#1E293B', borderRadius: '8px' }}>
                    ✓ All devices actively broadcasting 24/7 GPS coordinates.
                  </div>
                ) : (
                  offlineData.offlineAlerts.map((item) => (
                    <div
                      key={item.staff_id}
                      style={{
                        background: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#FFF' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.reason}</div>
                      </div>
                      <span style={{ color: '#94A3B8', fontSize: '11px' }}>
                        {item.minutes_offline ? `${item.minutes_offline}m ago` : 'Offline'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(isoString) {
  if (!isoString) return 'Never'
  const diffSec = Math.floor((new Date() - new Date(isoString)) / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}
