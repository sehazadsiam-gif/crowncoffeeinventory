'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import {
  Printer, X, History, RefreshCw, Lock, Eye, EyeOff,
  UserCheck, ShieldCheck, LogOut, ChevronDown, ChevronUp,
  Search, CheckCircle2, Clock, AlertCircle, Coffee, DollarSign,
  Calendar, ArrowDownRight, ArrowUpRight, FileText, Info, Globe,
  CalendarDays, Sun, Moon, LogIn, LogOut as LogOutIcon, Sparkles, Timer
} from 'lucide-react'
import dynamic from 'next/dynamic'

const PaySlip = dynamic(() => import('../../components/PaySlip'), { ssr: false })
import { normalizeShiftTime } from '../../lib/roster-utils'

function getShiftType(log, staffDefaultShift = '11:00') {
  if (log?.shift_type) return log.shift_type
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

function formatTime12(val) {
  if (!val || val === '--' || val === 'null') return null
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed.toLowerCase().includes('am') || trimmed.toLowerCase().includes('pm')) {
      return trimmed
    }
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Dhaka'
      })
    }
    return trimmed
  }
  return null
}

function formatTimeCompact(val) {
  const formatted = formatTime12(val)
  if (!formatted) return ''
  return formatted.replace(/\s+/g, '').toLowerCase()
}

function parseLocalDate(str) {
  if (!str) return new Date()
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getSaturdayOf(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay() // 0 = Sun, 6 = Sat
  const diff = (day === 6 ? 0 : -(day + 1))
  date.setDate(date.getDate() + diff)
  return formatDateStr(date)
}

function get7Days(saturdayStr) {
  const list = []
  const start = parseLocalDate(saturdayStr)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    list.push(formatDateStr(d))
  }
  return list
}

function getWeeksForMonth(y, m) {
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  let currentSat = getSaturdayOf(firstDay)
  const weeks = []
  const seen = new Set()
  
  while (true) {
    if (seen.has(currentSat)) break
    seen.add(currentSat)
    
    const days = get7Days(currentSat)
    const startObj = parseLocalDate(days[0])
    const endObj = parseLocalDate(days[6])
    
    const overlaps = days.some(d => {
      const dt = parseLocalDate(d)
      return dt.getFullYear() === y && (dt.getMonth() + 1) === m
    })
    
    if (overlaps) {
      weeks.push({
        start: currentSat,
        end: days[6],
        label: `${startObj.getDate()} ${startObj.toLocaleDateString('en-US', { month: 'short' })} – ${endObj.getDate()} ${endObj.toLocaleDateString('en-US', { month: 'short' })}`,
        days
      })
    }
    
    const nextSat = parseLocalDate(currentSat)
    nextSat.setDate(nextSat.getDate() + 7)
    currentSat = formatDateStr(nextSat)
    
    if (parseLocalDate(currentSat) > lastDay) break
  }
  return weeks
}

