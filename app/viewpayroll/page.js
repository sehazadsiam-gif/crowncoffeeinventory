'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import { Printer, X, History, ChevronUp, ChevronDown } from 'lucide-react'
import dynamic from 'next/dynamic'

const PaySlip = dynamic(() => import('../../components/PaySlip'), { ssr: false })

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
  const [viewMode, setViewMode] = useState('desktop') // 'desktop' | 'mobile'

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
        safe(supabase.from('attendance_log').select('staff_id, status, hours_worked, overtime_minutes').gte('date', startDate).lte('date', endDate))
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

      attLogs.forEach(l => {
        if (l.status === 'late') logLateMap[l.staff_id] = (logLateMap[l.staff_id] || 0) + 1
        if (l.status === 'present' || l.status === 'late') logPresentMap[l.staff_id] = (logPresentMap[l.staff_id] || 0) + 1
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
          overtime_manual: p.miscellaneous_plus === 1
        }
      })

      const activeStaff = staffRes.data || []
      for (const s of activeStaff) {
        const summary = summaryMap[s.id]

        const lateDays = summary ? Number(summary.late_days || 0) : (logLateMap[s.id] || lateMap[s.id] || 0)
        const presentCount = summary ? Number(summary.present_days || 0) : (logPresentMap[s.id] || presentMap[s.id] || 0)
        const absentCount = summary ? Number(summary.absent_days || 0) : (unpaidMap[s.id] || 0)
        const totalPresentForFood = presentCount

        const perDay = Math.round(Number(s.base_salary) / 30)
        const lateDeductionDays = Math.floor(lateDays / 3)
        const lateDeduction = lateDeductionDays * perDay

        const autoOtHours = summary ? Number(summary.overtime_hours || 0) : (otMap[s.id]?.hours || Math.round((logOtMap[s.id] || 0) * 100) / 100)
        const hourlyRate = (Number(s.base_salary) / 30) / 10
        const autoOtPay = otMap[s.id]?.pay || Math.round(autoOtHours * hourlyRate)

        if (!payMap[s.id]) {
          payMap[s.id] = {
            staff_id: s.id, month: m, year: y,
            overtime_hours: autoOtHours, 
            overtime_pay: autoOtPay,
            overtime_auto_hours: autoOtHours,
            overtime_auto_pay: autoOtPay,
            overtime_manual: false,
            service_charge: 0, bonus: 0,
            lunch_dinner: totalPresentForFood * 140, morning_food: 0,
            lunch_dinner_auto: totalPresentForFood * 140,
            lunch_dinner_manual: false,
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
          payMap[s.id].overtime_auto_hours = autoOtHours
          payMap[s.id].overtime_auto_pay = autoOtPay
          if (!payMap[s.id].overtime_manual) {
            payMap[s.id].overtime_hours = autoOtHours
            payMap[s.id].overtime_pay = autoOtPay
          }
        }

        if (!payMap[s.id].lunch_dinner_manual) {
          payMap[s.id].lunch_dinner = totalPresentForFood * 140
          payMap[s.id].lunch_dinner_auto = totalPresentForFood * 140
        } else {
          payMap[s.id].lunch_dinner_auto = totalPresentForFood * 140
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
      <div style={{ background: '#000000', minHeight: '100vh', fontFamily: '"Inter", system-ui, sans-serif', boxSizing: 'border-box', color: '#E8D5A3', display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          @keyframes shimmerGold {
            0% { background-position: -800px 0; }
            100% { background-position: 800px 0; }
          }
          @keyframes goldPulse {
            0% { box-shadow: 0 0 0 0 rgba(212,175,55,0.5), 0 0 20px rgba(212,175,55,0.2); }
            50% { box-shadow: 0 0 0 22px rgba(212,175,55,0), 0 0 40px rgba(212,175,55,0.35); }
            100% { box-shadow: 0 0 0 0 rgba(212,175,55,0), 0 0 20px rgba(212,175,55,0.2); }
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
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(212,175,55,0.3)); }
            50% { transform: scale(1.03); filter: drop-shadow(0 0 28px rgba(212,175,55,0.55)); }
          }
          .shimmer-gold {
            background: linear-gradient(90deg, #111006 25%, #2a2208 50%, #111006 75%);
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
            <svg style={{ position: 'absolute', width: '210px', height: '210px', animation: 'rotateRing 6s linear infinite', opacity: 0.5 }} viewBox="0 0 210 210">
              <circle cx="105" cy="105" r="100" fill="none" stroke="#D4AF37" strokeWidth="1" strokeDasharray="6 10" strokeLinecap="round" />
            </svg>
            {/* Inner glow ring */}
            <svg style={{ position: 'absolute', width: '185px', height: '185px', animation: 'rotateRing 10s linear infinite reverse', opacity: 0.3 }} viewBox="0 0 185 185">
              <circle cx="92.5" cy="92.5" r="88" fill="none" stroke="#D4AF37" strokeWidth="0.8" strokeDasharray="2 14" strokeLinecap="round" />
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
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, letterSpacing: '0.12em', color: '#D4AF37', textTransform: 'uppercase' }}>Crown Coffee</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', letterSpacing: '0.3em', color: '#6B5A2A', textTransform: 'uppercase', fontWeight: 500 }}>Multi Cuisine Café · Payroll System</p>
          </div>

          {/* Status log panel */}
          <div style={{ background: '#080800', border: '1px solid #2A2000', borderRadius: '10px', padding: '16px 20px', fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace', fontSize: '11.5px', lineHeight: '2', width: '100%', maxWidth: '440px', marginBottom: '20px' }}>
            {LOADING_STEPS.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                opacity: i < loadingStep ? 0.4 : i === loadingStep ? 1 : 0.15,
                transition: 'opacity 0.5s ease',
                animation: i === loadingStep ? 'fadeUp 0.35s ease' : 'none'
              }}>
                <span style={{ color: i < loadingStep ? '#B8860B' : i === loadingStep ? '#D4AF37' : '#2A2000', fontWeight: 700, flexShrink: 0, width: '12px', textAlign: 'center' }}>
                  {i < loadingStep ? '✓' : i === loadingStep ? '›' : '·'}
                </span>
                <span style={{ color: i < loadingStep ? '#B8860B' : i === loadingStep ? '#E8D5A3' : '#2A2000' }}>
                  {s.label}
                </span>
                {i === loadingStep && (
                  <span style={{ color: '#D4AF37', animation: 'blink 0.8s step-end infinite', marginLeft: '2px' }}>▋</span>
                )}
              </div>
            ))}
          </div>

          {/* Gold progress bar */}
          <div style={{ width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: '#4A3A0A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading</span>
              <span style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 700, fontFamily: 'monospace' }}>{progress}%</span>
            </div>
            <div style={{ height: '3px', background: '#1A1400', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #7B5D0A, #D4AF37, #F5E17A)',
                borderRadius: '2px',
                transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 10px rgba(212,175,55,0.7)'
              }} />
            </div>
          </div>
        </div>

        {/* Bottom skeleton preview */}
        <div style={{ padding: '0 32px 32px 32px', opacity: 0.35 }}>
          {/* KPI cards skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[['Grand Total', '65%'], ['Total Paid', '42%'], ['Remaining', '50%']].map(([lbl, w], i) => (
              <div key={i} style={{ background: '#0A0800', border: '1px solid #1E1600', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '9px', color: '#3A2A00', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '8px' }}>{lbl}</div>
                <div className="shimmer-gold" style={{ width: w, height: '20px' }} />
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div style={{ background: '#080800', border: '1px solid #1A1400', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '14px', padding: '11px 18px', borderBottom: '1px solid #1A1400', background: '#060600' }}>
              {[130, 85, 95, 80, 70, 95, 80, 70, 70, 90, 88, 80, 70, 80].map((w, i) => (
                <div key={i} className="shimmer-gold" style={{ width: `${w}px`, height: '9px', flexShrink: 0 }} />
              ))}
            </div>
            {[0,1,2,3,4].map(r => (
              <div key={r} style={{ display: 'flex', gap: '14px', padding: '12px 18px', borderBottom: r < 4 ? '1px solid #0F0C00' : 'none', alignItems: 'center', opacity: 1 - r * 0.15 }}>
                <div style={{ flexShrink: 0, minWidth: '130px' }}>
                  <div className="shimmer-gold" style={{ width: '105px', height: '11px', marginBottom: '6px' }} />
                  <div className="shimmer-gold" style={{ width: '70px', height: '8px', opacity: 0.5 }} />
                </div>
                {[85, 95, 80, 70, 95, 80, 70, 70, 90, 88, 80, 70, 80].map((w, i) => (
                  <div key={i} className="shimmer-gold" style={{ width: `${w}px`, height: '11px', flexShrink: 0 }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (

    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <Navbar />
      <main style={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: '24px 32px', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Payroll Center (View Only)</h1>
            <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>{months[month - 1]} {year}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={{ width: '130px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" style={{ width: '85px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)', textAlign: 'center' }} value={year} onChange={e => setYear(Number(e.target.value))} />
            <button
              onClick={() => setViewMode(v => v === 'desktop' ? 'mobile' : 'desktop')}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                background: viewMode === 'mobile' ? '#6366F1' : 'var(--bg-surface)',
                color: viewMode === 'mobile' ? '#fff' : 'var(--text-primary)',
                fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              {viewMode === 'desktop' ? '📱 Mobile View' : '🖥 Desktop View'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, margin: '0 0 4px 0' }}>Grand Total Salary</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>৳{grandTotal.toLocaleString()}</p>
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, margin: '0 0 4px 0' }}>Grand Paid Amount</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#34D399', margin: 0 }}>৳{totalPaidAll.toLocaleString()}</p>
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, margin: '0 0 4px 0' }}>Grand Remaining to Pay</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: totalRemainingAll > 0 ? '#F87171' : '#34D399', margin: 0 }}>৳{totalRemainingAll.toLocaleString()}</p>
          </div>
        </div>

        {viewMode === 'mobile' ? (
          /* ── MOBILE CARD VIEW ── */
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: border ? '1px solid var(--border-light)' : 'none' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</span>
                </div>
              )

              return (
                <div key={s.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

                  {/* Card Header */}
                  <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>{s.name}</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{s.designation}</p>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 600 }}>
                        {Number(row.present_days) > 0 && <p style={{ margin: 0, color: '#34D399' }}>Present {row.present_days}d</p>}
                        {Number(row.late_days) > 0 && <p style={{ margin: 0, color: '#FBBF24' }}>Late {row.late_days}d</p>}
                        {Number(row.absent_days) > 0 && <p style={{ margin: 0, color: '#F87171' }}>Absent {row.absent_days}d</p>}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '4px 16px 0 16px' }}>

                    {/* Earnings */}
                    <Row label="Base Salary" value={`৳${base.toLocaleString()}`} />
                    {Number(row.overtime_pay) > 0 && <Row label={`Overtime (${row.overtime_hours || 0} hrs)`} value={`+৳${Number(row.overtime_pay).toLocaleString()}`} color="#34D399" />}
                    {Number(row.service_charge) > 0 && <Row label="Service Charge" value={`৳${Number(row.service_charge).toLocaleString()}`} />}
                    {Number(row.bonus) > 0 && <Row label="Bonus" value={`৳${Number(row.bonus).toLocaleString()}`} color="#34D399" />}
                    {Number(row.lunch_dinner) > 0 && <Row label="Lunch + Dinner" value={`৳${Number(row.lunch_dinner).toLocaleString()}`} />}
                    {Number(row.morning_food) > 0 && <Row label="Morning Food" value={`৳${Number(row.morning_food).toLocaleString()}`} />}

                    {/* Deductions */}
                    {Number(row.advance_taken) > 0 && <Row label="Advance" value={`-৳${Number(row.advance_taken).toLocaleString()}`} color="#F87171" border />}
                    {Number(row.others_taken) > 0 && <Row label="Others" value={`-৳${Number(row.others_taken).toLocaleString()}`} color="#F87171" />}
                    {autoUnpaid > 0 && <Row label={`Unpaid Leave (${autoUnpaid}d)`} value={`-৳${(autoUnpaid * perDay).toLocaleString()}`} color="#F87171" />}
                    {Number(row.late_days) > 0 && !waivedStaff[s.id] && <Row label={`Late Deduction (${row.late_days})`} value={`-৳${Number(row.late_deduction).toLocaleString()}`} color="#F87171" />}
                    {waivedStaff[s.id] && <Row label="Late Deduction" value="Waived ✓" color="#34D399" />}
                    {Number(row.miscellaneous) > 0 && <Row label="Miscellaneous" value={`-৳${Number(row.miscellaneous).toLocaleString()}`} color="#F87171" />}

                    {/* Net Pay */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', marginTop: '4px', borderTop: '2px solid var(--border-medium)' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>NET PAY</span>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#34D399' }}>৳{finalSalary.toLocaleString()}</span>
                    </div>
                    <Row label="Paid" value={`৳${paid.toLocaleString()}`} color="#34D399" />
                    {rem > 0 && <Row label="Due" value={`৳${rem.toLocaleString()}`} color="#F87171" />}
                    {rem <= 0 && paid >= finalSalary && <Row label="Status" value="Fully Paid ✓" color="#34D399" />}
                  </div>

                  {/* Card Footer — buttons */}
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPrintData({ staff: s, payroll: { ...row, final_salary: finalSalary, is_paid: paid >= finalSalary, is_waived: waivedStaff[s.id] }, month: months[month - 1], year })}
                      style={{ flex: 1, padding: '9px', borderRadius: '8px', background: '#1C2233', color: '#94A3B8', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    >
                      <Printer size={13} /> Payslip
                    </button>
                    {staffPayments.length > 0 && (
                      <button
                        onClick={() => setShowHistory(showHistory === s.id ? null : s.id)}
                        style={{ flex: 1, padding: '9px', borderRadius: '8px', background: showHistory === s.id ? '#6366F1' : '#1C2233', color: showHistory === s.id ? '#fff' : '#94A3B8', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                      >
                        <History size={13} /> History
                      </button>
                    )}
                  </div>

                  {/* Inline payment history (mobile — no popup) */}
                  {showHistory === s.id && staffPayments.length > 0 && (
                    <div style={{ margin: '0 16px 14px 16px', background: '#1C2233', borderRadius: '10px', border: '1px solid #2D3A52', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#E2E8F0' }}>Payment History</h4>
                        <button onClick={() => setShowHistory(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={13} /></button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {staffPayments.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px', background: '#252F45', borderRadius: '6px', border: '1px solid #2D3A52' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#E2E8F0' }}>৳{Number(p.amount_paid || p.amount || 0).toLocaleString()}</div>
                              {p.notes && <div style={{ color: '#94A3B8', fontSize: '10px', marginTop: '2px' }}>{p.notes}</div>}
                            </div>
                            <div style={{ color: '#64748B', fontSize: '11px' }}>{new Date(p.payment_date).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        ) : (
          /* ── DESKTOP TABLE VIEW (unchanged) ── */
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', position: 'relative' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '100%' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-medium)' }}>
                  {colHeaders.map(h => h === 'Staff' ? (
                    <th key={h} style={{ padding: '12px 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'left', cursor: 'pointer', userSelect: 'none', position: 'sticky', top: 0, left: 0, zIndex: 25, background: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-medium)', boxShadow: '2px 0 5px rgba(0,0,0,0.05)' }}
                      onClick={() => setNameSort(nameSort === 'asc' ? 'desc' : 'asc')}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Staff
                        {nameSort === 'asc' ? <ChevronUp size={12} style={{ opacity: 0.7 }} /> : <ChevronDown size={12} style={{ opacity: 0.7 }} />}
                      </span>
                    </th>
                  ) : (
                    <th key={h} style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-medium)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStaff.map(s => {
                  const row = payroll[s.id]; if (!row) return null
                  const finalSalary = calculateFinalSalary(s, row, waivedStaff[s.id])
                  const staffPayments = (payments[s.id] || [])
                  const paid = staffPayments.reduce((acc, p) => acc + Number(p.amount_paid || p.amount || 0), 0)
                  const rem = finalSalary - paid

                  const base = Number(s.base_salary) || 0
                  const perDay = Math.round(base / 30)
                  const autoUnpaid = Math.max(0, (Number(row.absent_days) || 0) - 4)

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 12px', textAlign: 'left', position: 'sticky', left: 0, zIndex: 15, background: 'var(--bg-surface)', boxShadow: '2px 0 5px rgba(0,0,0,0.05)' }}>
                        <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: 'var(--text-primary)' }}>{s.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{s.designation}</p>
                        {Number(row.present_days) > 0 && <p style={{ fontSize: '11px', color: '#34D399', marginTop: '3px', fontWeight: 600 }}>Present: {row.present_days}d</p>}
                        {Number(row.late_days) > 0 && <p style={{ fontSize: '11px', color: '#FBBF24', marginTop: '3px', fontWeight: 600 }}>Late: {row.late_days}d</p>}
                        {Number(row.absent_days) > 0 && <p style={{ fontSize: '11px', color: '#F87171', marginTop: '3px', fontWeight: 600 }}>Absent: {row.absent_days}d</p>}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                        ৳{base.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600 }}>
                        {row.overtime_hours || 0} hrs
                        {row.overtime_manual && <p style={{ fontSize: '10px', color: '#fa7b17', marginTop: '2px', fontWeight: 600 }}>Manual</p>}
                        {Number(row.overtime_pay) > 0 && <p style={{ fontSize: '10px', color: '#34D399', margin: '2px 0 0 0', fontWeight: 700 }}>+৳{row.overtime_pay}</p>}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600 }}>৳{Number(row.service_charge || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600 }}>৳{Number(row.bonus || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600 }}>
                        ৳{Number(row.lunch_dinner || 0).toLocaleString()}
                        <p style={{ fontSize: '10px', color: '#64748B', marginTop: '3px' }}>Auto: ৳{row.lunch_dinner_auto || 0}</p>
                        {row.lunch_dinner_manual && <p style={{ fontSize: '10px', color: '#FBBF24', marginTop: '2px', fontWeight: 600 }}>Manual</p>}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600 }}>৳{Number(row.morning_food || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: '#F87171' }}>৳{Number(row.advance_taken || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: '#F87171' }}>৳{Number(row.others_taken || 0).toLocaleString()}</td>

                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Auto: <span style={{ color: '#F87171' }}>{autoUnpaid}d</span> <span style={{ opacity: 0.8 }}>(-৳{(autoUnpaid * perDay).toLocaleString()})</span>
                          </p>
                          {row.waived_unpaid_days > 0 && (
                            <p style={{ margin: 0, fontSize: '11px', color: '#34D399', fontWeight: 600 }}>
                              Waived: {row.waived_unpaid_days}d
                            </p>
                          )}
                          {row.manual_unpaid_days !== null && (
                            <p style={{ margin: 0, fontSize: '11px', color: '#F87171', fontWeight: 600 }}>
                              Override: {row.manual_unpaid_days}d
                            </p>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 8px' }}>
                        {Number(row.late_days) > 0 ? (
                          <div>
                            <p style={{ fontSize: '12px', color: '#FBBF24', fontWeight: 700, margin: 0 }}>{row.late_days} late</p>
                            <p style={{ fontSize: '10px', color: '#F87171', marginTop: '2px', textDecoration: waivedStaff[s.id] ? 'line-through' : 'none' }}>-৳{Number(row.late_deduction).toLocaleString()}</p>
                            {waivedStaff[s.id] && <span style={{ fontSize: '10px', color: '#34D399', fontWeight: 600 }}>Waived</span>}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600 }}>৳{Number(row.miscellaneous || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 800, color: '#34D399', fontSize: '14px' }}>৳{finalSalary.toLocaleString()}</td>
                      <td style={{ padding: '12px 8px', position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399' }}>Paid: ৳{paid.toLocaleString()}</span>
                          {rem > 0 && <span style={{ fontSize: '10px', fontWeight: 600, color: '#F87171' }}>Due: ৳{rem.toLocaleString()}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => setShowHistory(showHistory === s.id ? null : s.id)} style={{ padding: '5px', borderRadius: '4px', background: '#1C2233', color: '#94A3B8', border: 'none', cursor: 'pointer' }} title="Payment History"><History size={14} /></button>
                          <button onClick={() => setPrintData({ staff: s, payroll: { ...row, final_salary: finalSalary, is_paid: paid >= finalSalary, is_waived: waivedStaff[s.id] }, month: months[month - 1], year })} style={{ padding: '5px', borderRadius: '4px', background: '#1C2233', color: '#94A3B8', border: 'none', cursor: 'pointer' }}><Printer size={14} /></button>
                        </div>

                        {staffPayments.length > 0 && (
                          <div style={{ 
                            display: showHistory === s.id ? 'block' : 'none',
                            position: 'absolute', 
                            right: '10px', 
                            top: 'calc(100% + 4px)',
                            background: '#1C2233', 
                            border: '1px solid #2D3A52', 
                            padding: '12px', 
                            borderRadius: '10px', 
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', 
                            zIndex: 101, 
                            width: '240px', 
                            textAlign: 'left' 
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#E2E8F0' }}>Payment History</h4>
                              <button onClick={() => setShowHistory(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={14} /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                              {staffPayments.map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '8px', background: '#252F45', borderRadius: '6px', border: '1px solid #2D3A52' }}>
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#E2E8F0' }}>৳{Number(p.amount_paid || p.amount || 0).toLocaleString()}</div>
                                    <div style={{ color: '#64748B', fontSize: '10px' }}>{new Date(p.payment_date).toLocaleDateString()}</div>
                                    {p.notes && <div style={{ color: '#94A3B8', fontSize: '9px', marginTop: '2px' }}>{p.notes}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </main>
      {printData && <PaySlip data={printData} onClose={() => setPrintData(null)} />}
    </div>
  )
}
