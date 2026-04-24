'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Coffee, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const [summary, setSummary] = useState(null)

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
      const [staffRes, payRes, paymentRes, attRes, advRes, notesRes, leaveRes, summaryRes] = await Promise.all([
        supabase.from('staff').select('*').eq('id', staffId).single(),
        supabase.from('payroll_entries').select('*').eq('staff_id', staffId).order('year', { ascending: false }).order('month', { ascending: false }).limit(24),
        supabase.from('salary_payments').select('*').eq('staff_id', staffId).order('payment_date', { ascending: false }),
        supabase.from('attendance').select('*').eq('staff_id', staffId).order('date', { ascending: false }).limit(365),
        supabase.from('advance_log').select('*').eq('staff_id', staffId).order('date', { ascending: false }),
        supabase.from('staff_notes').select('*').eq('staff_id', staffId).order('created_at', { ascending: false }),
        supabase.from('leave_balance').select('*').eq('staff_id', staffId).eq('year', currentYear).single(),
        supabase.from('monthly_attendance_summary').select('*').eq('staff_id', staffId)
      ])
      setStaff(staffRes.data)
      setPayroll(payRes.data || [])
      setPayments(paymentRes.data || [])
      setAttendance(attRes.data || [])
      setAdvances(advRes.data || [])
      setNotes(notesRes.data || [])
      setLeave(leaveRes.data)
      setSummary(summaryRes.data || [])
    } catch (err) {
      console.error('Error fetching staff data:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('cc_token')
    localStorage.removeItem('cc_role')
    localStorage.removeItem('cc_staff_id')
    localStorage.removeItem('cc_staff_name')
    router.replace('/')
  }

  function prevMonth() {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  function nextMonth() {
    const now = new Date()
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1) return
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const monthPayroll = payroll.find(p => p.month === selectedMonth && p.year === selectedYear)
  const monthSummary = (summary || []).find(s => s.month === selectedMonth && s.year === selectedYear)

  const monthPayments = payments.filter(p =>
    Number(p.month) === selectedMonth && Number(p.year) === selectedYear
  )
  const monthAttendance = attendance.filter(a => {
    const d = new Date(a.date)
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
  })
  const monthAdvances = advances.filter(a => a.month === selectedMonth && a.year === selectedYear)

  const totalPaidThisMonth = monthPayments.reduce((s, p) => s + Number(p.amount), 0)
  const monthAdvanceTotal = monthAdvances.reduce((s, a) => s + Number(a.amount), 0)

  const presentDays = monthSummary ? monthSummary.present_days : monthAttendance.filter(a => a.status === 'present').length
  const absentDays = monthSummary ? monthSummary.absent_days : monthAttendance.filter(a => a.status === 'absent').length
  const lateDays = monthSummary ? monthSummary.late_days : monthAttendance.filter(a => a.status === 'late').length
  const halfDays = monthAttendance.filter(a => a.status === 'half_day').length

  const lateDeductionDays = Math.floor(lateDays / 3)
  const perDay = Math.round(Number(staff?.base_salary || 0) / 30)
  const lateDeduction = lateDeductionDays * perDay

  // Final salary calculation
  const base = Number(staff?.base_salary || 0)
  const perHourRate = Math.floor(Math.floor(base / 30) / 10)
  const ot = (Number(monthPayroll?.overtime_hours) || 0) * perHourRate
  const sc = Number(monthPayroll?.service_charge || 0)
  const bonus = Number(monthPayroll?.bonus || 0)
  const lunch = Number(monthPayroll?.lunch_dinner || 0)
  const morn = Number(monthPayroll?.morning_food || 0)
  const misc = Number(monthPayroll?.miscellaneous || 0)
  const adv = Number(monthPayroll?.advance_taken || 0)
  const others = Number(monthPayroll?.others_taken || 0)

  const autoUnpaidDays = Math.max(0, absentDays - 4)
  const waivedDays = Number(monthPayroll?.waived_unpaid_days) || 0
  const calculatedUnpaidDays = Math.max(0, autoUnpaidDays - waivedDays)

  const unpaidDeductionDays = monthPayroll?.manual_unpaid_days !== null
    && monthPayroll?.manual_unpaid_days !== undefined
    ? Number(monthPayroll.manual_unpaid_days)
    : calculatedUnpaidDays
  const unpaidDeductionAmount = unpaidDeductionDays * perDay

  const finalSalary = monthPayroll ? Math.round(
    base + ot + sc + bonus + lunch + morn + misc - adv - others - unpaidDeductionAmount - lateDeduction
  ) : 0

  const remaining = finalSalary - totalPaidThisMonth
  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()
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

        {/* Month Selector */}
        <div style={{ background: '#6B3A2A', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'white' }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '22px', fontWeight: 800, color: 'white', margin: 0 }}>
              {monthNames[selectedMonth - 1]} {selectedYear}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                {isCurrentMonth ? 'Current Month' : 'Past Month'}
              </p>
              {monthSummary?.source === 'rysenova' && (
                <span style={{ fontSize: '10px', background: '#10B981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  Data from Rysenova
                </span>
              )}
            </div>
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            style={{ background: isCurrentMonth ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '8px', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', color: isCurrentMonth ? 'rgba(255,255,255,0.3)' : 'white' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Monthly Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Final Salary', value: '৳' + finalSalary.toLocaleString(), color: '#8B5E3C' },
            { label: 'Received', value: '৳' + totalPaidThisMonth.toLocaleString(), color: '#1e8e3e' },
            { label: 'Remaining', value: '৳' + remaining.toLocaleString(), color: remaining > 0 ? '#d93025' : '#1e8e3e' },
            { label: 'Advance', value: '৳' + monthAdvanceTotal.toLocaleString(), color: '#d93025' },
            { label: 'Present', value: presentDays + ' days', color: '#1e8e3e' },
            { label: 'Absent Days', value: absentDays, color: '#d93025' },
            { label: 'Free Days (4)', value: Math.min(4, absentDays), color: '#1e8e3e' },
            { label: 'Waived Days', value: waivedDays, color: '#1e8e3e', hide: waivedDays === 0 },
            { label: 'Unpaid Days', value: unpaidDeductionDays, color: '#d93025' },
          ].filter(c => !c.hide).map(card => (
            <div key={card.label} style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
              <p style={{ fontSize: '10px', color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '6px' }}>{card.label}</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
            </div>
          ))}
          <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
            <p style={{ fontSize: '10px', color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '6px' }}>Late</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#fa7b17', margin: 0 }}>{lateDays} days</p>
            {lateDeductionDays > 0 && (
              <p style={{ fontSize: '11px', color: '#d93025', marginTop: '4px', fontWeight: 600 }}>
                = {lateDeductionDays} unpaid day{lateDeductionDays > 1 ? 's' : ''} (-৳{lateDeduction.toLocaleString()})
              </p>
            )}
          </div>
        </div>

        {/* Salary progress bar */}
        {finalSalary > 0 && (
          <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: '#9C8A76', fontWeight: 600 }}>Salary Payment Progress</span>
              <span style={{ color: '#1C1410', fontWeight: 700 }}>
                {Math.round((totalPaidThisMonth / finalSalary) * 100)}%
              </span>
            </div>
            <div style={{ height: '8px', background: '#F5F0E8', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: Math.min(100, finalSalary > 0 ? (totalPaidThisMonth / finalSalary) * 100 : 0) + '%',
                background: remaining <= 0 ? '#1e8e3e' : '#8B5E3C',
                borderRadius: '4px',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#9C8A76' }}>
              <span>Received: ৳{totalPaidThisMonth.toLocaleString()}</span>
              <span>Total: ৳{finalSalary.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {monthPayroll ? (
              <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1C1410', marginBottom: '16px' }}>
                  Salary Breakdown — {monthNames[selectedMonth - 1]} {selectedYear}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  {[
                    { label: 'Base Salary', value: base, neutral: true },
                    { label: 'Overtime', value: ot, positive: true },
                    { label: 'Service Charge', value: sc, positive: true },
                    { label: 'Bonus', value: bonus, positive: true },
                    { label: 'Lunch + Dinner', value: lunch, positive: true },
                    { label: 'Morning Food', value: morn, positive: true },
                    { label: 'Advance', value: adv, negative: true },
                    { label: 'Others', value: others, negative: true },
                    { label: 'Unpaid Deduction', value: unpaidDeductionAmount, negative: true },
                    { label: 'Late Deduction', value: lateDeduction, negative: true },
                    { label: 'Miscellaneous', value: misc },
                  ].filter(item => Number(item.value) !== 0).map(item => (
                    <div key={item.label} style={{ background: '#F5F0E8', borderRadius: '6px', padding: '10px' }}>
                      <p style={{ fontSize: '10px', color: '#9C8A76', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: item.negative ? '#d93025' : item.positive ? '#1e8e3e' : '#1C1410' }}>
                        {item.negative ? '-' : item.positive ? '+' : ''}৳{Math.abs(Number(item.value || 0)).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', padding: '12px 16px', background: '#8B5E3C', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>Final Salary</span>
                  <span style={{ color: 'white', fontWeight: 800, fontSize: '20px' }}>৳{finalSalary.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '32px', textAlign: 'center', color: '#9C8A76' }}>
                No salary record for {monthNames[selectedMonth - 1]} {selectedYear}
              </div>
            )}

            {monthPayments.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1C1410', marginBottom: '12px' }}>
                  Payment Records — {monthNames[selectedMonth - 1]} {selectedYear}
                </h3>
                {monthPayments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F5F0E8', fontSize: '13px' }}>
                    <span style={{ color: '#5C4A36' }}>
                      {new Date(p.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {p.notes ? ' · ' + p.notes : ''}
                    </span>
                    <span style={{ color: '#1e8e3e', fontWeight: 700 }}>৳{Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {leave && (
              <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1C1410', marginBottom: '16px' }}>
                  Leave Balance {selectedYear}
                </h3>
                {[
                  { label: 'Sick Leave', used: leave.sick_used, total: leave.sick_total },
                  { label: 'Casual Leave', used: leave.casual_used, total: leave.casual_total },
                  { label: 'Annual Leave', used: leave.annual_used, total: leave.annual_total },
                ].map(l => (
                  <div key={l.label} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
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

        {/* Salary Tab */}
        {activeTab === 'salary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {payroll.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9C8A76' }}>
                No salary records found.
              </div>
            ) : payroll.map(p => {
              const mPayments = payments.filter(pay =>
                Number(pay.month) === p.month && Number(pay.year) === p.year
              )
              const tPaid = mPayments.reduce((s, pay) => s + Number(pay.amount), 0)

              const pBase = Number(staff?.base_salary || 0)
              const pOt = (Number(p.overtime_hours) || 0) * Math.floor(Math.floor(pBase / 30) / 10)
              const pMisc = Number(p.miscellaneous || 0)
              const pAdv = Number(p.advance_taken || 0)
              const pOthers = Number(p.others_taken || 0)
              const pUnpaid = Number(p.unpaid_leave_deduction || 0)
              const pLateDeduct = p.month === selectedMonth && p.year === selectedYear ? lateDeduction : 0
              const pFinal = Math.round(
                pBase + pOt + Number(p.service_charge || 0) + Number(p.bonus || 0) +
                Number(p.lunch_dinner || 0) + Number(p.morning_food || 0) + pMisc
                - pAdv - pOthers - pUnpaid - pLateDeduct
              )
              const rem = pFinal - tPaid
              const isSelected = p.month === selectedMonth && p.year === selectedYear

              return (
                <div key={p.id} style={{ background: 'white', border: isSelected ? '2px solid #8B5E3C' : '1px solid #E8E0D4', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1C1410', margin: 0 }}>
                        {monthShort[p.month - 1]} {p.year}
                        {isSelected && <span style={{ fontSize: '10px', background: '#8B5E3C', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 600 }}>Selected</span>}
                      </h3>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: rem <= 0 ? '#e6f4ea' : '#fce8e6', color: rem <= 0 ? '#1e8e3e' : '#d93025', fontWeight: 600, marginTop: '4px', display: 'inline-block' }}>
                        {rem <= 0 ? 'Fully Paid' : 'Pending'}
                      </span>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: 800, color: '#8B5E3C', margin: 0 }}>
                      ৳{pFinal.toLocaleString()}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', fontSize: '12px', marginBottom: '16px' }}>
                    {[
                      { label: 'Base', value: pBase },
                      { label: 'Overtime', value: p.overtime_pay, positive: true },
                      { label: 'Service Charge', value: p.service_charge, positive: true },
                      { label: 'Bonus', value: p.bonus, positive: true },
                      { label: 'Lunch + Dinner', value: p.lunch_dinner, positive: true },
                      { label: 'Morning Food', value: p.morning_food, positive: true },
                      { label: 'Advance', value: p.advance_taken, negative: true },
                      { label: 'Others', value: p.others_taken, negative: true },
                      { label: 'Unpaid Leave', value: p.unpaid_leave_deduction, negative: true },
                      { label: 'Late Deduction', value: pLateDeduct, negative: true },
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
                      <span style={{ color: '#1e8e3e', fontWeight: 700 }}>৳{tPaid.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#9C8A76' }}>Remaining</span>
                      <span style={{ color: rem > 0 ? '#d93025' : '#1e8e3e', fontWeight: 700 }}>৳{rem.toLocaleString()}</span>
                    </div>
                    {mPayments.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <p style={{ fontSize: '11px', color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '6px' }}>Payment History</p>
                        {mPayments.map(pay => (
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

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
              {[
                { label: 'Present', value: presentDays, color: '#1e8e3e' },
                { label: 'Absent', value: absentDays, color: '#d93025' },
                { label: 'Half Day', value: halfDays, color: '#B07830' },
                { label: 'Late', value: lateDays, color: '#fa7b17' },
              ].map(c => (
                <div key={c.label} style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '22px', fontWeight: 800, color: c.color, margin: 0 }}>{c.value}</p>
                  <p style={{ fontSize: '11px', color: '#9C8A76', margin: '4px 0 0 0' }}>{c.label}</p>
                </div>
              ))}
            </div>
            {monthAttendance.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9C8A76' }}>
                No attendance for {monthNames[selectedMonth - 1]} {selectedYear}
              </div>
            ) : monthAttendance.map(a => {
              const statusColors = { present: '#1e8e3e', absent: '#d93025', half_day: '#B07830', late: '#fa7b17' }
              const color = statusColors[a.status] || '#9C8A76'
              return (
                <div key={a.id} style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1C1410', margin: 0 }}>
                      {new Date(a.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
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

        {/* Advances Tab */}
        {activeTab === 'advances' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ background: '#fce8e6', border: '1px solid #f0c0c0', borderRadius: '10px', padding: '16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#d93025', fontWeight: 600 }}>
                Advances in {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#d93025' }}>৳{monthAdvanceTotal.toLocaleString()}</span>
            </div>
            {monthAdvances.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9C8A76' }}>
                No advances in {monthNames[selectedMonth - 1]} {selectedYear}
              </div>
            ) : monthAdvances.map(a => (
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

        {/* Remarks Tab */}
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