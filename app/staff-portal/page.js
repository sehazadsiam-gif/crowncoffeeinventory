'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import {
  Coffee, LogOut, ChevronLeft, ChevronRight, Printer,
  Moon, Sun, Send, Globe, LayoutDashboard, Wallet,
  CalendarDays, TrendingUp, MessageSquare, FileText,
  CheckCircle2, Clock, XCircle, Home
} from 'lucide-react'
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
  const [mounted, setMounted] = useState(false)

  const t = translations[lang]

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const isDark = localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      setDarkMode(isDark)
      document.body.classList.toggle('dark-mode', isDark)
    }
  }, [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    document.body.classList.toggle('dark-mode', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
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
    if (!newLeave.start_date || !newLeave.end_date) { alert('Please select start and end dates.'); return }
    try {
      setSubmittingLeave(true)
      const { error } = await supabase.from('leave_requests').insert([{
        staff_id: staff.id, start_date: newLeave.start_date, end_date: newLeave.end_date,
        leave_type: newLeave.leave_type, reason: newLeave.reason, status: 'pending'
      }])
      if (error) throw error
      try {
        await fetch('/api/email/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'leave_admin_alert', staffName: staff.name, leaveType: newLeave.leave_type, startDate: newLeave.start_date, endDate: newLeave.end_date, reason: newLeave.reason })
        })
      } catch {}
      alert('Leave request submitted successfully!')
      setNewLeave({ start_date: '', end_date: '', leave_type: 'sick', reason: '' })
      const { data } = await supabase.from('leave_requests').select('*').eq('staff_id', staff.id).order('created_at', { ascending: false })
      setLeaveRequests(data || [])
    } catch (err) {
      alert('Failed to submit: ' + err.message)
    } finally {
      setSubmittingLeave(false)
    }
  }

  function prevMonth() {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }

  function nextMonth() {
    const now = new Date()
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1) return
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthPayroll = payroll.find(p => p.month === selectedMonth && p.year === selectedYear)
  const monthSummary = (summary || []).find(s => s.month === selectedMonth && s.year === selectedYear)
  const monthPayments = payments.filter(p => Number(p.month) === selectedMonth && Number(p.year) === selectedYear)
  const monthAttendance = attendance.filter(a => { const d = new Date(a.date); return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear })
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
  const unpaidDeductionDays = monthPayroll?.manual_unpaid_days !== null && monthPayroll?.manual_unpaid_days !== undefined ? Number(monthPayroll.manual_unpaid_days) : calculatedUnpaidDays
  const unpaidDeductionAmount = unpaidDeductionDays * perDay
  const finalSalary = monthPayroll ? Math.round(base + lunch + morn + bonus + sc + misc) : 0
  const remaining = finalSalary - totalPaidThisMonth
  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()

  const tabs = [
    { key: 'overview', icon: <Home size={15} />, label: lang === 'bn' ? 'ওভারভিউ' : 'Overview' },
    { key: 'salary', icon: <Wallet size={15} />, label: lang === 'bn' ? 'বেতন' : 'Salary' },
    { key: 'attendance', icon: <CalendarDays size={15} />, label: lang === 'bn' ? 'উপস্থিতি' : 'Attendance' },
    { key: 'advances', icon: <TrendingUp size={15} />, label: lang === 'bn' ? 'অগ্রিম' : 'Advances' },
    { key: 'remarks', icon: <FileText size={15} />, label: lang === 'bn' ? 'মন্তব্য' : 'Remarks' },
    { key: 'leave_requests', icon: <CalendarDays size={15} />, label: lang === 'bn' ? 'ছুটির আবেদন' : 'Leave' },
    { key: 'messages', icon: <MessageSquare size={15} />, label: lang === 'bn' ? 'মেসেজ' : 'Messages' },
  ]

  if (loading || !mounted) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '18px',
        background: 'linear-gradient(135deg, #6B3A2A, #D4933A)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px', boxShadow: '0 8px 24px rgba(107,58,42,0.30)'
      }}>
        <Coffee size={30} color="white" />
      </div>
      <div className="loader" />
      <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>Loading your portal...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>

      {/* ── TOP NAV ── */}
      <nav style={{
        height: '62px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7C3A1E 0%, #D4933A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 8px rgba(124,58,30,0.30)'
          }}>
            <Coffee size={17} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{t.portalTitle}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }} className="nav-staff-name">{staff?.name}</p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Language pill */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--bg-subtle)',
            border: '1.5px solid var(--border-light)',
            borderRadius: '9999px',
            padding: '3px'
          }}>
            {['en', 'bn'].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: '5px 12px',
                fontSize: '11px', fontWeight: 700,
                borderRadius: '9999px', border: 'none',
                cursor: 'pointer',
                background: lang === l ? 'var(--bg-surface)' : 'transparent',
                color: lang === l ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: lang === l ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.04em',
                minHeight: '30px'
              }}>
                {l === 'en' ? 'EN' : 'বাং'}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button onClick={toggleDarkMode} style={{
            width: '36px', height: '36px', borderRadius: '10px',
            border: '1.5px solid var(--border-light)',
            background: 'var(--bg-subtle)',
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            {darkMode ? <Sun size={16} style={{ color: '#FBBF24' }} /> : <Moon size={16} />}
          </button>

          {/* Logout */}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '10px',
            border: '1.5px solid var(--danger-bg)',
            background: 'var(--danger-bg)', color: 'var(--danger)',
            cursor: 'pointer', fontWeight: 700, fontSize: '12.5px',
            transition: 'all 0.2s', fontFamily: 'var(--font-sans)'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--danger)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger-bg)' }}
          >
            <LogOut size={14} />
            <span className="logout-label">Logout</span>
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* Month Selector */}
        <div style={{
          background: 'linear-gradient(135deg, #5A2810 0%, #8B4A26 50%, #B0633E 100%)',
          borderRadius: '18px', padding: '20px 24px',
          marginBottom: '20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(90,40,16,0.28)',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', right: '-40px', top: '-60px' }} />
          <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', left: '-20px', bottom: '-40px' }} />

          <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '10px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'white', transition: 'background 0.2s', zIndex: 1 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <p style={{ fontSize: '24px', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {monthNames[selectedMonth - 1]} {selectedYear}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                {isCurrentMonth ? '📍 Current Month' : '📂 Past Month'}
              </span>
              {monthSummary?.source === 'rysenova' && (
                <span style={{ fontSize: '10px', background: '#10B981', color: 'white', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>Rysenova</span>
              )}
            </div>
          </div>

          <button onClick={nextMonth} disabled={isCurrentMonth} style={{ background: isCurrentMonth ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', color: isCurrentMonth ? 'rgba(255,255,255,0.30)' : 'white', transition: 'background 0.2s', zIndex: 1 }}
            onMouseEnter={e => { if (!isCurrentMonth) e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = isCurrentMonth ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.14)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Summary Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: lang === 'bn' ? 'মোট বেতন' : 'Final Salary', value: '৳' + finalSalary.toLocaleString(), color: '#7C3A1E', bg: 'linear-gradient(135deg, #7C3A1E15, #D4933A10)' },
            { label: lang === 'bn' ? 'পেয়েছেন' : 'Received', value: '৳' + totalPaidThisMonth.toLocaleString(), color: 'var(--success)', bg: 'var(--success-bg)' },
            { label: lang === 'bn' ? 'বাকি' : 'Remaining', value: '৳' + remaining.toLocaleString(), color: remaining > 0 ? 'var(--danger)' : 'var(--success)', bg: remaining > 0 ? 'var(--danger-bg)' : 'var(--success-bg)' },
            { label: lang === 'bn' ? 'অগ্রিম' : 'Advance', value: '৳' + monthAdvanceTotal.toLocaleString(), color: 'var(--danger)', bg: 'var(--danger-bg)' },
            { label: lang === 'bn' ? 'উপস্থিত' : 'Present', value: presentDays + ' days', color: 'var(--success)', bg: 'var(--success-bg)' },
            { label: lang === 'bn' ? 'অনুপস্থিত' : 'Absent', value: absentDays, color: 'var(--danger)', bg: 'var(--danger-bg)' },
            { label: lang === 'bn' ? 'দেরি' : 'Late', value: lateDays + ' days', color: 'var(--warning)', bg: 'var(--warning-bg)' },
            { label: lang === 'bn' ? 'ছাড় দেওয়া দিন' : 'Free Days', value: Math.min(4, absentDays), color: 'var(--success)', bg: 'var(--success-bg)' },
          ].map((card, i) => (
            <div key={i} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: '12px', padding: '14px',
              boxShadow: 'var(--shadow-xs)',
              transition: 'box-shadow 0.2s, transform 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: '6px' }}>{card.label}</p>
              <p style={{ fontSize: '17px', fontWeight: 800, color: card.color, margin: 0, letterSpacing: '-0.01em' }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Salary progress bar */}
        {finalSalary > 0 && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '18px 20px', marginBottom: '20px', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'bn' ? 'বেতন প্রদানের অগ্রগতি' : 'Salary Payment Progress'}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{Math.min(100, Math.round((totalPaidThisMonth / finalSalary) * 100))}%</span>
            </div>
            <div style={{ height: '10px', background: 'var(--bg-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: Math.min(100, finalSalary > 0 ? (totalPaidThisMonth / finalSalary) * 100 : 0) + '%',
                background: remaining <= 0
                  ? 'linear-gradient(90deg, #10B981, #34D399)'
                  : 'linear-gradient(90deg, #7C3A1E, #D4933A)',
                borderRadius: '10px',
                transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span>Received: ৳{totalPaidThisMonth.toLocaleString()}</span>
              <span>Total: ৳{finalSalary.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px',
                fontSize: '13px', fontWeight: 700,
                borderRadius: '10px',
                border: activeTab === tab.key ? 'none' : '1.5px solid var(--border-light)',
                cursor: 'pointer', whiteSpace: 'nowrap',
                background: activeTab === tab.key
                  ? 'linear-gradient(135deg, #6B3A2A 0%, #A05228 100%)'
                  : 'var(--bg-surface)',
                color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
                boxShadow: activeTab === tab.key ? 'var(--shadow-glow-brown)' : 'var(--shadow-xs)',
                transition: 'all 0.22s ease',
                fontFamily: 'var(--font-sans)',
                minHeight: '40px'
              }}
              onMouseEnter={e => { if (activeTab !== tab.key) { e.currentTarget.style.borderColor = 'var(--accent-brown)'; e.currentTarget.style.color = 'var(--accent-brown)' }}}
              onMouseLeave={e => { if (activeTab !== tab.key) { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-muted)' }}}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-in">
            {monthPayroll ? (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                      {lang === 'bn' ? 'বেতনের বিবরণ' : 'Salary Breakdown'} — {monthNames[selectedMonth - 1]} {selectedYear}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'var(--font-sans)' }}>
                      {lang === 'bn' ? 'মোট বেতনের বিশ্লেষণ' : 'All components of your salary'}
                    </p>
                  </div>
                  <button
                    onClick={() => setPrintData({
                      staff, payroll: { ...monthPayroll, final_salary: finalSalary, is_paid: totalPaidThisMonth >= finalSalary, is_waived: isCurrentMonth ? false : monthPayroll?.late_waived },
                      month: monthNames[selectedMonth - 1], year: selectedYear
                    })}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-light)', cursor: 'pointer', fontWeight: 600, fontSize: '12.5px', fontFamily: 'var(--font-sans)' }}
                  >
                    <Printer size={14} /> Print Pay Slip
                  </button>
                </div>
                <div style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                    {[
                      { label: lang === 'bn' ? 'মূল বেতন' : 'Base Salary', value: base, neutral: true },
                      { label: lang === 'bn' ? 'ওভারটাইম' : 'Overtime', value: ot, positive: true },
                      { label: lang === 'bn' ? 'সার্ভিস চার্জ' : 'Service Charge', value: sc, positive: true },
                      { label: lang === 'bn' ? 'বোনাস' : 'Bonus', value: bonus, positive: true },
                      { label: lang === 'bn' ? 'লাঞ্চ+ডিনার' : 'Lunch + Dinner', value: lunch, positive: true },
                      { label: lang === 'bn' ? 'সকালের খাবার' : 'Morning Food', value: morn, positive: true },
                      { label: lang === 'bn' ? 'বিবিধ (+)' : 'Miscellaneous', value: misc },
                      { label: lang === 'bn' ? 'অগ্রিম কাটা' : 'Advance Taken', value: adv, negative: true },
                      { label: lang === 'bn' ? 'অন্যান্য কাটা' : 'Others Taken', value: others, negative: true },
                      { label: lang === 'bn' ? 'অনুপস্থিত কাটা' : 'Unpaid Deduction', value: unpaidDeductionAmount, negative: true },
                      { label: lang === 'bn' ? 'দেরি কাটা' : 'Late Deduction', value: lateDeduction, negative: true },
                    ].filter(item => Number(item.value) !== 0).map((item, i) => (
                      <div key={i} style={{
                        background: item.negative ? 'var(--danger-bg)' : item.positive ? 'var(--success-bg)' : 'var(--bg-subtle)',
                        borderRadius: '10px', padding: '10px 12px',
                        border: `1px solid ${item.negative ? 'rgba(239,68,68,0.15)' : item.positive ? 'rgba(16,185,129,0.15)' : 'var(--border-light)'}`
                      }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{item.label}</p>
                        <p style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: item.negative ? 'var(--danger)' : item.positive ? 'var(--success)' : 'var(--text-primary)' }}>
                          {item.negative ? '-' : item.positive ? '+' : ''}৳{Math.abs(Number(item.value || 0)).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, #6B3A2A, #A05228)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>{lang === 'bn' ? 'মোট বেতন' : 'Final Salary'}</span>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: '22px', letterSpacing: '-0.02em' }}>৳{finalSalary.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
                <p style={{ fontWeight: 600, margin: 0 }}>No salary record for {monthNames[selectedMonth - 1]} {selectedYear}</p>
              </div>
            )}

            {monthPayments.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                  {lang === 'bn' ? 'পেমেন্ট রেকর্ড' : 'Payment Records'} — {monthNames[selectedMonth - 1]} {selectedYear}
                </h3>
                {monthPayments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {new Date(p.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {p.notes ? ' · ' + p.notes : ''}
                    </span>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>৳{Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {leave && (
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarDays size={16} style={{ color: 'var(--accent-blue)' }} />
                  {lang === 'bn' ? 'ছুটির ব্যালেন্স' : 'Leave Balance'} {selectedYear}
                </h3>
                {[
                  { label: lang === 'bn' ? 'অসুস্থ ছুটি' : 'Sick Leave', used: leave.sick_used, total: leave.sick_total },
                  { label: lang === 'bn' ? 'নৈমিত্তিক ছুটি' : 'Casual Leave', used: leave.casual_used, total: leave.casual_total },
                  { label: lang === 'bn' ? 'বার্ষিক ছুটি' : 'Annual Leave', used: leave.annual_used, total: leave.annual_total },
                ].map((l, i) => (
                  <div key={i} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{l.label}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{l.used} / {l.total} used</span>
                    </div>
                    <div style={{ height: '7px', background: 'var(--bg-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg, #6B3A2A, #D4933A)', width: Math.min(100, (l.used / l.total) * 100) + '%', borderRadius: '10px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SALARY TAB ── */}
        {activeTab === 'salary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-in">
            {payroll.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No salary records found.</div>
            ) : payroll.map(p => {
              const mPayments = payments.filter(pay => Number(pay.month) === p.month && Number(pay.year) === p.year)
              const tPaid = mPayments.reduce((s, pay) => s + Number(pay.amount), 0)
              const pBase = Number(staff?.base_salary || 0)
              const pOt = (Number(p.overtime_hours) || 0) * Math.floor(Math.floor(pBase / 30) / 10)
              const pMisc = Number(p.miscellaneous || 0)
              const pAdv = Number(p.advance_taken || 0)
              const pOthers = Number(p.others_taken || 0)
              const pUnpaid = Number(p.unpaid_leave_deduction || 0)
              const pLateDeduct = p.late_waived ? 0 : (Number(p.late_deduction) || 0)
              const pFinal = Math.round(pBase + pOt + Number(p.service_charge || 0) + Number(p.bonus || 0) + Number(p.lunch_dinner || 0) + Number(p.morning_food || 0) + pMisc - pAdv - pOthers - pUnpaid - pLateDeduct)
              const rem = pFinal - tPaid
              const isSelected = p.month === selectedMonth && p.year === selectedYear

              return (
                <div key={p.id} className="card" style={{ border: isSelected ? '2px solid var(--accent-brown)' : undefined, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', background: isSelected ? 'var(--accent-brown-dim)' : 'var(--bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{monthShort[p.month - 1]} {p.year}</h3>
                      {isSelected && <span style={{ fontSize: '10px', background: 'var(--accent-brown)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>Selected</span>}
                      <span className={`badge ${rem <= 0 ? 'badge-green' : 'badge-amber'}`}>{rem <= 0 ? '✓ Paid' : '⏳ Pending'}</span>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: 900, color: 'var(--accent-brown)', margin: 0, letterSpacing: '-0.02em' }}>৳{pFinal.toLocaleString()}</p>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                      {[
                        { label: 'Base', value: pBase },
                        { label: 'OT', value: p.overtime_pay, positive: true },
                        { label: 'Service', value: p.service_charge, positive: true },
                        { label: 'Bonus', value: p.bonus, positive: true },
                        { label: 'Lunch+Din', value: p.lunch_dinner, positive: true },
                        { label: 'Morning', value: p.morning_food, positive: true },
                        { label: 'Advance', value: p.advance_taken, negative: true },
                        { label: 'Others', value: p.others_taken, negative: true },
                        { label: 'Unpaid Lv', value: p.unpaid_leave_deduction, negative: true },
                        { label: 'Late', value: pLateDeduct, negative: true },
                        { label: 'Misc', value: p.miscellaneous },
                      ].filter(item => Number(item.value) !== 0).map((item, i) => (
                        <div key={i} style={{ background: item.negative ? 'var(--danger-bg)' : item.positive ? 'var(--success-bg)' : 'var(--bg-subtle)', borderRadius: '8px', padding: '8px 10px' }}>
                          <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{item.label}</p>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: item.negative ? 'var(--danger)' : item.positive ? 'var(--success)' : 'var(--text-primary)', margin: 0 }}>
                            {item.negative ? '-' : item.positive ? '+' : ''}৳{Math.abs(Number(item.value || 0)).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Received: </span>
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>৳{tPaid.toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Remaining: </span>
                        <span style={{ color: rem > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>৳{rem.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ATTENDANCE TAB ── */}
        {activeTab === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '4px' }}>
              {[
                { label: lang === 'bn' ? 'উপস্থিত' : 'Present', value: presentDays, color: 'var(--success)', bg: 'var(--success-bg)' },
                { label: lang === 'bn' ? 'অনুপস্থিত' : 'Absent', value: absentDays, color: 'var(--danger)', bg: 'var(--danger-bg)' },
                { label: lang === 'bn' ? 'আধা দিন' : 'Half Day', value: halfDays, color: 'var(--warning)', bg: 'var(--warning-bg)' },
                { label: lang === 'bn' ? 'দেরি' : 'Late', value: lateDays, color: 'var(--info)', bg: 'var(--info-bg)' },
              ].map((c, i) => (
                <div key={i} style={{ background: c.bg, border: `1px solid ${c.color}30`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <p style={{ fontSize: '26px', fontWeight: 900, color: c.color, margin: 0, lineHeight: 1 }}>{c.value}</p>
                  <p style={{ fontSize: '11px', color: c.color, margin: '5px 0 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</p>
                </div>
              ))}
            </div>

            {monthAttendance.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No attendance for {monthNames[selectedMonth - 1]} {selectedYear}</div>
            ) : monthAttendance.map(a => {
              const statusColors = { present: 'var(--success)', absent: 'var(--danger)', half_day: 'var(--warning)', late: 'var(--info)' }
              const color = statusColors[a.status] || 'var(--text-muted)'
              return (
                <div key={a.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {new Date(a.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    {a.note && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{a.note}</p>}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: color + '18', color, textTransform: 'capitalize' }}>
                    {a.status?.replace('_', ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ADVANCES TAB ── */}
        {activeTab === 'advances' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-in">
            <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 700 }}>{lang === 'bn' ? 'এই মাসের অগ্রিম' : 'Advances'} — {monthNames[selectedMonth - 1]}</span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--danger)' }}>৳{monthAdvanceTotal.toLocaleString()}</span>
            </div>
            {monthAdvances.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No advances in {monthNames[selectedMonth - 1]} {selectedYear}</div>
            ) : monthAdvances.map(a => (
              <div key={a.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>{a.reason || 'No reason provided'}</p>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--danger)' }}>৳{Number(a.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── REMARKS TAB ── */}
        {activeTab === 'remarks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-in">
            {notes.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No remarks found.</div>
            ) : notes.map(n => {
              const cfg = {
                warning:     { color: 'var(--danger)', bg: 'var(--danger-bg)' },
                commendation: { color: 'var(--success)', bg: 'var(--success-bg)' },
                performance: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
                general:     { color: 'var(--text-muted)', bg: 'var(--bg-subtle)' },
              }[n.note_type] || { color: 'var(--text-muted)', bg: 'var(--bg-subtle)' }
              return (
                <div key={n.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderLeft: `4px solid ${cfg.color}`, borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, textTransform: 'capitalize', letterSpacing: '0.05em', background: cfg.bg, padding: '2px 8px', borderRadius: '6px' }}>{n.note_type}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.55 }}>{n.note}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* ── LEAVE REQUESTS TAB ── */}
        {activeTab === 'leave_requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-in">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', padding: '18px 22px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: 0 }}>📅 {lang === 'bn' ? 'ছুটির আবেদন করুন' : 'Request Leave'}</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', margin: '4px 0 0' }}>{lang === 'bn' ? 'নিচের ফর্মটি পূরণ করুন' : 'Fill in the form and admin will be notified immediately.'}</p>
              </div>
              <div style={{ padding: '20px 22px' }}>
                <form onSubmit={handleRequestLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { label: lang === 'bn' ? 'শুরুর তারিখ' : 'Start Date', key: 'start_date' },
                      { label: lang === 'bn' ? 'শেষ তারিখ' : 'End Date', key: 'end_date' }
                    ].map(f => (
                      <div key={f.key}>
                        <label className="label">{f.label}</label>
                        <input type="date" required value={newLeave[f.key]} onChange={e => setNewLeave({ ...newLeave, [f.key]: e.target.value })} className="input" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="label">{lang === 'bn' ? 'ছুটির ধরন' : 'Leave Type'}</label>
                    <select value={newLeave.leave_type} onChange={e => setNewLeave({ ...newLeave, leave_type: e.target.value })} className="input">
                      <option value="sick">🤒 {lang === 'bn' ? 'অসুস্থ ছুটি' : 'Sick Leave'}</option>
                      <option value="casual">☕ {lang === 'bn' ? 'নৈমিত্তিক ছুটি' : 'Casual Leave'}</option>
                      <option value="annual">✈️ {lang === 'bn' ? 'বার্ষিক ছুটি' : 'Annual Leave'}</option>
                      <option value="unpaid">📋 {lang === 'bn' ? 'বিনা বেতনে ছুটি' : 'Unpaid Leave'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{lang === 'bn' ? 'কারণ (ঐচ্ছিক)' : 'Reason (Optional)'}</label>
                    <textarea placeholder={lang === 'bn' ? 'ছুটির কারণ লিখুন...' : 'Briefly describe the reason...'} value={newLeave.reason} onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })} className="input" style={{ minHeight: '80px', resize: 'vertical' }} />
                  </div>
                  <button type="submit" disabled={submittingLeave} className="btn-primary" style={{ width: '100%', height: '46px', background: submittingLeave ? 'var(--border-medium)' : 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                    {submittingLeave ? '⏳ Submitting...' : '📤 ' + (lang === 'bn' ? 'আবেদন পাঠান' : 'Submit Leave Request')}
                  </button>
                </form>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 {lang === 'bn' ? 'আমার ছুটির ইতিহাস' : 'My Leave History'}
                <span className="badge badge-gray">{leaveRequests.length}</span>
              </h3>
              {leaveRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '28px', margin: '0 0 8px' }}>📭</p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{lang === 'bn' ? 'কোনো আবেদন নেই' : 'No requests yet'}</p>
                </div>
              ) : leaveRequests.map(r => {
                const cfg = {
                  pending:  { color: 'var(--warning)', bg: 'var(--warning-bg)', icon: <Clock size={14} />, label: '⏳ Pending' },
                  approved: { color: 'var(--success)', bg: 'var(--success-bg)', icon: <CheckCircle2 size={14} />, label: '✅ Approved' },
                  rejected: { color: 'var(--danger)', bg: 'var(--danger-bg)', icon: <XCircle size={14} />, label: '❌ Rejected' },
                }[r.status] || {}
                const days = Math.max(1, Math.round((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1)
                return (
                  <div key={r.id} style={{ border: `1px solid ${cfg.color}30`, borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ background: cfg.bg, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {new Date(r.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {r.start_date !== r.end_date && ` → ${new Date(r.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </span>
                        <span className="badge badge-brown" style={{ textTransform: 'capitalize' }}>{r.leave_type}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{days} day{days > 1 ? 's' : ''}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    {(r.reason || r.admin_note) && (
                      <div style={{ padding: '10px 16px', background: 'var(--bg-surface)' }}>
                        {r.reason && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>{r.reason}</p>}
                        {r.admin_note && <p style={{ fontSize: '12px', color: cfg.color, margin: 0, fontWeight: 600 }}>Admin: {r.admin_note}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {activeTab === 'messages' && (() => {
          const typeConfig = {
            Requisition: { icon: '📦', gradient: 'linear-gradient(135deg, #f97316, #d97706)', label: t.typeRequisition },
            Leave:       { icon: '🏖️', gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)', label: t.typeLeave },
            Problem:     { icon: '⚠️', gradient: 'linear-gradient(135deg, #ef4444, #f43f5e)', label: t.typeProblem },
            Other:       { icon: '💬', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)', label: t.typeOther },
          }
          const selectedConfig = typeConfig[queryType] || typeConfig.Other

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'start' }} className="animate-in">

              {/* Compose Panel */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
                <div style={{ background: selectedConfig.gradient, padding: '18px 20px', color: 'white' }}>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>{t.composeNew}</p>
                  <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 800, margin: 0 }}>{selectedConfig.label}</h3>
                </div>
                <div style={{ padding: '20px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.05em' }}>{t.queryType}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '20px' }}>
                    {Object.entries(typeConfig).map(([id, cfg]) => (
                      <button key={id} onClick={() => setQueryType(id)} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px', borderRadius: '12px',
                        border: queryType === id ? 'none' : '1.5px solid var(--border-medium)',
                        background: queryType === id ? cfg.gradient : 'var(--bg-subtle)',
                        color: queryType === id ? 'white' : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                        transition: 'all 0.2s', fontFamily: 'var(--font-sans)', minHeight: '48px'
                      }}>
                        <span style={{ fontSize: '18px' }}>{cfg.icon}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cfg.label}</span>
                      </button>
                    ))}
                  </div>

                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>{t.messageLabel}</p>
                  <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={t.messagePlaceholder} rows={5} className="input" style={{ resize: 'none', marginBottom: '8px', minHeight: '110px' }} />
                  <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>{newMessage.length} / 500</div>

                  <button
                    disabled={!newMessage.trim() || sendingMessage}
                    onClick={async () => {
                      if (!newMessage.trim()) return
                      setSendingMessage(true)
                      try {
                        const res = await fetch('/api/staffquery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: staff.id, staff_name: staff.name, type: queryType, message: newMessage.trim() }) })
                        if (!res.ok) throw new Error('Failed')
                        setNewMessage('')
                        const { data } = await supabase.from('staff_queries').select('*').eq('staff_id', staff.id).order('created_at', { ascending: false })
                        setMessages(data || [])
                      } catch (err) {
                        alert('Failed: ' + err.message)
                      } finally {
                        setSendingMessage(false)
                      }
                    }}
                    style={{
                      width: '100%', height: '48px', borderRadius: '12px',
                      background: !newMessage.trim() || sendingMessage ? 'var(--border-medium)' : selectedConfig.gradient,
                      border: 'none', color: 'white', fontWeight: 700, fontSize: '14px',
                      cursor: !newMessage.trim() || sendingMessage ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    {sendingMessage ? t.submitting : <><Send size={15} /> {t.submitBtn}</>}
                  </button>
                </div>
              </div>

              {/* Inbox Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>{t.myRequests}</h3>
                  <span className="badge badge-gray">{messages.length}</span>
                </div>

                {messages.length === 0 ? (
                  <div className="card" style={{ padding: '36px', textAlign: 'center', borderRadius: '16px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>📪</div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-muted)' }}>{t.noRequests}</p>
                  </div>
                ) : messages.map(m => {
                  const isPending = m.status === 'Pending'
                  const isApproved = m.status === 'Approved'
                  const cfg = typeConfig[m.type] || typeConfig.Other
                  return (
                    <div key={m.id} className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '14px' }}>
                      <div style={{ background: cfg.gradient, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
                          <span>{cfg.icon}</span><span>{m.type}</span>
                        </div>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.22)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', fontSize: '10px' }}>
                          {isPending ? t.statusPending : isApproved ? t.statusApproved : t.statusRejected}
                        </span>
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          {new Date(m.created_at).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                        <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                        {m.admin_reply && (
                          <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                            <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Admin Reply</p>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{m.admin_reply}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

      </main>

      {printData && <PaySlip data={printData} onClose={() => setPrintData(null)} />}

      <style>{`
        @media (max-width: 480px) {
          .nav-staff-name { display: none; }
          .logout-label { display: none; }
        }
        @media (min-width: 1920px) {
          main { max-width: 1200px !important; }
          nav > div { padding: 0 32px !important; }
        }
      `}</style>
    </div>
  )
}