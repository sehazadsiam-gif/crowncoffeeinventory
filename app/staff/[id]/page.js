'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { useParams } from 'next/navigation'
import { User, Wallet, CalendarDays, Receipt, Clock, MessageSquare, Plus } from 'lucide-react'

export default function StaffProfile() {
  const { id } = useParams()
  const { addToast } = useToast()
  const [staff, setStaff] = useState(null)
  const [leave, setLeave] = useState(null)
  const [advances, setAdvances] = useState([])
  const [notes, setNotes] = useState([])
  const [payroll, setPayroll] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState({ text: '', type: 'general' })

  useEffect(() => {
    if (id) fetchProfileData()
  }, [id])

  async function fetchProfileData() {
    try {
      setLoading(true)
      const currentYear = new Date().getFullYear()

      const [staffRes, leaveRes, advRes, notesRes, payRes, attRes] = await Promise.all([
        supabase.from('staff').select('*').eq('id', id).single(),
        supabase.from('leave_balance').select('*').eq('staff_id', id).eq('year', currentYear).single(),
        supabase.from('advance_log').select('*').eq('staff_id', id).order('created_at', { ascending: false }).limit(10),
        supabase.from('staff_notes').select('*').eq('staff_id', id).order('created_at', { ascending: false }),
        supabase.from('payroll_entries').select('*').eq('staff_id', id).order('year', { ascending: false }).order('month', { ascending: false }).limit(6),
        supabase.from('attendance').select('*').eq('staff_id', id).order('date', { ascending: false }).limit(30)
      ])

      if (staffRes.error) throw staffRes.error
      setStaff(staffRes.data)
      setLeave(leaveRes.data)
      setAdvances(advRes.data || [])
      setNotes(notesRes.data || [])
      setPayroll(payRes.data?.reverse() || [])
      setAttendance(attRes.data || [])
    } catch (err) {
      addToast('Error loading profile data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddNote() {
    if (!newNote.text) return
    try {
      const { error } = await supabase.from('staff_notes').insert([{
        staff_id: id,
        note: newNote.text,
        note_type: newNote.type
      }])
      if (error) throw error
      setNewNote({ text: '', type: 'general' })
      fetchProfileData()
      addToast('Note added', 'success')
    } catch (err) {
      addToast('Error adding note', 'error')
    }
  }

  if (loading) return (
    <div><Navbar /><div style={{ padding: '100px', textAlign: 'center' }}><div className="loader"></div></div></div>
  )
  if (!staff) return (
    <div><Navbar /><div style={{ padding: '100px', textAlign: 'center' }}>Staff not found</div></div>
  )

  const currentMonthAdvances = advances
    .filter(a => a.month === new Date().getMonth() + 1 && a.year === new Date().getFullYear())
    .reduce((s, a) => s + a.amount, 0)

  const maxPayroll = Math.max(...payroll.map(p => p.final_salary), 1)

  return (
    <div>
      <Navbar />
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>

        <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'var(--accent-brown)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <User size={40} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '32px', margin: 0, fontFamily: 'var(--font-display)' }}>{staff.name}</h1>
              <span style={{
                fontSize: '12px', padding: '4px 10px', borderRadius: '20px',
                background: staff.is_active ? '#e6f4ea' : '#fce8e6',
                color: staff.is_active ? '#1e8e3e' : '#d93025',
                fontWeight: 600
              }}>
                {staff.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p style={{
              fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px'
            }}>
              {staff.designation} &bull; {staff.contract_type?.replace('_', ' ')}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Joined: {staff.join_date ? new Date(staff.join_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Wallet size={18} color="var(--accent-gold)" /> Salary Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Base Salary', value: '৳' + staff.base_salary?.toLocaleString(), highlight: true },
                  { label: 'Per Day Rate', value: '৳' + Math.round(staff.per_day_rate || staff.base_salary / 30) },
                  { label: 'Per Hour Rate', value: '৳' + Math.round(staff.per_hour_rate || staff.base_salary / 30 / 8) },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    <span style={{ fontWeight: item.highlight ? 700 : 600, color: item.highlight ? 'var(--accent-brown)' : 'var(--text-primary)', fontSize: item.highlight ? '16px' : '14px' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <CalendarDays size={18} color="var(--accent-brown)" /> Leave Balance ({new Date().getFullYear()})
              </h3>
              {leave ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { label: 'Sick Leave', used: leave.sick_used, total: leave.sick_total },
                    { label: 'Casual Leave', used: leave.casual_used, total: leave.casual_total },
                    { label: 'Annual Leave', used: leave.annual_used, total: leave.annual_total }
                  ].map(l => {
                    const pct = Math.min(100, (l.used / l.total) * 100)
                    return (
                      <div key={l.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{l.label}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.used} / {l.total} used</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--accent-brown)', width: pct + '%', transition: 'width 0.3s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No leave records found for current year.</p>
              )}
            </div>

            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Clock size={18} color="var(--text-secondary)" /> Recent Attendance (Last 30 Days)
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {attendance.map(a => {
                  let color = '#1e8e3e'
                  if (a.status === 'absent') color = '#d93025'
                  else if (a.status === 'half_day') color = '#fbbc04'
                  else if (a.status === 'late') color = '#fa7b17'
                  return (
                    <div
                      key={a.id}
                      title={a.date + ': ' + a.status}
                      style={{ width: '16px', height: '16px', borderRadius: '50%', background: color }}
                    />
                  )
                })}
                {attendance.length === 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No attendance records found.</p>
                )}
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                {[
                  { color: '#1e8e3e', label: 'Present' },
                  { color: '#d93025', label: 'Absent' },
                  { color: '#fbbc04', label: 'Half Day' },
                  { color: '#fa7b17', label: 'Late' },
                ].map(item => (
                  <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, display: 'inline-block' }}></span>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <Receipt size={18} color="#2e7d32" /> Payroll History (Last 6 Months)
              </h3>
              {payroll.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No payroll history.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '150px', paddingBottom: '20px' }}>
                  {payroll.map(p => {
                    const heightPct = Math.max(10, (p.final_salary / maxPayroll) * 100) + '%'
                    const monthName = new Date(p.year, p.month - 1).toLocaleString('default', { month: 'short' })
                    const barColor = p.is_paid ? 'var(--accent-brown)' : 'var(--border-medium)'
                    return (
                      <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', height: '100%' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          ৳{(p.final_salary / 1000).toFixed(1)}k
                        </span>
                        <div style={{
                          width: '100%', maxWidth: '30px',
                          background: barColor,
                          height: heightPct,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s'
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>{monthName}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Wallet size={18} color="#d93025" /> Advance History
              </h3>
              <div style={{ padding: '12px', background: '#fce8e6', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#d93025', fontWeight: 600 }}>This Month Total</span>
                <span style={{ fontSize: '16px', color: '#d93025', fontWeight: 700 }}>৳{currentMonthAdvances.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {advances.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-light)', fontSize: '13px' }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{new Date(a.date).toLocaleDateString()}</span>
                      <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{a.reason || 'No reason provided'}</p>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-brown)' }}>৳{a.amount.toLocaleString()}</span>
                  </div>
                ))}
                {advances.length === 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No advances logged.</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <MessageSquare size={18} color="var(--text-primary)" /> Notes & Remarks
              </h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <select className="input" style={{ width: 'auto' }} value={newNote.type} onChange={e => setNewNote({ ...newNote, type: e.target.value })}>
                  <option value="general">General</option>
                  <option value="warning">Warning</option>
                  <option value="performance">Performance</option>
                  <option value="commendation">Commendation</option>
                </select>
                <input
                  className="input"
                  placeholder="Add a note..."
                  value={newNote.text}
                  onChange={e => setNewNote({ ...newNote, text: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                />
                <button className="btn-primary" onClick={handleAddNote} style={{ padding: '10px 14px' }}>
                  <Plus size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notes.map(n => {
                  let noteBg = 'var(--bg-subtle)'
                  let noteBorder = 'var(--border-medium)'
                  if (n.note_type === 'warning') { noteBg = '#fce8e6'; noteBorder = '#d93025' }
                  else if (n.note_type === 'commendation') { noteBg = '#e6f4ea'; noteBorder = '#1e8e3e' }
                  else if (n.note_type === 'performance') { noteBg = '#fef7e0'; noteBorder = '#fbbc04' }
                  return (
                    <div key={n.id} style={{
                      padding: '12px',
                      background: noteBg,
                      borderLeft: '4px solid ' + noteBorder,
                      borderRadius: '4px'
                    }}>
                      <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{n.note}</p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  )
                })}
                {notes.length === 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No notes added yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}