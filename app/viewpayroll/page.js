'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import {
  Printer, X, History, RefreshCw, Lock, Eye, EyeOff,
  UserCheck, ShieldCheck, LogOut, ChevronDown, ChevronUp,
  Search, CheckCircle2, Clock, AlertCircle, Coffee, DollarSign,
  Calendar, ArrowDownRight, ArrowUpRight, FileText, Info
} from 'lucide-react'
import dynamic from 'next/dynamic'

const PaySlip = dynamic(() => import('../../components/PaySlip'), { ssr: false })

function getShiftType(log, staffDefaultShift = '11:00') {
  if (log?.check_in_at) {
    const d = new Date(log.check_in_at)
    if (!isNaN(d.getTime())) {
      const bstHour = (d.getUTCHours() + 6) % 24
      const bstMin = d.getUTCMinutes()
      const totalMins = bstHour * 60 + bstMin
      if (bstHour < 6) return 'night'
      return totalMins < 735 ? 'morning' : 'night'
    }
  }

  const shiftStr = String(log?.shift_start || staffDefaultShift || '').trim()
  const hourMatch = shiftStr.match(/^(\d{1,2})/)
  if (hourMatch) {
    const h = parseInt(hourMatch[1], 10)
    if (h >= 13) return 'night'
    return 'morning'
  }
  return 'morning'
}

const LOADING_STEPS = [
  { label: 'Verifying credentials & access...' },
  { label: 'Connecting to database...' },
  { label: 'Fetching staff payroll records...' },
  { label: 'Calculating overtime, food & deductions...' },
  { label: 'Preparing itemized salary breakdown...' },
]