const I18N = {
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    brandSubtitle: 'Payroll View Center',
    portalPasscode: 'Enter Portal Passcode',
    passcodePlaceholder: 'Enter Passcode',
    unlockBtn: 'Unlock Payroll',
    errorEmpty: 'Please enter your passcode.',
    errorInvalid: 'Incorrect passcode. Please try again.',
    multiMatchTitle: 'Multiple staff members matched. Please choose:',
    adminCenterTitle: 'Payroll Center (Admin Master)',
    reportSuffix: 'Payroll Report',
    adminBadge: 'Admin Access',
    staffBadge: 'Staff',
    lockSignOut: 'Lock / Sign Out',
    refresh: 'Refresh',
    searchPlaceholder: 'Search staff...',
    grandNet: 'Grand Total Net Pay',
    grandPaid: 'Grand Paid Amount',
    grandDue: 'Grand Remaining Due',
    noRecord: 'No payroll record found',
    noRecordSub: 'Check month/year or search keywords.',
    fullyPaid: 'Fully Paid ✓',
    due: 'Due',
    settled: 'Settled',
    collapse: 'Collapse',
    breakdown: 'Breakdown',
    netSalary: 'Net Salary',
    paidSoFar: 'Paid So Far',
    remainingDue: 'Remaining Due',
    dutyFoundation: '1. Duty & Rate Foundation',
    standardMonth: 'Standard 30 Days Month',
    baseSalary: 'Base Salary',
    ratePerDay: 'Rate / Day (৳Base/30)',
    ratePerHour: 'Rate / Hour (OT)',
    daysPresent: 'Days Present',
    morningShifts: 'Food Days (৳140/day)',
    nightShifts: 'Food Allowance (৳140)',
    foodAllowanceDays: 'Food Days (৳140/day)',
    foodAllowance: 'Food Allowance',
    lateArrivals: 'Late Arrivals',
    absentOffDays: 'Absent / Off Days',
    daysUnit: 'days',
    monthlyWorkedHours: 'Monthly Hours Worked',
    totalHoursWorkedLabel: 'Total Worked Hours',
    hoursUnit: 'hrs',
    earningsBreakdown: '2. Earnings Breakdown',
    overtimeAllowance: 'Overtime Allowance',
    morningShiftFood: 'Food Allowance',
    nightShiftFood: 'Night Shift Food',
    serviceChargePool: 'Service Charge Pool',
    bonusIncentive: 'Bonus / Incentive',
    miscAddition: 'Miscellaneous Addition',
    deductionsBreakdown: '3. Deductions Breakdown',
    salaryAdvanceTaken: 'Salary Advance Taken',
    advanceLogDetails: 'Advance Log Details:',
    records: 'record',
    unpaidLeaveDeduction: 'Unpaid Leave Deduction',
    lateAttendanceDeduction: 'Late Attendance Deduction',
    waived: 'Waived ✓ (৳0)',
    latesToCut: 'lates → cut days',
    othersTaken: 'Others Taken / Deductions',
    penaltiesDeductions: 'Penalties / Misc Deductions',
    netPayableTitle: 'Net Payable Salary',
    disbursementsTitle: 'Payment Disbursements',
    noPaymentYet: 'No payment recorded yet for this month.',
    printSlipBtn: 'Print Salary Slip',
    tabSalaryBreakdown: 'Salary Breakdown',
    tabAttendanceHeatmap: 'Attendance Heatmap',
    tabWeeklyRoster: 'Weekly Roster',
    rosterTitle: 'Weekly Duty Roster Schedule',
    rosterSubtitle: 'Official working shift hours & weekly off days assigned by management',
    rosterCurrentWeek: 'Current Week',
    rosterDayOff: 'DAY OFF',
    rosterLeave: 'ON LEAVE',
    rosterDutyChange: 'Duty Swap',
    rosterShiftAssigned: 'Standard Shift',
    rosterWeeklyOff: 'Weekly Off Day',
    rosterScheduledDays: 'Work Days',
    rosterScheduledHours: 'Total Hours',
    rosterShiftLabel: 'Shift',
    rosterHoursUnit: 'hrs',
    rosterTodayBadge: 'TODAY',
    rosterSelectWeek: 'Select Week:',
    rosterActualAtt: 'Actual Attendance on this Day:',
    heatmapTitle: 'Attendance Heatmap Calendar',
    heatmapSubtitle: 'Synced with Admin Attendance: Arrival, Departure & Overtime logs',
    summaryTotalHours: 'Total Monthly Hours',
    summaryDaysWorked: 'Days Present',
    summaryTotalOT: 'Total Overtime',
    summaryFoodFee: 'Food Allowance',
    weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    legendPresent: 'Present',
    legendFood: 'Food Allowance: ৳140',
    legendMorning: 'Morning Shift',
    legendNight: 'Night Shift',
    legendLate: 'Late Arrival',
    legendAbsent: 'Absent / Unpaid',
    legendOff: 'Off Day',
    legendOvertime: 'Overtime (OT)',
    selectedDayDetails: 'Selected Day Details:',
    arrivalTimeText: 'Arrival (Check-in)',
    departureTimeText: 'Departure (Check-out)',
    stillWorkingText: 'On duty (Checked In)',
    totalHoursText: 'Hours Worked',
    overtimeText: 'Overtime Worked',
    noOvertimeText: '0 mins (Standard Shift)',
    foodAllowanceText: 'Shift & Food Allowance',
    noRecordDay: 'No attendance log recorded for this date.',
    loadingSteps: [
      'Verifying credentials & access...',
      'Connecting to database...',
      'Fetching staff payroll records...',
      'Syncing attendance arrival, departures & monthly hours...',
      'Preparing itemized salary breakdown...'
    ]
  },
  bn: {
    months: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
    brandSubtitle: 'বেতন বিবরণী পোর্টাল',
    portalPasscode: 'পোর্টাল পাসকোড লিখুন',
    passcodePlaceholder: 'পাসকোড দিন',
    unlockBtn: 'বেতন বিবরণী দেখুন',
    errorEmpty: 'অনুগ্রহ করে পাসকোড দিন।',
    errorInvalid: 'ভুল পাসকোড। আবার চেষ্টা করুন।',
    multiMatchTitle: 'একাধিক কর্মী পাওয়া গেছে। আপনার পদবী নির্বাচন করুন:',
    adminCenterTitle: 'পেরোল সেন্টার (অ্যাডমিন মাস্টার)',
    reportSuffix: 'বেতন বিবরণী',
    adminBadge: 'অ্যাডমিন অ্যাক্সেস',
    staffBadge: 'কর্মী',
    lockSignOut: 'লক / সাইন আউট',
    refresh: 'রিফ্রেশ',
    searchPlaceholder: 'কর্মী খুঁজুন...',
    grandNet: 'সর্বমোট নিট বেতন',
    grandPaid: 'সর্বমোট পরিশোধিত',
    grandDue: 'সর্বমোট বকেয়া',
    noRecord: 'কোনো পেরোল রেকর্ড পাওয়া যায়নি',
    noRecordSub: 'মাস/বছর যাচাই করুন বা নাম দিয়ে খুঁজুন।',
    fullyPaid: 'সম্পূর্ণ পরিশোধিত ✓',
    due: 'বকেয়া',
    settled: 'নিষ্পন্ন',
    collapse: 'সংক্ষেপ',
    breakdown: 'বিস্তারিত',
    netSalary: 'নিট বেতন',
    paidSoFar: 'পরিশোধিত',
    remainingDue: 'অবশিষ্ট বকেয়া',
    dutyFoundation: '১. কাজের দিন ও বেতনের ভিত্তি',
    standardMonth: 'স্ট্যান্ডার্ড ৩০ দিনের মাস',
    baseSalary: 'মূল বেতন',
    ratePerDay: 'দৈনিক হার (মূল/৩০)',
    ratePerHour: 'ঘণ্টার হার (ওভারটাইম)',
    daysPresent: 'উপস্থিত দিন',
    morningShifts: 'খাবার ভাতা (৳১৪০/দিন)',
    nightShifts: 'খাবার ভাতা (৳১৪০)',
    foodAllowanceDays: 'খাবার ভাতা (৳১৪০/দিন)',
    foodAllowance: 'খাবার ভাতা',
    lateArrivals: 'দেরিতে উপস্থিতি',
    absentOffDays: 'ছুটি / অনুপস্থিত দিন',
    daysUnit: 'দিন',
    monthlyWorkedHours: 'মাসে মোট কাজের সময়',
    totalHoursWorkedLabel: 'মোট কাজের সময়',
    hoursUnit: 'ঘণ্টা',
    earningsBreakdown: '২. মোট আয় বিবরণী',
    overtimeAllowance: 'ওভারটাইম ভাতা',
    morningShiftFood: 'খাবার ভাতা',
    nightShiftFood: 'নাইট শিফট খাবার ভাতা',
    serviceChargePool: 'সার্ভিস চার্জ তহবিল',
    bonusIncentive: 'বোনাস / ইনসেন্টিভ',
    miscAddition: 'বিবিধ সংযোজন',
    deductionsBreakdown: '৩. মোট কর্তন বিবরণী',
    salaryAdvanceTaken: 'অগ্রিম বেতন গ্রহণ',
    advanceLogDetails: 'অগ্রিম গ্রহণের বিস্তারিত:',
    records: 'টি রেকর্ড',
    unpaidLeaveDeduction: 'বিনা বেতনে ছুটির কর্তন',
    lateAttendanceDeduction: 'দেরিতে উপস্থিতির কর্তন',
    waived: 'মওকুফ করা হয়েছে ✓ (৳০)',
    latesToCut: 'টি লেট → দিনের বেতন কর্তন',
    othersTaken: 'অন্যান্য কর্তন',
    penaltiesDeductions: 'জরিমানা / বিবিধ কর্তন',
    netPayableTitle: 'চূড়ান্ত প্রদেয় নিট বেতন',
    disbursementsTitle: 'বেতন পরিশোধ বিবরণী',
    noPaymentYet: 'এই মাসে এখনো কোনো অর্থ পরিশোধ রেকর্ড করা হয়নি।',
    printSlipBtn: 'বেতন রশিদ প্রিন্ট করুন',
    tabSalaryBreakdown: 'বেতন বিবরণী',
    tabAttendanceHeatmap: 'উপস্থিতি হিটম্যাপ',
    tabWeeklyRoster: 'সাপ্তাহিক রোস্টার',
    rosterTitle: 'সাপ্তাহিক ডিউটি রোস্টার শিডিউল',
    rosterSubtitle: 'ম্যানেজমেন্ট কর্তৃক নির্ধারিত শিফট ও সাপ্তাহিক ছুটির তালিকা',
    rosterCurrentWeek: 'চলতি সপ্তাহ',
    rosterDayOff: 'সাপ্তাহিক ছুটি',
    rosterLeave: 'ছুটিতে',
    rosterDutyChange: 'শিফট পরিবর্তন',
    rosterShiftAssigned: 'নির্ধারিত শিফট',
    rosterWeeklyOff: 'সাপ্তাহিক ছুটির দিন',
    rosterScheduledDays: 'কাজের দিন',
    rosterScheduledHours: 'মোট সময়',
    rosterShiftLabel: 'শিফট',
    rosterHoursUnit: 'ঘণ্টা',
    rosterTodayBadge: 'আজ',
    rosterSelectWeek: 'সপ্তাহ নির্বাচন:',
    rosterActualAtt: 'এই দিনের বাস্তব উপস্থিতি:',
    heatmapTitle: 'উপস্থিতি হিটম্যাপ ক্যালেন্ডার',
    heatmapSubtitle: 'অ্যাডমিন উপস্থিতির সাথে সিঙ্ককৃত: আসার সময়, যাওয়ার সময় ও ওভারটাইম বিবরণী',
    summaryTotalHours: 'মাসে মোট কাজের সময়',
    summaryDaysWorked: 'উপস্থিত দিন',
    summaryTotalOT: 'মোট ওভারটাইম',
    summaryFoodFee: 'খাবার ভাতা',
    weekDays: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'],
    legendPresent: 'উপস্থিত',
    legendFood: 'খাবার ভাতা: ৳১৪০',
    legendMorning: 'মর্নিং শিফট',
    legendNight: 'নাইট শিফট',
    legendLate: 'দেরিতে উপস্থিতি',
    legendAbsent: 'অনুপস্থিত',
    legendOff: 'সাপ্তাহিক ছুটি',
    legendOvertime: 'ওভারটাইম (OT)',
    selectedDayDetails: 'নির্বাচিত দিনের বিস্তারিত:',
    arrivalTimeText: 'আসার সময় (চেক-ইন)',
    departureTimeText: 'যাওয়ার সময় (চেক-আউট)',
    stillWorkingText: 'ডিউটিতে আছেন (চলমান)',
    totalHoursText: 'কাজের সময়',
    overtimeText: 'ওভারটাইম',
    noOvertimeText: 'নেই (০ মি. সাধারণ শিফট)',
    foodAllowanceText: 'শিফট ও খাবার ভাতা',
    noRecordDay: 'এই তারিখে কোনো প্রবেশের রেকর্ড নেই।',
    loadingSteps: [
      'লগইন তথ্য যাচাই করা হচ্ছে...',
      'ডাটাবেসে সংযুক্ত হচ্ছে...',
      'পেরোল ডাটা লোড করা হচ্ছে...',
      'আসার সময়, যাওয়ার সময় ও মাসিক মোট ঘণ্টা সিঙ্ক হচ্ছে...',
      'বিস্তারিত বেতন তালিকা প্রস্তুত হচ্ছে...'
    ]
  }
}

