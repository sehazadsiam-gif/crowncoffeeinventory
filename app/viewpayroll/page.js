'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import { Printer, X, History, ChevronUp, ChevronDown } from 'lucide-react'
import dynamic from 'next/dynamic'

const PaySlip = dynamic(() => import('../../components/PaySlip'), { ssr: false })

function getShiftType(log, staffDefaultShift = '11:00') {
  const shiftStr = String(log?.shift_start || staffDefaultShift || '').trim()
  const timePrefix = shiftStr.slice(0, 5)
  if (timePrefix === '08:00' || timePrefix === '11:00' || timePrefix === '10:00') {
    return 'morning'
  }
  if (timePrefix === '13:00' || timePrefix === '14:00' || timePrefix === '15:00') {
    return 'night'
  }
  const hourMatch = shiftStr.match(/^(\d{1,2})/)
  if (hourMatch) {
    const h = parseInt(hourMatch[1], 10)
    if (h >= 7 && h <= 12) return 'morning'
    if (h >= 13) return 'night'
  }
  if (log?.check_in_at) {
    const d = new Date(log.check_in_at)
    if (!isNaN(d.getTime())) {
      const localHour = (d.getUTCHours() + 6) % 24
      return localHour < 12.5 ? 'morning' : 'night'
    }
  }
  return 'morning'
}

const LOADING_STEPS = [
  { label: 'Connecting to database...' },
  { label: 'Fetching staff records...' },
  { label: 'Calculating overtime & deductions...' },
  { label: 'Computing net salaries...' },
  { label: 'Preparing payroll ledger...' },
]

