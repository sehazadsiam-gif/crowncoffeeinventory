'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Coffee,
  Navigation,
  Compass,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Layers,
  Maximize2,
  RefreshCw,
  Phone,
  Clock,
  MapPin,
  X,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Flame,
  ShieldAlert
} from 'lucide-react'

// Fix default Leaflet icon assets
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

export default function LiveTrackingMap({
  locations = [],
  zones = [],
  selectedStaffId = null,
  onSelectStaff = () => {},
  routePoints = [],
  routeStaff = null,
  onClearRoute = () => {},
  sosAlerts = [],
  heatmapMode = false,
  onToggleHeatmap = () => {}
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const circlesRef = useRef([])
  const routePolylineRef = useRef(null)
  const scrubberMarkerRef = useRef(null)
  const heatmapLayersRef = useRef([])
  const sosMarkersRef = useRef([])
  const [mapTheme, setMapTheme] = useState('google_streets') // 'google_streets' | 'google_hybrid' | 'google_terrain' | 'carto_dark' | 'osm'

  // Playback Scrubber State
  const [playIndex, setPlayIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1) // 1x, 2x, 5x

  // My Device / iOS tracking state
  const myDeviceMarkerRef = useRef(null)
  const [isLocatingDevice, setIsLocatingDevice] = useState(false)
  const [showIosGuideModal, setShowIosGuideModal] = useState(false)
  const [locErrorMessage, setLocErrorMessage] = useState(null)

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    // Default center: Crown Coffee Main (Uttara, Dhaka) or fallback
    const defaultCenter = [23.8759, 90.3795]
    const defaultZoom = 15

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false
    })

    // Add zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map)

    // Base tile layer: Default to official Google Maps Roads & Landmarks
    const tileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 21,
      subdomains: ['0', '1', '2', '3'],
      attribution: '© Google Maps'
    }).addTo(map)

    mapInstanceRef.current = map
    map._currentTileLayer = tileLayer

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Change Map Theme
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (map._currentTileLayer) {
      map.removeLayer(map._currentTileLayer)
    }

    let url = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
    let subdomains = ['0', '1', '2', '3']
    let attr = '© Google Maps'
    let maxZoom = 21

    if (mapTheme === 'google_hybrid') {
      url = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
    } else if (mapTheme === 'google_terrain') {
      url = 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'
    } else if (mapTheme === 'carto_dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      subdomains = 'abcd'
      attr = '© CARTO'
      maxZoom = 19
    } else if (mapTheme === 'osm') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      subdomains = 'abc'
      attr = '© OpenStreetMap contributors'
      maxZoom = 19
    }

    const newLayer = L.tileLayer(url, { maxZoom, subdomains, attribution: attr }).addTo(map)
    map._currentTileLayer = newLayer
  }, [mapTheme])

  // Render Geofence Zones
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear old circles
    circlesRef.current.forEach((c) => map.removeLayer(c))
    circlesRef.current = []

    zones.forEach((zone) => {
      if (!zone.latitude || !zone.longitude) return

      const circle = L.circle([zone.latitude, zone.longitude], {
        radius: zone.radius_m || 100,
        color: '#107C41',
        weight: 2,
        fillColor: '#107C41',
        fillOpacity: 0.15,
        dashArray: '4, 6'
      }).addTo(map)

      // Center marker icon for Cafe
      const cafeIcon = L.divIcon({
        className: 'custom-cafe-pin',
        html: `
          <div style="
            background: #107C41;
            color: #FFFFFF;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(16, 124, 65, 0.4);
            border: 2px solid #FFFFFF;
            font-size: 14px;
            font-weight: 700;
          ">
            ☕
          </div>
          <div style="
            background: rgba(16, 124, 65, 0.95);
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 999px;
            white-space: nowrap;
            margin-top: 4px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transform: translateX(-25%);
          ">
            ${zone.name}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })

      const cafeMarker = L.marker([zone.latitude, zone.longitude], { icon: cafeIcon }).addTo(map)
      circlesRef.current.push(circle)
      circlesRef.current.push(cafeMarker)
    })
  }, [zones])

  // Render Live Staff Markers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const currentIds = new Set()

    locations.forEach((loc) => {
      const staff = loc.staff || {}
      const staffId = loc.staff_id
      currentIds.add(staffId)

      const lat = loc.latitude
      const lon = loc.longitude
      if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) return

      // Determine status & styling
      const now = new Date().getTime()
      const lastUpdate = new Date(loc.last_updated).getTime()
      const isOffline = now - lastUpdate > 10 * 60 * 1000 // > 10 min
      const isAtCafe = loc.is_inside_geofence
      const isMoving = (loc.speed || 0) > 1.2 // > ~4.3 km/h

      let ringColor = '#107C41' // Green
      let statusText = 'At Cafe'
      let pulseAnim = 'animation: pulse 2s infinite;'

      if (isOffline) {
        ringColor = '#6B7280' // Grey
        statusText = 'Offline'
        pulseAnim = ''
      } else if (isMoving) {
        ringColor = '#3B82F6' // Blue
        statusText = `In Transit (${Math.round((loc.speed || 0) * 3.6)} km/h)`
      } else if (!isAtCafe) {
        ringColor = '#F59E0B' // Amber
        statusText = 'Off-site (Stationary)'
      }

      const initial = (staff.name || 'S').charAt(0).toUpperCase()
      const isSelected = selectedStaffId === staffId

      const customHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          ${
            !isOffline
              ? `<div style="
                  position: absolute;
                  width: 44px;
                  height: 44px;
                  top: -4px;
                  left: -4px;
                  border-radius: 50%;
                  background: ${ringColor};
                  opacity: 0.25;
                  ${pulseAnim}
                "></div>`
              : ''
          }
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #FFFFFF;
            border: 3px solid ${ringColor};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            overflow: hidden;
            transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
            transition: transform 0.2s ease;
          ">
            ${
              staff.photo_url
                ? `<img src="${staff.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
                : `<span style="font-weight: 800; font-size: 14px; color: #1E293B;">${initial}</span>`
            }
          </div>
          <div style="
            background: rgba(15, 23, 42, 0.9);
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 3px;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            ${staff.name || 'Staff'}
          </div>
        </div>
      `

      const icon = L.divIcon({
        className: 'staff-live-marker',
        html: customHtml,
        iconSize: [40, 52],
        iconAnchor: [20, 26]
      })

      // Popup Content
      const timeAgo = formatTimeAgo(loc.last_updated)
      const popupHtml = `
        <div style="min-width: 220px; font-family: system-ui, sans-serif; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <div style="
              width: 40px; height: 40px; border-radius: 50%;
              background: #F1F5F9; border: 2px solid ${ringColor};
              display: flex; align-items: center; justify-content: center;
              font-weight: 800; font-size: 16px; overflow: hidden;
            ">
              ${
                staff.photo_url
                  ? `<img src="${staff.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
                  : initial
              }
            </div>
            <div>
              <div style="font-weight: 700; font-size: 14px; color: #0F172A;">${staff.name || 'Unknown'}</div>
              <div style="font-size: 11px; color: #64748B;">${staff.designation || 'Staff'} • ${staff.employee_id || 'ID'}</div>
            </div>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #334155; background: #F8FAFC; padding: 8px; border-radius: 6px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">Status:</span>
              <span style="font-weight: 700; color: ${ringColor};">${statusText}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">Battery:</span>
              <span style="font-weight: 600;">${loc.battery_level !== null ? `${loc.battery_level}%` : 'N/A'} ${loc.is_charging ? '⚡' : ''}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">Last ping:</span>
              <span style="font-weight: 600;">${timeAgo}</span>
            </div>
            ${
              loc.speed
                ? `<div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748B;">Speed:</span>
                    <span style="font-weight: 600;">${Math.round(loc.speed * 3.6)} km/h</span>
                  </div>`
                : ''
            }
            ${
              loc.accuracy
                ? `<div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748B;">GPS Accuracy:</span>
                    <span style="font-weight: 600;">±${Math.round(loc.accuracy)}m</span>
                  </div>`
                : ''
            }
          </div>

          ${
            staff.emergency_phone
              ? `<a href="tel:${staff.emergency_phone}" style="
                  display: block; text-align: center; background: #107C41; color: #FFFFFF;
                  text-decoration: none; font-size: 12px; font-weight: 700; padding: 6px;
                  border-radius: 6px; margin-bottom: 4px;
                ">
                  📞 Call ${staff.emergency_phone}
                </a>`
              : ''
          }
        </div>
      `

      if (markersRef.current[staffId]) {
        // Update existing marker position & icon
        const marker = markersRef.current[staffId]
        marker.setLatLng([lat, lon])
        marker.setIcon(icon)
        marker.setPopupContent(popupHtml)
      } else {
        // Create new marker
        const marker = L.marker([lat, lon], { icon }).addTo(map)
        marker.bindPopup(popupHtml)
        marker.on('click', () => onSelectStaff(staffId))
        markersRef.current[staffId] = marker
      }
    })

    // Remove stale markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        map.removeLayer(markersRef.current[id])
        delete markersRef.current[id]
      }
    })
  }, [locations, selectedStaffId])

  // Center on Selected Staff
  useEffect(() => {
    if (!selectedStaffId || !mapInstanceRef.current) return
    const marker = markersRef.current[selectedStaffId]
    if (marker) {
      mapInstanceRef.current.flyTo(marker.getLatLng(), 17, { duration: 1.2 })
      marker.openPopup()
    }
  }, [selectedStaffId])

  // Render Route Playback Polyline
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current)
      routePolylineRef.current = null
    }

    if (routePoints && routePoints.length > 1) {
      const latlngs = routePoints.map((p) => [p.latitude, p.longitude])
      const polyline = L.polyline(latlngs, {
        color: '#2563EB',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 6'
      }).addTo(map)

      routePolylineRef.current = polyline
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] })
      setPlayIndex(0)
      setIsPlaying(false)
    }
  }, [routePoints])

  // Route Scrubber Animation Effect
  useEffect(() => {
    if (!isPlaying || !routePoints || routePoints.length === 0) return
    const intervalTime = Math.max(100, Math.floor(600 / playbackSpeed))
    const timer = setInterval(() => {
      setPlayIndex((prev) => {
        if (prev >= routePoints.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, intervalTime)
    return () => clearInterval(timer)
  }, [isPlaying, routePoints, playbackSpeed])

  // Render & Move Scrubber Marker on Map
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (!routePoints || routePoints.length === 0) {
      if (scrubberMarkerRef.current) {
        map.removeLayer(scrubberMarkerRef.current)
        scrubberMarkerRef.current = null
      }
      return
    }

    const currentPoint = routePoints[playIndex]
    if (!currentPoint) return

    const scrubberHtml = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 22px;
          height: 22px;
          background: #2563EB;
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 16px rgba(37, 99, 235, 0.9);
        "></div>
      </div>
    `
    const icon = L.divIcon({
      className: 'scrubber-marker',
      html: scrubberHtml,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    })

    if (scrubberMarkerRef.current) {
      scrubberMarkerRef.current.setLatLng([currentPoint.latitude, currentPoint.longitude])
    } else {
      scrubberMarkerRef.current = L.marker([currentPoint.latitude, currentPoint.longitude], {
        icon,
        zIndexOffset: 2000
      }).addTo(map)
    }
  }, [playIndex, routePoints])

  // Render SOS Emergency Beacons
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    sosMarkersRef.current.forEach((m) => map.removeLayer(m))
    sosMarkersRef.current = []

    const activeSos = (sosAlerts || []).filter((s) => s.status === 'active')

    activeSos.forEach((alert) => {
      if (!alert.latitude || !alert.longitude) return

      const staff = alert.staff || {}
      const sosHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="
            position: absolute;
            width: 52px;
            height: 52px;
            top: -6px;
            left: -6px;
            border-radius: 50%;
            background: #EF4444;
            opacity: 0.45;
            animation: pulse 1.2s infinite;
          "></div>
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #DC2626;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(220, 38, 38, 0.9);
            border: 3px solid #FFFFFF;
            font-size: 18px;
            font-weight: 900;
          ">
            🆘
          </div>
          <div style="
            background: #991B1B;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            margin-top: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          ">
            EMERGENCY: ${staff.name || 'Staff'}
          </div>
        </div>
      `
      const icon = L.divIcon({
        className: 'sos-beacon-marker',
        html: sosHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })

      const marker = L.marker([alert.latitude, alert.longitude], {
        icon,
        zIndexOffset: 3000
      }).addTo(map)

      marker.bindPopup(`
        <div style="padding: 6px; font-family: system-ui; text-align: center;">
          <div style="font-weight: 800; font-size: 14px; color: #DC2626; margin-bottom: 4px;">🚨 SOS EMERGENCY</div>
          <div style="font-weight: 700; font-size: 13px;">${staff.name || 'Staff'}</div>
          <div style="font-size: 11px; color: #666; margin-bottom: 8px;">ID: ${staff.employee_id || 'N/A'} · Phone: ${staff.phone || 'N/A'}</div>
          <div style="font-size: 12px; margin-bottom: 8px;">Battery: ${alert.battery_level ? `${alert.battery_level}%` : 'N/A'}</div>
          <a href="https://maps.google.com/?q=${alert.latitude},${alert.longitude}" target="_blank" style="display: block; padding: 6px 10px; background: #DC2626; color: white; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: 700;">Open Google Maps Direction</a>
        </div>
      `)

      sosMarkersRef.current.push(marker)
    })
  }, [sosAlerts])

  // Render Movement Heatmap Layer
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    heatmapLayersRef.current.forEach((layer) => map.removeLayer(layer))
    heatmapLayersRef.current = []

    if (!heatmapMode) return

    const pointsToHeat =
      routePoints && routePoints.length > 0
        ? routePoints
        : locations.map((l) => ({ latitude: l.latitude, longitude: l.longitude }))

    pointsToHeat.forEach((pt) => {
      if (!pt.latitude || !pt.longitude) return

      const coreCircle = L.circle([pt.latitude, pt.longitude], {
        radius: 20,
        color: '#DC2626',
        fillColor: '#EF4444',
        fillOpacity: 0.28,
        weight: 0
      }).addTo(map)

      const glowCircle = L.circle([pt.latitude, pt.longitude], {
        radius: 45,
        color: '#F59E0B',
        fillColor: '#F59E0B',
        fillOpacity: 0.12,
        weight: 0
      }).addTo(map)

      heatmapLayersRef.current.push(coreCircle)
      heatmapLayersRef.current.push(glowCircle)
    })
  }, [heatmapMode, routePoints, locations])

  // Reset View to Cafe or Bounds
  const handleResetView = () => {
    const map = mapInstanceRef.current
    if (!map) return

    if (zones.length > 0 && zones[0].latitude) {
      map.flyTo([zones[0].latitude, zones[0].longitude], 15, { duration: 1 })
    } else {
      map.flyTo([23.8759, 90.3795], 15, { duration: 1 })
    }
  }

  // Fit all visible pins
  const handleFitAll = () => {
    const map = mapInstanceRef.current
    if (!map) return

    const allCoords = locations
      .filter((l) => l.latitude && l.longitude)
      .map((l) => [l.latitude, l.longitude])

    zones.forEach((z) => {
      if (z.latitude && z.longitude) allCoords.push([z.latitude, z.longitude])
    })

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords)
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 })
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* Top Map Controls Floating Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        <button
          onClick={handleResetView}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#1E293B',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
          title="Center on Crown Coffee Cafe"
        >
          <Coffee size={14} color="#107C41" />
          <span>Cafe Center</span>
        </button>

        <button
          onClick={() => {
            if (typeof window === 'undefined' || !navigator.geolocation) {
              alert('Geolocation is not supported by this browser.')
              return
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lat = pos.coords.latitude
                const lng = pos.coords.longitude
                setIsLocatingDevice(true)
                setLocErrorMessage(null)

                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.5 })

                  if (myDeviceMarkerRef.current) {
                    myDeviceMarkerRef.current.setLatLng([lat, lng])
                  } else {
                    const iconHtml = `
                      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
                        <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                        <div style="width: 14px; height: 14px; border-radius: 50%; background: #2563EB; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
                      </div>
                    `
                    const myIcon = L.divIcon({
                      className: 'my-device-marker',
                      html: iconHtml,
                      iconSize: [28, 28],
                      iconAnchor: [14, 14]
                    })

                    myDeviceMarkerRef.current = L.marker([lat, lng], { icon: myIcon })
                      .addTo(mapInstanceRef.current)
                      .bindPopup(`
                        <div style="font-family: sans-serif; font-size: 12px; font-weight: 700; color: #1E293B; padding: 4px;">
                          <span style="color: #2563EB;">📍 Your Current Device</span><br/>
                          <span style="font-size: 10px; color: #64748B; font-weight: 500;">GPS Accuracy: ±${Math.round(pos.coords.accuracy)}m</span>
                        </div>
                      `)
                  }
                }
              },
              (err) => {
                console.warn('[LocateDevice Error]', err)
                setLocErrorMessage(err.message)
                setShowIosGuideModal(true)
              },
              { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
            )
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isLocatingDevice ? '#10B981' : 'rgba(255, 255, 255, 0.95)',
            color: isLocatingDevice ? '#FFFFFF' : '#1E293B',
            backdropFilter: 'blur(8px)',
            border: isLocatingDevice ? '1px solid #059669' : '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
          title="Click to request iOS / Device GPS permission and pin your position"
        >
          <Navigation size={14} color={isLocatingDevice ? '#FFFFFF' : '#10B981'} />
          <span>{isLocatingDevice ? 'My Location (Active)' : 'Locate My Device'}</span>
        </button>

        <button
          onClick={handleFitAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#1E293B',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
          title="Zoom out to show all staff"
        >
          <Maximize2 size={14} color="#3B82F6" />
          <span>Fit All</span>
        </button>

        <button
          onClick={onToggleHeatmap}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: heatmapMode ? '#DC2626' : 'rgba(255, 255, 255, 0.95)',
            color: heatmapMode ? '#FFFFFF' : '#1E293B',
            backdropFilter: 'blur(8px)',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
          title="Toggle movement density heatmap"
        >
          <Flame size={14} color={heatmapMode ? '#FFFFFF' : '#DC2626'} />
          <span>Heatmap</span>
        </button>

        {/* Map Style Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          <button
            onClick={() => setMapTheme('google_streets')}
            style={{
              background: mapTheme === 'google_streets' ? '#107C41' : 'transparent',
              color: mapTheme === 'google_streets' ? '#FFFFFF' : '#64748B',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Google Map
          </button>
          <button
            onClick={() => setMapTheme('google_hybrid')}
            style={{
              background: mapTheme === 'google_hybrid' ? '#107C41' : 'transparent',
              color: mapTheme === 'google_hybrid' ? '#FFFFFF' : '#64748B',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapTheme('google_terrain')}
            style={{
              background: mapTheme === 'google_terrain' ? '#107C41' : 'transparent',
              color: mapTheme === 'google_terrain' ? '#FFFFFF' : '#64748B',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Terrain
          </button>
          <button
            onClick={() => setMapTheme('carto_dark')}
            style={{
              background: mapTheme === 'carto_dark' ? '#107C41' : 'transparent',
              color: mapTheme === 'carto_dark' ? '#FFFFFF' : '#64748B',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Interactive Route Playback Scrubber Bar */}
      {routePoints && routePoints.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            color: '#FFFFFF',
            borderRadius: '16px',
            padding: '14px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.12)',
            minWidth: '420px',
            maxWidth: '560px'
          }}
        >
          {/* Top Title & Time Info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={16} color="#60A5FA" />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>
                {routeStaff?.name || 'Staff'} — Route Replay
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  background: 'rgba(37, 99, 235, 0.2)',
                  color: '#93C5FD',
                  border: '1px solid rgba(37, 99, 235, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}
              >
                {routePoints[playIndex]?.recorded_at
                  ? new Date(routePoints[playIndex].recorded_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                      timeZone: 'Asia/Dhaka'
                    })
                  : '--:--:--'}
              </span>

              <button
                onClick={onClearRoute}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Close route playback"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Timeline Range Slider */}
          <input
            type="range"
            min={0}
            max={Math.max(1, routePoints.length - 1)}
            value={playIndex}
            onChange={(e) => setPlayIndex(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#3B82F6',
              cursor: 'pointer'
            }}
          />

          {/* Playback Controls & Speed Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => {
                  setPlayIndex(0)
                  setIsPlaying(true)
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Restart from beginning"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Step info & Speed buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                Point {playIndex + 1} of {routePoints.length}
              </span>

              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', padding: '2px' }}>
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    style={{
                      background: playbackSpeed === spd ? '#2563EB' : 'transparent',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Pulse Keyframes */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            opacity: 0.7;
          }
          70% {
            transform: scale(1.4);
            opacity: 0;
          }
          100% {
            transform: scale(0.95);
            opacity: 0;
          }
        }
      `}</style>
      {/* ── iOS / Safari Location Permission Unlock Modal ── */}
      {showIosGuideModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#0F172A',
            color: '#F8FAFC',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            fontFamily: 'var(--font-sans)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={20} color="#EF4444" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>iOS Permission</h3>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Permission Guide</span>
                </div>
              </div>
              <button
                onClick={() => setShowIosGuideModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.5', margin: '0 0 16px' }}>
              Please allow permission in your iPhone settings:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#1E293B', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#fff', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
                <span style={{ fontSize: '12px', color: '#E2E8F0' }}>Open your iPhone <strong>Settings</strong> app.</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#fff', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
                <span style={{ fontSize: '12px', color: '#E2E8F0' }}>Go to <strong>Privacy & Security</strong> $\rightarrow$ <strong>Location Services</strong> (turn ON).</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#fff', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
                <span style={{ fontSize: '12px', color: '#E2E8F0' }}>Scroll down to <strong>Safari Websites</strong> (or Crown Coffee) $\rightarrow$ choose <strong>"While Using the App"</strong> and turn <strong>Precise Location: ON</strong>.</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIosGuideModal(false)
                window.location.reload()
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              I Updated Settings — Reload & Try Again
            </button>
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
