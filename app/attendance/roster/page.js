'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Calendar, ChevronLeft, ChevronRight, Sparkles, Save, CheckCircle } from 'lucide-react'

export default function WeeklyRosterPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(getSaturdayOf(new Date()))
  const [staff, setStaff] = useState([])
  const [showKitchenStaff, setShowKitchenStaff] = useState(false)
  const [gridData, setGridData] = useState({}) // { staff_id: { dateStr: { shift_start, is_off, is_leave } } }
  const [aiDraft, setAiDraft] = useState(null)
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [saving, setSaving] = useState(false)

  const days = get7Days(weekStart)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      router.replace('/')
      return
    }

    fetchRoster(weekStart)
  }, [weekStart, router])

  async function fetchRoster(ws) {
    try {
      setLoading(true)
      const res = await fetch(`/api/attendance/roster?week_start=${ws}`)
      const json = await res.json()

      if (res.ok) {
        setStaff(json.staff || [])
        setAiDraft(json.draft || null)

        // Initialize grid state
        const initialGrid = {}
        const fetchedMap = new Map((json.roster || []).map(r => [`${r.staff_id}_${r.day_date}`, r]))

        json.staff.forEach(s => {
          initialGrid[s.id] = {}
          days.forEach(d => {
            const existing = fetchedMap.get(`${s.id}_${d}`)
            const dayName = new Date(d).toLocaleDateString('en-US', { weekday: 'long' })
            const isDefaultOff = s.weekly_off && dayName.toLowerCase() === s.weekly_off.toLowerCase()

            if (existing) {
              initialGrid[s.id][d] = {
                shift_start: existing.shift_start || '08:00',
                is_off: existing.is_off,
                is_leave: existing.is_leave
              }
            } else {
              initialGrid[s.id][d] = {
                shift_start: s.shift_start || '08:00',
                is_off: isDefaultOff,
                is_leave: false
              }
            }
          })
        })

        setGridData(initialGrid)
      } else {
        addToast(json.error || 'Failed to load roster', 'error')
      }
    } catch (err) {
      addToast('Error loading roster data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateAIDraft() {
    try {
      setGeneratingDraft(true)
      const res = await fetch('/api/attendance/agent/draft-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart })
      })
      const json = await res.json()

      if (res.ok) {
        addToast('AI Roster Draft generated!', 'success')
        fetchRoster(weekStart)
      } else {
        addToast(json.error || 'AI Draft generation failed', 'error')
      }
    } catch (err) {
      addToast('Error generating draft', 'error')
    } finally {
      setGeneratingDraft(false)
    }
  }

  function handleApplyAIDraft() {
    if (!aiDraft || !aiDraft.draft_data) return

    const newGrid = { ...gridData }
    Object.entries(aiDraft.draft_data).forEach(([staffId, userSchedule]) => {
      if (!newGrid[staffId]) newGrid[staffId] = {}
      Object.entries(userSchedule).forEach(([dateStr, dayData]) => {
        newGrid[staffId][dateStr] = {
          shift_start: dayData.shift_start || '10:00',
          is_off: dayData.type === 'off',
          is_leave: dayData.type === 'leave'
        }
      })
    })

    setGridData(newGrid)
    addToast('AI Draft pre-filled into grid! Review and save.', 'info')
  }

  async function handleSaveRoster() {
    try {
      setSaving(true)
      const items = []

      Object.entries(gridData).forEach(([staffId, dates]) => {
        Object.entries(dates).forEach(([dayDate, val]) => {
          items.push({
            staff_id: staffId,
            week_start: weekStart,
            day_date: dayDate,
            shift_start: val.shift_start || '10:00',
            shift_hours: 10,
            is_off: val.is_off,
            is_leave: val.is_leave
          })
        })
      })

      const res = await fetch('/api/attendance/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      })

      const json = await res.json()
      if (res.ok) {
        addToast('Duty roster saved successfully!', 'success')
      } else {
        addToast(json.error || 'Failed to save roster', 'error')
      }
    } catch (err) {
      addToast('Error saving roster', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleCellChange(staffId, dateStr, field, val) {
    setGridData(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [dateStr]: {
          ...prev[staffId]?.[dateStr],
          [field]: val
        }
      }
    }))
  }

  const [deptFilter, setDeptFilter] = useState('all') // 'all' | 'front' | 'kitchen'

  function changeWeek(offset) {
    const current = new Date(weekStart)
    current.setDate(current.getDate() + offset * 7)
    setWeekStart(getSaturdayOf(current))
  }

  const todaySat = getSaturdayOf(new Date())
  const isFutureWeek = weekStart > todaySat
  const isPastWeek = weekStart < todaySat

  const filteredStaff = staff.filter(s => {
    if (deptFilter === 'front') return s.department === 'front'
    if (deptFilter === 'kitchen') return s.department === 'kitchen'
    if (!showKitchenStaff && (s.department === 'kitchen' || s.is_rostered === false)) {
      return false
    }
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #faf7f2)', fontFamily: 'var(--font-sans)' }}>
      <Navbar />

      <main style={{ maxWidth: '1500px', margin: '0 auto', padding: '32px 24px 60px' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Weekly Duty Roster
              </h1>
              {isFutureWeek && (
                <span style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                  Future Roster
                </span>
              )}
              {isPastWeek && (
                <span style={{ background: '#F5F5F5', color: '#757575', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                  Past Roster
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
              Assign 10-hour shifts & off-days for Front and Kitchen employees.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Week Selector */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '4px 12px', gap: '8px' }}>
              <button onClick={() => changeWeek(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#333' }}>
                Week of {new Date(weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => changeWeek(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Jump to Date Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '4px 10px' }}>
              <span style={{ fontSize: '12px', color: '#777', fontWeight: 600 }}>Select Date:</span>
              <input
                type="date"
                value={weekStart}
                onChange={e => e.target.value && setWeekStart(getSaturdayOf(e.target.value))}
                style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#333', cursor: 'pointer' }}
              />
            </div>

            <button
              onClick={handleGenerateAIDraft}
              disabled={generatingDraft}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FEF8EC', border: '1px solid #F5D396', color: '#B78103', fontWeight: 700 }}
            >
              <Sparkles size={16} /> {generatingDraft ? 'Drafting...' : 'AI Roster Draft'}
            </button>

            <button
              onClick={handleSaveRoster}
              disabled={saving}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#6B3A2A', border: 'none', color: 'white' }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Roster'}
            </button>
          </div>
        </div>

        {/* AI Draft Banner if available */}
        {aiDraft && (
          <div style={{ background: '#FFFDF9', border: '1px solid #E8C88B', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#B78103', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> AI Pre-filled Roster Draft Available
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                {aiDraft.ai_notes || 'Optimized based on 6-day work weeks, off-days, and past balances.'}
              </p>
            </div>
            <button
              onClick={handleApplyAIDraft}
              className="btn-primary"
              style={{ background: '#C9943A', color: 'white', border: 'none', fontSize: '13px', whiteSpace: 'nowrap' }}
            >
              Apply AI Draft to Grid
            </button>
          </div>
        )}

        {/* Roster Grid */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8E0D4', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}><div className="loader"></div></div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setDeptFilter('all')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E8E0D4',
                      background: deptFilter === 'all' ? '#6B3A2A' : 'white',
                      color: deptFilter === 'all' ? 'white' : '#666',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    All Staff ({staff.length})
                  </button>
                  <button
                    onClick={() => setDeptFilter('front')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E8E0D4',
                      background: deptFilter === 'front' ? '#1565C0' : 'white',
                      color: deptFilter === 'front' ? 'white' : '#666',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ☕ Front Staff ({staff.filter(s => s.department === 'front' || s.is_rostered !== false).length})
                  </button>
                  <button
                    onClick={() => setDeptFilter('kitchen')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E8E0D4',
                      background: deptFilter === 'kitchen' ? '#E65100' : 'white',
                      color: deptFilter === 'kitchen' ? 'white' : '#666',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🍳 Kitchen Staff ({staff.filter(s => s.department === 'kitchen' || s.is_rostered === false).length})
                  </button>
                </div>

                <label style={{ fontSize: '12px', color: '#6B3A2A', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={showKitchenStaff}
                    onChange={e => setShowKitchenStaff(e.target.checked)}
                  /> Include Kitchen Staff on Roster Grid
                </label>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F0EAE1' }}>
                  <th style={{ padding: '12px', textAlign: 'left', minWidth: '180px', color: '#8C7A6B' }}>Staff Member</th>
                  {days.map(d => {
                    const dt = new Date(d)
                    const isToday = d === new Date().toISOString().split('T')[0]
                    return (
                      <th key={d} style={{ padding: '12px', textAlign: 'center', background: isToday ? '#FAF7F2' : 'transparent', color: isToday ? '#6B3A2A' : '#8C7A6B' }}>
                        <div style={{ fontWeight: 700 }}>{dt.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>{dt.getDate()} {dt.toLocaleDateString('en-US', { month: 'short' })}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F7F3EE' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#1C1410', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {s.name}
                        <span style={{
                          fontSize: '9px',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          background: s.department === 'kitchen' ? '#FFF3E0' : '#E3F2FD',
                          color: s.department === 'kitchen' ? '#E65100' : '#1565C0',
                          fontWeight: 700
                        }}>
                          {s.department === 'kitchen' ? 'Kitchen' : 'Front'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9C8A76' }}>
                        {s.employee_id} • {s.designation}
                      </div>
                    </td>

                    {days.map(d => {
                      const cell = gridData[s.id]?.[d] || { shift_start: '08:00', is_off: false, is_leave: false }

                      let bg = 'white'
                      if (cell.is_leave) bg = '#e1f5fe'
                      else if (cell.is_off) bg = '#f3e5f5'

                      return (
                        <td key={d} style={{ padding: '8px', textAlign: 'center', background: bg, borderLeft: '1px solid #F7F3EE' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            {cell.is_leave ? (
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#0288d1', color: 'white', fontWeight: 700, fontSize: '11px' }}>LEAVE</span>
                            ) : cell.is_off ? (
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#7b1fa2', color: 'white', fontWeight: 700, fontSize: '11px' }}>DAY OFF</span>
                            ) : (
                              <input
                                type="time"
                                value={cell.shift_start || '08:00'}
                                onChange={e => handleCellChange(s.id, d, 'shift_start', e.target.value)}
                                style={{ padding: '4px 6px', border: '1px solid #E0D6C8', borderRadius: '6px', fontSize: '12px', textAlign: 'center' }}
                              />
                            )}

                            <label style={{ fontSize: '10px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                              <input
                                type="checkbox"
                                checked={cell.is_off}
                                disabled={cell.is_leave}
                                onChange={e => handleCellChange(s.id, d, 'is_off', e.target.checked)}
                              /> Off Day
                            </label>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
          )}
        </div>

      </main>
    </div>
  )
}

function getSaturdayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 6 ? 0 : -(day + 1))
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function get7Days(saturdayStr) {
  const res = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(saturdayStr)
    d.setDate(d.getDate() + i)
    res.push(d.toISOString().split('T')[0])
  }
  return res
}