export default function ViewPayrollPage() {
  const today = new Date()
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const [month, setMonth] = useState(prevMonthDate.getMonth() + 1)
  const [year, setYear] = useState(prevMonthDate.getFullYear())

  // Language state: 'bn' or 'en'
  const [lang, setLang] = useState('bn')

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
  const [dailyAttendanceLogs, setDailyAttendanceLogs] = useState({}) // staffId -> { [date]: log }
  const [showHistory, setShowHistory] = useState(null)
  const [expandedBreakdowns, setExpandedBreakdowns] = useState({})
  const [staffActiveTab, setStaffActiveTab] = useState({}) // staffId -> 'breakdown' | 'heatmap' | 'roster'
  const [selectedDayInfo, setSelectedDayInfo] = useState({}) // staffId -> selected day log
  const [staffRosters, setStaffRosters] = useState({}) // staffId -> { [date]: rosterRow }
  const [staffSelectedWeek, setStaffSelectedWeek] = useState({}) // staffId -> saturdayDateStr
  const [staffSelectedRosterDay, setStaffSelectedRosterDay] = useState({}) // staffId -> dayDateStr
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState(0)
  const [printData, setPrintData] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [waivedStaff, setWaivedStaff] = useState({})

  // Read saved language preference and session
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('cc_viewpayroll_lang')
      if (savedLang === 'en' || savedLang === 'bn') {
        setLang(savedLang)
      }
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
      console.warn('Could not read session/lang:', e)
    }
  }, [])

  const handleLanguageChange = (l) => {
    setLang(l)
    try {
      localStorage.setItem('cc_viewpayroll_lang', l)
    } catch (e) {}
  }

  const t = I18N[lang] || I18N.bn

  useEffect(() => {
    fetchAll(month, year)
  }, [month, year])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % t.loadingSteps.length)
    }, 800)
    return () => clearInterval(interval)
  }, [loading, t.loadingSteps.length])

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

      // Calculate extended range for duty roster (covers surrounding Saturday-to-Friday weeks)
      const curToday = new Date()
      const curDateStr = `${curToday.getFullYear()}-${String(curToday.getMonth() + 1).padStart(2, '0')}-${String(curToday.getDate()).padStart(2, '0')}`
      const minDate = startDate < curDateStr ? startDate : curDateStr
      const maxDate = endDate > curDateStr ? endDate : curDateStr
      const rosterStartObj = new Date(new Date(minDate).getTime() - 14 * 24 * 60 * 60 * 1000)
      const rosterEndObj = new Date(new Date(maxDate).getTime() + 14 * 24 * 60 * 60 * 1000)
      const rosterStartDate = rosterStartObj.toISOString().split('T')[0]
      const rosterEndDate = rosterEndObj.toISOString().split('T')[0]

      const safe = (q) => Promise.resolve(q).catch(() => ({ data: [] }))

      // Query database tables and attendance report API concurrently
      const [payRes, advRes, unpaidRes, lateRes, presentRes, summaryRes, otRes, logRes, rosterRes] = await Promise.all([
        safe(supabase.from('payroll_entries').select('*').eq('month', m).eq('year', y)),
        safe(supabase.from('advance_log').select('id, staff_id, amount, date, reason').eq('month', m).eq('year', y).order('date', { ascending: false })),
        safe(supabase.from('attendance').select('staff_id, date, status, leave_type').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('attendance').select('staff_id').eq('status', 'late').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('attendance').select('staff_id').eq('status', 'present').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('monthly_attendance_summary').select('*').eq('month', m).eq('year', y)),
        safe(supabase.from('overtime_logs').select('staff_id, overtime_hours, overtime_pay, manual_override, manual_overtime_hours, manual_overtime_pay').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('attendance_log').select('staff_id, date, status, hours_worked, overtime_minutes, shift_start, check_in_at, check_out_at').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('duty_roster').select('*').gte('day_date', rosterStartDate).lte('day_date', rosterEndDate).order('day_date', { ascending: true }))
      ])

      const rosterMap = {}
      ;(rosterRes?.data || []).forEach(r => {
        if (!rosterMap[r.staff_id]) rosterMap[r.staff_id] = {}
        rosterMap[r.staff_id][r.day_date] = r
      })
      setStaffRosters(rosterMap)

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

      // Fetch the EXACT same attendance report API that powers the Admin Attendance Heatmap
      const reportStaffMap = {}
      let reportDailyLogs = []
      try {
        const reportRes = await fetch(`/api/attendance/report?month=${m}&year=${y}`)
        if (reportRes.ok) {
          const reportJson = await reportRes.json()
          ;(reportJson.reports || []).forEach(r => {
            reportStaffMap[r.staff_id] = r
          })
          reportDailyLogs = reportJson.daily_logs || []
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

      // ─────────────────────────────────────────────────────────────
      // BUILD SYNCHRONIZED DAILY LOGS MAP FOR THE HEATMAP
      // ─────────────────────────────────────────────────────────────
      const dailyMap = {}

      // 1. Primary Source: Authoritative reportDailyLogs from /api/attendance/report
      reportDailyLogs.forEach(l => {
        if (!dailyMap[l.staff_id]) dailyMap[l.staff_id] = {}
        dailyMap[l.staff_id][l.date] = {
          ...l,
          checkInDisplay: formatTime12(l.check_in_formatted || l.check_in_at),
          checkOutDisplay: formatTime12(l.check_out_formatted || l.check_out_at),
          hoursWorked: Number(l.hours_worked || 0),
          overtimeMins: Number(l.overtime_minutes || (Number(l.overtime_hours || 0) * 60) || 0)
        }
      })

      // 2. Secondary: Merge direct attendance_log rows if any date wasn't in reportDailyLogs
      attLogs.forEach(l => {
        if (!dailyMap[l.staff_id]) dailyMap[l.staff_id] = {}
        if (!dailyMap[l.staff_id][l.date]) {
          const shift = getShiftType(l)
          const inFormatted = formatTime12(l.check_in_at)
          const outFormatted = formatTime12(l.check_out_at)
          dailyMap[l.staff_id][l.date] = {
            id: l.id,
            staff_id: l.staff_id,
            date: l.date,
            status: l.status,
            shift_start: l.shift_start,
            shift_type: shift,
            check_in_at: l.check_in_at,
            check_out_at: l.check_out_at,
            checkInDisplay: inFormatted,
            checkOutDisplay: outFormatted,
            hoursWorked: Number(l.hours_worked || 0),
            overtimeMins: Number(l.overtime_minutes || 0)
          }
        }

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

      // 3. Tertiary: Merge records from attendance table if missing (leaves, unpaid off)
      ;(unpaidRes.data || []).forEach(a => {
        if (a.date) {
          if (!dailyMap[a.staff_id]) dailyMap[a.staff_id] = {}
          if (!dailyMap[a.staff_id][a.date]) {
            dailyMap[a.staff_id][a.date] = {
              staff_id: a.staff_id,
              date: a.date,
              status: a.status || (a.leave_type === 'unpaid' ? 'absent' : 'off')
            }
          }
        }
      })

      setDailyAttendanceLogs(dailyMap)

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
        const autoFoodTotal = reportEntry ? reportEntry.total_food : (presentCount * 140)
        const autoMorningFood = 0
        const autoLunchDinner = autoFoodTotal

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

        // Compute total hours worked for the month
        const staffDaily = dailyMap[s.id] || {}
        const sumHoursFromLogs = Object.values(staffDaily).reduce((sum, dl) => sum + (Number(dl.hours_worked || dl.hoursWorked || 0)), 0)
        const totalHoursWorked = reportEntry?.total_hours || (Math.round(sumHoursFromLogs * 10) / 10) || (presentCount * 10)

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
            total_hours: totalHoursWorked,
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
          payMap[s.id].total_hours = totalHoursWorked
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
      setAuthError(t.errorEmpty)
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

    // 2. Staff login: <name>@cc
    const cleaned = raw.replace(/[<>]/g, '').trim().toLowerCase()
    const namePart = cleaned.includes('@cc')
      ? cleaned.split('@cc')[0].trim()
      : cleaned

    if (!namePart) {
      setAuthError(t.errorEmpty)
      return
    }

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
      setAuthError(t.errorInvalid)
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

  function toggleStaffCardTab(staffId, tabKey) {
    setStaffActiveTab(prev => ({
      ...prev,
      [staffId]: tabKey
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
        finalSalary: 0,
        totalHoursWorked: 0
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
    const totalHoursWorked = Number(p.total_hours) || 0

    return {
      base, perDay, hourlyRate,
      otHours, otPay, sc, bonus,
      mornFood, nightFood, miscEarnings,
      grossEarnings,
      adv, others, unpaidDays, unpaidDeduction,
      lateDays, lateDeductionDays, lateDeduction, isWaived,
      miscDeductions, totalDeductions,
      finalSalary,
      totalHoursWorked
    }
  }

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
        color: '#FFFFFF',
        position: 'relative'
      }}>
        {/* Language switcher on top right */}
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '9999px',
            padding: '3px'
          }}>
            {['en', 'bn'].map(l => (
              <button
                key={l}
                onClick={() => handleLanguageChange(l)}
                style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  background: lang === l ? '#D4933A' : 'transparent',
                  color: lang === l ? '#000000' : '#E2E8F0',
                  transition: 'all 0.2s'
                }}
              >
                {l === 'en' ? 'EN' : 'বাং'}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          width: '100%',
          maxWidth: '420px',
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
              {t.brandSubtitle}
            </p>
          </div>

          {/* Password Prompt Card */}
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#E2E8F0', marginBottom: '8px', letterSpacing: '0.02em' }}>
                {t.portalPasscode}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.passcodePlaceholder}
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
                  {t.multiMatchTitle}
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
              <span>{t.unlockBtn}</span>
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // 2. LOADING STATE
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    const progress = Math.round(((loadingStep + 1) / t.loadingSteps.length) * 100)
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
            {authRole === 'admin' ? t.adminCenterTitle : `${authStaff?.name} - ${t.reportSuffix}`}
          </p>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', borderRadius: '12px', padding: '18px 22px', width: '100%', maxWidth: '420px', marginBottom: '20px' }}>
            {t.loadingSteps.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: i <= loadingStep ? 1 : 0.3, padding: '4px 0' }}>
                <span style={{ color: i < loadingStep ? '#059669' : '#7C3A1E', fontWeight: 800 }}>{i < loadingStep ? '✓' : '›'}</span>
                <span style={{ fontSize: '13px', color: i === loadingStep ? '#0F172A' : '#64748B', fontWeight: i === loadingStep ? 700 : 500 }}>{label}</span>
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
                src={authRole === 'staff' && authStaff?.photo_url ? authStaff.photo_url : "/crown-coffee-logo.jpg"}
                alt={authRole === 'staff' ? (authStaff?.name || 'Staff') : "Crown Coffee"}
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #D4933A' }}
                onError={(e) => { e.target.src = "/crown-coffee-logo.jpg" }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                    {authRole === 'admin' ? t.adminCenterTitle : `${authStaff?.name}`}
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
                    {authRole === 'admin' ? t.adminBadge : (authStaff?.designation || t.staffBadge)}
                  </span>
                </div>
                <p style={{ color: '#64748B', fontSize: '12.5px', margin: '2px 0 0 0', fontWeight: 600 }}>
                  {t.months[month - 1]} {year} {t.reportSuffix}
                </p>
              </div>
            </div>

            {/* Language Switcher & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Language Pills */}
              <div style={{
                display: 'flex', alignItems: 'center',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '9999px',
                padding: '2px'
              }}>
                {['en', 'bn'].map(l => (
                  <button
                    key={l}
                    onClick={() => handleLanguageChange(l)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                      background: lang === l ? '#7C3A1E' : 'transparent',
                      color: lang === l ? '#FFFFFF' : '#64748B',
                      transition: 'all 0.2s'
                    }}
                  >
                    {l === 'en' ? 'EN' : 'বাং'}
                  </button>
                ))}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                title={t.lockSignOut}
              >
                <LogOut size={14} />
                <span>{t.lockSignOut}</span>
              </button>
            </div>
          </div>

          {/* Month & Year Selectors */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 700, fontSize: '13px', outline: 'none' }}
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
              >
                {t.months.map((mName, i) => <option key={i} value={i + 1}>{mName}</option>)}
              </select>
              <input
                type="number"
                style={{ width: '82px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 700, fontSize: '13px', textAlign: 'center', outline: 'none' }}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              />
              <button
                onClick={() => fetchAll(month, year)}
                disabled={loading}
                style={{
                  padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                  background: '#FFFFFF', color: '#0F172A', fontWeight: 700, fontSize: '13px',
                  cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
                title={t.refresh}
              >
                <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                <span>{t.refresh}</span>
              </button>
            </div>

            {/* Search (only in admin mode) */}
            {authRole === 'admin' && (
              <div style={{ position: 'relative', flex: '1', minWidth: '160px', maxWidth: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
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
              <p style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, margin: '0 0 4px 0' }}>{t.grandNet}</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#7C3A1E', margin: 0 }}>৳{grandTotal.toLocaleString()}</p>
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, margin: '0 0 4px 0' }}>{t.grandPaid}</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#059669', margin: 0 }}>৳{totalPaidAll.toLocaleString()}</p>
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, margin: '0 0 4px 0' }}>{t.grandDue}</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: totalRemainingAll > 0 ? '#DC2626' : '#059669', margin: 0 }}>৳{totalRemainingAll.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* ── PAYROLL CARDS WITH COMPLETE BREAKDOWN & ATTENDANCE HEATMAP ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {sortedStaff.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{t.noRecord}</p>
              <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>{t.noRecordSub}</p>
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
              const isExpanded = expandedBreakdowns[s.id] ?? true
              const activeTab = staffActiveTab[s.id] || 'breakdown' // 'breakdown' | 'heatmap'

              // Heatmap Calendar Computations
              const daysInMonth = new Date(year, month, 0).getDate()
              const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0=Sun .. 6=Sat
              const logsForStaff = dailyAttendanceLogs[s.id] || {}
              const activeDay = selectedDayInfo[s.id]
              const totalMonthlyHours = calc.totalHoursWorked || row.total_hours || 0

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid #8B5E3C',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        background: '#FAF7F2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {s.photo_url ? (
                          <img
                            src={s.photo_url}
                            alt={s.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div style={{
                          display: s.photo_url ? 'none' : 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #6B3A2A 0%, #8B5E3C 100%)',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '18px'
                        }}>
                          {s.name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>{s.name}</span>
                          {s.serial && (
                            <span style={{ fontSize: '10.5px', fontWeight: 800, background: '#E2E8F0', color: '#475569', padding: '2px 6px', borderRadius: '6px' }}>
                              #{s.serial}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>{s.designation}</span>
                          <span style={{ color: '#CBD5E1' }}>•</span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#7C3A1E',
                            background: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={11} color="#B45309" />
                            <span>{normalizeShiftTime(s.shift_start)} • {s.weekly_off || 'Friday'} Off</span>
                          </span>
                        </div>
                      </div>
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
                        {isFullyPaid ? t.fullyPaid : remaining > 0 ? `${t.due}: ৳${remaining.toLocaleString()}` : t.settled}
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
                        <span>{isExpanded ? t.collapse : t.breakdown}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* High-Level Settlement KPI Strip */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    background: '#FAFAFA',
                    borderBottom: '1px solid #E2E8F0',
                    padding: '12px 20px',
                    gap: '12px'
                  }}>
                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>{t.netSalary}</span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 900, color: '#7C3A1E' }}>৳{calc.finalSalary.toLocaleString()}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>{t.paidSoFar}</span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 900, color: '#059669' }}>৳{paid.toLocaleString()}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>{t.remainingDue}</span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 900, color: remaining > 0 ? '#DC2626' : '#059669' }}>৳{remaining.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* ── CARD TABS: [💰 SALARY BREAKDOWN] vs [📅 ATTENDANCE HEATMAP] vs [📋 WEEKLY ROSTER] ── */}
                  {isExpanded && (
                    <div style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', padding: '6px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => toggleStaffCardTab(s.id, 'breakdown')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: activeTab === 'breakdown' ? '1.5px solid #7C3A1E' : '1px solid #CBD5E1',
                          background: activeTab === 'breakdown' ? '#7C3A1E' : '#FFFFFF',
                          color: activeTab === 'breakdown' ? '#FFFFFF' : '#475569',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <DollarSign size={13} />
                        <span>{t.tabSalaryBreakdown}</span>
                      </button>

                      <button
                        onClick={() => toggleStaffCardTab(s.id, 'heatmap')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: activeTab === 'heatmap' ? '1.5px solid #7C3A1E' : '1px solid #CBD5E1',
                          background: activeTab === 'heatmap' ? '#7C3A1E' : '#FFFFFF',
                          color: activeTab === 'heatmap' ? '#FFFFFF' : '#475569',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <CalendarDays size={13} />
                        <span>{t.tabAttendanceHeatmap}</span>
                      </button>

                      <button
                        onClick={() => toggleStaffCardTab(s.id, 'roster')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: activeTab === 'roster' ? '1.5px solid #7C3A1E' : '1px solid #CBD5E1',
                          background: activeTab === 'roster' ? '#7C3A1E' : '#FFFFFF',
                          color: activeTab === 'roster' ? '#FFFFFF' : '#475569',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Clock size={13} />
                        <span>{t.tabWeeklyRoster}</span>
                      </button>
                    </div>
                  )}

                  {/* ── TAB 1: SALARY BREAKDOWN ── */}
                  {isExpanded && activeTab === 'breakdown' && (
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
                            {t.dutyFoundation}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{t.standardMonth}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '12px' }}>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>{t.baseSalary}</div>
                            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>৳{calc.base.toLocaleString()}</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>{t.ratePerDay}</div>
                            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>৳{calc.perDay.toLocaleString()}</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>{t.ratePerHour}</div>
                            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>৳{calc.hourlyRate.toLocaleString()}</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>{t.daysPresent}</div>
                            <div style={{ fontWeight: 800, color: '#059669', marginTop: '2px' }}>{row.present_days || 0} {t.daysUnit}</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>{t.foodAllowanceDays}</div>
                            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{row.present_days || 0} {t.daysUnit} (৳{((row.present_days || 0) * 140).toLocaleString()})</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>{t.lateArrivals}</div>
                            <div style={{ fontWeight: 800, color: '#D97706', marginTop: '2px' }}>{row.late_days || 0} {t.daysUnit}</div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>{t.absentOffDays}</div>
                            <div style={{ fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>{row.absent_days || 0} {t.daysUnit}</div>
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
                            <ArrowUpRight size={14} /> {t.earningsBreakdown}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 900, color: '#059669' }}>
                            ৳{calc.grossEarnings.toLocaleString()}
                          </span>
                        </div>

                        <div style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ color: '#475569' }}>{t.baseSalary}</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>৳{calc.base.toLocaleString()}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                            <div>
                              <span style={{ color: '#475569' }}>{t.overtimeAllowance}</span>
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
                              <span style={{ color: '#475569' }}>{t.foodAllowance}</span>
                              <span style={{ color: '#94A3B8', fontSize: '11px', marginLeft: '6px' }}>
                                ({row.present_days || (Number(row.night_days || 0) + Number(row.morning_days || 0))}{t.daysUnit} × ৳140)
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, color: (calc.mornFood + calc.nightFood) > 0 ? '#0F172A' : '#94A3B8' }}>
                              +৳{(calc.mornFood + calc.nightFood).toLocaleString()}
                            </span>
                          </div>

                          {calc.sc > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#475569' }}>{t.serviceChargePool}</span>
                              <span style={{ fontWeight: 700, color: '#059669' }}>+৳{calc.sc.toLocaleString()}</span>
                            </div>
                          )}

                          {calc.bonus > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#475569' }}>{t.bonusIncentive}</span>
                              <span style={{ fontWeight: 700, color: '#059669' }}>+৳{calc.bonus.toLocaleString()}</span>
                            </div>
                          )}

                          {calc.miscEarnings > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#475569' }}>{t.miscAddition} {row.miscellaneous_note ? `(${row.miscellaneous_note})` : ''}</span>
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
                            <ArrowDownRight size={14} /> {t.deductionsBreakdown}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 900, color: '#DC2626' }}>
                            -৳{calc.totalDeductions.toLocaleString()}
                          </span>
                        </div>

                        <div style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                          {/* Advance Taken */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <div>
                              <span style={{ color: '#475569' }}>{t.salaryAdvanceTaken}</span>
                              {staffAdvances.length > 0 && (
                                <span style={{ color: '#64748B', fontSize: '11px', marginLeft: '6px' }}>
                                  ({staffAdvances.length} {t.records})
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
                              <div style={{ fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>{t.advanceLogDetails}</div>
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
                              <span style={{ color: '#475569' }}>{t.unpaidLeaveDeduction}</span>
                              <span style={{ color: '#94A3B8', fontSize: '11px', marginLeft: '6px' }}>
                                ({calc.unpaidDays} {t.daysUnit} @ ৳{calc.perDay}/{t.daysUnit})
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, color: calc.unpaidDeduction > 0 ? '#DC2626' : '#94A3B8' }}>
                              {calc.unpaidDeduction > 0 ? `-৳${calc.unpaidDeduction.toLocaleString()}` : '৳0'}
                            </span>
                          </div>

                          {/* Late Deduction */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                            <div>
                              <span style={{ color: '#475569' }}>{t.lateAttendanceDeduction}</span>
                              <span style={{ color: '#94A3B8', fontSize: '11px', marginLeft: '6px' }}>
                                ({calc.lateDays} {t.latesToCut})
                              </span>
                            </div>
                            {calc.isWaived ? (
                              <span style={{ fontWeight: 700, color: '#059669' }}>{t.waived}</span>
                            ) : (
                              <span style={{ fontWeight: 700, color: calc.lateDeduction > 0 ? '#DC2626' : '#94A3B8' }}>
                                {calc.lateDeduction > 0 ? `-৳${calc.lateDeduction.toLocaleString()}` : '৳0'}
                              </span>
                            )}
                          </div>

                          {/* Others Taken */}
                          {calc.others > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#475569' }}>{t.othersTaken}</span>
                              <span style={{ fontWeight: 700, color: '#DC2626' }}>-৳{calc.others.toLocaleString()}</span>
                            </div>
                          )}

                          {/* Misc Deductions */}
                          {calc.miscDeductions > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#475569' }}>{t.penaltiesDeductions} {row.miscellaneous_note ? `(${row.miscellaneous_note})` : ''}</span>
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
                            {t.netPayableTitle}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#92400E', marginTop: '2px' }}>
                            ৳{calc.grossEarnings.toLocaleString()} - ৳{calc.totalDeductions.toLocaleString()}
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
                            <History size={14} /> {t.disbursementsTitle} ({staffPayments.length})
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: isFullyPaid ? '#059669' : '#D97706' }}>
                            {t.paidSoFar}: ৳{paid.toLocaleString()} | {t.due}: ৳{remaining.toLocaleString()}
                          </span>
                        </div>

                        {staffPayments.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                            {t.noPaymentYet}
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

                  {/* ── TAB 2: ATTENDANCE HEATMAP CALENDAR (Synced with Admin) ── */}
                  {isExpanded && activeTab === 'heatmap' && (
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                      {/* Header & Subtitle */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CalendarDays size={16} color="#7C3A1E" />
                            <span>{t.heatmapTitle} ({t.months[month - 1]} {year})</span>
                          </h3>
                        </div>
                        <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
                          {t.heatmapSubtitle}
                        </p>
                      </div>

                      {/* Monthly Work Summary Strip */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '8px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '10px 14px'
                      }}>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>{t.summaryDaysWorked}</div>
                          <div style={{ fontSize: '15px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                            {row.present_days || 0} {t.daysUnit}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>{t.summaryTotalOT}</div>
                          <div style={{ fontSize: '15px', fontWeight: 900, color: (calc.otHours || row.overtime_hours) > 0 ? '#B45309' : '#64748B', marginTop: '2px' }}>
                            {calc.otHours || row.overtime_hours || 0} {t.hoursUnit}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>{t.summaryFoodFee}</div>
                          <div style={{ fontSize: '15px', fontWeight: 900, color: '#7C3A1E', marginTop: '2px' }}>
                            ৳{((row.morning_food || 0) + (row.lunch_dinner || 0)).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Heatmap Legend */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '8px 12px'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#065F46' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#10B981' }} /> {t.legendPresent}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#0E7490' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#06B6D4' }} /> {t.legendFood}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#B45309' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#F59E0B' }} /> {t.legendLate}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#B91C1C' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#EF4444' }} /> {t.legendAbsent}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#CBD5E1' }} /> {t.legendOff}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#92400E' }}>
                          <Sparkles size={11} color="#D97706" /> {t.legendOvertime}
                        </span>
                      </div>

                      {/* 7-Column Calendar Grid */}
                      <div style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '12px',
                        overflowX: 'auto'
                      }}>
                        {/* Day of Week Headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '8px', textAlign: 'center' }}>
                          {t.weekDays.map((wd, i) => (
                            <div key={i} style={{ fontSize: '11px', fontWeight: 800, color: i === 5 ? '#D97706' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {wd}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Day Cells */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                          {/* Empty Spacers before 1st of month */}
                          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                            <div key={`spacer-${i}`} style={{ background: 'transparent', minHeight: '64px' }} />
                          ))}

                          {/* Days 1 to daysInMonth */}
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1
                            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                            const log = logsForStaff[dateKey]
                            const isToday = today.getFullYear() === year && (today.getMonth() + 1) === month && today.getDate() === dayNum
                            const isSelected = activeDay?.date === dateKey

                            let cellBg = '#F8FAFC'
                            let cellBorder = '#E2E8F0'
                            let textColor = '#475569'
                            let shiftType = null
                            let shiftBadge = ''
                            let inTimeCompact = ''
                            let outTimeCompact = ''
                            let hasOvertime = false
                            let otHours = 0
                            let otMins = 0

                            if (log) {
                              shiftType = getShiftType(log, s.shift_start)
                              inTimeCompact = formatTimeCompact(log.checkInDisplay || log.check_in_formatted || log.check_in_at)
                              outTimeCompact = formatTimeCompact(log.checkOutDisplay || log.check_out_formatted || log.check_out_at)
                              
                              otMins = Number(log.overtimeMins || log.overtime_minutes || (Number(log.overtime_hours || 0) * 60) || 0)
                              otHours = Math.round((otMins / 60) * 10) / 10
                              hasOvertime = otMins > 0

                              if (log.status === 'present') {
                                cellBg = '#ECFDF5'
                                cellBorder = '#A7F3D0'
                                textColor = '#065F46'
                                shiftBadge = '🍽️ ৳140'
                              } else if (log.status === 'late') {
                                cellBg = '#FFFBEB'
                                cellBorder = '#FDE68A'
                                textColor = '#92400E'
                                shiftBadge = '⏰ ৳140'
                              } else if (log.status === 'absent') {
                                cellBg = '#FEF2F2'
                                cellBorder = '#FECACA'
                                textColor = '#991B1B'
                                shiftBadge = '❌ Absent'
                              } else if (log.status === 'off') {
                                cellBg = '#F1F5F9'
                                cellBorder = '#E2E8F0'
                                textColor = '#64748B'
                                shiftBadge = '🏖️ Off'
                              }
                            } else {
                              const cellDate = new Date(year, month - 1, dayNum)
                              if (cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
                                cellBg = '#F8FAFC'
                                cellBorder = '#E2E8F0'
                                textColor = '#94A3B8'
                                shiftBadge = '—'
                              }
                            }

                            return (
                              <button
                                key={dayNum}
                                type="button"
                                onClick={() => {
                                  setSelectedDayInfo(prev => ({
                                    ...prev,
                                    [s.id]: {
                                      dayNum,
                                      date: dateKey,
                                      log: log || null,
                                      shiftType
                                    }
                                  }))
                                }}
                                style={{
                                  minHeight: '66px',
                                  padding: '5px 4px',
                                  borderRadius: '8px',
                                  background: cellBg,
                                  border: isSelected ? '2px solid #7C3A1E' : `1px solid ${cellBorder}`,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  position: 'relative',
                                  boxSizing: 'border-box',
                                  transition: 'transform 0.15s, box-shadow 0.15s',
                                  boxShadow: isToday ? '0 0 0 2px #D4933A' : isSelected ? '0 2px 8px rgba(124, 58, 30, 0.2)' : 'none'
                                }}
                                title={`${dateKey}: ${log ? log.status : 'No record'}`}
                              >
                                {/* Top Line: Day Number + Dot indicator */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 800, color: textColor }}>
                                    {dayNum}
                                  </span>
                                  {isToday ? (
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#D4933A' }} />
                                  ) : shiftType === 'morning' ? (
                                    <span style={{ fontSize: '9px' }}>🌅</span>
                                  ) : shiftType === 'night' ? (
                                    <span style={{ fontSize: '9px' }}>🌙</span>
                                  ) : null}
                                </div>

                                {/* Middle Line: Arrival & Departure Time */}
                                {log && (inTimeCompact || outTimeCompact) ? (
                                  <div style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    color: '#0F172A',
                                    textAlign: 'center',
                                    lineHeight: '1.2',
                                    margin: '1px 0'
                                  }}>
                                    {inTimeCompact && outTimeCompact ? (
                                      <span>{inTimeCompact}–{outTimeCompact}</span>
                                    ) : inTimeCompact ? (
                                      <span>{inTimeCompact}</span>
                                    ) : null}
                                  </div>
                                ) : (
                                  shiftBadge && (
                                    <span style={{ fontSize: '9px', fontWeight: 700, color: textColor }}>
                                      {shiftBadge}
                                    </span>
                                  )
                                )}

                                {/* Bottom Line: Overtime Badge (if any) or Food chip */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', maxWidth: '100%', overflow: 'hidden' }}>
                                  {hasOvertime ? (
                                    <span style={{
                                      fontSize: '8.5px',
                                      fontWeight: 800,
                                      padding: '1px 3px',
                                      borderRadius: '4px',
                                      background: '#FEF3C7',
                                      color: '#B45309',
                                      border: '1px solid #FDE68A',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      +{otHours > 0 ? `${otHours}h` : `${otMins}m`} OT
                                    </span>
                                  ) : log && (log.status === 'present' || log.status === 'late') ? (
                                    <span style={{
                                      fontSize: '8.5px',
                                      fontWeight: 800,
                                      padding: '1px 3px',
                                      borderRadius: '4px',
                                      background: '#CCFBF1',
                                      color: '#0E7490',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      ৳140
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* ── INTERACTIVE SELECTED DAY INSPECTOR BOX ── */}
                      {activeDay && (
                        <div style={{
                          background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: '12px',
                          padding: '14px 18px',
                          fontSize: '12.5px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} color="#7C3A1E" />
                              <span>{t.selectedDayDetails} {activeDay.date}</span>
                            </span>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '11px',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              background: activeDay.log?.status === 'present' ? '#DCFCE7' : activeDay.log?.status === 'late' ? '#FEF3C7' : activeDay.log?.status === 'off' ? '#E2E8F0' : '#FEE2E2',
                              color: activeDay.log?.status === 'present' ? '#15803D' : activeDay.log?.status === 'late' ? '#B45309' : activeDay.log?.status === 'off' ? '#475569' : '#B91C1C',
                              textTransform: 'uppercase'
                            }}>
                              {activeDay.log ? activeDay.log.status : 'No Check-in'}
                            </span>
                          </div>

                          {activeDay.log ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                              {/* 1. Time of Arrival */}
                              <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <LogIn size={12} color="#059669" />
                                  <span>{t.arrivalTimeText}</span>
                                </div>
                                <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px', fontSize: '13px' }}>
                                  {formatTime12(activeDay.log.checkInDisplay || activeDay.log.check_in_formatted || activeDay.log.check_in_at) || '—'}
                                </div>
                              </div>

                              {/* 2. Time of Departure */}
                              <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <LogOutIcon size={12} color="#D97706" />
                                  <span>{t.departureTimeText}</span>
                                </div>
                                <div style={{ fontWeight: 800, color: activeDay.log.check_out_at ? '#0F172A' : '#D97706', marginTop: '2px', fontSize: '13px' }}>
                                  {formatTime12(activeDay.log.checkOutDisplay || activeDay.log.check_out_formatted || activeDay.log.check_out_at) || t.stillWorkingText}
                                </div>
                              </div>

                              {/* 3. Overtime (Highlighted if any) */}
                              <div style={{
                                background: (activeDay.log.overtimeMins || activeDay.log.overtime_minutes || activeDay.log.overtime_hours) > 0 ? '#FFFBEB' : '#FFFFFF',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: (activeDay.log.overtimeMins || activeDay.log.overtime_minutes || activeDay.log.overtime_hours) > 0 ? '1.5px solid #FDE68A' : '1px solid #E2E8F0'
                              }}>
                                <div style={{ color: (activeDay.log.overtimeMins || activeDay.log.overtime_minutes || activeDay.log.overtime_hours) > 0 ? '#B45309' : '#64748B', fontSize: '10.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Sparkles size={12} color="#D97706" />
                                  <span>{t.overtimeText}</span>
                                </div>
                                <div style={{ fontWeight: 900, color: (activeDay.log.overtimeMins || activeDay.log.overtime_minutes || activeDay.log.overtime_hours) > 0 ? '#B45309' : '#475569', marginTop: '2px', fontSize: '13px' }}>
                                  {(activeDay.log.overtimeMins || activeDay.log.overtime_minutes || activeDay.log.overtime_hours) > 0 ? (
                                    <span>
                                      +{activeDay.log.overtime_hours ? `${activeDay.log.overtime_hours} hrs` : `${Math.round(activeDay.log.overtimeMins / 60 * 10) / 10} hrs`} ({activeDay.log.overtimeMins || Math.round(Number(activeDay.log.overtime_hours) * 60)} mins)
                                    </span>
                                  ) : (
                                    <span>{t.noOvertimeText}</span>
                                  )}
                                </div>
                              </div>

                              {/* 4. Hours Worked */}
                              <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>
                                  {t.totalHoursText}
                                </div>
                                <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px', fontSize: '13px' }}>
                                  {activeDay.log.hours_worked || activeDay.log.hoursWorked ? `${activeDay.log.hours_worked || activeDay.log.hoursWorked} hrs` : '—'}
                                </div>
                              </div>

                              {/* 5. Shift & Food Allowance */}
                              <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <div style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 700 }}>
                                  {t.foodAllowanceText}
                                </div>
                                <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px', fontSize: '13px' }}>
                                  {(activeDay.log?.status === 'present' || activeDay.log?.status === 'late')
                                    ? `🍽️ ৳140 (${activeDay.shiftType === 'morning' ? (t.legendMorning || 'Morning') : (t.legendNight || 'Night')})`
                                    : '—'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p style={{ margin: 0, color: '#64748B', fontStyle: 'italic' }}>
                              {t.noRecordDay}
                            </p>
                          )}
                        </div>
                      )}

                    </div>
                  )}

                  {/* ── TAB 3: WEEKLY ROSTER SCHEDULE (Assigned Duty Roster) ── */}
                  {isExpanded && activeTab === 'roster' && (() => {
                    const weeks = getWeeksForMonth(year, month)
                    const activeWeekStart = staffSelectedWeek[s.id] || (weeks.length > 0 ? weeks[0].start : getSaturdayOf(new Date()))
                    const activeWeek = weeks.find(w => w.start === activeWeekStart) || weeks[0] || { start: activeWeekStart, end: activeWeekStart, days: get7Days(activeWeekStart), label: 'Current Week' }
                    const staffRosterByDate = staffRosters[s.id] || {}
                    const selectedRosterDate = staffSelectedRosterDay[s.id] || activeWeek.days[0]

                    // Calculate week stats
                    let weekScheduledDays = 0
                    let weekOffDays = 0
                    let weekTotalHours = 0

                    activeWeek.days.forEach(d => {
                      const dObj = parseLocalDate(d)
                      const dayFullName = dObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
                      const isDefaultOff = s.weekly_off && dayFullName === s.weekly_off.toLowerCase()
                      const item = staffRosterByDate[d]
                      const isOff = item ? !!item.is_off : isDefaultOff
                      const isLeave = item ? !!item.is_leave : false

                      if (isOff || isLeave) {
                        weekOffDays++
                      } else {
                        weekScheduledDays++
                        weekTotalHours += (item?.shift_hours || s.shift_hours || 10)
                      }
                    })

                    const todayStr = formatDateStr(new Date())

                    return (
                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Header & Subtitle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={16} color="#7C3A1E" />
                              <span>{t.rosterTitle}</span>
                            </h3>
                            <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
                              {t.rosterSubtitle}
                            </p>
                          </div>

                          {/* Quick standard shift pill */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 800, color: '#7C3A1E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '5px 10px', borderRadius: '8px' }}>
                            <Coffee size={13} color="#B45309" />
                            <span>{t.rosterShiftAssigned}: {normalizeShiftTime(s.shift_start)}</span>
                            <span style={{ color: '#D97706' }}>•</span>
                            <span>{t.rosterWeeklyOff}: {s.weekly_off || 'Friday'}</span>
                          </div>
                        </div>

                        {/* Week Selection Strip */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {t.rosterSelectWeek}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                            {weeks.map((w, idx) => {
                              const isCur = w.days.includes(todayStr)
                              const isSelected = w.start === activeWeek.start

                              return (
                                <button
                                  key={w.start}
                                  onClick={() => setStaffSelectedWeek(prev => ({ ...prev, [s.id]: w.start }))}
                                  style={{
                                    padding: '7px 12px',
                                    borderRadius: '8px',
                                    border: isSelected ? '1.5px solid #7C3A1E' : '1px solid #E2E8F0',
                                    background: isSelected ? '#7C3A1E' : isCur ? '#FEF3C7' : '#FFFFFF',
                                    color: isSelected ? '#FFFFFF' : isCur ? '#92400E' : '#334155',
                                    fontWeight: 800,
                                    fontSize: '11.5px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  <span>Week {idx + 1}: {w.label}</span>
                                  {isCur && (
                                    <span style={{
                                      fontSize: '9px',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      background: isSelected ? 'rgba(255,255,255,0.25)' : '#D97706',
                                      color: '#FFFFFF',
                                      fontWeight: 800
                                    }}>
                                      {t.rosterTodayBadge}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Week KPI Strip */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '8px',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          padding: '10px 14px'
                        }}>
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>{t.rosterScheduledDays}</div>
                            <div style={{ fontSize: '15px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                              {weekScheduledDays} {t.daysUnit}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>{t.rosterDayOff}</div>
                            <div style={{ fontSize: '15px', fontWeight: 900, color: '#DC2626', marginTop: '2px' }}>
                              {weekOffDays} {t.daysUnit}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>{t.rosterScheduledHours}</div>
                            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                              {weekTotalHours} {t.hoursUnit}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>{t.rosterShiftAssigned}</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#7C3A1E', marginTop: '2px' }}>
                              {normalizeShiftTime(s.shift_start)}
                            </div>
                          </div>
                        </div>

                        {/* 7-Days Schedule Cards Grid (Saturday to Friday) */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '8px'
                        }}>
                          {activeWeek.days.map((d) => {
                            const dObj = parseLocalDate(d)
                            const dayName = dObj.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' })
                            const dayNum = dObj.getDate()
                            const monthShort = dObj.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short' })
                            const isToday = d === todayStr
                            const isSelected = selectedRosterDate === d

                            const dayFullNameEn = dObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
                            const isDefaultOff = s.weekly_off && dayFullNameEn === s.weekly_off.toLowerCase()
                            const item = staffRosterByDate[d]
                            const isOff = item ? !!item.is_off : isDefaultOff
                            const isLeave = item ? !!item.is_leave : false
                            const isDutyChange = item ? !!item.is_duty_change : false

                            let shiftVal = isOff ? 'OFF' : (item?.shift_start ? normalizeShiftTime(item.shift_start, isOff) : (s.shift_start ? normalizeShiftTime(s.shift_start, isOff) : '11:00 AM'))
                            const hours = item?.shift_hours || s.shift_hours || 10

                            // Actual attendance for cross-checking
                            const attLog = (logsForStaff || {})[d]

                            let cardBg = '#F8FAFC'
                            let cardBorder = '#CBD5E1'
                            let shiftBadgeBg = '#EEF2FF'
                            let shiftBadgeColor = '#4338CA'

                            if (isOff) {
                              cardBg = '#FEF2F2'
                              cardBorder = '#FECACA'
                              shiftBadgeBg = '#FEE2E2'
                              shiftBadgeColor = '#B91C1C'
                            } else if (isLeave) {
                              cardBg = '#F0F9FF'
                              cardBorder = '#BAE6FD'
                              shiftBadgeBg = '#E0F2FE'
                              shiftBadgeColor = '#0369A1'
                            } else if (shiftVal === '11:00 AM') {
                              cardBg = '#FFFBEB'
                              cardBorder = '#FDE68A'
                              shiftBadgeBg = '#FEF3C7'
                              shiftBadgeColor = '#B45309'
                            } else if (shiftVal === '1:00 PM') {
                              cardBg = '#EEF2FF'
                              cardBorder = '#C7D2FE'
                              shiftBadgeBg = '#E0E7FF'
                              shiftBadgeColor = '#4338CA'
                            }

                            return (
                              <div
                                key={d}
                                onClick={() => setStaffSelectedRosterDay(prev => ({ ...prev, [s.id]: d }))}
                                style={{
                                  background: cardBg,
                                  border: isSelected ? '2px solid #7C3A1E' : `1.5px solid ${cardBorder}`,
                                  borderRadius: '10px',
                                  padding: '10px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  position: 'relative',
                                  boxShadow: isToday ? '0 0 0 2px #D4933A' : 'none',
                                  transition: 'transform 0.15s, box-shadow 0.15s'
                                }}
                              >
                                <div>
                                  {/* Day Header */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: isOff ? '#DC2626' : '#0F172A' }}>
                                      {dayName}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>
                                      {dayNum} {monthShort}
                                    </span>
                                  </div>

                                  {/* Today indicator */}
                                  {isToday && (
                                    <div style={{ marginTop: '3px' }}>
                                      <span style={{ fontSize: '8.5px', padding: '1px 5px', borderRadius: '4px', background: '#D97706', color: '#FFFFFF', fontWeight: 800 }}>
                                        {t.rosterTodayBadge}
                                      </span>
                                    </div>
                                  )}

                                  {/* Shift Time Badge */}
                                  <div style={{ marginTop: '8px' }}>
                                    <div style={{
                                      fontSize: '11px',
                                      fontWeight: 900,
                                      padding: '4px 6px',
                                      borderRadius: '6px',
                                      background: shiftBadgeBg,
                                      color: shiftBadgeColor,
                                      textAlign: 'center',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px'
                                    }}>
                                      {isOff ? (
                                        <span>🔴 {t.rosterDayOff}</span>
                                      ) : isLeave ? (
                                        <span>🔵 {t.rosterLeave}</span>
                                      ) : (
                                        <span>☕ {shiftVal}</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Duty change badge */}
                                  {isDutyChange && (
                                    <div style={{ marginTop: '4px', textAlign: 'center' }}>
                                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '1px 5px', borderRadius: '4px' }}>
                                        {t.rosterDutyChange}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Bottom Info: Hours & Actual attendance status */}
                                <div style={{ marginTop: '8px', borderTop: '1px dashed #CBD5E1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '9.5px', color: '#64748B', fontWeight: 700 }}>
                                    {isOff || isLeave ? '—' : `${hours} ${t.rosterHoursUnit}`}
                                  </span>
                                  {attLog && (
                                    <span style={{
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      color: attLog.status === 'present' ? '#15803D' : attLog.status === 'late' ? '#B45309' : '#64748B'
                                    }}>
                                      {attLog.status === 'present' ? '✓ Attended' : attLog.status === 'late' ? '⚠ Late' : attLog.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Selected Day Cross-Check Inspector */}
                        {selectedRosterDate && (() => {
                          const sDateObj = parseLocalDate(selectedRosterDate)
                          const sDayName = sDateObj.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long' })
                          const sItem = staffRosterByDate[selectedRosterDate]
                          const sDayFullName = sDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
                          const sIsDefaultOff = s.weekly_off && sDayFullName === s.weekly_off.toLowerCase()
                          const sIsOff = sItem ? !!sItem.is_off : sIsDefaultOff
                          const sShift = sIsOff ? 'OFF' : (sItem?.shift_start ? normalizeShiftTime(sItem.shift_start, sIsOff) : (s.shift_start ? normalizeShiftTime(s.shift_start, sIsOff) : '11:00 AM'))
                          const sHours = sItem?.shift_hours || s.shift_hours || 10
                          const sAttLog = (logsForStaff || {})[selectedRosterDate]

                          return (
                            <div style={{
                              background: '#FFFFFF',
                              border: '1.5px solid #CBD5E1',
                              borderRadius: '10px',
                              padding: '12px 16px',
                              fontSize: '12px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                <div style={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Calendar size={14} color="#7C3A1E" />
                                  <span>{sDayName}, {selectedRosterDate}</span>
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: sIsOff ? '#FEE2E2' : '#DCFCE7',
                                  color: sIsOff ? '#B91C1C' : '#15803D'
                                }}>
                                  {sIsOff ? t.rosterDayOff : `${sShift} (${sHours} ${t.rosterHoursUnit})`}
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                                <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                  <div style={{ color: '#64748B', fontSize: '10px', fontWeight: 700 }}>{t.rosterTitle}</div>
                                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                                    {sIsOff ? t.rosterDayOff : `${sShift} Shift`}
                                    {sItem?.notes ? ` • Note: ${sItem.notes}` : ''}
                                  </div>
                                </div>

                                <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                  <div style={{ color: '#64748B', fontSize: '10px', fontWeight: 700 }}>{t.rosterActualAtt}</div>
                                  <div style={{ fontWeight: 800, color: sAttLog ? '#0F172A' : '#64748B', marginTop: '2px' }}>
                                    {sAttLog ? (
                                      <span>
                                        {sAttLog.status?.toUpperCase()} • {sAttLog.check_in_at ? formatTime12(sAttLog.check_in_at) : '—'} to {sAttLog.check_out_at ? formatTime12(sAttLog.check_out_at) : (sAttLog.check_in_at ? t.stillWorkingText : '—')} ({sAttLog.hours_worked || sAttLog.hoursWorked || 0} {t.rosterHoursUnit})
                                      </span>
                                    ) : (
                                      <span style={{ fontStyle: 'italic' }}>{t.noRecordDay}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })()}

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
                          total_hours: totalMonthlyHours,
                          is_paid: isFullyPaid,
                          is_waived: calc.isWaived
                        },
                        month: t.months[month - 1],
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
                      <span>{t.printSlipBtn}</span>
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
