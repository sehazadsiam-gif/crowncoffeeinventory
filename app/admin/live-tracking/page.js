'use client'

import { useState, useEffect, useMemo } from 'react'
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
  TrendingUp
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

export default function LiveTrackingPage() {
  const [locations, setLocations] = useState([])
  const [staffList, setStaffList] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'cafe' | 'transit' | 'offsite' | 'offline'
  const [selectedStaffId, setSelectedStaffId] = useState(null)

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
      let isOffline = true
      let isAtCafe = false
      let isMoving = false

      if (loc && loc.last_updated) {
        const lastUpdate = new Date(loc.last_updated).getTime()
        const diffMs = now - lastUpdate
        isOffline = diffMs > 10 * 60 * 1000 // > 10 minutes is offline
        timeAgo = formatTimeAgo(loc.last_updated)
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
            gap: '8px'
          }}
        >
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
                          <Clock size={12} /> {staff.timeAgo}
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
