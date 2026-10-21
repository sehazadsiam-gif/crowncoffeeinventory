'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Coffee, MapPin, Navigation, Clock, Battery, BatteryCharging, ArrowUpRight, RefreshCw } from 'lucide-react'

export default function CafePresenceWidget() {
  const [presentStaff, setPresentStaff] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPresence = async () => {
    try {
      const res = await fetch('/api/staff/location', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        const inside = (data.locations || []).filter((l) => l.is_inside_geofence && l.staff)
        setPresentStaff(inside)
      }
    } catch (e) {
      console.error('[CafePresenceWidget] error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPresence()
    const timer = setInterval(fetchPresence, 20000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      style={{
        background: 'var(--bg-card, #FFFFFF)',
        border: '1.5px solid var(--border-light, #E2E8F0)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 124, 65, 0.12)',
              color: '#107C41',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Coffee size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0F172A)' }}>
                Who&apos;s at the Cafe Right Now
              </h3>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#107C41',
                  background: 'rgba(16, 124, 65, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '999px'
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#107C41' }}></span>
                GPS RADAR
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', marginTop: '2px' }}>
              Crown Coffee Main Outlet Geofence
            </div>
          </div>
        </div>

        <Link
          href="/admin/live-tracking"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#107C41',
            textDecoration: 'none',
            background: 'rgba(16, 124, 65, 0.08)',
            padding: '6px 10px',
            borderRadius: '8px'
          }}
        >
          <span>Open Full Map</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Staff Grid or Empty State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted, #64748B)', fontSize: '13px' }}>
          Scanning live geofence...
        </div>
      ) : presentStaff.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '24px',
            background: 'var(--bg-subtle, #F8FAFC)',
            borderRadius: '12px',
            border: '1px dashed var(--border-light, #E2E8F0)'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
            No employees currently detected inside the cafe geofence.
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)', marginTop: '4px' }}>
            Staff GPS reports will appear here automatically when they enter.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '10px'
          }}
        >
          {presentStaff.map((loc) => {
            const staff = loc.staff || {}
            const diffMin = Math.floor((new Date() - new Date(loc.last_updated)) / 60000)

            return (
              <div
                key={loc.staff_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  borderRadius: '10px',
                  padding: '10px 12px'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#107C41',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '2px solid #107C41'
                  }}
                >
                  {staff.photo_url ? (
                    <img src={staff.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (staff.name || 'S').charAt(0).toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '13px',
                      color: 'var(--text-primary, #0F172A)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {staff.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>
                    {staff.designation || 'Staff'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '10px',
                      color: '#107C41',
                      fontWeight: 600,
                      marginTop: '2px'
                    }}
                  >
                    <span>● At Cafe</span>
                    {loc.battery_level !== null && (
                      <span style={{ color: 'var(--text-muted, #64748B)' }}>
                        {loc.battery_level}% {loc.is_charging ? '⚡' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
