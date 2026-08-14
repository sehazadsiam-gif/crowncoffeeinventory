'use client'

import { useState, useEffect } from 'react'
import { Calendar, User, AlertTriangle, Trash2, CheckCircle2, ChevronLeft, ChevronRight, Save, X, DollarSign } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

export default function StaffPenaltiesPage() {
  const [staffList, setStaffList] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [penaltiesMap, setPenaltiesMap] = useState({}) // { 'YYYY-MM-DD': penaltyObj }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState('')
  const [modalPercent, setModalPercent] = useState('1.0')
  const [modalReason, setModalReason] = useState('')
  const [existingPenaltyId, setExistingPenaltyId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const selectedMonth = currentDate.getMonth() + 1
  const selectedYear = currentDate.getFullYear()

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    if (selectedStaffId) {
      fetchPenalties()
    }
  }, [selectedStaffId, selectedMonth, selectedYear])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, designation, base_salary, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setStaffList(data || [])
      if (data && data.length > 0) {
        setSelectedStaffId(data[0].id)
      }
    } catch (err) {
      console.error('Error fetching staff:', err)
      showToast('Failed to load staff list', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchPenalties = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/staff/penalties?staff_id=${selectedStaffId}&month=${selectedMonth}&year=${selectedYear}`)
      const data = await res.json()
      
      const pMap = {}
      ;(data.penalties || []).forEach(p => {
        pMap[p.date] = p
      })
      setPenaltiesMap(pMap)
    } catch (err) {
      console.error('Error fetching penalties:', err)
      showToast('Failed to fetch penalty entries', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDateClick = (dateStr) => {
    const existing = penaltiesMap[dateStr]
    setModalDate(dateStr)
    if (existing) {
      setExistingPenaltyId(existing.id)
      setModalPercent(String(existing.penalty_percent || 1.0))
      setModalReason(existing.reason || '')
    } else {
      setExistingPenaltyId(null)
      setModalPercent('1.0')
      setModalReason('')
    }
    setModalOpen(true)
  }

  const handleSavePenalty = async () => {
    if (!selectedStaffId || !modalDate) return
    try {
      setSaving(true)
      const res = await fetch('/api/staff/penalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaffId,
          date: modalDate,
          penalty_percent: Number(modalPercent) || 1.0,
          reason: modalReason
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save penalty')

      showToast(`Penalty marked for ${modalDate} (${modalPercent}% cut)`)
      setModalOpen(false)
      fetchPenalties()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to save penalty', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePenalty = async (dateStr) => {
    try {
      setSaving(true)
      const res = await fetch(`/api/staff/penalties?staff_id=${selectedStaffId}&date=${dateStr}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete penalty')

      showToast(`Penalty removed for ${dateStr}`)
      setModalOpen(false)
      fetchPenalties()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to remove penalty', 'error')
    } finally {
      setSaving(false)
    }
  }

  const changeMonth = (offset) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  // Calendar Math
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay() // 0 = Sun

  const selectedStaff = staffList.find(s => s.id === selectedStaffId)
  const baseSalary = Number(selectedStaff?.base_salary) || 0

  const penaltiesArray = Object.values(penaltiesMap)
  const totalPenaltyPercent = penaltiesArray.reduce((acc, p) => acc + Number(p.penalty_percent || 0), 0)
  const estimatedDeduction = (baseSalary * (totalPenaltyPercent / 100)).toFixed(2)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#FFF',
          padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={28} color="#DC2626" />
            Staff Service Penalties & Salary Cut
          </h1>
          <p style={{ color: '#64748B', marginTop: '4px', fontSize: '14px', margin: '4px 0 0 0' }}>
            Mark dates for poor service or policy violations to apply salary cuts (1% per date) automatically integrated with Payroll.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#FFFFFF', padding: '6px 12px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#475569', borderRadius: '6px' }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontWeight: 800, fontSize: '15px', color: '#1E293B', minWidth: '130px', textAlign: 'center' }}>
            {monthNames[selectedMonth - 1]} {selectedYear}
          </span>
          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#475569', borderRadius: '6px' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Control Bar: Staff Selector & Summary Box */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* Staff Selector Card */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
            Select Staff Member
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1',
                fontSize: '15px', fontWeight: 700, color: '#1E293B', background: '#F8FAFC', outline: 'none', cursor: 'pointer'
              }}
            >
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.designation || 'Staff'}) — Base: ৳{s.base_salary}
                </option>
              ))}
            </select>
          </div>
          {selectedStaff && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#475569', display: 'flex', gap: '16px' }}>
              <span>Role: <strong>{selectedStaff.designation}</strong></span>
              <span>Base Salary: <strong>৳{baseSalary.toLocaleString()}</strong></span>
            </div>
          )}
        </div>

        {/* Penalty Summary Stat Card */}
        <div style={{ background: 'linear-gradient(135deg, #FFF5F5 0%, #FEF2F2 100%)', border: '1.5px solid #FECACA', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Monthly Penalties Summary ({monthNames[selectedMonth - 1]})
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#DC2626', marginTop: '6px' }}>
              {penaltiesArray.length} Days Flagged <span style={{ fontSize: '16px', fontWeight: 700, color: '#991B1B' }}>({totalPenaltyPercent}% cut)</span>
            </div>
            <div style={{ fontSize: '13px', color: '#7F1D1D', marginTop: '4px', fontWeight: 600 }}>
              Estimated Salary Cut: ৳{estimatedDeduction}
            </div>
          </div>
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '50%', color: '#DC2626' }}>
            <DollarSign size={28} />
          </div>
        </div>

      </div>

      {/* Calendar Section */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="#2563EB" />
            Calendar View — Click any date to mark/unmark penalty
          </h2>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
            🔴 Marked Date = 1% Salary Cut
          </span>
        </div>

        {/* Weekday Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '8px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div key={d} style={{ fontSize: '12px', fontWeight: 800, color: i === 5 || i === 6 ? '#EF4444' : '#64748B', padding: '8px 0', textTransform: 'uppercase' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} style={{ minHeight: '90px', background: '#F8FAFC', borderRadius: '10px', border: '1px border #F1F5F9' }} />
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
            const penalty = penaltiesMap[dateStr]
            const isToday = new Date().toISOString().slice(0, 10) === dateStr

            return (
              <div
                key={dateStr}
                onClick={() => handleDateClick(dateStr)}
                style={{
                  minHeight: '95px',
                  background: penalty ? '#FEF2F2' : isToday ? '#EFF6FF' : '#FFFFFF',
                  border: penalty ? '2px solid #FCA5A5' : isToday ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: penalty ? '0 4px 10px rgba(220,38,38,0.1)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: penalty ? '#DC2626' : '#1E293B' }}>
                    {dayNum}
                  </span>
                  {isToday && (
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#2563EB', background: '#DBEAFE', padding: '2px 6px', borderRadius: '4px' }}>
                      TODAY
                    </span>
                  )}
                </div>

                {penalty ? (
                  <div style={{ background: '#DC2626', color: '#FFFFFF', padding: '4px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                    <div>-{penalty.penalty_percent || 1}% CUT</div>
                    {penalty.reason && (
                      <div style={{ fontSize: '9.5px', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                        {penalty.reason}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center', opacity: 0.6 }}>
                    + Mark
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Audit Log Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', marginTop: 0, marginBottom: '16px' }}>
          Marked Penalties Log ({monthNames[selectedMonth - 1]} {selectedYear})
        </h3>

        {penaltiesArray.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '14px' }}>
            No penalties logged for this staff member in {monthNames[selectedMonth - 1]} {selectedYear}.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                <th style={{ padding: '12px', fontSize: '12px', fontWeight: 800, color: '#64748B' }}>DATE</th>
                <th style={{ padding: '12px', fontSize: '12px', fontWeight: 800, color: '#64748B' }}>DEDUCTION</th>
                <th style={{ padding: '12px', fontSize: '12px', fontWeight: 800, color: '#64748B' }}>REASON / NOTE</th>
                <th style={{ padding: '12px', fontSize: '12px', fontWeight: 800, color: '#64748B', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {penaltiesArray.map(p => (
                <tr key={p.id || p.date} style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{p.date}</td>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: 800, color: '#DC2626' }}>
                    -{p.penalty_percent}% Salary Cut
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#475569' }}>
                    {p.reason || 'Poor service / conduct'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDeletePenalty(p.date)}
                      style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Date Penalty Action Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '28px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', position: 'relative' }}>
            
            <button
              onClick={() => setModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', margin: '0 0 6px 0' }}>
              {existingPenaltyId ? 'Edit Performance Penalty' : 'Mark Service Penalty'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px 0' }}>
              Target Date: <strong>{modalDate}</strong> for <strong>{selectedStaff?.name}</strong>
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Salary Cut Percentage (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={modalPercent}
                onChange={(e) => setModalPercent(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontWeight: 700, outline: 'none' }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Default is 1.0% (1% cut from net monthly pay for this day).
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Reason / Note for Penalty
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Poor customer service at table, late response to orders..."
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {existingPenaltyId && (
                <button
                  disabled={saving}
                  onClick={() => handleDeletePenalty(modalDate)}
                  style={{ padding: '10px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Remove Cut
                </button>
              )}
              <button
                disabled={saving}
                onClick={handleSavePenalty}
                style={{ padding: '10px 20px', background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={16} /> Save Penalty
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
