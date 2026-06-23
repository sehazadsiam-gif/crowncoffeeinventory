'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Coffee, LogOut, ChevronLeft, ChevronRight, Printer, Languages, Moon, Sun, Send } from 'lucide-react'
import dynamic from 'next/dynamic'
import { translations } from '../../lib/i18n'

const PaySlip = dynamic(() => import('../../components/PaySlip'), { ssr: false })


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
  const [leaveRequests, setLeaveRequests] = useState([])
  const [newLeave, setNewLeave] = useState({ start_date: '', end_date: '', leave_type: 'sick', reason: '' })
  const [submittingLeave, setSubmittingLeave] = useState(false)
  const [printData, setPrintData] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [queryType, setQueryType] = useState('Requisition')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [lang, setLang] = useState('bn')
  const [darkMode, setDarkMode] = useState(false)

  const t = translations[lang]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      setDarkMode(isDark)
      if (isDark) document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'bn' : 'en')
  }

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
      const [staffRes, payRes, paymentRes, attRes, advRes, notesRes, leaveRes, summaryRes, leaveReqRes, msgRes] = await Promise.all([
        supabase.from('staff').select('*').eq('id', staffId).single(),
        supabase.from('payroll_entries').select('*').eq('staff_id', staffId).order('year', { ascending: false }).order('month', { ascending: false }).limit(24),
        supabase.from('salary_payments').select('*').eq('staff_id', staffId).order('payment_date', { ascending: false }),
        supabase.from('attendance').select('*').eq('staff_id', staffId).order('date', { ascending: false }).limit(365),
        supabase.from('advance_log').select('*').eq('staff_id', staffId).order('date', { ascending: false }),
        supabase.from('staff_notes').select('*').eq('staff_id', staffId).order('created_at', { ascending: false }),
        supabase.from('leave_balance').select('*').eq('staff_id', staffId).eq('year', currentYear).single(),
        supabase.from('monthly_attendance_summary').select('*').eq('staff_id', staffId),
        supabase.from('leave_requests').select('*').eq('staff_id', staffId).order('created_at', { ascending: false }),
        supabase.from('staff_queries').select('*').eq('staff_id', staffId).order('created_at', { ascending: false })
      ])
      setStaff(staffRes.data)
      setPayroll(payRes.data || [])
      setPayments(paymentRes.data || [])
      setAttendance(attRes.data || [])
      setAdvances(advRes.data || [])
      setNotes(notesRes.data || [])
      setLeave(leaveRes.data)
      setSummary(summaryRes.data || [])
      setLeaveRequests(leaveReqRes.data || [])
      setMessages(msgRes.data || [])
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

  async function handleRequestLeave(e) {
    e.preventDefault()
    if (!newLeave.start_date || !newLeave.end_date) {
      alert('Please select start and end dates.')
      return
    }
    try {
      setSubmittingLeave(true)
      const { error } = await supabase.from('leave_requests').insert([{
        staff_id: staff.id,
        start_date: newLeave.start_date,
        end_date: newLeave.end_date,
        leave_type: newLeave.leave_type,
        reason: newLeave.reason,
        status: 'pending'
      }])
      if (error) throw error

      // Notify admin via email
      try {
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'leave_admin_alert',
            staffName: staff.name,
            leaveType: newLeave.leave_type,
            startDate: newLeave.start_date,
            endDate: newLeave.end_date,
            reason: newLeave.reason
          })
        })
      } catch (emailErr) {
        console.error('Admin alert email failed:', emailErr)
      }

      alert('Leave request submitted successfully!')
      setNewLeave({ start_date: '', end_date: '', leave_type: 'sick', reason: '' })
      const { data } = await supabase.from('leave_requests').select('*').eq('staff_id', staff.id).order('created_at', { ascending: false })
      setLeaveRequests(data || [])
    } catch (err) {
      console.error(err)
      alert('Failed to submit leave request: ' + err.message)
    } finally {
      setSubmittingLeave(false)
    }
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
  const isLateWaived = monthPayroll?.late_waived || false
  const lateDeduction = isLateWaived ? 0 : lateDeductionDays * perDay

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
  const tabs = ['overview', 'salary', 'attendance', 'advances', 'remarks', 'leave_requests', 'messages']

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-[#FAF7F2]'}`}>
      <div className="loader"></div>
    </div>
  )

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#FAF7F2] text-[#1C1410]'} font-sans`}>

      <nav className={`px-6 flex items-center justify-between h-[70px] sticky top-0 z-50 transition-all duration-300 backdrop-blur-md border-b ${darkMode ? 'bg-slate-950/80 border-slate-800 shadow-sm shadow-slate-900/50' : 'bg-white/80 border-[#E8E0D4] shadow-sm'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5E3C] to-[#5C3E28] shadow-md">
            <Coffee size={20} color="white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#8B5E3C] to-[#5C3E28] dark:from-[#D4B896] dark:to-[#F5F0E8]">{t.portalTitle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          <div className={`flex items-center p-1 rounded-full border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-100 border-gray-200'}`}>
            <button 
              onClick={() => setLang('en')} 
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${lang === 'en' ? (darkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm') : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('bn')} 
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${lang === 'bn' ? (darkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm') : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              BN
            </button>
          </div>
          
          <button onClick={toggleDarkMode} className={`relative overflow-hidden w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 border hover:scale-105 active:scale-95 ${darkMode ? 'bg-slate-900 border-slate-700 text-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 'bg-white border-gray-200 text-gray-600 hover:shadow-md'}`} title={darkMode ? t.lightMode : t.darkMode}>
            <div className={`absolute transition-transform duration-500 ${darkMode ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}>
              <Sun size={18} />
            </div>
            <div className={`absolute transition-transform duration-500 ${darkMode ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}>
              <Moon size={18} />
            </div>
          </button>

          <div style={{ textAlign: 'right', marginLeft: '12px' }} className="hidden sm:block">
            <p className="text-sm font-bold m-0">{staff?.name}</p>
            <p className="text-xs opacity-60 m-0">{staff?.designation}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:border dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl font-bold text-xs transition-all duration-300 hover:shadow-sm active:scale-95 ml-2"
          >
            <LogOut size={16} /> <span className="hidden sm:inline">{t.logout}</span>
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
              <p style={{ fontSize: '11px', color: isLateWaived ? '#1e8e3e' : '#d93025', marginTop: '4px', fontWeight: 600 }}>
                {isLateWaived ? (
                  <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>
                    {lateDeductionDays} unpaid day{lateDeductionDays > 1 ? 's' : ''} (-৳{(lateDeductionDays * perDay).toLocaleString()})
                  </span>
                ) : (
                  `= ${lateDeductionDays} unpaid day${lateDeductionDays > 1 ? 's' : ''} (-৳${lateDeduction.toLocaleString()})`
                )}
                {isLateWaived && <span style={{ marginLeft: '4px' }}>Waived</span>}
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
          {(() => {
            const tabLabels = {
              overview: 'Overview',
              salary: 'Salary',
              attendance: 'Attendance',
              advances: 'Advances',
              remarks: 'Remarks',
              leave_requests: '📅 Leave Requests',
              messages: '💬 Messages'
            }
            return tabs.map(t => (
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
                }}
              >
                {tabLabels[t] || t}
              </button>
            ))
          })()}
        </div>


        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {monthPayroll ? (
              <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1C1410', margin: 0 }}>
                    Salary Breakdown — {monthNames[selectedMonth - 1]} {selectedYear}
                  </h3>
                  <button
                    onClick={() => setPrintData({
                      staff,
                      payroll: { ...monthPayroll, final_salary: finalSalary, is_paid: totalPaidThisMonth >= finalSalary, is_waived: isCurrentMonth ? false : monthPayroll?.late_waived },
                      month: monthNames[selectedMonth - 1],
                      year: selectedYear
                    })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '6px',
                      background: '#1C2233', color: '#94A3B8',
                      border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600
                    }}
                  >
                    <Printer size={14} /> Print Pay Slip
                  </button>
                </div>
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
              const pLateDeduct = p.late_waived ? 0 : (Number(p.late_deduction) || 0)
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

        {/* Leave Requests Tab */}
        {activeTab === 'leave_requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* New Request Form */}
            <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(28,20,16,0.07)' }}>
              <div style={{ background: '#6B3A2A', padding: '16px 20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: 0 }}>📅 Request Leave</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', margin: '4px 0 0' }}>Fill in the form below and the admin will be notified immediately.</p>
              </div>
              <div style={{ padding: '20px' }}>
              <form onSubmit={handleRequestLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9C8A76', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</label>
                    <input type="date" required value={newLeave.start_date} onChange={e => setNewLeave({...newLeave, start_date: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E8E0D4', background: '#FAF7F2', fontFamily: 'inherit', boxSizing: 'border-box', fontSize: '14px', color: '#1C1410' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9C8A76', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date</label>
                    <input type="date" required value={newLeave.end_date} onChange={e => setNewLeave({...newLeave, end_date: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E8E0D4', background: '#FAF7F2', fontFamily: 'inherit', boxSizing: 'border-box', fontSize: '14px', color: '#1C1410' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9C8A76', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Type</label>
                  <select value={newLeave.leave_type} onChange={e => setNewLeave({...newLeave, leave_type: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E8E0D4', background: '#FAF7F2', fontFamily: 'inherit', fontSize: '14px', color: '#1C1410' }}>
                    <option value="sick">🤒 Sick Leave</option>
                    <option value="casual">☕ Casual Leave</option>
                    <option value="annual">✈️ Annual Leave</option>
                    <option value="unpaid">📋 Unpaid Leave</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9C8A76', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason (Optional)</label>
                  <textarea placeholder="Briefly describe the reason for your leave..." value={newLeave.reason} onChange={e => setNewLeave({...newLeave, reason: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E8E0D4', background: '#FAF7F2', minHeight: '90px', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', color: '#1C1410' }} />
                </div>
                <button type="submit" disabled={submittingLeave} style={{ padding: '12px', background: submittingLeave ? '#B07830' : '#6B3A2A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: submittingLeave ? 'not-allowed' : 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {submittingLeave ? '⏳ Submitting...' : '📤 Submit Leave Request'}
                </button>
              </form>
              </div>
            </div>

            {/* Request History */}
            <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 12px rgba(28,20,16,0.07)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1C1410', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 My Leave History
                <span style={{ fontSize: '12px', background: '#F5F0E8', color: '#8B5E3C', padding: '2px 10px', borderRadius: '20px', fontWeight: 600 }}>{leaveRequests.length} total</span>
              </h3>
              {leaveRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9C8A76' }}>
                  <p style={{ fontSize: '32px', margin: '0 0 8px' }}>📭</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#5C4A36', margin: '0 0 4px' }}>No requests yet</p>
                  <p style={{ fontSize: '13px', margin: 0 }}>Submit your first leave request above.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {leaveRequests.map(r => {
                    const statusCfg = {
                      pending:  { color: '#B07830', bg: '#fef7e0', label: '⏳ Pending' },
                      approved: { color: '#1e8e3e', bg: '#e6f4ea', label: '✅ Approved' },
                      rejected: { color: '#d93025', bg: '#fce8e6', label: '❌ Rejected' },
                    }
                    const cfg = statusCfg[r.status] || statusCfg.pending
                    const days = Math.max(1, Math.round((new Date(r.end_date) - new Date(r.start_date)) / (1000 * 60 * 60 * 24)) + 1)
                    return (
                      <div key={r.id} style={{ border: `1px solid ${cfg.color}40`, borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ background: cfg.bg, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1C1410' }}>
                              {new Date(r.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              {r.start_date !== r.end_date && ` → ${new Date(r.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            </span>
                            <span style={{ fontSize: '11px', background: '#F5F0E8', color: '#8B5E3C', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase' }}>{r.leave_type}</span>
                            <span style={{ fontSize: '12px', color: '#9C8A76' }}>{days} day{days > 1 ? 's' : ''}</span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                        </div>
                        {(r.reason || r.admin_note) && (
                          <div style={{ padding: '10px 16px', background: 'white' }}>
                            {r.reason && <p style={{ fontSize: '13px', color: '#5C4A36', margin: '0 0 4px' }}>{r.reason}</p>}
                            {r.admin_note && (
                              <p style={{ fontSize: '12px', color: cfg.color, margin: 0, fontWeight: 600, background: cfg.bg, padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                                Admin: {r.admin_note}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interactive Mailbox Tab */}
        {activeTab === 'messages' && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Compose Box */}
            <div className={`p-8 rounded-3xl shadow-lg border transition-all duration-300 relative overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E8E0D4]'}`}>
              <div className={`absolute top-0 left-0 w-full h-1 ${darkMode ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-blue-500 to-cyan-400'}`}></div>
              <h3 className="text-xl font-extrabold mb-6 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <Send size={20} />
                </div>
                {t.composeNew}
              </h3>
              
              <div className="mb-6">
                <label className="block text-sm font-bold mb-3 opacity-80 uppercase tracking-wider">{t.queryType}</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'Requisition', label: t.typeRequisition },
                    { id: 'Leave', label: t.typeLeave },
                    { id: 'Problem', label: t.typeProblem },
                    { id: 'Other', label: t.typeOther }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setQueryType(opt.id)}
                      className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 border-2 active:scale-95 ${
                        queryType === opt.id 
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-[0_0_20px_rgba(59,130,246,0.15)] dark:bg-blue-900/20 dark:text-blue-300 dark:shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                          : `border-transparent ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-3 opacity-80 uppercase tracking-wider">{t.messageLabel}</label>
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={t.messagePlaceholder}
                  rows={5}
                  className={`w-full p-5 rounded-2xl border-2 transition-all duration-300 outline-none resize-y text-base ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 focus:border-blue-500 focus:bg-slate-900 shadow-inner' 
                      : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white shadow-inner'
                  }`}
                />
              </div>

              <button
                disabled={!newMessage.trim() || sendingMessage}
                onClick={async () => {
                  if (!newMessage.trim()) return
                  setSendingMessage(true)
                  try {
                    const res = await fetch('/api/staffquery', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        staff_id: staff.id,
                        staff_name: staff.name,
                        type: queryType,
                        message: newMessage.trim()
                      })
                    })
                    if (!res.ok) throw new Error('Failed to send')
                    setNewMessage('')
                    const { data } = await supabase.from('staff_queries').select('*').eq('staff_id', staff.id).order('created_at', { ascending: false })
                    setMessages(data || [])
                  } catch (err) {
                    alert('Failed to send message: ' + err.message)
                  } finally {
                    setSendingMessage(false)
                  }
                }}
                className={`group flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold transition-all duration-300 ${
                  sendingMessage || !newMessage.trim() 
                    ? `cursor-not-allowed opacity-50 ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-gray-200 text-gray-500'}` 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-blue-500/30 active:scale-95'
                }`}
              >
                <span className={`${!sendingMessage && newMessage.trim() ? 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform' : ''}`}>
                  <Send size={20} />
                </span>
                {sendingMessage ? t.submitting : t.submitBtn}
              </button>
            </div>

            {/* Inbox / Sent Messages */}
            <div className="flex flex-col gap-4">
              <h3 className="text-2xl font-extrabold mb-2 ml-2 tracking-tight">📨 {t.myRequests}</h3>
              {messages.length === 0 ? (
                <div className={`p-12 text-center rounded-3xl border-dashed border-2 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-gray-300 bg-white/50'}`}>
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                    <span className="text-4xl opacity-50">📭</span>
                  </div>
                  <p className="text-lg font-semibold opacity-60">{t.noRequests}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {messages.map((m, i) => {
                    const isPending = m.status === 'Pending'
                    const isApproved = m.status === 'Approved'
                    const isRejected = m.status === 'Rejected'
                    
                    return (
                      <div key={m.id} className={`p-6 rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-4 ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-[#E8E0D4] hover:border-gray-300'}`} style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                        <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-extrabold px-3 py-1.5 rounded-lg uppercase tracking-widest ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
                              {m.type === 'Requisition' ? t.typeRequisition : m.type === 'Leave' ? t.typeLeave : m.type === 'Problem' ? t.typeProblem : m.type}
                            </span>
                            <span className="text-sm font-medium opacity-50">
                              {new Date(m.created_at).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                          
                          <div className={`flex items-center gap-2 text-xs font-extrabold px-4 py-1.5 rounded-full ${
                            isPending ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20' :
                            isApproved ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' :
                            'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isPending ? 'bg-yellow-500 animate-pulse' : isApproved ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {isPending ? t.statusPending : isApproved ? t.statusApproved : t.statusRejected}
                          </div>
                        </div>
                        
                        <p className={`whitespace-pre-wrap text-base leading-relaxed mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-800'}`}>{m.message}</p>
                        
                        {m.admin_reply && (
                          <div className={`mt-5 p-5 rounded-2xl border ${
                            isApproved ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30' : 
                            isRejected ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30' : 
                            'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/30'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isApproved ? 'bg-green-500' : isRejected ? 'bg-red-500' : 'bg-blue-500'}`}>
                                A
                              </div>
                              <p className={`text-sm font-extrabold uppercase tracking-wider ${isApproved ? 'text-green-700 dark:text-green-400' : isRejected ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>{t.adminReply}</p>
                            </div>
                            <p className={`text-base ml-8 ${darkMode ? 'text-slate-300' : 'text-gray-800'}`}>{m.admin_reply}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
      {printData && <PaySlip data={printData} onClose={() => setPrintData(null)} />}
    </div>
  )
}