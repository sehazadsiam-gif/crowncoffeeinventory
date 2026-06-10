'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Printer, Plus, Trash2, X, History, ChevronUp, ChevronDown, Calculator } from 'lucide-react'
import PayrollCalculator from '../../../components/PayrollCalculator'
import dynamic from 'next/dynamic'

const PaySlip = dynamic(() => import('../../../components/PaySlip'), { ssr: false })

export default function PayrollPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [staff, setStaff] = useState([])
  const [payroll, setPayroll] = useState({})
  const [payments, setPayments] = useState({})
  const [showPaymentForm, setShowPaymentForm] = useState(null)
  const [showHistory, setShowHistory] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [printData, setPrintData] = useState(null)
  const [nameSort, setNameSort] = useState('asc') // 'asc' | 'desc'
  const [waivedStaff, setWaivedStaff] = useState({})
  const [showCalculator, setShowCalculator] = useState(false)
  const [editingSalary, setEditingSalary] = useState(null)
  const [salaryInput, setSalaryInput] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
    fetchAll(month, year)
  }, [month, year, router])

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

      const [staffRes, payRes, advRes, unpaidRes, lateRes, presentRes, summaryRes, otRes] = await Promise.all([
        supabase.from('staff').select('*').eq('is_active', true).order('serial', { ascending: true }).order('name', { ascending: true }),
        supabase.from('payroll_entries').select('*').eq('month', m).eq('year', y),
        supabase.from('advance_log').select('staff_id, amount').eq('month', m).eq('year', y),
        supabase.from('attendance').select('staff_id').eq('leave_type', 'unpaid').gte('date', startDate).lte('date', endDate),
        supabase.from('attendance').select('staff_id').eq('status', 'late').gte('date', startDate).lte('date', endDate),
        supabase.from('attendance').select('staff_id').eq('status', 'present').gte('date', startDate).lte('date', endDate),
        supabase.from('monthly_attendance_summary').select('*').eq('month', m).eq('year', y),
        supabase.from('overtime_logs').select('staff_id, overtime_hours, overtime_pay, manual_override, manual_overtime_hours, manual_overtime_pay').gte('date', startDate).lte('date', endDate)
      ])

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
          advance_taken: Math.max(Number(p.advance_taken), advancesMap[p.staff_id] || 0),
          manual_unpaid_days: p.manual_unpaid_days ?? null,
          waived_unpaid_days: p.waived_unpaid_days || 0,
          overtime_manual: p.miscellaneous_plus === 1
        }
      })

      const activeStaff = staffRes.data || []
      for (const s of activeStaff) {
        const summary = summaryMap[s.id]

        const lateDays = summary ? Number(summary.late_days || 0) : (lateMap[s.id] || 0)
        const presentCount = summary ? Number(summary.present_days || 0) : (presentMap[s.id] || 0)
        const absentCount = summary ? Number(summary.absent_days || 0) : (unpaidMap[s.id] || 0)
        const totalPresentForFood = presentCount + lateDays

        const perDay = Math.round(Number(s.base_salary) / 30)
        const lateDeductionDays = Math.floor(lateDays / 3)
        const lateDeduction = lateDeductionDays * perDay

        if (!payMap[s.id]) {
          payMap[s.id] = {
            staff_id: s.id, month: m, year: y,
            overtime_hours: otMap[s.id]?.hours || 0, 
            overtime_pay: otMap[s.id]?.pay || 0,
            overtime_auto_hours: otMap[s.id]?.hours || 0,
            overtime_auto_pay: otMap[s.id]?.pay || 0,
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
          // Update auto OT values
          payMap[s.id].overtime_auto_hours = otMap[s.id]?.hours || 0
          payMap[s.id].overtime_auto_pay = otMap[s.id]?.pay || 0
          // Update OT if not manually overridden
          if (!payMap[s.id].overtime_manual) {
            payMap[s.id].overtime_hours = otMap[s.id]?.hours || 0
            payMap[s.id].overtime_pay = otMap[s.id]?.pay || 0
          }
        }

        // Auto calculate lunch dinner if not manually set
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
      addToast('Error loading payroll', 'error')
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

  async function saveSalary(staffId) {
    const val = Number(salaryInput)
    if (!val || val <= 0) return addToast('Enter valid salary', 'error')
    try {
      const { error } = await supabase.from('staff').update({ base_salary: val }).eq('id', staffId)
      if (error) throw error
      setStaff(prev => prev.map(s => s.id === staffId ? { ...s, base_salary: val } : s))
      setEditingSalary(null)
      addToast('Salary updated', 'success')
      await fetchAll(month, year)
    } catch (err) {
      addToast('Failed to update salary', 'error')
    }
  }

  function calculateFinalSalary(s, p, isLateWaived) {
    if (!s || !p) return 0
    const base = Number(s.base_salary) || 0
    const perHourRate = s.hourly_rate || Math.floor(Math.floor(base / 30) / 10)
    const ot = Number(p.overtime_pay) || (Number(p.overtime_hours) || 0) * perHourRate
    const sc = Number(p.service_charge) || 0
    const bonus = Number(p.bonus) || 0
    const lunch = Number(p.lunch_dinner) || 0
    const morn = Number(p.morning_food) || 0
    const misc = Number(p.miscellaneous) || 0
    const adv = Number(p.advance_taken) || 0
    const others = Number(p.others_taken) || 0
    const perDay = Math.round(base / 30)

    // Absent days from summary or payroll
    const absentDays = Number(p.absent_days) || 0
    const freeAbsentDays = 4
    const autoUnpaidDays = Math.max(0, absentDays - freeAbsentDays)
    const waivedDays = Number(p.waived_unpaid_days) || 0
    const finalUnpaidDays = Math.max(0, autoUnpaidDays - waivedDays)
    const unpaidDeduction = finalUnpaidDays * perDay

    // Manual override takes priority if set
    const manualUnpaid = p.manual_unpaid_days !== undefined
      && p.manual_unpaid_days !== null
      ? Number(p.manual_unpaid_days) * perDay
      : unpaidDeduction

    const late = isLateWaived ? 0 : (Number(p.late_deduction) || 0)

    return Math.round(
      base + ot + sc + bonus + lunch + morn + misc
      - adv - others - manualUnpaid - late
    )
  }

  function handleInput(staffId, field, value) {
    setPayroll(prev => {
      const row = { ...prev[staffId], [field]: value }
      if (field === 'overtime_hours') {
        const autoVal = row.overtime_auto_hours || 0
        row.overtime_manual = Number(value) !== autoVal
        const s = staff.find(st => st.id === staffId)
        const perHourRate = s?.hourly_rate || Math.floor(Math.round((Number(s?.base_salary) || 0) / 30) / 10)
        row.overtime_pay = (Number(value) || 0) * perHourRate
      }
      if (field === 'lunch_dinner') {
        const autoVal = row.lunch_dinner_auto || 0
        row.lunch_dinner_manual = Number(value) !== autoVal
      }
      return { ...prev, [staffId]: row }
    })
  }

  async function handleBlur(staffId) {
    const row = payroll[staffId]
    const s = staff.find(st => st.id === staffId)
    if (!s || !row) return
    const finalSalary = calculateFinalSalary(s, row, waivedStaff[staffId])
    try {
      const { error } = await supabase.from('payroll_entries').upsert({
        staff_id: row.staff_id,
        month: Number(row.month),
        year: Number(row.year),
        overtime_hours: Number(row.overtime_hours) || 0,
        overtime_pay: Number(row.overtime_pay) || 0,
        service_charge: Number(row.service_charge) || 0,
        bonus: Number(row.bonus) || 0,
        lunch_dinner: Number(row.lunch_dinner) || 0,
        morning_food: Number(row.morning_food) || 0,
        advance_taken: Number(row.advance_taken) || 0,
        others_taken: Number(row.others_taken) || 0,
        miscellaneous: Number(row.miscellaneous) || 0,
        miscellaneous_note: row.miscellaneous_note || '',
        miscellaneous_plus: row.overtime_manual ? 1 : 0,
        is_paid: row.is_paid || false,
        manual_unpaid_days: row.manual_unpaid_days === null ? null : Number(row.manual_unpaid_days),
        waived_unpaid_days: Number(row.waived_unpaid_days) || 0,
        absent_days: Number(row.absent_days) || 0,
        late_waived: waivedStaff[staffId] || false,
        lunch_dinner_manual: row.lunch_dinner_manual || false,
        final_salary: finalSalary
      }, { onConflict: 'staff_id,month,year' })
      if (error) throw error
      console.log('Saved payroll for', s.name)

      // Email Notification for Payroll (First time set)
      if (row.isNew && finalSalary > 0) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('email, name')
          .eq('id', staffId)
          .single()

        if (staffData?.email) {
          try {
            await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'payroll',
                to: staffData.email,
                name: staffData.name,
                month: months[month - 1],
                year,
                breakdown: {
                  base: s.base_salary,
                  overtime: row.overtime_pay,
                  service_charge: row.service_charge,
                  bonus: row.bonus,
                  lunch_dinner: row.lunch_dinner,
                  morning_food: row.morning_food,
                  advance: row.advance_taken,
                  others: row.others_taken,
                  final: finalSalary
                }
              })
            })
            // Mark as not new anymore to avoid duplicate emails
            setPayroll(prev => ({ ...prev, [staffId]: { ...prev[staffId], isNew: false } }))
          } catch (emailErr) {
            console.error('Email send failed:', emailErr)
          }
        }
      }
    } catch (err) {
      console.error('Save error:', err)
      addToast('Save failed: ' + err.message, 'error')
    }
  }

  async function savePayment(staffId) {
    const amount = parseFloat(paymentForm.amount)
    if (!amount || amount <= 0) return addToast('Enter valid amount', 'error')

    const s = staff.find(st => st.id === staffId)
    const row = payroll[staffId]
    const finalSalary = calculateFinalSalary(s, row, waivedStaff[staffId])
    const alreadyPaid = (payments[staffId] || []).reduce((sum, p) => sum + Number(p.amount), 0)
    const remaining = finalSalary - alreadyPaid

    if (amount > remaining) return addToast('Exceeds remaining ৳' + remaining.toLocaleString(), 'error')

    try {
      const { error } = await supabase.from('salary_payments').insert([{
        staff_id: staffId, month, year, amount,
        payment_date: paymentForm.date, notes: paymentForm.notes
      }])
      if (error) throw error

      // Email Notification for Payment
      const { data: staffData } = await supabase
        .from('staff')
        .select('email, name')
        .eq('id', staffId)
        .single()

      if (staffData?.email) {
        try {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'payment',
              to: staffData.email,
              name: staffData.name,
              month: months[month - 1],
              year,
              amount: amount.toLocaleString(),
              remaining: Math.max(0, remaining - amount).toLocaleString()
            })
          })
        } catch (emailErr) {
          console.error('Email send failed:', emailErr)
        }
      }

      addToast('Payment recorded', 'success')
      setShowPaymentForm(null)
      setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
      await fetchPayments(month, year)
    } catch (err) {
      addToast('Payment error', 'error')
    }
  }

  async function deletePayment(paymentId) {
    if (!confirm('Undo this payment?')) return
    try {
      const { error } = await supabase.from('salary_payments').delete().eq('id', paymentId)
      if (error) throw error
      addToast('Payment undone', 'success')
      await fetchPayments(month, year)
    } catch (err) {
      addToast('Delete failed', 'error')
    }
  }

  async function deletePayrollEntry(staffId) {
    if (!confirm('Permanently delete this month\'s payroll data for this staff?')) return
    try {
      const { error } = await supabase.from('payroll_entries').delete().eq('staff_id', staffId).eq('month', month).eq('year', year)
      if (error) throw error
      addToast('Entry deleted', 'success')
      await fetchPayroll(month, year)
    } catch (err) {
      addToast('Delete failed', 'error')
    }
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const sortedStaff = [...staff].sort((a, b) => {
    if ((a.serial || 999) !== (b.serial || 999)) {
      return (a.serial || 999) - (b.serial || 999)
    }
    return nameSort === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name)
  })

  const grandTotal = staff.reduce((acc, s) => acc + calculateFinalSalary(s, payroll[s.id] || {}, waivedStaff[s.id]), 0)
  const totalPaidAll = Object.values(payments).flat().reduce((s, p) => s + Number(p.amount), 0)
  const totalRemainingAll = grandTotal - totalPaidAll

  const inputStyle = {
    width: '60px', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-medium)',
    outline: 'none', background: 'var(--bg-surface)', color: 'var(--text-primary)', textAlign: 'center',
    transition: 'all 0.15s ease'
  }

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

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <Navbar />
      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Payroll Center</h1>
            <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>{months[month - 1]} {year}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select className="input" style={{ width: '130px' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" className="input" style={{ width: '85px' }} value={year} onChange={e => setYear(Number(e.target.value))} />
            <button
              onClick={() => setShowCalculator(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 14px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: 'white', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700,
                boxShadow: '0 2px 8px rgba(99,102,241,0.35)'
              }}
            >
              <Calculator size={15} /> Calculator
            </button>
          </div>
        </div>

        <div style={{
          background: 'var(--warning-bg)',
          border: '1px solid var(--border-accent)',
          borderLeft: '4px solid var(--warning)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '13px',
          color: 'var(--warning)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Automatic Deduction Rules:</p>
          <p style={{ margin: 0 }}>
            1. Unpaid Leave: First 4 absent days are free. From the 5th absent day, each day deducts Base Salary / 30 from final salary. You can waive days or override manually.
          </p>
          <p style={{ margin: 0 }}>
            2. Late Attendance: Every 3 late days in a month counts as 1 unpaid absent day.
          </p>
          <p style={{ margin: 0 }}>
            3. Advance: Total advance taken in the month is automatically deducted.
          </p>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', position: 'relative' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '1400px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-medium)' }}>
                  {colHeaders.map(h => h === 'Staff' ? (
                    <th key={h} style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'left', cursor: 'pointer', userSelect: 'none', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-medium)' }}
                      onClick={() => setNameSort(nameSort === 'asc' ? 'desc' : 'asc')}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Staff
                        {nameSort === 'asc'
                          ? <ChevronUp size={12} style={{ opacity: 0.7 }} />
                          : <ChevronDown size={12} style={{ opacity: 0.7 }} />}
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
                  const paid = staffPayments.reduce((acc, p) => acc + Number(p.amount), 0)
                  const rem = finalSalary - paid

                  const base = Number(s.base_salary) || 0
                  const perDay = Math.round(base / 30)

                  const autoUnpaid = Math.max(0, (Number(row.absent_days) || 0) - 4)
                  const waived = Number(row.waived_unpaid_days) || 0
                  const finalUnpaidDays = Math.max(0, autoUnpaid - waived)

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 8px', textAlign: 'left' }}>
                        <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: 'var(--text-primary)' }}>{s.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{s.designation}</p>
                        {Number(row.present_days) > 0 && <p style={{ fontSize: '11px', color: '#34D399', marginTop: '3px', fontWeight: 600 }}>Present: {row.present_days}d</p>}
                        {Number(row.late_days) > 0 && <p style={{ fontSize: '11px', color: '#FBBF24', marginTop: '3px', fontWeight: 600 }}>Late: {row.late_days}d</p>}
                        {Number(row.absent_days) > 0 && <p style={{ fontSize: '11px', color: '#F87171', marginTop: '3px', fontWeight: 600 }}>Absent: {row.absent_days}d</p>}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {editingSalary === s.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            <input type="number" autoFocus value={salaryInput} onChange={e => setSalaryInput(e.target.value)}
                              style={{ width: '80px', padding: '4px 6px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)', textAlign: 'center', outline: 'none' }}
                              onKeyDown={e => { if (e.key === 'Enter') saveSalary(s.id); if (e.key === 'Escape') setEditingSalary(null) }}
                            />
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => saveSalary(s.id)} style={{ fontSize: '10px', padding: '2px 7px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>✓</button>
                              <button onClick={() => setEditingSalary(null)} style={{ fontSize: '10px', padding: '2px 7px', background: '#374151', color: '#9CA3AF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <div onDoubleClick={() => { setEditingSalary(s.id); setSalaryInput(base) }} style={{ cursor: 'pointer' }} title="Double-click to edit salary">
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>৳{base.toLocaleString()}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>✎ edit</div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <input type="number" style={inputStyle} value={row.overtime_hours} onChange={e => handleInput(s.id, 'overtime_hours', e.target.value)} onBlur={() => handleBlur(s.id)} />
                        {row.overtime_manual && (
                          <p style={{ fontSize: '10px', color: '#fa7b17', marginTop: '2px', fontWeight: 600 }}>Manual</p>
                        )}
                        {row.overtime_manual && (
                          <button
                            onClick={() => {
                              handleInput(s.id, 'overtime_hours', row.overtime_auto_hours || 0)
                              setPayroll(prev => ({
                                ...prev,
                                [s.id]: {
                                  ...prev[s.id],
                                  overtime_hours: row.overtime_auto_hours || 0,
                                  overtime_pay: row.overtime_auto_pay || 0,
                                  overtime_manual: false
                                }
                              }))
                              setTimeout(() => handleBlur(s.id), 100)
                            }}
                            style={{
                              color: '#94A3B8', background: 'none', border: 'none',
                              cursor: 'pointer', padding: 0, marginTop: '2px', textDecoration: 'underline'
                            }}
                          >Reset</button>
                        )}
                        {Number(row.overtime_pay) > 0 && <p style={{ fontSize: '10px', color: '#34D399', margin: '2px 0 0 0', fontWeight: 700 }}>+৳{row.overtime_pay}</p>}
                      </td>
                      <td style={{ padding: '12px 8px' }}><input type="number" style={inputStyle} value={row.service_charge} onChange={e => handleInput(s.id, 'service_charge', e.target.value)} onBlur={() => handleBlur(s.id)} /></td>
                      <td style={{ padding: '12px 8px' }}><input type="number" style={inputStyle} value={row.bonus} onChange={e => handleInput(s.id, 'bonus', e.target.value)} onBlur={() => handleBlur(s.id)} /></td>
                      <td style={{ padding: '14px' }}>
                        <input
                          type="number"
                          style={inputStyle}
                          value={row.lunch_dinner}
                          onChange={e => handleInput(s.id, 'lunch_dinner', e.target.value)}
                          onBlur={() => handleBlur(s.id)}
                        />
                        <p style={{ fontSize: '10px', color: '#64748B', marginTop: '3px' }}>
                           Auto: ৳{row.lunch_dinner_auto || 0}
                         </p>
                        {row.lunch_dinner_manual && (
                          <p style={{ fontSize: '10px', color: '#FBBF24', marginTop: '2px', fontWeight: 600 }}>
                            Manual
                          </p>
                        )}
                        {row.lunch_dinner_manual && (
                          <button
                            onClick={() => {
                              handleInput(s.id, 'lunch_dinner', row.lunch_dinner_auto || 0)
                              setPayroll(prev => ({
                                ...prev,
                                [s.id]: {
                                  ...prev[s.id],
                                  lunch_dinner: row.lunch_dinner_auto || 0,
                                  lunch_dinner_manual: false
                                }
                              }))
                              setTimeout(() => handleBlur(s.id), 100)
                            }}
                            style={{
                              fontSize: '10px', color: '#94A3B8',
                              background: 'none', border: 'none',
                              cursor: 'pointer', padding: 0,
                              marginTop: '2px', textDecoration: 'underline'
                            }}
                          >
                            Reset
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}><input type="number" style={inputStyle} value={row.morning_food} onChange={e => handleInput(s.id, 'morning_food', e.target.value)} onBlur={() => handleBlur(s.id)} /></td>
                      <td style={{ padding: '12px 8px' }}><input type="number" style={{ ...inputStyle, color: '#F87171' }} value={row.advance_taken} onChange={e => handleInput(s.id, 'advance_taken', e.target.value)} onBlur={() => handleBlur(s.id)} /></td>
                      <td style={{ padding: '12px 8px' }}><input type="number" style={{ ...inputStyle, color: '#F87171' }} value={row.others_taken} onChange={e => handleInput(s.id, 'others_taken', e.target.value)} onBlur={() => handleBlur(s.id)} /></td>

                      <td style={{ padding: '14px 8px' }}>
                         <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                          <p style={{ margin: 0 }}>Auto: {autoUnpaid}d (-৳{(autoUnpaid * perDay).toLocaleString()})</p>
                          
                          <div style={{ marginTop: '8px', borderTop: '1px dashed var(--border-medium)', paddingTop: '8px' }}>
                            <label style={{ display: 'block', fontSize: '10px' }}>Waive:</label>
                            <input type="number" min="0" style={{ width: '50px', padding: '3px', fontSize: '11px', border: '1px solid var(--border-medium)', borderRadius: '4px', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                              value={row.waived_unpaid_days || ''} placeholder="0"
                              onChange={e => handleInput(s.id, 'waived_unpaid_days', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </div>
 
                          <div style={{ marginTop: '8px' }}>
                            <label style={{ display: 'block', fontSize: '10px' }}>Override Result:</label>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <input type="number" min="0" style={{ width: '50px', padding: '3px', fontSize: '11px', border: '1px solid var(--border-medium)', borderRadius: '4px', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                                placeholder="Auto" value={row.manual_unpaid_days ?? ''}
                                onChange={e => handleInput(s.id, 'manual_unpaid_days', e.target.value === '' ? null : Number(e.target.value))}
                                onBlur={() => handleBlur(s.id)} />
                              {row.manual_unpaid_days !== null && <button onClick={() => { handleInput(s.id, 'manual_unpaid_days', null); setTimeout(() => handleBlur(s.id), 100) }} style={{ fontSize: '9px', color: '#F87171', background: 'none', border: 'none', cursor: 'pointer' }}>Reset</button>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 8px' }}>
                        {Number(row.late_days) > 0 ? (
                          <div>
                            <p style={{ fontSize: '12px', color: '#FBBF24', fontWeight: 700, margin: 0 }}>{row.late_days} late</p>
                            <p style={{ fontSize: '10px', color: '#F87171', marginTop: '2px', textDecoration: waivedStaff[s.id] ? 'line-through' : 'none' }}>-৳{Number(row.late_deduction).toLocaleString()}</p>
                            <button onClick={async () => {
                               const newWaived = !waivedStaff[s.id]
                               setWaivedStaff(prev => ({ ...prev, [s.id]: newWaived }))
                               
                               const row = payroll[s.id]
                               if (!row) return
                               
                               try {
                                 const { error } = await supabase
                                   .from('payroll_entries')
                                   .upsert({
                                     staff_id: row.staff_id,
                                     month: row.month,
                                     year: row.year,
                                     late_waived: newWaived
                                   }, { onConflict: 'staff_id,month,year' })
                                 if (error) throw error
                                 addToast(newWaived ? 'Late deduction waived' : 'Late deduction restored', 'success')
                               } catch (err) {
                                 addToast('Failed to save waiver', 'error')
                                 setWaivedStaff(prev => ({ ...prev, [s.id]: !newWaived }))
                               }
                             }} style={{ padding: '2px 6px', fontSize: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: waivedStaff[s.id] ? '#0D2B1A' : '#1C1500', color: waivedStaff[s.id] ? '#34D399' : '#D4A017' }}>{waivedStaff[s.id] ? 'Waived' : 'Waive'}</button>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 8px' }}><input type="number" style={inputStyle} value={row.miscellaneous} onChange={e => handleInput(s.id, 'miscellaneous', e.target.value)} onBlur={() => handleBlur(s.id)} /></td>
                      <td style={{ padding: '12px 8px', fontWeight: 800, color: '#34D399', fontSize: '14px' }}>৳{finalSalary.toLocaleString()}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399' }}>Paid: ৳{paid.toLocaleString()}</span>
                          {rem > 0 && <span style={{ fontSize: '10px', fontWeight: 600, color: '#F87171' }}>Due: ৳{rem.toLocaleString()}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => setShowPaymentForm(s.id)} style={{ padding: '5px', borderRadius: '4px', background: '#10B981', color: '#fff', border: 'none', cursor: 'pointer' }}><Plus size={14} /></button>
                          <button onClick={() => setShowHistory(showHistory === s.id ? null : s.id)} style={{ padding: '5px', borderRadius: '4px', background: '#1C2233', color: '#94A3B8', border: 'none', cursor: 'pointer' }} title="Payment History"><History size={14} /></button>
                          <button onClick={() => setPrintData({ staff: s, payroll: { ...row, final_salary: finalSalary, is_paid: paid >= finalSalary, is_waived: waivedStaff[s.id] }, month: months[month - 1], year })} style={{ padding: '5px', borderRadius: '4px', background: '#1C2233', color: '#94A3B8', border: 'none', cursor: 'pointer' }}><Printer size={14} /></button>
                          <button onClick={() => deletePayrollEntry(s.id)} style={{ padding: '5px', borderRadius: '4px', background: '#2D1515', color: '#F87171', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>

                        {staffPayments.length > 0 && (
                          <div style={{ 
                            display: showHistory === s.id ? 'block' : 'none',
                            position: 'absolute', 
                            right: '60px', 
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxH: '200px', overflowY: 'auto' }}>
                              {staffPayments.map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '8px', background: '#252F45', borderRadius: '6px', border: '1px solid #2D3A52' }}>
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#E2E8F0' }}>৳{Number(p.amount).toLocaleString()}</div>
                                    <div style={{ color: '#64748B', fontSize: '10px' }}>{new Date(p.payment_date).toLocaleDateString()}</div>
                                    {p.notes && <div style={{ color: '#94A3B8', fontSize: '9px', marginTop: '2px' }}>{p.notes}</div>}
                                  </div>
                                  <button onClick={() => deletePayment(p.id)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {showPaymentForm === s.id && (
                          <div style={{ position: 'absolute', right: '100px', background: '#1C2233', border: '1px solid #2D3A52', padding: '12px', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100, width: '200px', textAlign: 'left' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>Record Payment</h4>
                            <input type="number" className="input" placeholder="Amount" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} style={{ marginBottom: '8px' }} />
                            <input type="date" className="input" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} style={{ marginBottom: '10px' }} />
                            <button onClick={() => savePayment(s.id)} style={{ width: '100%', padding: '8px', background: '#10B981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
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
      {showCalculator && staff.length > 0 && (
        <PayrollCalculator
          staff={staff}
          payroll={payroll}
          waivedStaff={waivedStaff}
          month={month}
          year={year}
          monthName={months[month - 1]}
          onClose={() => setShowCalculator(false)}
          onApply={(staffId, sandboxValues) => {
            setPayroll(prev => {
              const updated = { ...prev[staffId], ...sandboxValues }
              if (Number(updated.lunch_dinner) !== Number(updated.lunch_dinner_auto)) {
                updated.lunch_dinner_manual = true;
              } else {
                updated.lunch_dinner_manual = false;
              }
              return { ...prev, [staffId]: updated }
            })
            setTimeout(() => handleBlur(staffId), 150)
            setShowCalculator(false)
          }}
        />
      )}
      <style jsx>{`.input { width: 100%; padding: 8px; border: 1px solid var(--border-medium); border-radius: 6px; font-size: 13px; outline: none; background: var(--bg-surface); color: var(--text-primary); transition: all 0.15s ease; }`}</style>
    </div>
  )
}