export default function ViewPayrollPage() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())

  // Auth State
  const [authRole, setAuthRole] = useState(null) // null | 'admin' | 'staff'
  const [authStaff, setAuthStaff] = useState(null) // staff object if role === 'staff'
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [disambiguationOptions, setDisambiguationOptions] = useState(null)

  // Data State
  const [staff, setStaff] = useState([])
  const [payroll, setPayroll] = useState({})
  const [payments, setPayments] = useState({})
  const [advanceDetails, setAdvanceDetails] = useState({})
  const [showHistory, setShowHistory] = useState(null)
  const [expandedBreakdowns, setExpandedBreakdowns] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState(0)
  const [printData, setPrintData] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [waivedStaff, setWaivedStaff] = useState({})

  // Check existing session on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('cc_viewpayroll_session')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.role === 'admin') {
          setAuthRole('admin')
        } else if (parsed.role === 'staff' && parsed.staff) {
          setAuthRole('staff')
          setAuthStaff(parsed.staff)
        }
      }
    } catch (e) {
      console.warn('Could not read session:', e)
    }
  }, [])

  useEffect(() => {
    fetchAll(month, year)
  }, [month, year])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % LOADING_STEPS.length)
    }, 800)
    return () => clearInterval(interval)
  }, [loading])

  async function fetchAll(m, y) {
    setLoading(true)
    await fetchPayroll(m, y)
    await fetchPayments(m, y)
    setLoading(false)
  }

  async function fetchPayroll(m, y) {
    try {
      const startDate = new Date(y, m - 1, 1).toISOString().split('T')[0]
      const endDate = new Date(y, m, 0).toISOString().split('T')[0]

      // Fetch active staff
      let activeStaffList = []
      try {
        const staffApiResponse = await fetch('/api/staff')
        if (staffApiResponse.ok) {
          const staffApiJson = await staffApiResponse.json()
          if (staffApiJson.data && staffApiJson.data.length > 0) {
            activeStaffList = staffApiJson.data.filter(s => s.is_active)
          }
        }
      } catch (err) {
        console.warn('API /api/staff fetch fallback to client:', err)
      }

      if (activeStaffList.length === 0) {
        const clientStaffRes = await supabase
          .from('staff')
          .select('*')
          .eq('is_active', true)
          .order('serial', { ascending: true })
          .order('name', { ascending: true })
        activeStaffList = clientStaffRes.data || []
      }

      const safe = (q) => Promise.resolve(q).catch(() => ({ data: [] }))

      const [payRes, advRes, unpaidRes, lateRes, presentRes, summaryRes, otRes, logRes] = await Promise.all([
        safe(supabase.from('payroll_entries').select('*').eq('month', m).eq('year', y)),
        safe(supabase.from('advance_log').select('id, staff_id, amount, date, reason').eq('month', m).eq('year', y).order('date', { ascending: false })),
        safe(supabase.from('attendance').select('staff_id').eq('leave_type', 'unpaid').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('attendance').select('staff_id').eq('status', 'late').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('attendance').select('staff_id').eq('status', 'present').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('monthly_attendance_summary').select('*').eq('month', m).eq('year', y)),
        safe(supabase.from('overtime_logs').select('staff_id, overtime_hours, overtime_pay, manual_override, manual_overtime_hours, manual_overtime_pay').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('attendance_log').select('staff_id, status, hours_worked, overtime_minutes, shift_start, check_in_at').gte('date', startDate).lte('date', endDate))
      ])

      const summaryMap = {}
      ;(summaryRes.data || []).forEach(s => {
        summaryMap[s.staff_id] = s
      })

      const advancesMap = {}
      const advanceListMap = {}
      ;(advRes.data || []).forEach(a => {
        advancesMap[a.staff_id] = (advancesMap[a.staff_id] || 0) + Number(a.amount)
        if (!advanceListMap[a.staff_id]) advanceListMap[a.staff_id] = []
        advanceListMap[a.staff_id].push(a)
      })
      setAdvanceDetails(advanceListMap)

      const reportStaffMap = {}
      try {
        const reportRes = await fetch(`/api/attendance/report?month=${m}&year=${y}`)
        if (reportRes.ok) {
          const reportJson = await reportRes.json()
          ;(reportJson.reports || []).forEach(r => {
            reportStaffMap[r.staff_id] = r
          })
        }
      } catch (err) {
        console.warn('Failed to fetch attendance report in viewpayroll:', err)
      }

      const unpaidMap = {}
      ;(unpaidRes.data || []).forEach(a => {
        unpaidMap[a.staff_id] = (unpaidMap[a.staff_id] || 0) + 1
      })

      const lateMap = {}
      ;(lateRes.data || []).forEach(a => {
        lateMap[a.staff_id] = (lateMap[a.staff_id] || 0) + 1
      })

      const presentMap = {}
      ;(presentRes.data || []).forEach(a => {
        presentMap[a.staff_id] = (presentMap[a.staff_id] || 0) + 1
      })

      const attLogs = logRes?.data || []
      const logLateMap = {}
      const logPresentMap = {}
      const logAbsentMap = {}
      const logOffMap = {}
      const logOtMap = {}
      const logMorningDays = {}
      const logNightDays = {}

      attLogs.forEach(l => {
        if (l.status === 'late') logLateMap[l.staff_id] = (logLateMap[l.staff_id] || 0) + 1
        if (l.status === 'present' || l.status === 'late') {
          logPresentMap[l.staff_id] = (logPresentMap[l.staff_id] || 0) + 1
          const staffMember = activeStaffList.find(st => st.id === l.staff_id)
          const shift = getShiftType(l, staffMember?.shift_start)
          if (shift === 'morning') {
            logMorningDays[l.staff_id] = (logMorningDays[l.staff_id] || 0) + 1
          } else {
            logNightDays[l.staff_id] = (logNightDays[l.staff_id] || 0) + 1
          }
        }
        if (l.status === 'absent') logAbsentMap[l.staff_id] = (logAbsentMap[l.staff_id] || 0) + 1
        if (l.status === 'off') logOffMap[l.staff_id] = (logOffMap[l.staff_id] || 0) + 1
        const otMins = l.overtime_minutes || Math.max(0, Math.round((l.hours_worked || 0) * 60) - 660)
        logOtMap[l.staff_id] = (logOtMap[l.staff_id] || 0) + (otMins / 60)
      })

      const otLogs = otRes?.data || []
      const otMap = {}
      otLogs.forEach(log => {
        if (!otMap[log.staff_id]) otMap[log.staff_id] = { hours: 0, pay: 0 }
        if (log.manual_override) {
          otMap[log.staff_id].hours += Number(log.manual_overtime_hours || 0)
          otMap[log.staff_id].pay += Number(log.manual_overtime_pay || 0)
        } else {
          otMap[log.staff_id].hours += Number(log.overtime_hours || 0)
          otMap[log.staff_id].pay += Number(log.overtime_pay || 0)
        }
      })

      const payMap = {}
      ;(payRes.data || []).forEach(p => {
        payMap[p.staff_id] = {
          ...p,
          advance_taken: Number(p.advance_taken || 0),
          manual_unpaid_days: p.manual_unpaid_days ?? null,
          waived_unpaid_days: p.waived_unpaid_days || 0,
          overtime_manual: p.miscellaneous_plus === 1,
          lunch_dinner_manual: Boolean(p.lunch_dinner_manual)
        }
      })

      for (const s of activeStaffList) {
        const summary = summaryMap[s.id]
        const reportEntry = reportStaffMap[s.id]

        const lateDays = reportEntry ? reportEntry.late : (summary ? Number(summary.late_days ?? summary.total_late ?? 0) : (logLateMap[s.id] || lateMap[s.id] || 0))
        const presentCount = reportEntry ? reportEntry.total_days_worked : (summary ? Number(summary.present_days ?? summary.total_present ?? 0) : (logPresentMap[s.id] || presentMap[s.id] || 0))

        const explicitOffAbsent = (logAbsentMap[s.id] || 0) + (logOffMap[s.id] || 0)
        const unworkedDays = Math.max(0, 30 - presentCount)
        const computedAbsent = Math.max(explicitOffAbsent, unworkedDays)
        const absentCount = summary && Number(summary.absent_days) > 0
          ? Math.max(Number(summary.absent_days), computedAbsent)
          : computedAbsent

        const loggedMorning = logMorningDays[s.id] || 0
        const loggedNight = logNightDays[s.id] || 0
        const unassigned = Math.max(0, presentCount - (loggedMorning + loggedNight))
        const defaultShift = getShiftType({ shift_start: s.shift_start }, s.shift_start)

        const morningDays = reportEntry ? reportEntry.morning_days : (defaultShift === 'night' ? loggedMorning : loggedMorning + unassigned)
        const nightDays = reportEntry ? reportEntry.night_days : (defaultShift === 'night' ? loggedNight + unassigned : loggedNight)
        const autoMorningFood = reportEntry ? reportEntry.morning_food : (morningDays * 110)
        const autoLunchDinner = reportEntry ? reportEntry.night_food : (nightDays * 140)

        const perDay = Math.round(Number(s.base_salary) / 30)
        const lateDeductionDays = Math.floor(lateDays / 3)
        const lateDeduction = lateDeductionDays * perDay

        const summaryOtHours = summary ? Number(summary.overtime_hours ?? summary.total_overtime_hours ?? 0) : 0
        const logOt = Math.round((logOtMap[s.id] || 0) * 100) / 100
        const trackedOt = otMap[s.id]?.hours || 0
        const autoOtHours = summaryOtHours > 0 ? summaryOtHours : (trackedOt > 0 ? trackedOt : logOt)

        const hourlyRate = s.hourly_rate || Math.floor(Math.round((Number(s.base_salary) || 0) / 30) / 10)
        const summaryOtPay = summary ? Number(summary.overtime_pay ?? summary.total_overtime_pay ?? 0) : 0
        const autoOtPay = summaryOtPay > 0 ? summaryOtPay : (otMap[s.id]?.pay || Math.round(autoOtHours * hourlyRate))

        if (!payMap[s.id]) {
          payMap[s.id] = {
            staff_id: s.id, month: m, year: y,
            overtime_hours: autoOtHours,
            overtime_pay: autoOtPay,
            overtime_auto_hours: autoOtHours,
            overtime_auto_pay: autoOtPay,
            overtime_manual: false,
            service_charge: 0, bonus: 0,
            lunch_dinner: autoLunchDinner,
            lunch_dinner_auto: autoLunchDinner,
            lunch_dinner_manual: false,
            morning_food: autoMorningFood,
            morning_food_auto: autoMorningFood,
            morning_food_manual: false,
            morning_days: morningDays,
            night_days: nightDays,
            advance_taken: advancesMap[s.id] || 0,
            others_taken: 0, miscellaneous: 0,
            is_paid: false,
            manual_unpaid_days: null,
            waived_unpaid_days: 0,
            late_days: lateDays,
            late_deduction_days: lateDeductionDays,
            late_deduction: lateDeduction,
            present_days: presentCount,
            absent_days: absentCount,
            isNew: true
          }
        } else {
          payMap[s.id].late_days = lateDays
          payMap[s.id].late_deduction_days = lateDeductionDays
          payMap[s.id].late_deduction = lateDeduction
          payMap[s.id].present_days = presentCount
          payMap[s.id].absent_days = absentCount
          payMap[s.id].morning_days = morningDays
          payMap[s.id].night_days = nightDays
          payMap[s.id].lunch_dinner_auto = autoLunchDinner
          payMap[s.id].morning_food_auto = autoMorningFood
          payMap[s.id].overtime_auto_hours = autoOtHours
          payMap[s.id].overtime_auto_pay = autoOtPay
          if (!payMap[s.id].overtime_manual) {
            payMap[s.id].overtime_hours = autoOtHours
            payMap[s.id].overtime_pay = autoOtPay
          }
          if (!payMap[s.id].lunch_dinner_manual) {
            payMap[s.id].lunch_dinner = autoLunchDinner
            payMap[s.id].morning_food = autoMorningFood
          }
        }
      }

      setStaff(activeStaffList)
      setPayroll(payMap)

      // If already logged in as staff, keep the authStaff reference fresh
      if (authStaff) {
        const fresh = activeStaffList.find(st => st.id === authStaff.id)
        if (fresh) setAuthStaff(fresh)
      }

      const initialWaived = {}
      for (const s of activeStaffList) {
        if (payMap[s.id]?.late_waived) {
          initialWaived[s.id] = true
        }
      }
      setWaivedStaff(initialWaived)
    } catch (err) {
      console.error('Fetch payroll error:', err)
    }
  }

  async function fetchPayments(m, y) {
    const { data } = await supabase
      .from('salary_payments')
      .select('*')
      .eq('month', m)
      .eq('year', y)
    const map = {}
    ;(data || []).forEach(p => {
      if (!map[p.staff_id]) map[p.staff_id] = []
      map[p.staff_id].push(p)
    })
    setPayments(map)
  }

  // Authentication Submission Handler
  function handlePasswordSubmit(e) {
    if (e) e.preventDefault()
    setAuthError('')
    setDisambiguationOptions(null)

    const raw = passwordInput.trim()
    if (!raw) {
      setAuthError('Please enter a password.')
      return
    }

    // 1. Admin login: 1590
    if (raw === '1590') {
      const session = { role: 'admin' }
      sessionStorage.setItem('cc_viewpayroll_session', JSON.stringify(session))
      setAuthRole('admin')
      setAuthStaff(null)
      setPasswordInput('')
      return
    }

    // 2. Staff login: <name>@cc (handles <shahadat>@cc, shahadat@cc, Shahadat@CC, etc.)
    const cleaned = raw.replace(/[<>]/g, '').trim().toLowerCase()
    const namePart = cleaned.includes('@cc')
      ? cleaned.split('@cc')[0].trim()
      : cleaned

    if (!namePart) {
      setAuthError('Please enter a valid staff password, e.g. shahadat@cc')
      return
    }

    // Match candidate in active staff
    const matches = staff.filter(s => {
      const sName = s.name.trim().toLowerCase()
      const firstName = sName.split(/\s+/)[0]
      const noSpaces = sName.replace(/\s+/g, '')
      const desig = (s.designation || '').trim().toLowerCase().replace(/\s+/g, '')

      if (namePart === sName || namePart === firstName || namePart === noSpaces) return true
      if (namePart === `${firstName}.${desig}` || namePart === `${firstName}${desig}`) return true
      return false
    })

    if (matches.length === 0) {
      setAuthError('Incorrect passcode. Use 1590 for Admin or <name>@cc for Staff (e.g. shahadat@cc).')
      return
    }

    if (matches.length === 1) {
      const matched = matches[0]
      const session = { role: 'staff', staff: matched }
      sessionStorage.setItem('cc_viewpayroll_session', JSON.stringify(session))
      setAuthRole('staff')
      setAuthStaff(matched)
      setPasswordInput('')
    } else {
      // Multiple staff with matching name (e.g. Esa)
      setDisambiguationOptions(matches)
    }
  }

  function handleSelectDisambiguatedStaff(chosenStaff) {
    const session = { role: 'staff', staff: chosenStaff }
    sessionStorage.setItem('cc_viewpayroll_session', JSON.stringify(session))
    setAuthRole('staff')
    setAuthStaff(chosenStaff)
    setDisambiguationOptions(null)
    setPasswordInput('')
  }

  function handleLogout() {
    sessionStorage.removeItem('cc_viewpayroll_session')
    setAuthRole(null)
    setAuthStaff(null)
    setPasswordInput('')
    setAuthError('')
    setDisambiguationOptions(null)
  }

  function toggleBreakdown(staffId) {
    setExpandedBreakdowns(prev => ({
      ...prev,
      [staffId]: !prev[staffId]
    }))
  }

  function calculateFullPayroll(s, p, isLateWaived) {
    if (!s || !p) {
      return {
        base: 0, perDay: 0, hourlyRate: 0,
        otHours: 0, otPay: 0, sc: 0, bonus: 0,
        mornFood: 0, nightFood: 0, miscEarnings: 0,
        grossEarnings: 0,
        adv: 0, others: 0, unpaidDays: 0, unpaidDeduction: 0,
        lateDays: 0, lateDeductionDays: 0, lateDeduction: 0,
        miscDeductions: 0, totalDeductions: 0,
        finalSalary: 0
      }
    }

    const base = Number(s.base_salary) || 0
    const perDay = Math.round(base / 30)
    const hourlyRate = s.hourly_rate || Math.floor(perDay / 10)

    const otHours = Number(p.overtime_hours) || 0
    const otPay = p.overtime_pay !== undefined && p.overtime_pay !== null && p.overtime_pay !== ''
      ? Number(p.overtime_pay)
      : otHours * hourlyRate

    const sc = Number(p.service_charge) || 0
    const bonus = Number(p.bonus) || 0
    const mornFood = Number(p.morning_food) || 0
    const nightFood = Number(p.lunch_dinner) || 0

    const misc = Number(p.miscellaneous) || 0
    const miscEarnings = misc > 0 ? misc : 0
    const miscDeductions = misc < 0 ? Math.abs(misc) : 0

    const grossEarnings = Math.round(base + otPay + sc + bonus + mornFood + nightFood + miscEarnings)

    const adv = Number(p.advance_taken) || 0
    const others = Number(p.others_taken) || 0

    const absentDays = Number(p.absent_days) || 0
    const freeAbsentDays = 4
    const autoUnpaidDays = Math.max(0, absentDays - freeAbsentDays)
    const waivedDays = Number(p.waived_unpaid_days) || 0
    const unpaidDays = p.manual_unpaid_days !== undefined && p.manual_unpaid_days !== null
      ? Number(p.manual_unpaid_days)
      : Math.max(0, autoUnpaidDays - waivedDays)
    const unpaidDeduction = unpaidDays * perDay

    const isWaived = isLateWaived !== undefined ? isLateWaived : Boolean(p.late_waived)
    const lateDays = Number(p.late_days) || 0
    const lateDeductionDays = Math.floor(lateDays / 3)
    const rawLateDeduction = lateDeductionDays * perDay
    const lateDeduction = isWaived ? 0 : (Number(p.late_deduction) || rawLateDeduction)

    const totalDeductions = Math.round(adv + others + unpaidDeduction + lateDeduction + miscDeductions)
    const finalSalary = Math.round(grossEarnings - totalDeductions)

    return {
      base, perDay, hourlyRate,
      otHours, otPay, sc, bonus,
      mornFood, nightFood, miscEarnings,
      grossEarnings,
      adv, others, unpaidDays, unpaidDeduction,
      lateDays, lateDeductionDays, lateDeduction, isWaived,
      miscDeductions, totalDeductions,
      finalSalary
    }
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // Filtered staff list based on role
  const roleFilteredStaff = authRole === 'admin'
    ? staff
    : (authStaff ? staff.filter(s => s.id === authStaff.id) : [])

  const searchedStaff = roleFilteredStaff.filter(s => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return s.name.toLowerCase().includes(q) || (s.designation && s.designation.toLowerCase().includes(q))
  })

  const sortedStaff = [...searchedStaff].sort((a, b) => {
    if ((a.serial || 999) !== (b.serial || 999)) {
      return (a.serial || 999) - (b.serial || 999)
    }
    return a.name.localeCompare(b.name)
  })

  // Grand totals (only relevant for admin)
  const grandTotal = roleFilteredStaff.reduce((acc, s) => {
    const calc = calculateFullPayroll(s, payroll[s.id] || {}, waivedStaff[s.id])
    return acc + calc.finalSalary
  }, 0)

  const totalPaidAll = roleFilteredStaff.reduce((acc, s) => {
    const staffPayments = payments[s.id] || []
    return acc + staffPayments.reduce((pAcc, p) => pAcc + Number(p.amount_paid || p.amount || 0), 0)
  }, 0)

  const totalRemainingAll = grandTotal - totalPaidAll

  // ─────────────────────────────────────────────────────────────
  // 1. PASSWORD GATE SCREEN (If not authenticated)
  // ─────────────────────────────────────────────────────────────
  if (!authRole) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 0%, #3D1A0A 0%, #1A0D07 45%, #0B0705 100%)',
        fontFamily: '"Inter", system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        color: '#FFFFFF'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(212, 147, 58, 0.25)',
          borderRadius: '24px',
          padding: '36px 28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          boxSizing: 'border-box'
        }}>
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              margin: '0 auto 16px',
              padding: '3px',
              background: 'linear-gradient(135deg, #7C3A1E, #D4933A)',
              boxShadow: '0 8px 24px rgba(212, 147, 58, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src="/crown-coffee-logo.jpg"
                alt="Crown Coffee Logo"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, letterSpacing: '0.05em', color: '#F8FAFC', textTransform: 'uppercase' }}>
              Crown Coffee
            </h1>
            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#D4933A', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Payroll View Center
            </p>
          </div>

          {/* Password Prompt Card */}
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#E2E8F0', marginBottom: '8px', letterSpacing: '0.02em' }}>
                Enter Portal Passcode
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="e.g. 1590 or shahadat@cc"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px 44px 14px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(255, 255, 255, 0.18)',
                    background: 'rgba(0, 0, 0, 0.35)',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#D4933A'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.18)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {authError && (
              <div style={{
                background: 'rgba(220, 38, 38, 0.15)',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#FCA5A5',
                fontSize: '12px',
                fontWeight: 600
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            {/* Disambiguation Modal if multiple staff match (e.g. Esa) */}
            {disambiguationOptions && disambiguationOptions.length > 0 && (
              <div style={{
                background: 'rgba(212, 147, 58, 0.12)',
                border: '1px solid rgba(212, 147, 58, 0.35)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '18px'
              }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#FDE68A' }}>
                  Multiple staff members matched. Please choose:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {disambiguationOptions.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectDisambiguatedStaff(st)}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '13px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{st.name}</span>
                      <span style={{ color: '#D4933A', fontSize: '11px', fontWeight: 600 }}>{st.designation}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Unlock Button */}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #7C3A1E, #D4933A)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(124, 58, 30, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.1s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Lock size={16} />
              <span>Unlock Payroll</span>
            </button>
          </form>

          {/* Instruction Pill */}
          <div style={{
            marginTop: '24px',
            padding: '14px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '11.5px',
            lineHeight: '1.6',
            color: '#94A3B8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E2E8F0', fontWeight: 700, marginBottom: '4px' }}>
              <Info size={13} color="#D4933A" />
              <span>Access Guide:</span>
            </div>
            <div>• <strong>Admin:</strong> Enter passcode <code style={{ color: '#FDE68A', background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: '4px' }}>1590</code> to view all staff.</div>
            <div style={{ marginTop: '2px' }}>• <strong>Staff:</strong> Enter <code style={{ color: '#FDE68A', background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: '4px' }}>&lt;name&gt;@cc</code> (e.g. <code style={{ color: '#FDE68A' }}>shahadat@cc</code>) to view only your payroll.</div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // 2. LOADING STATE
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    const progress = Math.round(((loadingStep + 1) / LOADING_STEPS.length) * 100)
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: '"Inter", system-ui, sans-serif', color: '#0F172A', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '50%',
            padding: '4px', background: 'linear-gradient(135deg, #7C3A1E, #D4933A)',
            boxShadow: '0 8px 30px rgba(124, 58, 30, 0.25)', marginBottom: '24px'
          }}>
            <img src="/crown-coffee-logo.jpg" alt="Crown Coffee" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>

          <p style={{ margin: 0, fontSize: '24px', fontWeight: 900, letterSpacing: '0.08em', color: '#7C3A1E', textTransform: 'uppercase' }}>
            Crown Coffee
          </p>
          <p style={{ margin: '4px 0 24px 0', fontSize: '11px', letterSpacing: '0.2em', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
            {authRole === 'admin' ? 'Admin Payroll Console' : `${authStaff?.name}'s Payroll`}
          </p>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', borderRadius: '12px', padding: '18px 22px', width: '100%', maxWidth: '420px', marginBottom: '20px' }}>
            {LOADING_STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: i <= loadingStep ? 1 : 0.3, padding: '4px 0' }}>
                <span style={{ color: i < loadingStep ? '#059669' : '#7C3A1E', fontWeight: 800 }}>{i < loadingStep ? '✓' : '›'}</span>
                <span style={{ fontSize: '13px', color: i === loadingStep ? '#0F172A' : '#64748B', fontWeight: i === loadingStep ? 700 : 500 }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #7C3A1E, #D4933A)', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // 3. AUTHENTICATED PAYROLL VIEW (Staff or Admin)
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: '"Inter", system-ui, sans-serif', color: '#0F172A' }}>
      {authRole === 'admin' && <Navbar />}

      <main style={{ width: '100%', maxWidth: '780px', margin: '0 auto', padding: '20px 16px 60px', boxSizing: 'border-box' }}>

        {/* ── TOP AUTH BAR & CONTROLS ── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src="/crown-coffee-logo.jpg"
                alt="Crown Coffee"
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #D4933A' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                    {authRole === 'admin' ? 'Payroll Center (Admin Master)' : `${authStaff?.name}`}
                  </h1>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '20px',
                    background: authRole === 'admin' ? 'rgba(124, 58, 30, 0.1)' : 'rgba(5, 150, 105, 0.1)',
                    color: authRole === 'admin' ? '#7C3A1E' : '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {authRole === 'admin' ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
                    {authRole === 'admin' ? 'Admin Access' : (authStaff?.designation || 'Staff')}
                  </span>
                </div>
                <p style={{ color: '#64748B', fontSize: '12.5px', margin: '2px 0 0 0', fontWeight: 600 }}>
                  {months[month - 1]} {year} Payroll Report
                </p>
              </div>
            </div>

            {/* Logout / Switch Account */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              title="Lock and sign out"
            >
              <LogOut size={14} />
              <span>Lock / Sign Out</span>
            </button>
          </div>

          {/* Month & Year Selectors */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 700, fontSize: '13px', outline: 'none' }}
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
              >
                {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <input
                type="number"
                style={{ width: '82px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 700, fontSize: '13px', textAlign: 'center', outline: 'none' }}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              >
              </input>
              <button
                onClick={() => fetchAll(month, year)}
                disabled={loading}
                style={{
                  padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                  background: '#FFFFFF', color: '#0F172A', fontWeight: 700, fontSize: '13px',
                  cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
                title="Refresh payroll data"
              >
                <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Search (only in admin mode) */}
            {authRole === 'admin' && (
              <div style={{ position: 'relative', flex: '1', minWidth: '160px', maxWidth: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 30px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── ADMIN SUMMARY CARDS (Admin Only) ── */}
        {authRole === 'admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, margin: '0 0 4px 0' }}>Grand Total Net Pay</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#7C3A1E', margin: 0 }}>৳{grandTotal.toLocaleString()}</p>
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, margin: '0 0 4px 0' }}>Grand Paid Amount</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#059669', margin: 0 }}>৳{totalPaidAll.toLocaleString()}</p>
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, margin: '0 0 4px 0' }}>Grand Remaining Due</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: totalRemainingAll > 0 ? '#DC2626' : '#059669', margin: 0 }}>৳{totalRemainingAll.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* ── PAYROLL CARDS WITH COMPLETE BREAKDOWN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {sortedStaff.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>No payroll record found</p>
              <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Check month/year or search keywords.</p>
            </div>
          ) : (
            sortedStaff.map(s => {
              const row = payroll[s.id] || {}
              const calc = calculateFullPayroll(s, row, waivedStaff[s.id])
              const staffPayments = payments[s.id] || []
              const paid = staffPayments.reduce((acc, p) => acc + Number(p.amount_paid || p.amount || 0), 0)
              const remaining = calc.finalSalary - paid
              const staffAdvances = advanceDetails[s.id] || []
              const isFullyPaid = paid >= calc.finalSalary && calc.finalSalary > 0
              const isExpanded = expandedBreakdowns[s.id] ?? true // default expanded for clear breakdown visibility

              return (
                <div
                  key={s.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    transition: 'box-shadow 0.2s ease'
                  }}
                >
                  {/* Card Top Header */}
                  <div style={{
                    background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                    padding: '16px 20px',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>{s.name}</span>
                        {s.serial && (
                          <span style={{ fontSize: '10.5px', fontWeight: 800, background: '#E2E8F0', color: '#475569', padding: '2px 6px', borderRadius: '6px' }}>
                            #{s.serial}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>{s.designation}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: isFullyPaid ? '#DCFCE7' : remaining > 0 ? '#FEE2E2' : '#E2E8F0',
                        color: isFullyPaid ? '#15803D' : remaining > 0 ? '#B91C1C' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isFullyPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {isFullyPaid ? 'Fully Paid ✓' : remaining > 0 ? `Due: ৳${remaining.toLocaleString()}` : 'Settled'}
                      </span>

                      <button
                        onClick={() => toggleBreakdown(s.id)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: '#475569'
                        }}
                      >
                        <span>{isExpanded ? 'Collapse' : 'Breakdown'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* High-Level Settlement KPI Strip */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    background: '#FAFAFA',
                    borderBottom: '1px solid #E2E8F0',
                    padding: '12px 20px',
                    gap: '10px'
                  }}>
                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Net Salary</span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 900, color: '#7C3A1E' }}>৳{calc.finalSalary.toLocaleString()}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Paid So Far</span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 900, color: '#059669' }}>৳{paid.toLocaleString()}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Remaining Due</span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 900, color: remaining > 0 ? '#DC2626' : '#059669' }}>৳{remaining.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* ── COMPLETE ITEM-BY-ITEM BREAKDOWN ── */}
                  {isExpanded && (
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                      {/* 1. Base Rates & Attendance Summary */}
                      <div style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '14px 16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            1. Duty & Rate Foundation
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Standard 30 Days Month</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '12px' }}>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>Base Salary</div>
                            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>৳{calc.base.toLocaleString()}</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>Rate / Day (৳Base/30)</div>
                            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>৳{calc.perDay.toLocaleString()}</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>Rate / Hour (OT)</div>
                            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>৳{calc.hourlyRate.toLocaleString()}</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>Days Present</div>
                            <div style={{ fontWeight: 800, color: '#059669', marginTop: '2px' }}>{row.present_days || 0} days</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>Morning Shifts (৳110)</div>
                            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{row.morning_days || 0} days</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>Night Shifts (৳140)</div>
                            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{row.night_days || 0} days</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>Late Arrivals</div>
                            <div style={{ fontWeight: 800, color: '#D97706', marginTop: '2px' }}>{row.late_days || 0} days</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>Absent / Off Days</div>
                            <div style={{ fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>{row.absent_days || 0} days</div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Earnings Breakdown */}
                      <div style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ background: 'rgba(5, 150, 105, 0.06)', padding: '10px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ArrowUpRight size={14} /> 2. Earnings Breakdown (মোট আয়)
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 900, color: '#059669' }}>
                            ৳{calc.grossEarnings.toLocaleString()}
                          </span>
                        </div>

                        <div style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ color: '#475569' }}>Base Salary</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>৳{calc.base.toLocaleString()}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                            <div>
                              <span style={{ color: '#475569' }}>Overtime Allowance</span>
                              <span style={{ color: '#94A3B8', fontSize: '11px', marginLeft: '6px' }}>
                                ({calc.otHours} hrs @ ৳{calc.hourlyRate}/hr)
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, color: calc.otPay > 0 ? '#059669' : '#94A3B8' }}>
                              +৳{calc.otPay.toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                            <div>
                              <span style={{ color: '#475569' }}>Morning Shift Food</span>
                              <span style={{ color: '#94A3B8', fontSize: '11px', marginLeft: '6px' }}>
                                ({row.morning_days || 0}d × ৳110)
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, color: calc.mornFood > 0 ? '#0F172A' : '#94A3B8' }}>
                              +৳{calc.mornFood.toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                            <div>
                              <span style={{ color: '#475569' }}>Night Shift Food</span>
                              <span style={{ color: '#94A3B8', fontSize: '11px', marginLeft: '6px' }}>
                                ({row.night_days || 0}d × ৳140)
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, color: calc.nightFood > 0 ? '#0F172A' : '#94A3B8' }}>
                              +৳{calc.nightFood.toLocaleString()}
                            </span>
                          </div>

                          {calc.sc > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#475569' }}>Service Charge Pool</span>
                              <span style={{ fontWeight: 700, color: '#059669' }}>+৳{calc.sc.toLocaleString()}</span>
                            </div>
                          )}

                          {calc.bonus > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#475569' }}>Bonus / Incentive</span>
                              <span style={{ fontWeight: 700, color: '#059669' }}>+৳{calc.bonus.toLocaleString()}</span>
                            </div>
                          )}

                          {calc.miscEarnings > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#475569' }}>Miscellaneous Addition {row.miscellaneous_note ? `(${row.miscellaneous_note})` : ''}</span>
                              <span style={{ fontWeight: 700, color: '#059669' }}>+৳{calc.miscEarnings.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Deductions Breakdown */}
                      <div style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ background: 'rgba(220, 38, 38, 0.05)', padding: '10px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ArrowDownRight size={14} /> 3. Deductions Breakdown (কর্তন বিবরণী)
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 900, color: '#DC2626' }}>
                            -৳{calc.totalDeductions.toLocaleString()}
                          </span>
                        </div>

                        <div style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                          {/* Advance Taken */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <div>
                              <span style={{ color: '#475569' }}>Salary Advance Taken</span>
                              {staffAdvances.length > 0 && (
                                <span style={{ color: '#64748B', fontSize: '11px', marginLeft: '6px' }}>
                                  ({staffAdvances.length} record{staffAdvances.length > 1 ? 's' : ''})
                                </span>
                              )}
                            </div>
                            <span style={{ fontWeight: 700, color: calc.adv > 0 ? '#DC2626' : '#94A3B8' }}>
                              {calc.adv > 0 ? `-৳${calc.adv.toLocaleString()}` : '৳0'}
                            </span>
                          </div>

                          {/* Itemized Advance Logs if any */}
                          {staffAdvances.length > 0 && (
                            <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '8px 12px', margin: '2px 0 4px', fontSize: '11.5px', border: '1px solid #E2E8F0' }}>
                              <div style={{ fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>Advance Log Details:</div>
                              {staffAdvances.map(advItem => (
                                <div key={advItem.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#475569' }}>
                                  <span>{advItem.date ? new Date(advItem.date).toLocaleDateString() : 'Advance'} {advItem.reason ? `· ${advItem.reason}` : ''}</span>
                                  <span style={{ fontWeight: 700, color: '#DC2626' }}>৳{Number(advItem.amount).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Unpaid Leave Deduction */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                            <div>
                              <span style={{ color: '#475569' }}>Unpaid Leave Deduction</span>
                              <span style={{ color: '#94A3B8', fontSize: '11px', marginLeft: '6px' }}>
                                ({calc.unpaidDays} days @ ৳{calc.perDay}/day)
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, color: calc.unpaidDeduction > 0 ? '#DC2626' : '#94A3B8' }}>
                              {calc.unpaidDeduction > 0 ? `-৳${calc.unpaidDeduction.toLocaleString()}` : '৳0'}
                            </span>
                          </div>

                          {/* Late Deduction */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                            <div>
                              <span style={{ color: '#475569' }}>Late Attendance Deduction</span>
                              <span style={{ color: '#94A3B8', fontSize: '11px', marginLeft: '6px' }}>
                                ({calc.lateDays} lates → {calc.lateDeductionDays} cut days)
                              </span>
                            </div>
                            {calc.isWaived ? (
                              <span style={{ fontWeight: 700, color: '#059669' }}>Waived ✓ (৳0)</span>
                            ) : (
                              <span style={{ fontWeight: 700, color: calc.lateDeduction > 0 ? '#DC2626' : '#94A3B8' }}>
                                {calc.lateDeduction > 0 ? `-৳${calc.lateDeduction.toLocaleString()}` : '৳0'}
                              </span>
                            )}
                          </div>

                          {/* Others Taken */}
                          {calc.others > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#475569' }}>Others Taken / Deductions</span>
                              <span style={{ fontWeight: 700, color: '#DC2626' }}>-৳{calc.others.toLocaleString()}</span>
                            </div>
                          )}

                          {/* Misc Deductions */}
                          {calc.miscDeductions > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#475569' }}>Penalties / Misc Deductions {row.miscellaneous_note ? `(${row.miscellaneous_note})` : ''}</span>
                              <span style={{ fontWeight: 700, color: '#DC2626' }}>-৳{calc.miscDeductions.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. Net Salary Final Calculation */}
                      <div style={{
                        background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                        border: '1.5px solid #FDE68A',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 900, color: '#78350F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Net Payable Salary (চূড়ান্ত প্রদেয় বেতন)
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#92400E', marginTop: '2px' }}>
                            ৳{calc.grossEarnings.toLocaleString()} (আয়) - ৳{calc.totalDeductions.toLocaleString()} (কর্তন)
                          </div>
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#7C3A1E' }}>
                          ৳{calc.finalSalary.toLocaleString()}
                        </div>
                      </div>

                      {/* 5. Payment Disbursements Log */}
                      <div style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '14px 16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <History size={14} /> Payment Disbursements ({staffPayments.length})
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: isFullyPaid ? '#059669' : '#D97706' }}>
                            Paid: ৳{paid.toLocaleString()} | Due: ৳{remaining.toLocaleString()}
                          </span>
                        </div>

                        {staffPayments.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                            No payment recorded yet for this month.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {staffPayments.map(p => (
                              <div
                                key={p.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '12px',
                                  padding: '8px 12px',
                                  background: '#F8FAFC',
                                  borderRadius: '8px',
                                  border: '1px solid #E2E8F0'
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 800, color: '#059669' }}>
                                    ৳{Number(p.amount_paid || p.amount || 0).toLocaleString()}
                                  </div>
                                  {p.notes && <div style={{ color: '#64748B', fontSize: '10.5px', marginTop: '1px' }}>{p.notes}</div>}
                                </div>
                                <div style={{ color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
                                  {new Date(p.payment_date).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* Card Bottom Actions */}
                  <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid #E2E8F0',
                    background: '#FAFAFA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <button
                      onClick={() => setPrintData({
                        staff: s,
                        payroll: {
                          ...row,
                          final_salary: calc.finalSalary,
                          is_paid: isFullyPaid,
                          is_waived: calc.isWaived
                        },
                        month: months[month - 1],
                        year
                      })}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '10px',
                        background: '#FFFFFF',
                        color: '#7C3A1E',
                        border: '1.5px solid #D4933A',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <Printer size={14} />
                      <span>Print Salary Slip (বেতন রশিদ)</span>
                    </button>
                  </div>

                </div>
              )
            })
          )}
        </div>

      </main>

      {/* Printable Payslip Modal */}
      {printData && <PaySlip data={printData} onClose={() => setPrintData(null)} />}
    </div>
  )
}
