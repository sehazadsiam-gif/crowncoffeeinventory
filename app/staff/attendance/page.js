'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Calendar, Save, CheckCircle } from 'lucide-react'

export default function AttendancePage() {
  const { addToast } = useToast()
  const [staff, setStaff] = useState([])
  const [attendance, setAttendance] = useState({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchStaffAndAttendance() }, [date])

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
        ; (attRes.data || []).forEach(a => {
          attMap[a.staff_id] = { status: a.status, leave_type: a.leave_type || '', note: a.note || '' }
        })

      const newAtt = { ...attMap }
        ; (staffRes.data || []).forEach(s => {
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

  return (
    <div>
      <Navbar />
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Attendance</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Daily attendance tracking</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-medium)' }}>
              <Calendar size={18} style={{ color: 'var(--accent-brown)' }} />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--text-primary)' }}
              />
            </div>
            <button
              className="btn-primary"
              onClick={saveAttendance}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-display)' }}>Active Staff</h3>
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
      </main>
    </div>
  )
}