'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Coffee, LogOut, User, Wallet, Calendar, MessageSquare, Clock } from 'lucide-react'

export default function StaffPortalPage() {
  const router = useRouter()
  const [staff, setStaff] = useState(null)
  const [payroll, setPayroll] = useState([])
  const [payments, setPayments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [advances, setAdvances] = useState([])
  const [notes, setNotes] = useState([])
  const [leave, setLeave] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    const staffId = localStorage.getItem('cc_staff_id')

    if (!token || role !== 'staff' || !staffId) {
      router.replace('/staff/login')
      return
    }
    fetchStaffData(staffId)
  }, [router])

  async function fetchStaffData(staffId) {
    try {
      setLoading(true)
      const currentYear = new Date().getFullYear()

      const [staffRes, payRes, paymentRes, attRes, advRes, notesRes, leaveRes] = await Promise.all([
        supabase.from('staff').select('*').eq('id', staffId).single(),
        supabase.from('payroll_entries').select('*').eq('staff_id', staffId).order('year', { ascending: false }).order('month', { ascending: false }).limit(12),
        supabase.from('salary_payments').select('*').eq('staff_id', staffId).order('payment_date', { ascending: false }),
        supabase.from('attendance').select('*').eq('staff_id', staffId).order('date', { ascending: false }).limit(60),
        supabase.from('advance_log').select('*').eq('staff_id', staffId).order('date', { ascending: false }),
        supabase.from('staff_notes').select('*').eq('staff_id', staffId).order('created_at', { ascending: false }),
        supabase.from('leave_balance').select('*').eq('staff_id', staffId).eq('year', currentYear).single()
      ])

      setStaff(staffRes.data)
      setPayroll(payRes.data || [])
      setPayments(paymentRes.data || [])
      setAttendance(attRes.data || [])
      setAdvances(advRes.data || [])
      setNotes(notesRes.data || [])
      setLeave(leaveRes.data)
    } catch (err) {
      console.error('Error fetching staff data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    const token = localStorage.getItem('cc_token')
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    localStorage.removeItem('cc_token')
    localStorage.removeItem('cc_role')
    localStorage.removeItem('cc_staff_id')
    localStorage.removeItem('cc_staff_name')
    router.replace('/')
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const totalEarned = payroll.reduce((s, p) => s + Number(p.final_salary || 0), 0)
  const totalReceived = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalAdvance = advances.reduce((s, a) => s + Number(a.amount || 0), 0)

  const presentDays = attendance.filter(a => a.status === 'present').length
  const absentDays = attendance.filter(a => a.status === 'absent').length
  const lateDays = attendance.filter(a => a.status === 'late').length

  const tabs = ['overview', 'salary', 'attendance', 'advances', 'remarks']

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div className="loader"></div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, sans-serif' }}>

      <nav style={{ background: 'white', borderBottom: '1px solid #E8E0D4', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#8B5E3C', padding: '6px', borderRadius: '8px' }}>
            <Coffee size={18} color="white" />
          </div>
          <span style={{ fontWeight: 700, color: '#1C1410', fontSize: '16px' }}>Crown Coffee</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1C1410', margin: 0 }}>{staff?.name}</p>
            <p style={{ fontSize: '11px', color: '#9C8A76', margin: 0 }}>{staff?.designation}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: '#fce8e6', border: 'none', borderRadius: '6px', color: '#d93025', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px 60px' }}>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                borderRadius: '20px', border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: activeTab === t ? '#8B5E3C' : 'white',
                color: activeTab === t ? 'white' : '#9C8A76',
                boxShadow: '0 1px 4px rgba(28,20,16,0.06)',
                textTransform: 'capitalize'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Base Salary', value: '৳' + Number(staff?.base_salary || 0).toLocaleString(), color: '#8B5E3C' },
                { label: 'Total Earned', value: '৳' + totalEarned.toLocaleString(), color: '#1e8e3e' },
                { label: 'Total Received', value: '৳' + totalReceived.toLocaleString(), color: '#1e8e3e' },
                { label: 'Total Advance', value: '৳' + totalAdvance.toLocaleString(), color: '#d93025' },
              ].map(card => (
                <div key={card.label} style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
                  <p style={{ fontSize: '11px', color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '6px' }}>{card.label}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: card.color }}>{card.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Present Days', value: presentDays, color: '#1e8e3e' },
                { label: 'Absent Days', value: absentDays, color: '#d93025' },
                { label: 'Late Days', value: lateDays, color: '#B07830' },
              ].map(card => (
                <div key={card.label} style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
                  <p style={{ fontSize: '11px', color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '6px' }}>{card.label}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: card.color }}>{card.value}</p>
                </div>
              ))}
            </div>

            {leave && (
              <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1C1410', marginBottom: '16px' }}>Leave Balance {new Date().getFullYear()}</h3>
                {[
                  { label: 'Sick Leave', used: leave.sick_used, total: leave.sick_total },
                  { label: 'Casual Leave', used: leave.casual_used, total: leave.casual_total },
                  { label: 'Annual Leave', used: leave.annual_used, total: leave.annual_total },
                ].map(l => (
                  <div key={l.label} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: '#5C4A36' }}>{l.label}</span>
                      <span style={{ fontWeight: 600, color: '#1C1410' }}>{l.used} / {l.total} used</span>
                    </div>
                    <div style={{ height: '6px', background: '#F5F0E8', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#8B5E3C', width: Math.min(100, (l.used / l.total) * 100) + '%', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'salary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {payroll.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9C8A76' }}>
                No salary records found.
              </div>
            ) : payroll.map(p => {
              const monthPayments = payments.filter(pay => {
                const d = new Date(pay.payment_date)
                return d.getMonth() + 1 === p.month && d.getFullYear() === p.year
              })
              const totalPaid = monthPayments.reduce((s, pay) => s + Number(pay.amount), 0)
              const remaining = Number(p.final_salary) - totalPaid

              return (
                <div key={p.id} style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1C1410', margin: 0 }}>
                        {months[p.month - 1]} {p.year}
                      </h3>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: p.is_paid ? '#e6f4ea' : '#fce8e6', color: p.is_paid ? '#1e8e3e' : '#d93025', fontWeight: 600, marginTop: '4px', display: 'inline-block' }}>
                        {p.is_paid ? 'Fully Paid' : 'Pending'}
                      </span>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: 800, color: '#8B5E3C', margin: 0 }}>
                      ৳{Number(p.final_salary).toLocaleString()}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', fontSize: '12px', marginBottom: '16px' }}>
                    {[
                      { label: 'Base', value: staff?.base_salary },
                      { label: 'Overtime', value: p.overtime_pay, positive: true },
                      { label: 'Service Charge', value: p.service_charge, positive: true },
                      { label: 'Bonus', value: p.bonus, positive: true },
                      { label: 'Lunch + Dinner', value: p.lunch_dinner, positive: true },
                      { label: 'Morning Food', value: p.morning_food, positive: true },
                      { label: 'Advance', value: p.advance_taken, negative: true },
                      { label: 'Others', value: p.others_taken, negative: true },
                      { label: 'Miscellaneous', value: p.miscellaneous },
                    ].filter(item => Number(item.value) !== 0).map(item => (
                      <div key={item.label} style={{ background: '#F5F0E8', borderRadius: '6px', padding: '8px' }}>
                        <p style={{ fontSize: '10px', color: '#9C8A76', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: item.negative ? '#d93025' : item.positive ? '#1e8e3e' : '#1C1410', margin: 0 }}>
                          {item.negative ? '-' : item.positive ? '+' : ''}৳{Math.abs(Number(item.value || 0)).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid #F0EBE3', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: '#9C8A76' }}>Amount received</span>
                      <span style={{ color: '#1e8e3e', fontWeight: 700 }}>৳{totalPaid.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#9C8A76' }}>Remaining</span>
                      <span style={{ color: remaining > 0 ? '#d93025' : '#1e8e3e', fontWeight: 700 }}>৳{remaining.toLocaleString()}</span>
                    </div>

                    {monthPayments.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <p style={{ fontSize: '11px', color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '6px' }}>Payment History</p>
                        {monthPayments.map(pay => (
                          <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #F5F0E8' }}>
                            <span style={{ color: '#9C8A76' }}>
                              {new Date(pay.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {pay.notes ? ' · ' + pay.notes : ''}
                            </span>
                            <span style={{ color: '#1e8e3e', fontWeight: 700 }}>৳{Number(pay.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {attendance.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9C8A76' }}>No attendance records found.</div>
            ) : attendance.map(a => {
              const statusColors = { present: '#1e8e3e', absent: '#d93025', half_day: '#B07830', late: '#fa7b17' }
              const color = statusColors[a.status] || '#9C8A76'
              return (
                <div key={a.id} style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1C1410', margin: 0 }}>
                      {new Date(a.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {a.note && <p style={{ fontSize: '12px', color: '#9C8A76', margin: '2px 0 0 0' }}>{a.note}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: color + '18', color, textTransform: 'capitalize' }}>
                      {a.status?.replace('_', ' ')}
                    </span>
                    {a.leave_type && (
                      <p style={{ fontSize: '11px', color: '#9C8A76', margin: '4px 0 0 0', textTransform: 'capitalize' }}>{a.leave_type} leave</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'advances' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ background: '#fce8e6', border: '1px solid #f0c0c0', borderRadius: '10px', padding: '16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#d93025', fontWeight: 600 }}>Total Advances Taken</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#d93025' }}>৳{totalAdvance.toLocaleString()}</span>
            </div>
            {advances.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9C8A76' }}>No advance records found.</div>
            ) : advances.map(a => (
              <div key={a.id} style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1C1410', margin: 0 }}>
                    {new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p style={{ fontSize: '12px', color: '#9C8A76', margin: '2px 0 0 0' }}>{a.reason || 'No reason provided'}</p>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#d93025' }}>৳{Number(a.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'remarks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notes.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9C8A76' }}>No remarks found.</div>
            ) : notes.map(n => {
              let bg = '#F5F0E8'; let border = '#D4C8B8'; let color = '#5C4A36'
              if (n.note_type === 'warning') { bg = '#fce8e6'; border = '#d93025'; color = '#d93025' }
              else if (n.note_type === 'commendation') { bg = '#e6f4ea'; border = '#1e8e3e'; color = '#1e8e3e' }
              else if (n.note_type === 'performance') { bg = '#fef7e0'; border = '#B07830'; color = '#B07830' }
              return (
                <div key={n.id} style={{ background: bg, borderLeft: '4px solid ' + border, borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color, textTransform: 'capitalize', letterSpacing: '0.05em' }}>{n.note_type}</span>
                    <span style={{ fontSize: '11px', color: '#9C8A76' }}>{new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#1C1410', margin: 0 }}>{n.note}</p>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
