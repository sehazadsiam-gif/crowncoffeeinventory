
'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Printer, CheckCircle } from 'lucide-react'
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
      const [staffRes, payRes, advRes] = await Promise.all([
        supabase.from('staff').select('*').eq('is_active', true).order('name'),
        supabase.from('payroll_entries').select('*').eq('month', m).eq('year', y),
        supabase.from('advance_log').select('staff_id, amount').eq('month', m).eq('year', y)
      ])

      const advancesMap = {}
        ; (advRes.data || []).forEach(a => {
          advancesMap[a.staff_id] = (advancesMap[a.staff_id] || 0) + Number(a.amount)
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
        if (!payMap[s.id]) {
          payMap[s.id] = {
            staff_id: s.id, month: m, year: y,
            overtime_hours: 0, overtime_pay: 0,
            service_charge: 0, bonus: 0,
            lunch_dinner: 0, morning_food: 0,
            advance_taken: advancesMap[s.id] || 0,
            others_taken: 0, miscellaneous: 0,
            miscellaneous_note: '', is_paid: false
          }
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
    const perHourRate = base / 30 / 10
    const ot = (Number(p.overtime_hours) || 0) * perHourRate
    const sc = Number(p.service_charge) || 0
    const bonus = Number(p.bonus) || 0
    const lunch = Number(p.lunch_dinner) || 0
    const morn = Number(p.morning_food) || 0
    const misc = Number(p.miscellaneous) || 0
    const adv = Number(p.advance_taken) || 0
    const others = Number(p.others_taken) || 0
    return Math.round(base + ot + sc + bonus + lunch + morn + misc - adv - others)
  }

  function handleInput(staffId, field, value) {
    setPayroll(prev => {
      const row = { ...prev[staffId], [field]: value }
      if (field === 'overtime_hours') {
        const s = staff.find(st => st.id === staffId)
        const perHourRate = (Number(s?.base_salary) || 0) / 30 / 10
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
    width: '80px',
    padding: '7px 8px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #e0d8cc',
    outline: 'none',
    background: '#faf8f5',
    color: '#1C1410',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center'
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
    'Miscellaneous',
    'Net Pay',
    'Payment'
  ]

  return (
    <>
      <div style={{ background: '#FAF7F2', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <Navbar />
        <main style={{ maxWidth: '1500px', margin: '0 auto', padding: '32px 24px 60px' }}>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', color: '#1C1410', fontWeight: 700, margin: 0 }}>
                Monthly Payroll
              </h1>
              <p style={{ color: '#9C8A76', marginTop: '4px', fontSize: '14px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Payroll', value: '৳' + grandTotal.toLocaleString(), color: '#5C4A36' },
              { label: 'Total Paid', value: '৳' + totalPaidAll.toLocaleString(), color: '#1e8e3e' },
              { label: 'Total Remaining', value: '৳' + totalRemainingAll.toLocaleString(), color: totalRemainingAll > 0 ? '#d93025' : '#1e8e3e' },
              { label: 'Staff Count', value: staff.length + ' staff', color: '#5C4A36' },
            ].map(card => (
              <div key={card.label} style={{
                background: 'white',
                border: '1px solid #E8E0D4',
                borderRadius: '10px',
                padding: '16px 20px',
                boxShadow: '0 1px 4px rgba(28,20,16,0.06)'
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

          <div style={{
            background: 'white',
            border: '1px solid #E8E0D4',
            borderRadius: '12px',
            boxShadow: '0 1px 4px rgba(28,20,16,0.06)',
            overflow: 'hidden'
          }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div className="loader"></div>
              </div>
            ) : staff.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#9C8A76' }}>
                No active staff found. Add staff members first.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'system-ui, sans-serif' }}>
                  <thead>
                    <tr style={{ background: '#F5F0E8', borderBottom: '2px solid #E8E0D4' }}>
                      {colHeaders.map(h => (
                        <th key={h} style={{
                          padding: '12px 14px',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.07em',
                          color: '#9C8A76',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
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
                      const miscColor = Number(row.miscellaneous) < 0 ? '#d93025' : '#1e8e3e'
                      const staffPayments = payments[s.id] || []
                      const totalPaid = staffPayments.reduce((sum, p) => sum + Number(p.amount), 0)
                      const remaining = finalSalary - totalPaid
                      const isFullyPaid = remaining <= 0

                      return (
                        <tr key={s.id} style={{
                          borderBottom: '1px solid #F0EBE3',
                          background: idx % 2 === 0 ? 'white' : '#FDFAF7',
                          verticalAlign: 'top'
                        }}>

                          <td style={{ padding: '14px', minWidth: '160px' }}>
                            <p style={{ fontWeight: 700, fontSize: '14px', color: '#1C1410' }}>{s.name}</p>
                            <p style={{ fontSize: '12px', color: '#9C8A76', marginTop: '2px' }}>{s.designation}</p>
                            <p style={{ fontSize: '11px', color: '#B07850', marginTop: '3px' }}>
                              OT: ৳{Math.round(s.base_salary / 30 / 10)}/hr
                            </p>
                          </td>

                          <td style={{ padding: '14px', fontWeight: 700, color: '#8B5E3C', fontSize: '14px', whiteSpace: 'nowrap' }}>
                            ৳{Number(s.base_salary).toLocaleString()}
                          </td>

                          <td style={{ padding: '14px' }}>
                            <input type="number" style={inputStyle} value={row.overtime_hours}
                              onChange={e => handleInput(s.id, 'overtime_hours', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                            {Number(row.overtime_hours) > 0 && (
                              <p style={{ fontSize: '11px', color: '#1e8e3e', marginTop: '4px', fontWeight: 600 }}>
                                +৳{Math.round(row.overtime_pay || 0)}
                              </p>
                            )}
                          </td>

                          <td style={{ padding: '14px' }}>
                            <input type="number" style={inputStyle} value={row.service_charge}
                              onChange={e => handleInput(s.id, 'service_charge', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          <td style={{ padding: '14px' }}>
                            <input type="number" style={inputStyle} value={row.bonus}
                              onChange={e => handleInput(s.id, 'bonus', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          <td style={{ padding: '14px' }}>
                            <input type="number" style={inputStyle} value={row.lunch_dinner}
                              onChange={e => handleInput(s.id, 'lunch_dinner', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          <td style={{ padding: '14px' }}>
                            <input type="number" style={inputStyle} value={row.morning_food}
                              onChange={e => handleInput(s.id, 'morning_food', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          <td style={{ padding: '14px' }}>
                            <input type="number" style={{ ...inputStyle, color: '#d93025' }} value={row.advance_taken}
                              onChange={e => handleInput(s.id, 'advance_taken', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          <td style={{ padding: '14px' }}>
                            <input type="number" style={inputStyle} value={row.others_taken}
                              onChange={e => handleInput(s.id, 'others_taken', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          <td style={{ padding: '14px' }}>
                            <input type="number" style={{ ...inputStyle, color: miscColor }} value={row.miscellaneous}
                              onChange={e => handleInput(s.id, 'miscellaneous', e.target.value)}
                              onBlur={() => handleBlur(s.id)} />
                          </td>

                          <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                            <p style={{ fontWeight: 700, fontSize: '16px', color: '#8B5E3C' }}>
                              ৳{finalSalary.toLocaleString()}
                            </p>
                            {isFullyPaid && (
                              <p style={{ fontSize: '11px', color: '#1e8e3e', fontWeight: 600, marginTop: '2px' }}>
                                Fully Paid
                              </p>
                            )}
                          </td>

                          <td style={{ padding: '14px', minWidth: '220px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                              <div style={{ background: '#F5F0E8', borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ color: '#9C8A76' }}>Paid so far</span>
                                  <span style={{ color: '#1e8e3e', fontWeight: 700 }}>৳{totalPaid.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#9C8A76' }}>Remaining</span>
                                  <span style={{ color: remaining > 0 ? '#d93025' : '#1e8e3e', fontWeight: 700 }}>
                                    ৳{remaining.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <div style={{ height: '6px', background: '#E8E0D4', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: Math.min(100, finalSalary > 0 ? (totalPaid / finalSalary) * 100 : 0) + '%',
                                  background: isFullyPaid ? '#1e8e3e' : '#8B5E3C',
                                  borderRadius: '3px',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>

                              {!isFullyPaid && (
                                <button
                                  onClick={() => {
                                    setShowPaymentForm(showPaymentForm === s.id ? null : s.id)
                                    setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
                                  }}
                                  style={{
                                    padding: '8px 12px', fontSize: '12px', borderRadius: '6px',
                                    border: 'none',
                                    background: showPaymentForm === s.id ? '#5C4A36' : '#8B5E3C',
                                    color: 'white', cursor: 'pointer', fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    width: '100%', justifyContent: 'center'
                                  }}
                                >
                                  <CheckCircle size={13} />
                                  {showPaymentForm === s.id ? 'Cancel' : 'Confirm Payment'}
                                </button>
                              )}

                              <button
                                onClick={() => setPrintData({
                                  staff: s,
                                  payroll: { ...row, final_salary: finalSalary },
                                  month: months[month - 1],
                                  year
                                })}
                                style={{
                                  padding: '7px 12px', fontSize: '12px', borderRadius: '6px',
                                  border: '1px solid #D4C8B8', background: 'white',
                                  color: '#5C4A36', cursor: 'pointer', fontWeight: 500,
                                  display: 'flex', alignItems: 'center', gap: '6px',
                                  width: '100%', justifyContent: 'center'
                                }}
                              >
                                <Printer size={13} /> Print Payslip
                              </button>

                              {showPaymentForm === s.id && (
                                <div style={{
                                  background: 'white', border: '2px solid #8B5E3C',
                                  borderRadius: '8px', padding: '12px',
                                  display: 'flex', flexDirection: 'column', gap: '8px'
                                }}>
                                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#5C4A36', margin: 0 }}>
                                    Record Payment for {s.name}
                                  </p>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#9C8A76', display: 'block', marginBottom: '3px' }}>
                                      Amount (max ৳{remaining.toLocaleString()})
                                    </label>
                                    <input
                                      type="number"
                                      className="input"
                                      style={{ fontSize: '14px', fontWeight: 600 }}
                                      placeholder="Enter amount"
                                      value={paymentForm.amount}
                                      onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#9C8A76', display: 'block', marginBottom: '3px' }}>
                                      Payment Date
                                    </label>
                                    <input
                                      type="date"
                                      className="input"
                                      value={paymentForm.date}
                                      onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#9C8A76', display: 'block', marginBottom: '3px' }}>
                                      Notes (optional)
                                    </label>
                                    <input
                                      className="input"
                                      placeholder="e.g. Cash payment"
                                      value={paymentForm.notes}
                                      onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    />
                                  </div>
                                  <button
                                    onClick={() => savePayment(s.id)}
                                    style={{
                                      padding: '9px', fontSize: '13px',
                                      background: '#1e8e3e', color: 'white',
                                      border: 'none', borderRadius: '6px',
                                      cursor: 'pointer', fontWeight: 700,
                                      display: 'flex', alignItems: 'center',
                                      gap: '6px', justifyContent: 'center'
                                    }}
                                  >
                                    <CheckCircle size={14} /> Confirm Payment
                                  </button>
                                </div>
                              )}

                              {staffPayments.length > 0 && (
                                <div style={{ borderTop: '1px solid #F0EBE3', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <p style={{ fontSize: '10px', color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                                    Payment History
                                  </p>
                                  {staffPayments.map(p => (
                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                      <span style={{ color: '#9C8A76' }}>
                                        {new Date(p.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        {p.notes ? ' · ' + p.notes : ''}
                                      </span>
                                      <span style={{ color: '#1e8e3e', fontWeight: 700 }}>
                                        ৳{Number(p.amount).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{
              padding: '20px 24px',
              background: '#8B5E3C',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
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