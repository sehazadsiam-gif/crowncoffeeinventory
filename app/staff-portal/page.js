'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import {
  Coffee, LogOut, ChevronLeft, ChevronRight, Printer,
  Moon, Sun, Send, Globe, LayoutDashboard, Wallet,
  CalendarDays, TrendingUp, MessageSquare, FileText,
  CheckCircle2, Clock, XCircle, Home, CheckSquare, ClipboardList, AlertTriangle
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { translations } from '../../lib/i18n'

import Modal from '../../components/Modal'

const PaySlip = dynamic(() => import('../../components/PaySlip'), { ssr: false })

export default function StaffPortalPage() {
  const router = useRouter()
  const [staff, setStaff] = useState(null)
  const [payroll, setPayroll] = useState([])
  const [payments, setPayments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [advances, setAdvances] = useState([])
  const [notes, setNotes] = useState([])
  const [showIdCard, setShowIdCard] = useState(false)
  const [leave, setLeave] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [summary, setSummary] = useState(null)
  const [leaveRequests, setLeaveRequests] = useState([])
  const [newLeave, setNewLeave] = useState({ start_date: '', end_date: '', leave_type: 'sick', reason: '' })
  const [submittingLeave, setSubmittingLeave] = useState(false)
  const [dutyRequests, setDutyRequests] = useState([])
  const [newDutyChange, setNewDutyChange] = useState({ request_date: '', request_type: 'day_off_swap', new_shift_start: '10:00', reason: '' })
  const [submittingDutyChange, setSubmittingDutyChange] = useState(false)
  const [printData, setPrintData] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [queryType, setQueryType] = useState('Requisition')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [lang, setLang] = useState('bn')
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tasks, setTasks] = useState([])
  const [updatingTaskId, setUpdatingTaskId] = useState(null)
  const [taskNotes, setTaskNotes] = useState({})

  const t = translations[lang]

  const [penalties, setPenalties] = useState([])

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
      const [staffRes, payRes, paymentRes, attRes, attLogRes, advRes, notesRes, leaveRes, summaryRes, leaveReqRes, msgRes, tasksRes, dutyReqRes, penaltyRes] = await Promise.all([
        supabase.from('staff').select('*').eq('id', staffId).single(),
        supabase.from('payroll_entries').select('*').eq('staff_id', staffId).order('year', { ascending: false }).order('month', { ascending: false }).limit(24),
        supabase.from('salary_payments').select('*').eq('staff_id', staffId).order('payment_date', { ascending: false }),
        supabase.from('attendance').select('*').eq('staff_id', staffId).order('date', { ascending: false }).limit(365),
        supabase.from('attendance_log').select('*').eq('staff_id', staffId).order('date', { ascending: false }).limit(365),
        supabase.from('advance_log').select('*').eq('staff_id', staffId).order('date', { ascending: false }),
        supabase.from('staff_notes').select('*').eq('staff_id', staffId).order('created_at', { ascending: false }),
        supabase.from('leave_balance').select('*').eq('staff_id', staffId).eq('year', currentYear).single(),
        supabase.from('monthly_attendance_summary').select('*').eq('staff_id', staffId),
        supabase.from('leave_requests').select('*').eq('staff_id', staffId).order('created_at', { ascending: false }),
        supabase.from('staff_queries').select('*').eq('staff_id', staffId).order('created_at', { ascending: false }),
        fetch(`/api/tasks/list?staff_id=${staffId}`).then(res => res.json()).then(data => ({ data: data.tasks || [], error: null })),
        fetch(`/api/attendance/duty-change?staff_id=${staffId}`).then(res => res.json()).then(data => ({ data: data.requests || [], error: null })),
        supabase.from('staff_penalties').select('*').eq('staff_id', staffId).order('date', { ascending: false })
      ])
      setStaff(staffRes.data)
      setPayroll(payRes.data || [])
      setPayments(paymentRes.data || [])
      setAttendance(attRes.data || [])
      setAttendanceLogs(attLogRes.data || [])
      setAdvances(advRes.data || [])
      setNotes(notesRes.data || [])
      setLeave(leaveRes.data)
      setSummary(summaryRes.data || [])
      setLeaveRequests(leaveReqRes.data || [])
      setMessages(msgRes.data || [])
      setTasks(tasksRes.data || [])
      setDutyRequests(dutyReqRes.data || [])
      setPenalties(penaltyRes.data || [])
    } catch (err) {
      console.error('Error fetching staff data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDutyChangeSubmit(e) {
    e.preventDefault()
    if (!newDutyChange.request_date) return alert('Please select a date')

    try {
      setSubmittingDutyChange(true)
      const res = await fetch('/api/attendance/duty-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staff.id,
          request_date: newDutyChange.request_date,
          request_type: newDutyChange.request_type,
          new_shift_start: newDutyChange.new_shift_start,
          reason: newDutyChange.reason
        })
      })

      const json = await res.json()
      if (res.ok) {
        alert(lang === 'bn' ? 'আবেদন সফলভাবে জমা হয়েছে!' : 'Request submitted successfully!')
        setNewDutyChange({ request_date: '', request_type: 'day_off_swap', new_shift_start: '10:00', reason: '' })
        fetchStaffData(staff.id)
      } else {
        alert(json.error || 'Submission failed')
      }
    } catch (err) {
      alert('Error submitting duty change request')
    } finally {
      setSubmittingDutyChange(false)
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

  async function handleUpdateTaskStatus(taskId, status) {
    try {
      setUpdatingTaskId(taskId)
      const res = await fetch('/api/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          status,
          staff_note: taskNotes[taskId] || '',
          staff_id: staff.id
        })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to update task')
      
      if (status === 'done') {
        alert(lang === 'bn' 
          ? 'কাজের অগ্রগতি সফলভাবে আপডেট করা হয়েছে! (অ্যাডমিন যাচাইয়ের অপেক্ষায়)' 
          : 'Task status updated! (Pending admin verification)')
      } else {
        alert(lang === 'bn' ? 'কাজের অগ্রগতি সফলভাবে আপডেট করা হয়েছে!' : 'Task status updated successfully!')
      }
      const resTasks = await fetch(`/api/tasks/list?staff_id=${staff.id}`)
      const dataTasks = await resTasks.json()
      setTasks(dataTasks.tasks || [])
    } catch (err) {
      alert('Error updating task: ' + err.message)
    } finally {
      setUpdatingTaskId(null)
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
  function isSameMonthYear(dateStr, targetMonth, targetYear) {
    if (!dateStr) return false
    const str = String(dateStr).split('T')[0]
    const parts = str.split('-')
    if (parts.length < 2) return false
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    return m === targetMonth && y === targetYear
  }

  // Unified attendance array merging `attendance` and `attendanceLogs` by date
  const attendanceByDate = {}
  ;(attendanceLogs || []).forEach(l => {
    if (l.date) {
      const dKey = String(l.date).split('T')[0]
      attendanceByDate[dKey] = { ...l, id: l.id || dKey, status: l.status || 'present' }
    }
  })
  ;(attendance || []).forEach(a => {
    if (a.date) {
      const dKey = String(a.date).split('T')[0]
      attendanceByDate[dKey] = { ...(attendanceByDate[dKey] || {}), ...a }
    }
  })
  const unifiedAttendance = Object.values(attendanceByDate).sort((a, b) => (b.date > a.date ? 1 : -1))

  const monthPayroll = payroll.find(p => p.month === selectedMonth && p.year === selectedYear)
  const monthSummary = (summary || []).find(s => s.month === selectedMonth && s.year === selectedYear)
  const monthPayments = payments.filter(p => Number(p.month) === selectedMonth && Number(p.year) === selectedYear)
  const monthAttendance = unifiedAttendance.filter(a => isSameMonthYear(a.date, selectedMonth, selectedYear))
  const monthAdvances = advances.filter(a => a.month === selectedMonth && a.year === selectedYear)
  const totalPaidThisMonth = monthPayments.reduce((s, p) => s + Number(p.amount_paid || p.amount || 0), 0)
  const monthAdvanceTotal = monthAdvances.reduce((s, a) => s + Number(a.amount), 0)

  // Live Overtime calculation from daily attendance logs
  const thisMonthLogs = monthAttendance
  
  const accruedOTHoursRaw = thisMonthLogs.reduce((sum, a) => {
    const hrs = Number(a.overtime_hours || 0)
    const mins = Number(a.overtime_minutes || 0)
    return sum + hrs + (mins > 0 ? mins / 60 : 0)
  }, 0)
  const accruedOTHours = Math.round(accruedOTHoursRaw * 100) / 100

  const totalOTHours = (monthPayroll?.overtime_hours !== undefined && monthPayroll?.overtime_hours !== null && Number(monthPayroll.overtime_hours) > 0)
    ? Number(monthPayroll.overtime_hours)
    : accruedOTHours

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
  const ot = Math.round(totalOTHours * perHourRate)
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
  // Calculate 0.5% penalties for the selected month
  const monthPenalties = (penalties || []).filter(p => {
    if (!p.date) return false
    const d = new Date(p.date)
    return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear
  })
  const monthPenaltyPercent = monthPenalties.reduce((sum, p) => sum + Number(p.penalty_percent || 0.5), 0)
  const grossBeforePenalty = Math.max(0, base + ot + sc + bonus + lunch + morn + misc - adv - others - unpaidDeductionAmount - lateDeduction)
  const penaltyCutAmount = Math.round(grossBeforePenalty * (monthPenaltyPercent / 100))

  const finalSalary = monthPayroll ? Math.max(0, Math.round(base + ot + sc + bonus + lunch + morn + misc - adv - others - unpaidDeductionAmount - lateDeduction - penaltyCutAmount)) : 0
  const remaining = finalSalary - totalPaidThisMonth
  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()

  const tabs = [
    { key: 'overview', icon: <Home size={15} />, label: lang === 'bn' ? 'ওভারভিউ' : 'Overview' },
    { key: 'schedule', icon: <Clock size={15} />, label: t.scheduleTab },
    { key: 'tasks', icon: <CheckSquare size={15} />, label: lang === 'bn' ? 'কাজসমূহ' : 'Tasks' },
    { key: 'salary', icon: <Wallet size={15} />, label: lang === 'bn' ? 'বেতন' : 'Salary' },
    { key: 'attendance', icon: <CalendarDays size={15} />, label: lang === 'bn' ? 'উপস্থিতি' : 'Attendance' },
    { key: 'advances', icon: <TrendingUp size={15} />, label: lang === 'bn' ? 'অগ্রিম' : 'Advances' },
    { key: 'penalties', icon: <AlertTriangle size={15} />, label: lang === 'bn' ? 'জরিমানা' : 'Penalties' },
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

        {/* Urgent Tasks Banner */}
        {tasks.filter(tk => tk.status === 'pending' && (tk.priority === 'urgent' || tk.priority === 'high')).length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
            border: '1.5px solid var(--danger)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--danger)', borderRadius: '50%', padding: '8px', display: 'flex', color: 'white' }}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--danger)' }}>
                  {lang === 'bn' ? 'জরুরি পদক্ষেপ প্রয়োজন!' : 'Urgent Action Required!'}
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '4px 0 0 0', fontWeight: 600 }}>
                  {lang === 'bn' 
                    ? `আপনার জন্য ${tasks.filter(tk => tk.status === 'pending').length}টি কাজ বাকি আছে। অনুগ্রহ করে দ্রুত সম্পন্ন করুন।` 
                    : `You have ${tasks.filter(tk => tk.status === 'pending').length} pending tasks assigned by the administrator.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('tasks')}
              style={{
                background: 'var(--danger)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform 0.2s',
                fontFamily: 'var(--font-sans)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {lang === 'bn' ? 'কাজগুলো দেখুন' : 'View Tasks'}
            </button>
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

        {/* ── MY SCHEDULE TAB ── */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-in">
            {/* Zero-click Quick Answer Banner */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #3D1E15 100%)', color: 'white', padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, color: '#D4933A', fontWeight: 700 }}>
                    {lang === 'bn' ? 'আজকের ডিউটি স্ট্যাটাস' : "Today's Work Status"}
                  </div>
                  <h2 style={{ fontSize: '26px', fontWeight: 900, margin: '6px 0 0 0', color: 'white' }}>
                    {(() => {
                      const today = new Date().toISOString().split('T')[0]
                      const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
                      const isDefaultOff = staff?.weekly_off && dayName.toLowerCase() === staff.weekly_off.toLowerCase()
                      if (isDefaultOff) return lang === 'bn' ? 'আজ আপনার সাপ্তাহিক ছুটি' : 'Today is your Weekly Off Day'
                      return (lang === 'bn' ? 'আজ ডিউটি আছে: ' : 'Working Today: ') + (staff?.shift_start ? staff.shift_start.slice(0, 5) : '08:00') + ' AM'
                    })()}
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.8 }}>{t.nextOff}</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#D4933A', marginTop: '2px' }}>{staff?.weekly_off || 'Friday'}</div>
                  </div>
                  <button
                    onClick={() => setShowIdCard(true)}
                    style={{
                      background: 'rgba(212, 147, 58, 0.2)',
                      border: '1px solid #D4933A',
                      color: '#D4933A',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {lang === 'bn' ? 'আমার আইডি কার্ড দেখুন' : 'View My ID Card'}
                  </button>
                </div>
              </div>
            </div>

            {/* Duty Change Request Form */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                {t.dutyChangeTitle}
              </h3>

              <form onSubmit={handleDutyChangeSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label className="label">{t.swapType}</label>
                  <select
                    className="input"
                    value={newDutyChange.request_type}
                    onChange={e => setNewDutyChange({ ...newDutyChange, request_type: e.target.value })}
                  >
                    <option value="day_off_swap">{t.dayOffSwap}</option>
                    <option value="shift_swap">{t.shiftSwap}</option>
                  </select>
                </div>

                <div>
                  <label className="label">{t.requestDate}</label>
                  <input
                    type="date"
                    className="input"
                    value={newDutyChange.request_date}
                    onChange={e => setNewDutyChange({ ...newDutyChange, request_date: e.target.value })}
                    required
                  />
                </div>

                {newDutyChange.request_type === 'shift_swap' && (
                  <div>
                    <label className="label">{t.newTime}</label>
                    <select
                      className="input"
                      value={newDutyChange.new_shift_start || '08:00'}
                      onChange={e => setNewDutyChange({ ...newDutyChange, new_shift_start: e.target.value })}
                    >
                      <option value="08:00">8:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="13:00">1:00 PM (13:00)</option>
                    </select>
                  </div>
                )}

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">{lang === 'bn' ? 'কারণ' : 'Reason'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder={lang === 'bn' ? 'আবেদনের কারণ সংক্ষেপে লিখুন...' : 'Write reason for change request...'}
                    value={newDutyChange.reason}
                    onChange={e => setNewDutyChange({ ...newDutyChange, reason: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <button
                    type="submit"
                    disabled={submittingDutyChange}
                    className="btn-primary"
                    style={{ background: '#6B3A2A', color: 'white', border: 'none', padding: '10px 24px' }}
                  >
                    {submittingDutyChange ? (lang === 'bn' ? 'জমা হচ্ছে...' : 'Submitting...') : t.submitDutyChange}
                  </button>
                </div>
              </form>
            </div>

            {/* Submitted Requests List */}
            {dutyRequests.length > 0 && (
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                  {lang === 'bn' ? 'আমার আবেদনসমূহ' : 'My Submitted Duty Change Requests'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dutyRequests.map(req => (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>
                          {req.request_type === 'day_off_swap' ? (lang === 'bn' ? 'ছুটির দিন পরিবর্তন' : 'Day Off Swap') : (lang === 'bn' ? 'শিফট পরিবর্তন' : 'Shift Swap')} — {req.request_date}
                        </div>
                        {req.reason && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>"{req.reason}"</div>}
                      </div>

                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, background: req.status === 'pending' ? '#FFF3E0' : req.status === 'approved' ? '#E8F5E9' : '#FFEBEE', color: req.status === 'pending' ? '#E65100' : req.status === 'approved' ? '#2E7D32' : '#C62828', textTransform: 'capitalize' }}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-in">

            {/* ── Phase 3C: Overtime Transparency Card ── */}
            {(() => {
              const totalHoursRaw = thisMonthLogs.reduce((sum, a) => sum + Number(a.hours_worked || 0), 0)
              const totalHours = Math.round(totalHoursRaw * 100) / 100
              const accrued = Math.round(totalOTHours * perHourRate)
              const workingDays = thisMonthLogs.filter(a => a.status === 'present' || a.status === 'late').length

              return (
                <div className="card" style={{ padding: '18px 22px', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-subtle))', border: '1.5px solid var(--border-light)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={15} style={{ color: 'var(--accent-blue)' }} />
                    {lang === 'bn' ? 'এই মাসের ঘণ্টা ও ওভারটাইম' : `${monthNames[selectedMonth - 1]} ${selectedYear} — Hours & Overtime`}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                    {[
                      { label: lang === 'bn' ? 'কাজের দিন' : 'Days Present', value: workingDays, unit: 'days', color: 'var(--text-primary)' },
                      { label: lang === 'bn' ? 'মোট ঘণ্টা' : 'Total Hours Worked', value: totalHours, unit: 'hrs', color: 'var(--accent-blue)' },
                      { label: lang === 'bn' ? 'ওভারটাইম ঘণ্টা' : 'Overtime Hours', value: totalOTHours, unit: 'hrs', color: '#D4933A' },
                      { label: lang === 'bn' ? 'অর্জিত ওটি পে' : 'Accrued OT Pay', value: `৳${accrued.toLocaleString()}`, unit: '', color: 'var(--success)' },
                    ].map((item, i) => (
                      <div key={i} style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '12px 14px', border: '1px solid var(--border-light)' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{item.label}</p>
                        <p style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: item.color, fontFamily: 'var(--font-mono)' }}>
                          {item.value}{item.unit ? <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '3px', color: 'var(--text-muted)' }}>{item.unit}</span> : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                  {!isCurrentMonth && (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '10px 0 0', fontStyle: 'italic' }}>
                      ⚠️ {lang === 'bn' ? 'চূড়ান্ত পেরোল এন্ট্রি থেকে OT পার্থক্য হতে পারে' : 'Final OT pay may differ from payroll entry after processing'}
                    </p>
                  )}
                </div>
              )
            })()}

            {monthPayroll ? (

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                      {lang === 'bn' ? 'বেতনের বিবরণ' : 'Salary Breakdown'} — {monthNames[selectedMonth - 1]} {selectedYear}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'var(--font-sans)' }}>
                      {lang === 'bn' ? 'উপার্জন ও কর্তনের সহজ হিসাব' : 'Easy Earnings & Deductions Breakdown'}
                    </p>
                  </div>
                  <button
                    onClick={() => setPrintData({
                      staff, payroll: { ...monthPayroll, final_salary: finalSalary, is_paid: totalPaidThisMonth >= finalSalary, is_waived: isCurrentMonth ? false : monthPayroll?.late_waived },
                      month: monthNames[selectedMonth - 1], year: selectedYear
                    })}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-light)', cursor: 'pointer', fontWeight: 600, fontSize: '12.5px', fontFamily: 'var(--font-sans)' }}
                  >
                    <Printer size={14} /> {lang === 'bn' ? 'পে-স্লিপ প্রিন্ট' : 'Print Pay Slip'}
                  </button>
                </div>

                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  
                  {/* Payment Progress Header */}
                  <div style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', textAlign: 'center' }}>
                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 700 }}>
                          {lang === 'bn' ? 'মোট বেতন' : 'Net Salary'}
                        </p>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent-brown)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                          ৳{finalSalary.toLocaleString()}
                        </p>
                      </div>

                      <div style={{ background: 'var(--success-bg)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <p style={{ fontSize: '11px', color: 'var(--success)', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 700 }}>
                          {lang === 'bn' ? 'প্রদত্ত (Paid)' : 'Paid to Date'}
                        </p>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--success)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                          ৳{totalPaidThisMonth.toLocaleString()}
                        </p>
                      </div>

                      <div style={{ background: remaining > 0 ? 'var(--danger-bg)' : 'var(--success-bg)', padding: '12px', borderRadius: '10px', border: `1px solid ${remaining > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                        <p style={{ fontSize: '11px', color: remaining > 0 ? 'var(--danger)' : 'var(--success)', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 700 }}>
                          {remaining > 0 ? (lang === 'bn' ? 'বকেয়া (Due)' : 'Balance Due') : (lang === 'bn' ? 'অবস্থা' : 'Status')}
                        </p>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: remaining > 0 ? 'var(--danger)' : 'var(--success)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                          {remaining > 0 ? `৳${remaining.toLocaleString()}` : (lang === 'bn' ? '✓ সম্পূর্ণ শোধ' : '✓ Paid')}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {finalSalary > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}>
                          <span>{lang === 'bn' ? 'পেমেন্ট অগ্রগতির হার' : 'Payment Completed'}</span>
                          <span>{Math.min(100, Math.round((totalPaidThisMonth / finalSalary) * 100))}%</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (totalPaidThisMonth / finalSalary) * 100)}%`,
                            background: totalPaidThisMonth >= finalSalary ? 'var(--success)' : 'linear-gradient(90deg, #6B3A2A, #D4933A)',
                            borderRadius: '10px',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Earnings vs Deductions 2-Column Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    
                    {/* 🟢 Earnings Card */}
                    <div style={{
                      background: 'var(--bg-card)',
                      border: '1.5px solid rgba(16,185,129,0.25)',
                      borderRadius: '14px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ background: 'var(--success-bg)', padding: '12px 16px', borderBottom: '1px solid rgba(16,185,129,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🟢 {lang === 'bn' ? 'উপার্জন (Earnings)' : 'Gross Earnings'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                          +৳{(base + ot + sc + bonus + lunch + morn + (misc > 0 ? misc : 0)).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{lang === 'bn' ? 'মূল বেতন (Base Salary)' : 'Base Salary'}</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>৳{base.toLocaleString()}</span>
                        </div>
                        {ot > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{lang === 'bn' ? 'ওভারটাইম (Overtime)' : 'Overtime Pay'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>+৳{ot.toLocaleString()}</span>
                          </div>
                        )}
                        {sc > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{lang === 'bn' ? 'সার্ভিস চার্জ (Service Charge)' : 'Service Charge'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>+৳{sc.toLocaleString()}</span>
                          </div>
                        )}
                        {bonus > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{lang === 'bn' ? 'বোনাস (Bonus)' : 'Bonus'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>+৳{bonus.toLocaleString()}</span>
                          </div>
                        )}
                        {(lunch + morn) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{lang === 'bn' ? 'খাবার ভাতা (Food Allowance)' : 'Food Allowance'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>+৳{(lunch + morn).toLocaleString()}</span>
                          </div>
                        )}
                        {misc > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{lang === 'bn' ? 'বিবিধ যোগ (Misc)' : 'Miscellaneous Add'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>+৳{misc.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 🔴 Deductions Card */}
                    <div style={{
                      background: 'var(--bg-card)',
                      border: '1.5px solid rgba(239,68,68,0.25)',
                      borderRadius: '14px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ background: 'var(--danger-bg)', padding: '12px 16px', borderBottom: '1px solid rgba(239,68,68,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🔴 {lang === 'bn' ? 'কর্তন / কাটা (Deductions)' : 'Total Deductions'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                          -৳{(adv + others + unpaidDeductionAmount + lateDeduction + (misc < 0 ? Math.abs(misc) : 0)).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {adv > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{lang === 'bn' ? 'অগ্রিম গ্রহণ (Advance Taken)' : 'Advance Taken'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>-৳{adv.toLocaleString()}</span>
                          </div>
                        )}
                        {unpaidDeductionAmount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {lang === 'bn' ? `অনুপস্থিতি (${unpaidDeductionDays} দিন)` : `Unpaid Leave (${unpaidDeductionDays}d)`}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>-৳{unpaidDeductionAmount.toLocaleString()}</span>
                          </div>
                        )}
                        {lateDeduction > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {lang === 'bn' ? `দেরির জন্য কাটা (${lateDeductionDays} দিন)` : `Late Deduction (${lateDeductionDays}d)`}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>-৳{lateDeduction.toLocaleString()}</span>
                          </div>
                        )}
                        {isLateWaived && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{lang === 'bn' ? 'দেরি জরিমানা' : 'Late Penalty'}</span>
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓ {lang === 'bn' ? 'মৌকুফ (Waived)' : 'Waived'}</span>
                          </div>
                        )}
                        {others > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{lang === 'bn' ? 'অন্যান্য কাটা (Others)' : 'Others Deduction'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>-৳{others.toLocaleString()}</span>
                          </div>
                        )}
                        {penaltyCutAmount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {lang === 'bn' ? `সার্ভিস জরিমানা (-0.5% × ${monthPenalties.length} দিন)` : `Service Penalty (-0.5% × ${monthPenalties.length}d)`}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>-৳{penaltyCutAmount.toLocaleString()}</span>
                          </div>
                        )}
                        {misc < 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{lang === 'bn' ? 'বিবিধ কাটা (Misc)' : 'Miscellaneous Sub'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>-৳{Math.abs(misc).toLocaleString()}</span>
                          </div>
                        )}
                        {adv === 0 && unpaidDeductionAmount === 0 && lateDeduction === 0 && others === 0 && misc >= 0 && (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>
                            ✓ {lang === 'bn' ? 'কোনো টাকা কাটা হয়নি' : 'No deductions this month'}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Math Equation Bar */}
                  <div style={{
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>
                      <span style={{ color: '#4ADE80' }}>+৳{(base + ot + sc + bonus + lunch + morn + (misc > 0 ? misc : 0)).toLocaleString()}</span>
                      <span>−</span>
                      <span style={{ color: '#F87171' }}>৳{(adv + others + unpaidDeductionAmount + lateDeduction + (misc < 0 ? Math.abs(misc) : 0)).toLocaleString()}</span>
                      <span>=</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#E2E8F0', fontWeight: 700, fontSize: '14px' }}>
                        {lang === 'bn' ? 'নিট দেয় বেতন' : 'Net Salary'}
                      </span>
                      <span style={{ color: '#F59E0B', fontWeight: 900, fontSize: '22px', fontFamily: 'var(--font-mono)' }}>
                        ৳{finalSalary.toLocaleString()}
                      </span>
                    </div>
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
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>৳{Number(p.amount_paid || p.amount || 0).toLocaleString()}</span>
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
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      {/* Earnings */}
                      <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(16,185,129,0.15)', pb: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--success)' }}>🟢 {lang === 'bn' ? 'মোট উপার্জন' : 'Earnings'}</span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>+৳{(pBase + pOt + Number(p.service_charge || 0) + Number(p.bonus || 0) + Number(p.lunch_dinner || 0) + Number(p.morning_food || 0) + (pMisc > 0 ? pMisc : 0)).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base:</span><b>৳{pBase.toLocaleString()}</b></div>
                          {pOt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>OT:</span><b>+৳{pOt.toLocaleString()}</b></div>}
                          {Number(p.service_charge) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Service:</span><b>+৳{Number(p.service_charge).toLocaleString()}</b></div>}
                          {Number(p.bonus) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bonus:</span><b>+৳{Number(p.bonus).toLocaleString()}</b></div>}
                          {(Number(p.lunch_dinner) + Number(p.morning_food)) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Food:</span><b>+৳{(Number(p.lunch_dinner) + Number(p.morning_food)).toLocaleString()}</b></div>}
                        </div>
                      </div>

                      {/* Deductions */}
                      <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(239,68,68,0.15)', pb: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--danger)' }}>🔴 {lang === 'bn' ? 'মোট কর্তন' : 'Deductions'}</span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>-৳{(pAdv + pOthers + pUnpaid + pLateDeduct + (pMisc < 0 ? Math.abs(pMisc) : 0)).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {pAdv > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Advance:</span><b>-৳{pAdv.toLocaleString()}</b></div>}
                          {pUnpaid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Unpaid Lv:</span><b>-৳{pUnpaid.toLocaleString()}</b></div>}
                          {pLateDeduct > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Late:</span><b>-৳{pLateDeduct.toLocaleString()}</b></div>}
                          {pOthers > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Others:</span><b>-৳{pOthers.toLocaleString()}</b></div>}
                          {pAdv === 0 && pUnpaid === 0 && pLateDeduct === 0 && pOthers === 0 && (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>✓ No deductions</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'bn' ? 'গৃহীত: ' : 'Received: '}</span>
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>৳{tPaid.toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'bn' ? 'বকেয়া: ' : 'Remaining: '}</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-in">
            
            {/* Top Attendance KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '26px', fontWeight: 900, color: 'var(--success)', margin: 0, lineHeight: 1 }}>{presentDays}</p>
                <p style={{ fontSize: '11px', color: 'var(--success)', margin: '5px 0 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {lang === 'bn' ? 'উপস্থিত' : 'Present'}
                </p>
              </div>

              <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '26px', fontWeight: 900, color: 'var(--danger)', margin: 0, lineHeight: 1 }}>{absentDays}</p>
                <p style={{ fontSize: '11px', color: 'var(--danger)', margin: '5px 0 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {lang === 'bn' ? 'অনুপস্থিত' : 'Absent'}
                </p>
              </div>

              <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '26px', fontWeight: 900, color: 'var(--warning)', margin: 0, lineHeight: 1 }}>{lateDays}</p>
                <p style={{ fontSize: '11px', color: 'var(--warning)', margin: '5px 0 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {lang === 'bn' ? 'দেরি আগমন' : 'Late Arrivals'}
                </p>
              </div>

              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '24px', fontWeight: 900, color: '#D4933A', margin: 0, lineHeight: 1 }}>
                  {totalOTHours} <span style={{ fontSize: '12px', fontWeight: 600 }}>hrs</span>
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '5px 0 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {lang === 'bn' ? 'ওভারটাইম' : 'Overtime'}
                </p>
              </div>
            </div>

            {/* Attendance Rules Notice */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '12.5px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '18px' }}>💡</span>
              <div>
                <b>{lang === 'bn' ? 'উপস্থিতি নিয়ম:' : 'Attendance Rules:'}</b>{' '}
                {lang === 'bn' 
                  ? 'প্রতি মাসে প্রথম ৪ দিন অনুপস্থিতি বিনামূল্যে (বেতন কাটা হয় না)। ৫ম দিন থেকে বেতন কাটা শুরু হয়। প্রতি ৩ দিন দেরিতে আগমনে ১ দিনের বেতন কর্তন হয় (অ্যাডমিন মৌকুফ না করলে)।' 
                  : 'First 4 absent days per month are FREE (no salary cut). Unpaid deductions start from the 5th absent day. 3 late arrivals equal 1 day salary deduction unless waived.'}
              </div>
            </div>

            {/* Daily Shift Timeline Cards */}
            {monthAttendance.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {lang === 'bn' ? `${monthNames[selectedMonth - 1]} ${selectedYear}-এর কোনো উপস্থিতি রেকর্ড পাওয়া যায়নি` : `No attendance log for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {monthAttendance.map(a => {
                  const log = attendanceLogs.find(l => l.date === a.date)
                  const statusColors = { present: 'var(--success)', absent: 'var(--danger)', half_day: 'var(--warning)', late: 'var(--info)' }
                  const color = statusColors[a.status] || 'var(--text-muted)'

                  const checkInStr = log?.check_in_at 
                    ? new Date(log.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
                    : null
                  const checkOutStr = log?.check_out_at 
                    ? new Date(log.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
                    : null

                  const otMins = Number(log?.overtime_hours || a.overtime_hours || 0)
                  const lateMins = Number(log?.minutes_late || 0)

                  return (
                    <div key={a.id} style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            {new Date(a.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: color + '18', color, textTransform: 'capitalize' }}>
                          {a.status === 'present' ? (lang === 'bn' ? '🟢 উপস্থিত' : '🟢 Present') :
                           a.status === 'absent' ? (lang === 'bn' ? '🔴 অনুপস্থিত' : '🔴 Absent') :
                           a.status === 'late' ? (lang === 'bn' ? '🟡 দেরি' : '🟡 Late') :
                           a.status === 'half_day' ? (lang === 'bn' ? '🟠 আধা দিন' : '🟠 Half Day') : a.status}
                        </span>
                      </div>

                      {/* Shift Timings */}
                      {(checkInStr || checkOutStr || log?.hours_worked) && (
                        <div style={{
                          background: 'var(--bg-subtle)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                          fontSize: '12.5px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {checkInStr && <span><b>In:</b> {checkInStr}</span>}
                            {checkOutStr && <span><b>Out:</b> {checkOutStr}</span>}
                          </div>
                          {log?.hours_worked > 0 && (
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                              {lang === 'bn' ? `মোট: ${log.hours_worked} ঘণ্টা` : `Total: ${log.hours_worked} hrs`}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Overtime & Late info badges */}
                      {(otMins > 0 || lateMins > 0 || a.note) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
                          {otMins > 0 && (
                            <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                              ⚡ +{otMins} {lang === 'bn' ? 'ঘণ্টা ওভারটাইম' : 'hrs Overtime'}
                            </span>
                          )}
                          {lateMins > 0 && (
                            <span style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                              ⏰ {lateMins} {lang === 'bn' ? 'মিনিট দেরি' : 'mins late'}
                            </span>
                          )}
                          {a.note && (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              💬 {a.note}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

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

        {/* ── PENALTIES & SALARY CUTS TAB ── */}
        {activeTab === 'penalties' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-in">
            <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '14px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 800 }}>
                  {lang === 'bn' ? 'সার্ভিস জরিমানা ও বেতন কর্তন' : 'Service Penalties & Salary Cuts'} — {monthNames[selectedMonth - 1]} {selectedYear}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {lang === 'bn' ? `মোট চিহ্নিত তারিখ: ${monthPenalties.length} দিন (-0.5% প্রতি তারিখ)` : `Total Penalty Dates: ${monthPenalties.length} days (-0.5% per date)`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase' }}>
                  -{monthPenaltyPercent}% {lang === 'bn' ? 'কাটা' : 'Cut'}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--danger)' }}>
                  -৳{penaltyCutAmount.toLocaleString()}
                </div>
              </div>
            </div>

            {monthPenalties.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✓</div>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {lang === 'bn' ? `${monthNames[selectedMonth - 1]} মাসে কোনো সার্ভিস জরিমানা নেই!` : `No service penalties recorded for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
                </p>
              </div>
            ) : monthPenalties.map(p => {
              const estCut = Math.round(grossBeforePenalty * (Number(p.penalty_percent || 0.5) / 100))
              return (
                <div key={p.id || p.date} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderLeft: '4px solid var(--danger)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {new Date(p.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {p.reason ? `Reason: "${p.reason}"` : (lang === 'bn' ? 'সার্ভিস জরিমানা (Service Penalty)' : 'Service Penalty')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800 }}>
                      -{p.penalty_percent || 0.5}% CUT
                    </span>
                    {estCut > 0 && (
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--danger)', marginTop: '4px' }}>
                        -৳{estCut.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
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

        {/* ── TASKS TAB ── */}
        {activeTab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-in">
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ClipboardList size={22} color="var(--primary)" />
                  {t.todoTab}
                </h3>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12.5px', fontWeight: 700 }}>
                  <span style={{ color: 'var(--success)' }}>
                    {t.tasksCompleted}: {tasks.filter(tk => tk.status === 'done').length}
                  </span>
                  <span style={{ color: 'var(--warning)' }}>
                    {t.tasksPending}: {tasks.filter(tk => tk.status === 'pending').length}
                  </span>
                </div>
              </div>

              {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={36} style={{ marginBottom: '12px', opacity: 0.4, color: 'var(--success)' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>{t.noTasks}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {tasks.map(task => {
                    const isUrgent = task.priority === 'urgent'
                    const isHigh = task.priority === 'high'
                    const pColor = isUrgent ? 'var(--danger)' : isHigh ? 'var(--warning)' : 'var(--success)'
                    
                    const isDone = task.status === 'done'
                    const isNotDone = task.status === 'not_done'
                    
                    const statusBg = isDone 
                      ? (task.is_verified ? 'var(--success-bg)' : 'var(--warning-bg)') 
                      : isNotDone ? 'var(--danger-bg)' : 'var(--warning-bg)'
                    const statusColor = isDone 
                      ? (task.is_verified ? 'var(--success)' : 'var(--warning)') 
                      : isNotDone ? 'var(--danger)' : 'var(--warning)'
                    
                    const statusText = isDone 
                      ? (task.is_verified ? (lang === 'bn' ? 'যাচাইকৃত সম্পন্ন' : 'Verified Done') : (lang === 'bn' ? 'যাচাইকরণ পেন্ডিং' : 'Pending Verification'))
                      : isNotDone ? t.statusNotDone : t.statusPending

                    return (
                      <div key={task.id} style={{
                        background: 'var(--bg-surface)',
                        border: `1.5px solid ${isUrgent && !isDone ? 'var(--danger)' : 'var(--border-light)'}`,
                        borderRadius: '14px',
                        padding: '18px',
                        boxShadow: 'var(--shadow-xs)',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontSize: '11px', background: 'var(--bg-subtle)', color: pColor, fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {task.priority === 'urgent' ? t.priorityUrgent : task.priority === 'high' ? t.priorityHigh : task.priorityNormal}
                            </span>
                            <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '6px 0 2px 0', color: 'var(--text-primary)' }}>
                              {task.title}
                            </h4>
                          </div>
                          <span style={{ background: statusBg, color: statusColor, fontWeight: 800, fontSize: '11.5px', padding: '3px 10px', borderRadius: '6px' }}>
                            {statusText}
                          </span>
                        </div>

                        {task.description && (
                          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.55 }}>
                            {task.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                          <CalendarDays size={14} />
                          <span>{t.dueDate}: {task.due_date ? new Date(task.due_date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium' }) : 'N/A'}</span>
                        </div>

                        {/* Note Input */}
                        {!isDone && (
                          <div style={{ marginBottom: '14px' }}>
                            <input
                              type="text"
                              value={taskNotes[task.id] || ''}
                              onChange={e => setTaskNotes({ ...taskNotes, [task.id]: e.target.value })}
                              placeholder={t.notePlaceholder}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1.5px solid var(--border-light)',
                                background: 'var(--bg-base)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontFamily: 'var(--font-sans)'
                              }}
                            />
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!isDone && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'done')}
                              disabled={updatingTaskId === task.id}
                              style={{
                                flex: 1,
                                background: 'var(--success)',
                                color: 'white',
                                border: 'none',
                                padding: '10px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'opacity 0.2s'
                              }}
                            >
                              <CheckCircle2 size={15} />
                              {lang === 'bn' ? 'সম্পন্ন চিহ্নিত করুন' : 'Mark Done'}
                            </button>
                          )}

                          {!isNotDone && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'not_done')}
                              disabled={updatingTaskId === task.id}
                              style={{
                                flex: 1,
                                background: 'var(--danger)',
                                color: 'white',
                                border: 'none',
                                padding: '10px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'opacity 0.2s'
                              }}
                            >
                              <XCircle size={15} />
                              {lang === 'bn' ? 'অসম্পন্ন চিহ্নিত করুন' : 'Mark Not Done'}
                            </button>
                          )}

                          {(isDone || isNotDone) && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'pending')}
                              disabled={updatingTaskId === task.id}
                              style={{
                                flex: 1,
                                background: 'var(--bg-subtle)',
                                color: 'var(--text-secondary)',
                                border: '1.5px solid var(--border-medium)',
                                padding: '9px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                            >
                              <Clock size={15} />
                              {lang === 'bn' ? 'আবার শুরু করুন' : 'Reopen / Mark Pending'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
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
                      <option value="sick">{lang === 'bn' ? 'অসুস্থ ছুটি' : 'Sick Leave'}</option>
                      <option value="casual">{lang === 'bn' ? 'নৈমিত্তিক ছুটি' : 'Casual Leave'}</option>
                      <option value="annual">{lang === 'bn' ? 'বার্ষিক ছুটি' : 'Annual Leave'}</option>
                      <option value="unpaid">{lang === 'bn' ? 'বিনা বেতনে ছুটি' : 'Unpaid Leave'}</option>
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

      {/* Staff ID Card Modal */}
      {showIdCard && staff && (
        <Modal
          isOpen={showIdCard}
          onClose={() => setShowIdCard(false)}
          title={lang === 'bn' ? 'স্টাফ আইডি কার্ড' : 'Official Staff ID Card'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div id="printable-staff-card" style={{
              width: '320px',
              background: '#FFFFFF',
              border: '2px solid #6B3A2A',
              borderRadius: '16px',
              padding: '20px',
              color: '#1C1410',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              textAlign: 'center',
              position: 'relative',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {/* Header Banner */}
              <div style={{
                background: '#6B3A2A',
                color: 'white',
                margin: '-20px -20px 16px -20px',
                padding: '14px 12px',
                borderTopLeftRadius: '14px',
                borderTopRightRadius: '14px'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px', color: '#D4933A' }}>CROWN COFFEE</div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.9 }}>Official Staff ID Card</div>
              </div>

              {/* Photo */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                {staff.photo_url ? (
                  <img
                    src={staff.photo_url}
                    alt={staff.name}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #6B3A2A' }}
                  />
                ) : (
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#FAF7F2',
                    border: '3px solid #6B3A2A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#6B3A2A'
                  }}>
                    {staff.name ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'CC'}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1C1410', marginBottom: '2px' }}>{staff.name}</div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#6B3A2A', fontWeight: 700, marginBottom: '10px' }}>
                {staff.designation}
              </div>

              <div style={{
                display: 'inline-block',
                background: '#FAF7F2',
                border: '1px dashed #6B3A2A',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#6B3A2A',
                marginBottom: '14px'
              }}>
                ID: {staff.employee_id || 'CC-001'}
              </div>

              {/* Details Grid */}
              <div style={{
                background: '#F9F6F0',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '11px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#777' }}>NID:</span>
                  <span style={{ fontWeight: 600 }}>{staff.nid || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#777' }}>Blood Group:</span>
                  <span style={{ fontWeight: 700, color: '#d32f2f' }}>{staff.blood_group || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#777' }}>Emergency Contact:</span>
                  <span style={{ fontWeight: 600 }}>{staff.emergency_phone || staff.emergency_contact || 'N/A'}</span>
                </div>
              </div>

              {/* QR Code */}
              <div style={{ background: 'white', padding: '8px', borderRadius: '8px', display: 'inline-block', border: '1px solid #E8E0D4' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(staff.employee_id || staff.id)}`}
                  alt="Staff QR Code"
                  style={{ width: '90px', height: '90px', display: 'block' }}
                />
              </div>
              <div style={{ fontSize: '9px', color: '#999', marginTop: '4px' }}>Scan for attendance / check-in</div>
            </div>

            <button
              onClick={() => window.print()}
              className="btn-primary"
              style={{ background: '#6B3A2A', color: 'white', border: 'none', width: '100%', padding: '12px' }}
            >
              {lang === 'bn' ? 'আইডি কার্ড প্রিন্ট করুন' : 'Print Staff ID Card'}
            </button>
          </div>
        </Modal>
      )}

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