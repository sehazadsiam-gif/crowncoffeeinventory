'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Calendar, Save, CheckCircle } from 'lucide-react'

export default function AttendancePage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [staff, setStaff] = useState([])
  const [attendance, setAttendance] = useState({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [activeTab, setActiveTab] = useState('daily') // 'daily' | 'monthly'
  const [monthlySummary, setMonthlySummary] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [editingRow, setEditingRow] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
    if (activeTab === 'daily') {
      fetchStaffAndAttendance()
    } else {
      fetchMonthlySummary()
    }
  }, [date, activeTab, selectedMonth, selectedYear])

  async function fetchMonthlySummary() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('monthly_attendance_summary')
        .select('*, staff(name, designation)')
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('staff_id')
      if (error) throw error
      setMonthlySummary(data || [])
    } catch (err) {
      addToast('Error loading monthly summary', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function saveMonthlyEdit() {
    if (!editingRow) return
    try {
      setSaving(true)
      const { error } = await supabase
        .from('monthly_attendance_summary')
        .update({
          present_days: parseInt(editingRow.present_days),
          absent_days: parseInt(editingRow.absent_days),
          late_days: parseInt(editingRow.late_days),
          source: 'manual'
        })
        .eq('id', editingRow.id)

      if (error) throw error
      addToast('Monthly record updated', 'success')
      setEditingRow(null)
      fetchMonthlySummary()
    } catch (err) {
      addToast('Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function fetchStaffAndAttendance() {
    try {
      setLoading(true)
      const [staffRes, attRes] = await Promise.all([
        supabase.from('staff').select('*').eq('is_active', true).order('name'),
        supabase.from('attendance').select('*').eq('date', date)
      ])
      if (staffRes.error) throw staffRes.error
      setStaff(staffRes.data || [])

      const attMap = {}
      ;(attRes.data || []).forEach(a => {
        attMap[a.staff_id] = { status: a.status, leave_type: a.leave_type || '', note: a.note || '' }
      })

      const newAtt = { ...attMap }
      ;(staffRes.data || []).forEach(s => {
        if (!newAtt[s.id]) newAtt[s.id] = { status: 'present', leave_type: '', note: '' }
      })
      setAttendance(newAtt)
    } catch (err) {
      addToast('Error loading attendance', 'error')
    } finally {
      setLoading(false)
    }
  }

  function updateRow(staffId, field, value) {
    setAttendance(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], [field]: value }
    }))
  }

  function markAll(status) {
    setAttendance(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], status, leave_type: status === 'present' ? '' : next[k].leave_type }
      })
      return next
    })
  }

  async function saveAttendance() {
    try {
      setSaving(true)
      const records = Object.keys(attendance).map(staff_id => ({
        staff_id,
        date,
        status: attendance[staff_id].status,
        leave_type: ['absent', 'half_day'].includes(attendance[staff_id].status) ? attendance[staff_id].leave_type : null,
        note: attendance[staff_id].note
      }))

      const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'staff_id,date' })
      if (error) throw error
      addToast('Attendance saved for ' + date, 'success')
    } catch (err) {
      addToast('Error saving attendance: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = [
    { val: 'present', label: 'Present', color: '#1e8e3e', bg: '#e6f4ea' },
    { val: 'absent', label: 'Absent', color: '#d93025', bg: '#fce8e6' },
    { val: 'half_day', label: 'Half Day', color: '#fbbc04', bg: '#fef7e0' },
    { val: 'late', label: 'Late', color: '#fa7b17', bg: '#feefe3' }
  ]

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <div>
      <Navbar />
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        
        {/* Header and Tabs */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px', borderBottom: '1px solid var(--border-light)' }}>
          <div>
            <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Attendance</h1>
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
              <button 
                onClick={() => setActiveTab('daily')}
                style={{ 
                  padding: '8px 4px', fontSize: '15px', fontWeight: activeTab === 'daily' ? 700 : 500,
                  color: activeTab === 'daily' ? 'var(--accent-blue)' : 'var(--text-muted)',
                  border: 'none', borderBottom: activeTab === 'daily' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  background: 'none', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Daily Entry
              </button>
              <button 
                onClick={() => setActiveTab('monthly')}
                style={{ 
                  padding: '8px 4px', fontSize: '15px', fontWeight: activeTab === 'monthly' ? 700 : 500,
                  color: activeTab === 'monthly' ? 'var(--accent-blue)' : 'var(--text-muted)',
                  border: 'none', borderBottom: activeTab === 'monthly' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  background: 'none', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Monthly Summary
              </button>
            </div>
          </div>

          <div style={{ paddingBottom: '8px' }}>
            {activeTab === 'daily' ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-medium)' }}>
                  <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--text-primary)' }}
                  />
                </div>
                <button className="btn-primary" onClick={saveAttendance} disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select className="input" style={{ width: '140px' }} value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                  {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" className="input" style={{ width: '90px' }} value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} />
              </div>
            )}
          </div>
        </div>

        {activeTab === 'daily' ? (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-display)', margin: 0 }}>Active Staff</h3>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '4px 0 0 0' }}>Late = checked in after 8:15 AM or 2:15 PM</p>
              </div>
              <button
                onClick={() => markAll('present')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', border: '1px solid #1e8e3e',
                  color: '#1e8e3e', padding: '6px 14px', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600
                }}
              >
                <CheckCircle size={14} /> Mark All Present
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}><div className="loader"></div></div>
            ) : staff.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No active staff found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {staff.map(s => {
                  const att = attendance[s.id] || { status: 'present', leave_type: '', note: '' }
                  return (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '16px', border: '1px solid var(--border-light)',
                      borderRadius: '8px', background: 'var(--bg-subtle)', flexWrap: 'wrap'
                    }}>
                      <div style={{ flex: '1 1 180px' }}>
                        <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{s.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.designation}</p>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {statusOptions.map(st => {
                          const isSelected = att.status === st.val
                          return (
                            <button
                              key={st.val}
                              onClick={() => updateRow(s.id, 'status', st.val)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                border: '1px solid ' + (isSelected ? st.color : 'var(--border-medium)'),
                                background: isSelected ? st.bg : 'var(--bg-surface)',
                                color: isSelected ? st.color : 'var(--text-muted)',
                                fontWeight: isSelected ? 600 : 400,
                                cursor: 'pointer',
                                fontSize: '12px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {st.label}
                            </button>
                          )
                        })}
                      </div>

                      {['absent', 'half_day'].includes(att.status) && (
                        <select
                          className="input"
                          style={{ width: '150px' }}
                          value={att.leave_type}
                          onChange={e => updateRow(s.id, 'leave_type', e.target.value)}
                        >
                          <option value="">Leave Type...</option>
                          <option value="sick">Sick Leave</option>
                          <option value="casual">Casual Leave</option>
                          <option value="annual">Annual Leave</option>
                          <option value="unpaid">Unpaid Leave</option>
                        </select>
                      )}

                      <input
                        className="input"
                        style={{ flex: '1 1 150px' }}
                        placeholder="Note..."
                        value={att.note}
                        onChange={e => updateRow(s.id, 'note', e.target.value)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Monthly Summary View */
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}><div className="loader"></div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Source</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No monthly summary records found for this period.</td>
                      </tr>
                    ) : monthlySummary.map(row => (
                      <tr key={row.id}>
                        <td>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.staff?.name}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.staff?.designation}</p>
                        </td>
                        <td>
                          {editingRow?.id === row.id ? (
                            <input type="number" className="input" style={{ width: '60px' }} value={editingRow.present_days} onChange={e => setEditingRow({ ...editingRow, present_days: e.target.value })} />
                          ) : (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{row.present_days} days</span>
                          )}
                        </td>
                        <td>
                          {editingRow?.id === row.id ? (
                            <input type="number" className="input" style={{ width: '60px' }} value={editingRow.absent_days} onChange={e => setEditingRow({ ...editingRow, absent_days: e.target.value })} />
                          ) : (
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{row.absent_days} days</span>
                          )}
                        </td>
                        <td>
                          {editingRow?.id === row.id ? (
                            <input type="number" className="input" style={{ width: '60px' }} value={editingRow.late_days} onChange={e => setEditingRow({ ...editingRow, late_days: e.target.value })} />
                          ) : (
                            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{row.late_days} days</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${row.source === 'rysenova' ? 'badge-blue' : 'badge-gray'}`}>
                            {row.source === 'rysenova' ? 'Rysenova' : 'Manual'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {editingRow?.id === row.id ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingRow(null)}>Cancel</button>
                              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={saveMonthlyEdit} disabled={saving}>Save</button>
                            </div>
                          ) : (
                            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingRow(row)}>Edit</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}