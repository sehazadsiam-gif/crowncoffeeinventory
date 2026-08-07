'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import { Printer, X, History, ChevronUp, ChevronDown } from 'lucide-react'
import dynamic from 'next/dynamic'

const PaySlip = dynamic(() => import('../../components/PaySlip'), { ssr: false })

const LOADING_STEPS = [
  { icon: '☕', label: 'Brewing payroll data...' },
  { icon: '📋', label: 'Fetching staff records...' },
  { icon: '⏱️', label: 'Calculating overtime & deductions...' },
  { icon: '💰', label: 'Computing net salaries...' },
  { icon: '✅', label: 'Preparing payroll ledger...' },
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
    const step = LOADING_STEPS[loadingStep]
    return (
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '32px', boxSizing: 'border-box' }}>
        <style>{`
          @keyframes pulseRing {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
            70% { transform: scale(1); box-shadow: 0 0 0 18px rgba(99,102,241,0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99,102,241,0); }
          }
          @keyframes shimmer {
            0% { background-position: -600px 0; }
            100% { background-position: 600px 0; }
          }
          @keyframes fadeSlideUp {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes dotBounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
          .shimmer-block {
            background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-surface, #e2e8f0) 50%, var(--bg-subtle, #f1f5f9) 75%);
            background-size: 600px 100%;
            animation: shimmer 1.4s infinite linear;
            border-radius: 8px;
          }
        `}</style>

        {/* Hero loader */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', gap: '20px' }}>
          {/* Glow ring + icon */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              animation: 'pulseRing 1.6s ease-in-out infinite',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px', boxShadow: '0 0 0 0 rgba(99,102,241,0.5)'
            }}>
              {step.icon}
            </div>
            {/* Spinning orbit ring */}
            <div style={{
              position: 'absolute', width: '100px', height: '100px',
              borderRadius: '50%',
              border: '2.5px solid transparent',
              borderTopColor: '#6366F1',
              borderRightColor: '#8B5CF6',
              animation: 'spin 1.1s linear infinite'
            }} />
          </div>

          {/* Cycling text */}
          <div key={loadingStep} style={{ textAlign: 'center', animation: 'fadeSlideUp 0.4s ease' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #1E293B)', margin: 0 }}>{step.label}</p>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>Crown Coffee Payroll — Loading...</p>
          </div>

          {/* Bouncing dots */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`
              }} />
            ))}
          </div>

          {/* Progress steps strip */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            {LOADING_STEPS.map((s, i) => (
              <div key={i} style={{
                width: i === loadingStep ? '28px' : '8px',
                height: '8px', borderRadius: '4px',
                background: i <= loadingStep
                  ? 'linear-gradient(90deg, #6366F1, #8B5CF6)'
                  : 'var(--bg-subtle, #E2E8F0)',
                transition: 'all 0.4s ease'
              }} />
            ))}
          </div>
        </div>

        {/* Skeleton KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px' }}>
              <div className="shimmer-block" style={{ width: '55%', height: '12px', marginBottom: '10px' }} />
              <div className="shimmer-block" style={{ width: '40%', height: '28px' }} />
            </div>
          ))}
        </div>

        {/* Skeleton table */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderBottom: '2px solid var(--border-medium)', background: 'var(--bg-subtle)' }}>
            {[120,80,90,80,70,90,80,70,70,90,90,80,70,80].map((w,i) => (
              <div key={i} className="shimmer-block" style={{ width: `${w}px`, height: '12px', flexShrink: 0 }} />
            ))}
          </div>
          {/* Rows */}
          {[0,1,2,3,4,5].map(r => (
            <div key={r} style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--border-light)', alignItems: 'center' }}>
              <div style={{ flexShrink: 0 }}>
                <div className="shimmer-block" style={{ width: '100px', height: '13px', marginBottom: '6px' }} />
                <div className="shimmer-block" style={{ width: '70px', height: '10px' }} />
              </div>
              {[80,80,80,70,80,70,70,70,90,80,70,70,80].map((w,i) => (
                <div key={i} className="shimmer-block" style={{ width: `${w}px`, height: '13px', flexShrink: 0 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <Navbar />
      <main style={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: '24px 32px', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Payroll Center (View Only)</h1>
            <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>{months[month - 1]} {year}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select style={{ width: '130px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" style={{ width: '85px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)', textAlign: 'center' }} value={year} onChange={e => setYear(Number(e.target.value))} />
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
      </main>
      {printData && <PaySlip data={printData} onClose={() => setPrintData(null)} />}
    </div>
  )
}
