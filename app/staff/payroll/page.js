'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Printer, CheckCircle, Trash2, X } from 'lucide-react'
import dynamic from 'next/dynamic'

const PaySlip = dynamic(() => import('../../../components/PaySlip'), { ssr: false })

export default function PayrollPage() {
  const { addToast } = useToast()
  const [staff, setStaff] = useState([])
  const [payroll, setPayroll] = useState({})
  const [payments, setPayments] = useState({})
  const [showPaymentForm, setShowPaymentForm] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [printData, setPrintData] = useState(null)

  useEffect(() => {
    fetchAll(month, year)
  }, [month, year])

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

      const [staffRes, payRes, advRes, unpaidRes] = await Promise.all([
        supabase.from('staff').select('*').eq('is_active', true).order('name'),
        supabase.from('payroll_entries').select('*').eq('month', m).eq('year', y),
        supabase.from('advance_log').select('staff_id, amount').eq('month', m).eq('year', y),
        supabase.from('attendance').select('staff_id').eq('leave_type', 'unpaid').gte('date', startDate).lte('date', endDate)
      ])

      const advancesMap = {}
        ; (advRes.data || []).forEach(a => {
          advancesMap[a.staff_id] = (advancesMap[a.staff_id] || 0) + Number(a.amount)
        })

      const unpaidMap = {}
        ; (unpaidRes.data || []).forEach(a => {
          unpaidMap[a.staff_id] = (unpaidMap[a.staff_id] || 0) + 1
        })

      const payMap = {}
        ; (payRes.data || []).forEach(p => {
          payMap[p.staff_id] = {
            ...p,
            advance_taken: Math.max(Number(p.advance_taken), advancesMap[p.staff_id] || 0)
          }
        })

      const activeStaff = staffRes.data || []
      for (const s of activeStaff) {
        const unpaidDays = unpaidMap[s.id] || 0
        const perDay = Math.round(Number(s.base_salary) / 30)
        const unpaidDeduction = unpaidDays * perDay

        if (!payMap[s.id]) {
          payMap[s.id] = {
            staff_id: s.id, month: m, year: y,
            overtime_hours: 0, overtime_pay: 0,
            service_charge: 0, bonus: 0,
            lunch_dinner: 0, morning_food: 0,
            advance_taken: advancesMap[s.id] || 0,
            others_taken: 0, miscellaneous: 0,
            miscellaneous_note: '', is_paid: false,
            unpaid_leave_days: unpaidDays,
            unpaid_leave_deduction: unpaidDeduction
          }
        } else {
          payMap[s.id].unpaid_leave_days = unpaidDays
          payMap[s.id].unpaid_leave_deduction = unpaidDeduction
        }
      }

      setStaff(activeStaff)
      setPayroll(payMap)
    } catch (err) {
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
      ; (data || []).forEach(p => {
        if (!map[p.staff_id]) map[p.staff_id] = []
        map[p.staff_id].push(p)
      })
    setPayments(map)
  }

  function calculateFinalSalary(s, p) {
    if (!s || !p) return 0
    const base = Number(s.base_salary) || 0
    const perHourRate = Math.floor(base / 30 / 10)
    const ot = (Number(p.overtime_hours) || 0) * perHourRate
    const sc = Number(p.service_charge) || 0
    const bonus = Number(p.bonus) || 0
    const lunch = Number(p.lunch_dinner) || 0
    const morn = Number(p.morning_food) || 0
    const misc = Number(p.miscellaneous) || 0
    const adv = Number(p.advance_taken) || 0
    const others = Number(p.others_taken) || 0
    const unpaid = Number(p.unpaid_leave_deduction) || 0
    return Math.round(base + ot + sc + bonus + lunch + morn + misc - adv - others - unpaid)
  }

  function handleInput(staffId, field, value) {
    setPayroll(prev => {
      const row = { ...prev[staffId], [field]: value }
      if (field === 'overtime_hours') {
        const s = staff.find(st => st.id === staffId)
        const perHourRate = Math.floor((Number(s?.base_salary) || 0) / 30 / 10)
        row.overtime_pay = (Number(value) || 0) * perHourRate
      }
      return { ...prev, [staffId]: row }
    })
  }

  async function handleBlur(staffId) {
    const row = payroll[staffId]
    const s = staff.find(st => st.id === staffId)
    if (!s || !row) return
    const finalSalary = calculateFinalSalary(s, row)
    try {
      const { error } = await supabase.from('payroll_entries').upsert({
        staff_id: row.staff_id,
        month: row.month,
        year: row.year,
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
        is_paid: row.is_paid || false,
        final_salary: finalSalary
      }, { onConflict: 'staff_id,month,year' })
      if (error) throw error
    } catch (err) {
      console.error('Auto-save error:', err)
      addToast('Auto-save failed: ' + err.message, 'error')
    }
  }

  async function savePayment(staffId) {
    const amount = parseFloat(paymentForm.amount)
    if (!amount || amount <= 0) {
      addToast('Enter a valid amount', 'error')
      return
    }

    const s = staff.find(st => st.id === staffId)
    const row = payroll[staffId]
    const finalSalary = calculateFinalSalary(s, row)
    const alreadyPaid = (payments[staffId] || []).reduce((sum, p) => sum + Number(p.amount), 0)
    const remaining = finalSalary - alreadyPaid

    if (amount > remaining) {
      addToast('Amount exceeds remaining balance of ৳' + remaining.toLocaleString(), 'error')
      return
    }

    try {
      const { error } = await supabase.from('salary_payments').insert([{
        staff_id: staffId,
        month,
        year,
        amount,
        payment_date: paymentForm.date,
        notes: paymentForm.notes
      }])
      if (error) throw error
      addToast('Payment confirmed for ' + s.name, 'success')
      setShowPaymentForm(null)
      setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
      await fetchPayments(month, year)
    } catch (err) {
      addToast(err.message || 'Error saving payment', 'error')
    }
  }

  async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to remove this payment record?')) return
    try {
      const { error } = await supabase.from('salary_payments').delete().eq('id', paymentId)
      if (error) throw error
      addToast('Payment record removed', 'success')
      await fetchPayments(month, year)
    } catch (err) {
      addToast('Error removing payment: ' + err.message, 'error')
    }
  }

  async function togglePaid(staffId) {
    const isPaid = !payroll[staffId].is_paid
    const row = { ...payroll[staffId], is_paid: isPaid }
    const s = staff.find(st => st.id === staffId)
    const finalSalary = calculateFinalSalary(s, row)
    setPayroll(prev => ({ ...prev, [staffId]: row }))
    try {
      await supabase.from('payroll_entries').upsert({
        staff_id: row.staff_id,
        month: row.month,
        year: row.year,
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
        is_paid: isPaid,
        paid_date: isPaid ? new Date().toISOString() : null,
        final_salary: finalSalary
      }, { onConflict: 'staff_id,month,year' })
      addToast(isPaid ? 'Marked as fully paid' : 'Marked as unpaid', 'success')
    } catch (err) {
      addToast('Error updating status', 'error')
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const grandTotal = staff.reduce((acc, s) => {
    return acc + calculateFinalSalary(s, payroll[s.id] || {})
  }, 0)

  const totalPaidAll = Object.values(payments).flat().reduce((s, p) => s + Number(p.amount), 0)
  const totalRemainingAll = grandTotal - totalPaidAll

  const inputStyle = {
    width: '64px',
    padding: '4px 6px',
    fontSize: '12px',
    borderRadius: '4px',
    border: '1px solid var(--border-light)',
    outline: 'none',
    background: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    textAlign: 'center'
  }

  const colHeaders = [
    'Staff',
    'Base',
    'OT hr',
    'SC',
    'Bonus',
    'Food',
    'Adv',
    'Others',
    'Unpaid',
    'Misc',
    'Net Pay',
    'Payment'
  ]

  return (
    <>
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
        <Navbar />
        <main style={{ maxWidth: '1500px', margin: '0 auto', padding: '32px 24px 60px' }}>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
                Monthly Payroll
              </h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '14px' }}>
                {months[month - 1]} {year} — {staff.length} active staff
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                className="input"
                style={{ width: '140px' }}
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
              >
                {months.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                className="input"
                style={{ width: '90px' }}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Payroll', value: '৳' + grandTotal.toLocaleString(), color: '#5C4A36' },
              { label: 'Total Paid', value: '৳' + totalPaidAll.toLocaleString(), color: '#1e8e3e' },
              { label: 'Total Remaining', value: '৳' + totalRemainingAll.toLocaleString(), color: totalRemainingAll > 0 ? '#d93025' : '#1e8e3e' },
              { label: 'Staff Count', value: staff.length + ' staff', color: '#5C4A36' },
            ].map(card => (
              <div key={card.label} style={{
                background: 'white', border: '1px solid var(--border-light)',
                borderRadius: '10px', padding: '16px 20px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <p style={{ fontSize: '11px', color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
                  {card.label}
                </p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: card.color }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Unpaid leave info box */}
          <div style={{
            background: '#fef7e0',
            border: '1px solid #f0d080',
            borderLeft: '4px solid #B07830',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#7A5010'
          }}>
            <strong>Unpaid Leave Deduction:</strong> When an attendance is marked as Absent with leave type Unpaid,
            the system automatically calculates the deduction as:
            <strong> Unpaid Days × (Base Salary / 30)</strong>.
            This is shown in the Unpaid Leave column and deducted from Net Pay automatically.
          </div>

          {/* Table */}
          <div style={{
            background: 'white', border: '1px solid var(--border-light)',
            borderRadius: '12px', boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
          }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div className="loader"></div>
              </div>
            ) : staff.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active staff found. Add staff members first.
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-body)', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-light)' }}>
                      {colHeaders.map((h, i) => (
                       <th key={h} style={{
                          padding: '8px 6px',
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: h === 'Unpaid' ? 'var(--danger)' : 'var(--text-muted)',
                          fontWeight: 700,
                          textAlign: 'center',
                          borderBottom: '1px solid var(--border-light)',
                          width: h === 'Staff' ? '140px' : h === 'Payment' ? '180px' : 'auto'
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((s, idx) => {
                      const row = payroll[s.id]
                      if (!row) return null
                      const finalSalary = calculateFinalSalary(s, row)
                      const miscColor = Number(row.miscellaneous) < 0 ? 'var(--danger)' : 'var(--success)'
                      const staffPayments = payments[s.id] || []
                      const totalPaid = staffPayments.reduce((sum, p) => sum + Number(p.amount), 0)
                      const remaining = finalSalary - totalPaid
                      const isFullyPaid = remaining <= 0
                      const unpaidDays = Number(row.unpaid_leave_days) || 0
                      const unpaidDeduction = Number(row.unpaid_leave_deduction) || 0

                      return (
                        <tr key={s.id} style={{
                          borderBottom: '1px solid var(--border-light)',
                          background: idx % 2 === 0 ? 'white' : 'var(--bg-subtle)'
                        }}>

                          {/* Staff */}
                          <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                            <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>{s.name}</p>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>{s.designation}</p>
                          </td>

                          {/* Base Salary */}
                          <td style={{ padding: '8px 4px', fontWeight: 600, color: 'var(--accent-blue)', fontSize: '12px', textAlign: 'center' }}>
                            ৳{Math.round(s.base_salary / 1000)}k
                          </td>

                          {/* Overtime Hours */}
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            <input type="number" style={inputStyle} value={row.overtime_hours}
                              onChange={e => handleInput(s.id, 'overtime_hours', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          {/* SC */}
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            <input type="number" style={inputStyle} value={row.service_charge}
                              onChange={e => handleInput(s.id, 'service_charge', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          {/* Bonus */}
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            <input type="number" style={inputStyle} value={row.bonus}
                              onChange={e => handleInput(s.id, 'bonus', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          {/* Food */}
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            <input type="number" style={inputStyle} value={(Number(row.lunch_dinner) || 0) + (Number(row.morning_food) || 0)}
                              onChange={e => handleInput(s.id, 'lunch_dinner', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          {/* Advance */}
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            <input type="number" style={{ ...inputStyle, color: 'var(--danger)' }} value={row.advance_taken}
                              onChange={e => handleInput(s.id, 'advance_taken', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          {/* Others */}
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            <input type="number" style={inputStyle} value={row.others_taken}
                              onChange={e => handleInput(s.id, 'others_taken', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          {/* Unpaid */}
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                             <span style={{ fontSize: '12px', color: unpaidDays > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                               {unpaidDays > 0 ? `-${unpaidDeduction}` : '—'}
                             </span>
                          </td>

                          {/* Misc */}
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            <input type="number" style={{ ...inputStyle, color: miscColor }} value={row.miscellaneous}
                              onChange={e => handleInput(s.id, 'miscellaneous', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          {/* Net Pay */}
                          <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px', color: 'var(--accent-blue)' }}>
                            {finalSalary}
                          </td>

                          {/* Payment */}
                           <td style={{ padding: '8px', minWidth: '120px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                               <div style={{ textAlign: 'right', minWidth: '60px' }}>
                                 <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', margin: 0 }}>৳{totalPaid}</p>
                                 <p style={{ fontSize: '10px', color: remaining > 0 ? 'var(--danger)' : 'var(--success)', margin: 0 }}>Rem: {remaining}</p>
                               </div>
                               
                               <div style={{ display: 'flex', gap: '4px' }}>
                                 {!isFullyPaid && (
                                   <button
                                     onClick={() => {
                                       setShowPaymentForm(showPaymentForm === s.id ? null : s.id)
                                       setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
                                     }}
                                     title="Confirm Payment"
                                     style={{
                                       padding: '6px', borderRadius: '4px', border: 'none',
                                       background: showPaymentForm === s.id ? 'var(--text-muted)' : 'var(--accent-blue)',
                                       color: 'white', cursor: 'pointer'
                                     }}
                                   >
                                     <CheckCircle size={14} />
                                   </button>
                                 )}
                                 <button
                                   onClick={() => setPrintData({
                                     staff: s,
                                     payroll: { ...row, final_salary: finalSalary },
                                     month: months[month - 1],
                                     year
                                   })}
                                   title="Print Payslip"
                                   style={{
                                     padding: '6px', borderRadius: '4px', border: '1px solid var(--border-light)',
                                     background: 'white', color: 'var(--accent-blue)', cursor: 'pointer'
                                   }}
                                 >
                                   <Printer size={14} />
                                 </button>
                               </div>
                             </div>

                             {showPaymentForm === s.id && (
                               <div style={{
                                 position: 'absolute', right: '100%', top: '0', zIndex: 50,
                                 background: 'white', border: '1px solid var(--border-light)',
                                 borderRadius: '8px', padding: '12px', boxShadow: 'var(--shadow-md)',
                                 display: 'flex', flexDirection: 'column', gap: '8px', width: '200px'
                               }}>
                                 <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                   Record Payment
                                 </p>
                                 <input
                                   type="number"
                                   className="input"
                                   style={{ fontSize: '14px', height: '32px' }}
                                   placeholder="Amount"
                                   value={paymentForm.amount}
                                   onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                 />
                                 <input
                                   type="date"
                                   className="input"
                                   style={{ fontSize: '12px', height: '32px' }}
                                   value={paymentForm.date}
                                   onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                 />
                                 <button
                                   onClick={() => savePayment(s.id)}
                                   style={{
                                     padding: '6px', fontSize: '12px',
                                     background: 'var(--success)', color: 'white',
                                     border: 'none', borderRadius: '4px',
                                     cursor: 'pointer', fontWeight: 700
                                   }}
                                 >
                                   Confirm
                                 </button>
                               </div>
                             )}

                             {staffPayments.length > 0 && (
                               <div style={{ marginTop: '4px', borderTop: '1px solid var(--border-light)', paddingTop: '4px' }}>
                                 {staffPayments.map(p => (
                                   <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
                                     <span style={{ color: 'var(--text-muted)' }}>{new Date(p.payment_date).toLocaleDateString()}</span>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                       <span style={{ fontWeight: 600 }}>৳{p.amount}</span>
                                       <button onClick={() => deletePayment(p.id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                         <X size={10} />
                                       </button>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{
              padding: '20px 24px', background: 'var(--accent-blue)', color: 'white',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '12px'
            }}>
              <div>
                <p style={{ fontSize: '13px', opacity: 0.8, margin: 0 }}>Grand Total — {months[month - 1]} {year}</p>
                <p style={{ fontSize: '13px', opacity: 0.7, margin: '4px 0 0 0' }}>
                  Paid: ৳{totalPaidAll.toLocaleString()} &nbsp;|&nbsp; Remaining: ৳{totalRemainingAll.toLocaleString()}
                </p>
              </div>
              <p style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
                ৳{grandTotal.toLocaleString()}
              </p>
            </div>
          </div>
        </main>
      </div>

      {printData && (
        <PaySlip data={printData} onClose={() => setPrintData(null)} />
      )}
    </>
  )
}