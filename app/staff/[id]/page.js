'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { useParams, useRouter } from 'next/navigation'
import { User, Wallet, CalendarDays, Receipt, Clock, MessageSquare, Plus, Download } from 'lucide-react'

export default function StaffProfile() {
  const router = useRouter()
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
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
    if (id) fetchProfileData()
  }, [id, router])

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

      // Email Notification
      const { data: staffData } = await supabase
        .from('staff')
        .select('email, name')
        .eq('id', id)
        .single()

      if (staffData?.email) {
        try {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'remark',
              to: staffData.email,
              name: staffData.name,
              note_type: newNote.type,
              note: newNote.text,
              date: new Date().toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
              })
            })
          })
        } catch (emailErr) {
          console.error('Email send failed:', emailErr)
        }
      }

      setNewNote({ text: '', type: 'general' })
      fetchProfileData()
      addToast('Note added', 'success')
    } catch (err) {
      addToast('Error adding note', 'error')
    }
  }

  function downloadProfilePDF() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${staff.name} - Staff Profile</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Georgia, serif; color: #1C1410; padding: 40px; background: white; }
          .header { text-align: center; border-bottom: 2px solid #8B5E3C; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 28px; color: #8B5E3C; letter-spacing: 2px; text-transform: uppercase; }
          .header h2 { font-size: 20px; font-weight: normal; margin-top: 6px; color: #1C1410; }
          .header p { font-size: 13px; color: #9C8A76; margin-top: 4px; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #8B5E3C; border-bottom: 1px solid #E8E0D4; padding-bottom: 6px; margin-bottom: 12px; }
          .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #F5F0E8; font-size: 14px; }
          .label { color: #9C8A76; }
          .value { font-weight: 600; color: #1C1410; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          th { text-align: left; padding: 8px 10px; background: #F5F0E8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #9C8A76; font-weight: 600; }
          td { padding: 9px 10px; border-bottom: 1px solid #E8E0D4; color: #5C4A36; }
          .paid { color: #3A7D5C; font-weight: 600; }
          .unpaid { color: #A63C3C; font-weight: 600; }
          .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #9C8A76; border-top: 1px dotted #E8E0D4; padding-top: 16px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Crown Coffee</h1>
          <h2>Staff Profile — ${staff.name}</h2>
          <p>Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div class="section">
          <div class="section-title">Personal Information</div>
          <div class="row"><span class="label">Full Name</span><span class="value">${staff.name}</span></div>
          <div class="row"><span class="label">Designation</span><span class="value">${staff.designation}</span></div>
          <div class="row"><span class="label">Contract Type</span><span class="value">${staff.contract_type?.replace('_', ' ')}</span></div>
          <div class="row"><span class="label">Join Date</span><span class="value">${staff.join_date ? new Date(staff.join_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span></div>
          <div class="row"><span class="label">Status</span><span class="value">${staff.is_active ? 'Active' : 'Inactive'}</span></div>
          ${staff.emergency_contact ? '<div class="row"><span class="label">Emergency Contact</span><span class="value">' + staff.emergency_contact + '</span></div>' : ''}
          ${staff.emergency_phone ? '<div class="row"><span class="label">Emergency Phone</span><span class="value">' + staff.emergency_phone + '</span></div>' : ''}
          ${staff.notes ? '<div class="row"><span class="label">Notes</span><span class="value">' + staff.notes + '</span></div>' : ''}
        </div>

        <div class="section">
          <div class="section-title">Salary Information</div>
          <div class="row"><span class="label">Base Salary</span><span class="value">৳${Number(staff.base_salary).toLocaleString()}</span></div>
          <div class="row"><span class="label">Per Day Rate (Base / 30)</span><span class="value">৳${Math.round(staff.base_salary / 30).toLocaleString()}</span></div>
          <div class="row"><span class="label">Per Hour Rate (Base / 30 / 10)</span><span class="value">৳${Math.floor(Math.floor(staff.base_salary / 30) / 10).toLocaleString()}</span></div>
        </div>

        ${leave ? `
        <div class="section">
          <div class="section-title">Leave Balance (${new Date().getFullYear()})</div>
          <div class="row"><span class="label">Sick Leave</span><span class="value">${leave.sick_used} used / ${leave.sick_total} total</span></div>
          <div class="row"><span class="label">Casual Leave</span><span class="value">${leave.casual_used} used / ${leave.casual_total} total</span></div>
          <div class="row"><span class="label">Annual Leave</span><span class="value">${leave.annual_used} used / ${leave.annual_total} total</span></div>
        </div>
        ` : ''}

        ${advances.length > 0 ? `
        <div class="section">
          <div class="section-title">Advance History</div>
          <table>
            <thead>
              <tr><th>Date</th><th>Month</th><th>Amount</th><th>Reason</th></tr>
            </thead>
            <tbody>
              ${advances.map(a => `
                <tr>
                  <td>${new Date(a.date).toLocaleDateString('en-GB')}</td>
                  <td>${monthNames[(a.month || 1) - 1]} ${a.year || ''}</td>
                  <td>৳${Number(a.amount).toLocaleString()}</td>
                  <td>${a.reason || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${payroll.length > 0 ? `
        <div class="section">
          <div class="section-title">Payroll History</div>
          <table>
            <thead>
              <tr><th>Month</th><th>Base</th><th>OT Pay</th><th>Bonus</th><th>Advance</th><th>Final</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${payroll.map(p => `
                <tr>
                  <td>${monthNames[p.month - 1]} ${p.year}</td>
                  <td>৳${Number(staff.base_salary).toLocaleString()}</td>
                  <td>৳${Number(p.overtime_pay || 0).toLocaleString()}</td>
                  <td>৳${Number(p.bonus || 0).toLocaleString()}</td>
                  <td>৳${Number(p.advance_taken || 0).toLocaleString()}</td>
                  <td>৳${Number(p.final_salary).toLocaleString()}</td>
                  <td class="${p.is_paid ? 'paid' : 'unpaid'}">${p.is_paid ? 'Paid' : 'Unpaid'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${notes.length > 0 ? `
        <div class="section">
          <div class="section-title">Notes and Remarks</div>
          <table>
            <thead>
              <tr><th>Date</th><th>Type</th><th>Note</th></tr>
            </thead>
            <tbody>
              ${notes.map(n => `
                <tr>
                  <td>${new Date(n.created_at).toLocaleDateString('en-GB')}</td>
                  <td style="text-transform:capitalize">${n.note_type}</td>
                  <td>${n.note}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          Crown Coffee Inventory and Stock Management &bull; ${staff.name} &bull; Generated ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 500)
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
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <User size={40} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
          <button
            onClick={downloadProfilePDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'var(--accent-brown)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Download size={15} /> Download PDF
          </button>
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
                  { label: 'Per Day Rate (Base / 30)', value: '৳' + Math.round(staff.base_salary / 30) },
                  { label: 'Per Hour Rate (Base / 30 / 10)', value: '৳' + Math.floor(Math.floor(staff.base_salary / 30) / 10) },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{item.label}</span>
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