export default function ViewPayrollPage() {
  const [staff, setStaff] = useState([])
  const [payroll, setPayroll] = useState({})
  const [payments, setPayments] = useState({})
  const [showHistory, setShowHistory] = useState(null)
  const [month, setMonth] = useState(7)
  const [year, setYear] = useState(2026)
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState(0)
  const [printData, setPrintData] = useState(null)
  const [nameSort, setNameSort] = useState('asc') // 'asc' | 'desc'
  const [waivedStaff, setWaivedStaff] = useState({})

  useEffect(() => {
    fetchAll(month, year)
  }, [month, year])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % LOADING_STEPS.length)
    }, 900)
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
        const clientStaffRes = await supabase.from('staff').select('*').eq('is_active', true).order('serial', { ascending: true }).order('name', { ascending: true })
        activeStaffList = clientStaffRes.data || []
      }

      const safe = (q) => Promise.resolve(q).catch(() => ({ data: [] }))

      const [payRes, advRes, unpaidRes, lateRes, presentRes, summaryRes, otRes, logRes] = await Promise.all([
        safe(supabase.from('payroll_entries').select('*').eq('month', m).eq('year', y)),
        safe(supabase.from('advance_log').select('staff_id, amount').eq('month', m).eq('year', y)),
        safe(supabase.from('attendance').select('staff_id').eq('leave_type', 'unpaid').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('attendance').select('staff_id').eq('status', 'late').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('attendance').select('staff_id').eq('status', 'present').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('monthly_attendance_summary').select('*').eq('month', m).eq('year', y)),
        safe(supabase.from('overtime_logs').select('staff_id, overtime_hours, overtime_pay, manual_override, manual_overtime_hours, manual_overtime_pay').gte('date', startDate).lte('date', endDate)),
        safe(supabase.from('attendance_log').select('staff_id, status, hours_worked, overtime_minutes, shift_start, check_in_at').gte('date', startDate).lte('date', endDate))
      ])

      const staffRes = { data: activeStaffList }

      const summaryMap = {}
      ;(summaryRes.data || []).forEach(s => {
        summaryMap[s.staff_id] = s
      })

      const advancesMap = {}
      ;(advRes.data || []).forEach(a => {
        advancesMap[a.staff_id] = (advancesMap[a.staff_id] || 0) + Number(a.amount)
      })

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
      const logOtMap = {}
      const logMorningDays = {}
      const logNightDays = {}

      attLogs.forEach(l => {
        if (l.status === 'late') logLateMap[l.staff_id] = (logLateMap[l.staff_id] || 0) + 1
        if (l.status === 'present' || l.status === 'late') {
          logPresentMap[l.staff_id] = (logPresentMap[l.staff_id] || 0) + 1
          const shift = getShiftType(l)
          if (shift === 'morning') {
            logMorningDays[l.staff_id] = (logMorningDays[l.staff_id] || 0) + 1
          } else {
            logNightDays[l.staff_id] = (logNightDays[l.staff_id] || 0) + 1
          }
        }
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

      const activeStaff = staffRes.data || []
      for (const s of activeStaff) {
        const summary = summaryMap[s.id]

        const lateDays = summary ? Number(summary.late_days ?? summary.total_late ?? 0) : (logLateMap[s.id] || lateMap[s.id] || 0)
        const presentCount = summary ? Number(summary.present_days ?? summary.total_present ?? 0) : (logPresentMap[s.id] || presentMap[s.id] || 0)
        const absentCount = summary ? Number(summary.absent_days ?? summary.total_absent ?? 0) : (unpaidMap[s.id] || 0)
        const totalPresentForFood = presentCount

        const morningDays = logMorningDays[s.id] || 0
        const nightDays = logNightDays[s.id] !== undefined ? logNightDays[s.id] : Math.max(0, presentCount - morningDays)
        const autoMorningFood = morningDays * 110
        const autoLunchDinner = nightDays * 140

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

      setStaff(activeStaff)
      setPayroll(payMap)

      const initialWaived = {}
      for (const s of activeStaff) {
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

  function calculateFinalSalary(s, p, isLateWaived) {
    if (!s || !p) return 0
    const base = Number(s.base_salary) || 0
    const perHourRate = s.hourly_rate || Math.floor(Math.floor(base / 30) / 10)
    const ot = p.overtime_pay !== undefined && p.overtime_pay !== null && p.overtime_pay !== ''
      ? Number(p.overtime_pay)
      : (Number(p.overtime_hours) || 0) * perHourRate
    const sc = Number(p.service_charge) || 0
    const bonus = Number(p.bonus) || 0
    const lunch = Number(p.lunch_dinner) || 0
    const morn = Number(p.morning_food) || 0
    const misc = Number(p.miscellaneous) || 0
    const adv = Number(p.advance_taken) || 0
    const others = Number(p.others_taken) || 0
    const perDay = Math.round(base / 30)

    const absentDays = Number(p.absent_days) || 0
    const freeAbsentDays = 4
    const autoUnpaidDays = Math.max(0, absentDays - freeAbsentDays)
    const waivedDays = Number(p.waived_unpaid_days) || 0
    const finalUnpaidDays = p.manual_unpaid_days !== undefined && p.manual_unpaid_days !== null
      ? Number(p.manual_unpaid_days)
      : Math.max(0, autoUnpaidDays - waivedDays)
    const unpaidDeduction = finalUnpaidDays * perDay

    const isWaived = isLateWaived !== undefined ? isLateWaived : Boolean(p.late_waived)
    const late = isWaived ? 0 : (Number(p.late_deduction) || 0)

    return Math.round(
      base + ot + sc + bonus + lunch + morn + misc
      - adv - others - unpaidDeduction - late
    )
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const sortedStaff = [...staff].sort((a, b) => {
    if ((a.serial || 999) !== (b.serial || 999)) {
      return (a.serial || 999) - (b.serial || 999)
    }
    return nameSort === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  })

  const grandTotal = sortedStaff.reduce((acc, s) => acc + calculateFinalSalary(s, payroll[s.id] || {}, waivedStaff[s.id]), 0)
  const totalPaidAll = sortedStaff.reduce((acc, s) => {
    const staffPayments = payments[s.id] || []
    return acc + staffPayments.reduce((pAcc, p) => pAcc + Number(p.amount_paid || p.amount || 0), 0)
  }, 0)
  const totalRemainingAll = grandTotal - totalPaidAll

  const colHeaders = [
    'Staff',
    'Base Salary',
    'Overtime Hours',
    'Service Charge',
    'Bonus',
    'Lunch + Dinner',
    'Morning Food',
    'Advance',
    'Others',
    'Unpaid Leave',
    'Late Deduction',
    'Miscellaneous',
    'Net Pay',
    'Payment'
  ]

  if (loading) {
    const progress = Math.round(((loadingStep + 1) / LOADING_STEPS.length) * 100)
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: '"Inter", system-ui, sans-serif', boxSizing: 'border-box', color: '#0F172A', display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          @keyframes shimmerGold {
            0% { background-position: -800px 0; }
            100% { background-position: 800px 0; }
          }
          @keyframes goldPulse {
            0% { box-shadow: 0 0 0 0 rgba(124,58,30,0.3), 0 0 20px rgba(212,147,58,0.2); }
            50% { box-shadow: 0 0 0 18px rgba(124,58,30,0), 0 0 35px rgba(212,147,58,0.35); }
            100% { box-shadow: 0 0 0 0 rgba(124,58,30,0), 0 0 20px rgba(212,147,58,0.2); }
          }
          @keyframes rotateRing {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          @keyframes logoBreath {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 4px 12px rgba(124,58,30,0.15)); }
            50% { transform: scale(1.03); filter: drop-shadow(0 8px 24px rgba(212,147,58,0.3)); }
          }
          .shimmer-gold {
            background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
            background-size: 800px 100%;
            animation: shimmerGold 1.8s infinite linear;
            border-radius: 6px;
          }
        `}</style>

        {/* Centered logo hero */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '0' }}>

          {/* Logo with glow ring */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '36px' }}>
            {/* Outer spinning dashed ring */}
            <svg style={{ position: 'absolute', width: '210px', height: '210px', animation: 'rotateRing 6s linear infinite', opacity: 0.6 }} viewBox="0 0 210 210">
              <circle cx="105" cy="105" r="100" fill="none" stroke="#7C3A1E" strokeWidth="1" strokeDasharray="6 10" strokeLinecap="round" />
            </svg>
            {/* Inner glow ring */}
            <svg style={{ position: 'absolute', width: '185px', height: '185px', animation: 'rotateRing 10s linear infinite reverse', opacity: 0.4 }} viewBox="0 0 185 185">
              <circle cx="92.5" cy="92.5" r="88" fill="none" stroke="#D4933A" strokeWidth="0.8" strokeDasharray="2 14" strokeLinecap="round" />
            </svg>
            {/* Logo image */}
            <img
              src="/crown-coffee-logo.jpg"
              alt="Crown Coffee"
              style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                objectFit: 'cover',
                animation: 'logoBreath 3s ease-in-out infinite, goldPulse 3s ease-in-out infinite',
                position: 'relative',
                zIndex: 1
              }}
            />
          </div>

          {/* Brand text */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 900, letterSpacing: '0.12em', color: '#7C3A1E', textTransform: 'uppercase' }}>Crown Coffee</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', letterSpacing: '0.3em', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Multi Cuisine Café · Payroll System</p>
          </div>

          {/* Status log panel */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', borderRadius: '12px', padding: '18px 22px', fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace', fontSize: '12px', lineHeight: '2', width: '100%', maxWidth: '440px', marginBottom: '20px' }}>
            {LOADING_STEPS.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                opacity: i < loadingStep ? 0.5 : i === loadingStep ? 1 : 0.25,
                transition: 'opacity 0.5s ease',
                animation: i === loadingStep ? 'fadeUp 0.35s ease' : 'none'
              }}>
                <span style={{ color: i < loadingStep ? '#059669' : i === loadingStep ? '#7C3A1E' : '#CBD5E1', fontWeight: 800, flexShrink: 0, width: '14px', textAlign: 'center' }}>
                  {i < loadingStep ? '✓' : i === loadingStep ? '›' : '·'}
                </span>
                <span style={{ color: i < loadingStep ? '#059669' : i === loadingStep ? '#0F172A' : '#94A3B8', fontWeight: i === loadingStep ? 700 : 500 }}>
                  {s.label}
                </span>
                {i === loadingStep && (
                  <span style={{ color: '#7C3A1E', animation: 'blink 0.8s step-end infinite', marginLeft: '2px' }}>▋</span>
                )}
              </div>
            ))}
          </div>

          {/* Gold progress bar */}
          <div style={{ width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading</span>
              <span style={{ fontSize: '10px', color: '#7C3A1E', fontWeight: 800, fontFamily: 'monospace' }}>{progress}%</span>
            </div>
            <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #7C3A1E, #D4933A)',
                borderRadius: '3px',
                transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 6px rgba(124,58,30,0.3)'
              }} />
            </div>
          </div>
        </div>

        {/* Bottom skeleton preview */}
        <div style={{ padding: '0 16px 16px 16px', opacity: 0.45, maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {/* KPI cards skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[['Grand Total', '65%'], ['Total Paid', '42%'], ['Remaining', '50%']].map(([lbl, w], i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '8px' }}>{lbl}</div>
                <div className="shimmer-gold" style={{ width: w, height: '20px' }} />
              </div>
            ))}
          </div>

          {/* Card list skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[0, 1, 2].map(r => (
              <div key={r} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', padding: '16px', opacity: 1 - r * 0.2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ width: '120px' }}>
                    <div className="shimmer-gold" style={{ height: '14px', marginBottom: '6px' }} />
                    <div className="shimmer-gold" style={{ height: '10px', width: '80px' }} />
                  </div>
                  <div className="shimmer-gold" style={{ height: '12px', width: '60px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed #E2E8F0', paddingTop: '12px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="shimmer-gold" style={{ height: '10px', width: '70px' }} />
                      <div className="shimmer-gold" style={{ height: '10px', width: '40px' }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#0F172A' }}>
      <Navbar />
      <main style={{ width: '100%', maxWidth: '640px', margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box' }}>

        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Payroll Center (View Only)</h1>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0', fontWeight: 600 }}>{months[month - 1]} {year}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              style={{ width: '130px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 700, fontSize: '13px', outline: 'none' }}
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
            >
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input
              type="number"
              style={{ width: '85px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 700, fontSize: '13px', textAlign: 'center', outline: 'none' }}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Top Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <p style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, margin: '0 0 4px 0' }}>Grand Total Salary</p>
            <p style={{ fontSize: '22px', fontWeight: 900, color: '#7C3A1E', margin: 0 }}>৳{grandTotal.toLocaleString()}</p>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <p style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, margin: '0 0 4px 0' }}>Grand Paid Amount</p>
            <p style={{ fontSize: '22px', fontWeight: 900, color: '#059669', margin: 0 }}>৳{totalPaidAll.toLocaleString()}</p>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <p style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, margin: '0 0 4px 0' }}>Grand Remaining to Pay</p>
            <p style={{ fontSize: '22px', fontWeight: 900, color: totalRemainingAll > 0 ? '#DC2626' : '#059669', margin: 0 }}>৳{totalRemainingAll.toLocaleString()}</p>
          </div>
        </div>

        {/* ── MOBILE CARD VIEW ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sortedStaff.map(s => {
            const row = payroll[s.id]; if (!row) return null
            const finalSalary = calculateFinalSalary(s, row, waivedStaff[s.id])
            const staffPayments = (payments[s.id] || [])
            const paid = staffPayments.reduce((acc, p) => acc + Number(p.amount_paid || p.amount || 0), 0)
            const rem = finalSalary - paid
            const base = Number(s.base_salary) || 0
            const perDay = Math.round(base / 30)
            const autoUnpaid = Math.max(0, (Number(row.absent_days) || 0) - 4)

            const Row = ({ label, value, color, border }) => (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: border ? '1px solid #F1F5F9' : 'none' }}>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: color || '#0F172A' }}>{value}</span>
              </div>
            )

            return (
              <div key={s.id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>

                {/* Card Header */}
                <div style={{ background: '#F8FAFC', padding: '14px 16px', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>{s.name}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{s.designation}</p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 700 }}>
                      {Number(row.present_days) > 0 && <p style={{ margin: 0, color: '#059669' }}>Present {row.present_days}d</p>}
                      {Number(row.late_days) > 0 && <p style={{ margin: 0, color: '#D97706' }}>Late {row.late_days}d</p>}
                      {Number(row.absent_days) > 0 && <p style={{ margin: 0, color: '#DC2626' }}>Absent {row.absent_days}d</p>}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '4px 16px 0 16px' }}>

                  {/* Earnings */}
                  <Row label="Base Salary" value={`৳${base.toLocaleString()}`} />
                  {Number(row.overtime_pay) > 0 && <Row label={`Overtime (${row.overtime_hours || 0} hrs)`} value={`+৳${Number(row.overtime_pay).toLocaleString()}`} color="#059669" />}
                  {Number(row.service_charge) > 0 && <Row label="Service Charge" value={`৳${Number(row.service_charge).toLocaleString()}`} />}
                  {Number(row.bonus) > 0 && <Row label="Bonus" value={`৳${Number(row.bonus).toLocaleString()}`} color="#059669" />}
                  {Number(row.lunch_dinner) > 0 && <Row label={`Night Food (${row.night_days || 0}d × ৳140)`} value={`৳${Number(row.lunch_dinner).toLocaleString()}`} />}
                  {Number(row.morning_food) > 0 && <Row label={`Morning Food (${row.morning_days || 0}d × ৳110)`} value={`৳${Number(row.morning_food).toLocaleString()}`} />}

                  {/* Deductions */}
                  {Number(row.advance_taken) > 0 && <Row label="Advance" value={`-৳${Number(row.advance_taken).toLocaleString()}`} color="#DC2626" border />}
                  {Number(row.others_taken) > 0 && <Row label="Others" value={`-৳${Number(row.others_taken).toLocaleString()}`} color="#DC2626" />}
                  {autoUnpaid > 0 && <Row label={`Unpaid Leave (${autoUnpaid}d)`} value={`-৳${(autoUnpaid * perDay).toLocaleString()}`} color="#DC2626" />}
                  {Number(row.late_days) > 0 && !waivedStaff[s.id] && <Row label={`Late Deduction (${row.late_days})`} value={`-৳${Number(row.late_deduction).toLocaleString()}`} color="#DC2626" />}
                  {waivedStaff[s.id] && <Row label="Late Deduction" value="Waived ✓" color="#059669" />}
                  {Number(row.miscellaneous) > 0 && <Row label="Miscellaneous" value={`-৳${Number(row.miscellaneous).toLocaleString()}`} color="#DC2626" />}

                  {/* Net Pay */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', marginTop: '4px', borderTop: '2px solid #E2E8F0' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>NET PAY</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#059669' }}>৳{finalSalary.toLocaleString()}</span>
                  </div>
                  <Row label="Paid" value={`৳${paid.toLocaleString()}`} color="#059669" />
                  {rem > 0 && <Row label="Due" value={`৳${rem.toLocaleString()}`} color="#DC2626" />}
                  {rem <= 0 && paid >= finalSalary && <Row label="Status" value="Fully Paid ✓" color="#059669" />}
                </div>

                {/* Card Footer — buttons */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPrintData({ staff: s, payroll: { ...row, final_salary: finalSalary, is_paid: paid >= finalSalary, is_waived: waivedStaff[s.id] }, month: months[month - 1], year })}
                    style={{ flex: 1, padding: '9px', borderRadius: '8px', background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    <Printer size={13} /> Payslip
                  </button>
                  {staffPayments.length > 0 && (
                    <button
                      onClick={() => setShowHistory(showHistory === s.id ? null : s.id)}
                      style={{ flex: 1, padding: '9px', borderRadius: '8px', background: showHistory === s.id ? '#4F46E5' : '#F1F5F9', color: showHistory === s.id ? '#fff' : '#334155', border: showHistory === s.id ? 'none' : '1px solid #CBD5E1', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    >
                      <History size={13} /> History
                    </button>
                  )}
                </div>

                {/* Inline payment history */}
                {showHistory === s.id && staffPayments.length > 0 && (
                  <div style={{ margin: '0 16px 14px 16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>Payment History</h4>
                      <button onClick={() => setShowHistory(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={13} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {staffPayments.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px 12px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#059669' }}>৳{Number(p.amount_paid || p.amount || 0).toLocaleString()}</div>
                            {p.notes && <div style={{ color: '#64748B', fontSize: '10px', marginTop: '2px' }}>{p.notes}</div>}
                          </div>
                          <div style={{ color: '#64748B', fontSize: '11px', fontWeight: 600 }}>{new Date(p.payment_date).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      </main>
      {printData && <PaySlip data={printData} onClose={() => setPrintData(null)} />}
    </div>
  )
}
