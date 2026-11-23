'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import CameraBarcodeScanner from '../../components/CameraBarcodeScanner'
import { PracticeBanner, fmtQty, PRACTICE_PAGES } from './PracticeShared'
import {
  Plus, Minus, Trash2, CheckCircle, ShoppingCart, Scan,
  RefreshCcw, ChevronRight, Clock, User, AlertTriangle, Camera
} from 'lucide-react'

export default function PracticeBazarPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const scanInputRef = useRef(null)

  const [trips, setTrips] = useState([])
  const [activeTrip, setActiveTrip] = useState(null)
  const [lines, setLines] = useState([])
  const [stockMap, setStockMap] = useState({})     // item_id → current stock
  const [loading, setLoading] = useState(true)
  const [scanValue, setScanValue] = useState('')
  const [scanning, setScanning] = useState(false)
  const [totalPaid, setTotalPaid] = useState('')
  const [approveModal, setApproveModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  const username = typeof window !== 'undefined'
    ? (localStorage.getItem('cc_username') || localStorage.getItem('cc_staff_name') || 'staff')
    : 'staff'

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin' && role !== 'staff' && role !== 'manager')) {
      router.replace('/')
      return
    }
    fetchTrips()
  }, [])

  // ── Keep scan box focused at all times ───────────────────
  const refocusScan = useCallback(() => {
    setTimeout(() => scanInputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    if (!activeTrip) return
    refocusScan()
  }, [activeTrip, lines, refocusScan])

  // ── Data fetching ─────────────────────────────────────────
  async function fetchTrips() {
    setLoading(true)
    const res = await fetch('/api/practice/trips')
    const json = await res.json()
    if (json.error) addToast(json.error, 'error')
    setTrips(json.trips || [])
    setLoading(false)
  }

  async function fetchTripDetail(tripId) {
    const [tripRes, stockRes] = await Promise.all([
      fetch(`/api/practice/trips/${tripId}`),
      fetch('/api/practice/stock'),
    ])
    const tripJson = await tripRes.json()
    const stockJson = await stockRes.json()

    if (tripJson.error) { addToast(tripJson.error, 'error'); return }
    setActiveTrip(tripJson.trip)
    setLines(tripJson.lines || [])

    const sm = {}
    for (const s of stockJson.stock || []) sm[s.id] = s.current_stock
    setStockMap(sm)
  }

  async function openTrip(trip) {
    await fetchTripDetail(trip.id)
    refocusScan()
  }

  async function createNewTrip() {
    setCreating(true)
    const res = await fetch('/api/practice/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ created_by: username }),
    })
    const json = await res.json()
    setCreating(false)
    if (json.error) { addToast(json.error, 'error'); return }
    setTrips(prev => [json.trip, ...prev])
    await fetchTripDetail(json.trip.id)
    addToast('New bazar trip started!', 'success')
  }

  // ── Core barcode processor (USB scanner, keyboard, or camera) ─
  async function executeBarcode(barcode) {
    const trimmed = (barcode || '').trim()
    if (!trimmed || !activeTrip) return

    setScanValue('')
    setScanning(true)

    const res = await fetch(`/api/practice/trips/${activeTrip.id}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: trimmed, scanned_by: username }),
    })
    const json = await res.json()
    setScanning(false)

    if (json.error) {
      addToast(json.error, 'error')
      refocusScan()
      return
    }

    if (json.type === 'item' && json.action === 'added') {
      setLines(prev => [...prev, json.line])
      addToast(`Added: ${json.line.practice_items?.name}`, 'success')
    } else if (json.type === 'item' && json.action === 'updated') {
      setLines(prev => prev.map(l => l.id === json.line.id ? json.line : l))
      addToast(`Updated: ${json.line.practice_items?.name}`, 'success')
    } else if (json.type === 'qty') {
      setLines(prev => prev.map(l => l.id === json.line.id ? json.line : l))
      addToast(`Quantity updated`, 'success')
    }
    refocusScan()
  }

  // ── Keyboard / USB scan handler ────────────────────────────
  async function handleScan(e) {
    if (e.key !== 'Enter') return
    await executeBarcode(scanValue)
  }

  // ── Line mutations ─────────────────────────────────────────
  async function updateLineQty(line, delta) {
    const newQty = Math.max(0, line.quantity + delta)
    const item = line.practice_items
    // snap to pack_size increments
    const snap = Math.round(newQty / item.pack_size) * item.pack_size
    await patchLine(line.id, snap)
  }

  async function patchLine(lineId, quantity) {
    const res = await fetch(`/api/practice/trips/${activeTrip.id}/lines/${lineId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    })
    const json = await res.json()
    if (json.error) { addToast(json.error, 'error'); return }
    if (json.deleted) {
      setLines(prev => prev.filter(l => l.id !== lineId))
    } else {
      setLines(prev => prev.map(l => l.id === lineId ? json.line : l))
    }
    refocusScan()
  }

  async function deleteLine(lineId) {
    const res = await fetch(`/api/practice/trips/${activeTrip.id}/lines/${lineId}`, {
      method: 'DELETE',
    })
    const json = await res.json()
    if (json.error) { addToast(json.error, 'error'); return }
    setLines(prev => prev.filter(l => l.id !== lineId))
    refocusScan()
  }

  // ── Approve ───────────────────────────────────────────────
  async function approveTrip() {
    setApproveModal(false)
    const res = await fetch(`/api/practice/trips/${activeTrip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total_paid: parseFloat(totalPaid) || 0,
        approved_by: username,
      }),
    })
    const json = await res.json()
    if (json.error) { addToast(json.error, 'error'); return }
    addToast('Trip approved! Stock updated.', 'success')
    setActiveTrip(prev => ({ ...prev, status: 'approved' }))
    fetchTrips()
  }

  const isApproved = activeTrip?.status === 'approved'

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <PracticeBanner />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 80px' }}>
        {/* Sub-nav */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {PRACTICE_PAGES.map(p => (
            <Link key={p.href} href={p.href} style={{
              padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
              background: p.href === '/practice-bazar' ? 'var(--primary)' : 'var(--bg-surface)',
              color: p.href === '/practice-bazar' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${p.href === '/practice-bazar' ? 'var(--primary)' : 'var(--border-medium)'}`,
              textDecoration: 'none',
            }}>
              {p.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: activeTrip ? '320px 1fr' : '1fr', gap: '20px', alignItems: 'start' }} className="practice-grid">

          {/* ── Trips sidebar ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Bazar Trips</h2>
              <button className="btn-primary" onClick={createNewTrip} disabled={creating} style={{ padding: '8px 14px', fontSize: '13px' }}>
                <Plus size={15} /> New Trip
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="loader" /></div>
            ) : trips.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>
                <ShoppingCart size={32} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} strokeWidth={1.5} />
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No trips yet. Press "New Trip" to start.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {trips.map(t => (
                  <button
                    key={t.id}
                    onClick={() => openTrip(t)}
                    style={{
                      textAlign: 'left', width: '100%', padding: '14px 16px',
                      borderRadius: '12px', border: `2px solid ${activeTrip?.id === t.id ? 'var(--primary)' : 'var(--border-light)'}`,
                      background: activeTrip?.id === t.id ? 'var(--accent-blue-dim)' : 'var(--bg-surface)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Trip #{t.id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`badge ${t.status === 'approved' ? 'badge-green' : 'badge-amber'}`}>
                        {t.status === 'approved' ? '✓ Approved' : 'Open'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '10px' }}>
                      <span><Clock size={10} style={{ verticalAlign: 'middle' }} /> {new Date(t.created_at).toLocaleString()}</span>
                    </div>
                    {t.approved_by && (
                      <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '2px' }}>
                        <User size={10} style={{ verticalAlign: 'middle' }} /> Approved by {t.approved_by}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Active trip panel ── */}
          {activeTrip && (
            <div>
              {/* Header + scan box */}
              <div className="card" style={{ marginBottom: '16px', borderLeft: `4px solid ${isApproved ? 'var(--success)' : 'var(--warning)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700 }}>
                      Trip #{activeTrip.id.slice(-6).toUpperCase()}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {isApproved
                        ? `✅ Approved by ${activeTrip.approved_by} on ${new Date(activeTrip.approved_at).toLocaleString()}`
                        : `Open — by ${activeTrip.created_by || 'staff'} at ${new Date(activeTrip.created_at).toLocaleString()}`
                      }
                    </p>
                  </div>
                  {!isApproved && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Scan size={14} /> Scan box always focused
                    </span>
                  )}
                </div>

                {!isApproved && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Scan size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                      <input
                        ref={scanInputRef}
                        type="text"
                        className="input"
                        placeholder="Scan barcode or type code + Enter…"
                        value={scanValue}
                        onChange={e => setScanValue(e.target.value)}
                        onKeyDown={handleScan}
                        onClick={refocusScan}
                        disabled={scanning}
                        autoComplete="off"
                        style={{
                          paddingLeft: '36px', fontSize: '16px', fontWeight: 600,
                          borderColor: 'var(--primary)', boxShadow: '0 0 0 3px var(--accent-blue-dim)',
                          height: '52px',
                        }}
                      />
                      {scanning && <div className="loader" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCameraOpen(true)}
                      className="btn-secondary"
                      style={{
                        height: '52px',
                        padding: '0 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        fontWeight: 700,
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      <Camera size={18} style={{ color: 'var(--primary)' }} />
                      <span>Use Camera</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Lines table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
                {lines.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', opacity: 0.5 }}>
                    <ShoppingCart size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} strokeWidth={1.5} />
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No items scanned yet.</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Practice Stock</th>
                        <th>Buying</th>
                        <th>Scanned by</th>
                        {!isApproved && <th style={{ width: '120px' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map(line => {
                        const item = line.practice_items
                        if (!item) return null
                        const stock = stockMap[item.id] || 0
                        const isAboveMin = stock > item.par_level
                        return (
                          <tr key={line.id} style={{ background: isAboveMin ? 'var(--warning-bg)' : undefined }}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                              {isAboveMin && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', fontSize: '11px', color: 'var(--warning)', fontWeight: 700 }}>
                                  <AlertTriangle size={11} /> Stock is already above minimum
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                              {fmtQty(stock, item.base_unit)}
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                (par: {fmtQty(item.par_level, item.base_unit)})
                              </span>
                            </td>
                            <td>
                              {isApproved ? (
                                <span style={{ fontWeight: 700, fontSize: '15px' }}>{fmtQty(line.quantity, item.base_unit)}</span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    onClick={() => updateLineQty(line, -item.pack_size)}
                                    style={{ width: '34px', height: '34px', border: '1.5px solid var(--border-medium)', borderRadius: '8px', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span style={{ fontWeight: 700, fontSize: '15px', minWidth: '64px', textAlign: 'center' }}>
                                    {fmtQty(line.quantity, item.base_unit)}
                                  </span>
                                  <button
                                    onClick={() => updateLineQty(line, item.pack_size)}
                                    style={{ width: '34px', height: '34px', border: '1.5px solid var(--border-medium)', borderRadius: '8px', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {line.scanned_by || '—'}<br />
                              {new Date(line.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            {!isApproved && (
                              <td>
                                <button
                                  onClick={() => deleteLine(line.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Approve section */}
              {!isApproved && (
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label className="label">Total Amount Paid (৳)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Enter amount paid"
                      value={totalPaid}
                      onChange={e => setTotalPaid(e.target.value)}
                      style={{ fontSize: '18px', fontWeight: 700 }}
                    />
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => setApproveModal(true)}
                    disabled={lines.length === 0}
                    style={{ padding: '14px 28px', fontSize: '16px', marginTop: '20px' }}
                  >
                    <CheckCircle size={18} /> APPROVE TRIP
                  </button>
                </div>
              )}

              {isApproved && (
                <div className="card" style={{ borderLeft: '4px solid var(--success)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle size={24} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--success)' }}>Trip Approved & Locked</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Total paid: ৳{activeTrip.total_paid?.toLocaleString() || 0} · Stock updated in practice inventory.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={approveModal}
        onClose={() => setApproveModal(false)}
        onConfirm={approveTrip}
        title="Approve Bazar Trip"
        message={`This will lock the trip and add all ${lines.length} item(s) to practice inventory as purchase movements. This cannot be undone. Total paid: ৳${totalPaid || 0}. Continue?`}
        confirmLabel="Yes, Approve"
        type="warning"
      />

      <CameraBarcodeScanner
        isOpen={cameraOpen}
        onClose={() => {
          setCameraOpen(false)
          refocusScan()
        }}
        onScan={executeBarcode}
        recentLines={lines}
      />

      <style>{`
        @media (max-width: 900px) {
          .practice-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
