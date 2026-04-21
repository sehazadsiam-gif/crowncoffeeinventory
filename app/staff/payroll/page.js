'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Printer } from 'lucide-react'
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

  useEffect(() => { fetchAll() }, [month, year])

  async function fetchAll() {
    await fetchPayroll()
    await fetchPayments()
  }

  async function fetchPayroll() {
    try {
      setLoading(true)
      const [staffRes, payRes, advRes] = await Promise.all([
        supabase.from('staff').select('*').eq('is_active', true).order('name'),
        supabase.from('payroll_entries').select('*').eq('month', month).eq('year', year),
        supabase.from('advance_log').select('staff_id, amount').eq('month', month).eq('year', year)
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
            staff_id: s.id, month, year,
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
    } finally {
      setLoading(false)
    }
  }

  async function fetchPayments() {
    const { data } = await supabase
      .from('salary_payments')
      .select('*')
      .eq('month', month)
      .eq('year', year)

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
        ...row, final_salary: finalSalary
      }, { onConflict: 'staff_id,month,year' })
      if (error) throw error
    } catch (err) {
      addToast('Auto-save failed', 'error')
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
      addToast('Payment recorded', 'success')
      setShowPaymentForm(null)
      setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
      fetchPayments()
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
        ...row,
        final_salary: finalSalary,
        paid_date: isPaid ? new Date().toISOString() : null
      }, { onConflict: 'staff_id,month,year' })
      addToast(isPaid ? 'Marked as paid' : 'Marked as unpaid', 'success')
    } catch (err) {
      addToast('Error updating paid status', 'error')
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const grandTotal = staff.reduce((acc, s) => {
    return acc + calculateFinalSalary(s, payroll[s.id] || {})
  }, 0)

  const inputStyle = {
    width: '72px',
    padding: '6px 8px',
    fontSize: '13px',
    borderRadius: '4px',
    border: '1px solid var(--border-light)',
    outline: 'none',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)'
  }

  return (
    <>
      <div>
        <Navbar />
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px 60px' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                Monthly Payroll
              </h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                Manage salary and generate payslips
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                className="input"
                style={{ width: '150px' }}
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
                style={{ width: '100px' }}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div className="loader"></div>
              </div>
            ) : staff.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active staff found. Add staff members first.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{
                    background: 'var(--bg-subtle)',
                    borderBottom: '1px solid var(--border-light)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)'
                  }}>
                    {['Staff', 'Base', 'OT Hrs', 'Srv Chg', 'Bonus', 'Lunch', 'Morn Food', 'Advance', 'Others', 'Misc', 'Net Pay', 'Payments'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => {
                    const row = payroll[s.id]
                    if (!row) return null
                    const finalSalary = calculateFinalSalary(s, row)
                    const miscColor = Number(row.miscellaneous) < 0 ? '#d93025' : '#1e8e3e'
                    const staffPayments = payments[s.id] || []
                    const totalPaid = staffPayments.reduce((sum, p) => sum + Number(p.amount), 0)
                    const remaining = finalSalary - totalPaid

                    return (
                      <tr key={s.id} style={{
                        borderBottom: '1px solid var(--border-light)',
                        opacity: row.is_paid ? 0.75 : 1,
                        verticalAlign: 'top'
                      }}>
                        <td style={{ padding: '12px 16px', minWidth: '140px' }}>
                          <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                            {s.name}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {s.designation}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            OT rate: ৳{Math.round(s.base_salary / 30 / 10)}/hr
                          </p>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--accent-brown)', whiteSpace: 'nowrap' }}>
                          ৳{Number(s.base_salary).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="number"
                            style={inputStyle}
                            value={row.overtime_hours}
                            onChange={e => handleInput(s.id, 'overtime_hours', e.target.value)}
                            onBlur={() => handleBlur(s.id)}
                          />
                          {Number(row.overtime_hours) > 0 && (
                            <p style={{ fontSize: '10px', color: '#1e8e3e', marginTop: '3px' }}>
                              +৳{Math.round(row.overtime_pay || 0)}
                            </p>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="number"
                            style={inputStyle}
                            value={row.service_charge}
                            onChange={e => handleInput(s.id, 'service_charge', e.target.value)}
                            onBlur={() => handleBlur(s.id)}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="number"
                            style={inputStyle}
                            value={row.bonus}
                            onChange={e => handleInput(s.id, 'bonus', e.target.value)}
                            onBlur={() => handleBlur(s.id)}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="number"
                            style={inputStyle}
                            value={row.lunch_dinner}
                            onChange={e => handleInput(s.id, 'lunch_dinner', e.target.value)}
                            onBlur={() => handleBlur(s.id)}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="number"
                            style={inputStyle}
                            value={row.morning_food}
                            onChange={e => handleInput(s.id, 'morning_food', e.target.value)}
                            onBlur={() => handleBlur(s.id)}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="number"
                            style={{ ...inputStyle, color: '#d93025' }}
                            value={row.advance_taken}
                            onChange={e => handleInput(s.id, 'advance_taken', e.target.value)}
                            onBlur={() => handleBlur(s.id)}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="number"
                            style={inputStyle}
                            value={row.others_taken}
                            onChange={e => handleInput(s.id, 'others_taken', e.target.value)}
                            onBlur={() => handleBlur(s.id)}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="number"
                            style={{ ...inputStyle, color: miscColor }}
                            value={row.miscellaneous}
                            onChange={e => handleInput(s.id, 'miscellaneous', e.target.value)}
                            onBlur={() => handleBlur(s.id)}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '15px', color: 'var(--accent-brown)', whiteSpace: 'nowrap' }}>
                          ৳{finalSalary.toLocaleString()}
                        </td>

                        {/* Payments column */}
                        <td style={{ padding: '12px 16px', minWidth: '200px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

                            <div style={{ fontSize: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Paid:</span>
                                <span style={{ color: '#1e8e3e', fontWeight: 600 }}>
                                  ৳{totalPaid.toLocaleString()}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Remaining:</span>
                                <span style={{ color: remaining > 0 ? '#d93025' : '#1e8e3e', fontWeight: 600 }}>
                                  ৳{remaining.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => {
                                  setShowPaymentForm(showPaymentForm === s.id ? null : s.id)
                                  setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
                                }}
                                style={{
                                  padding: '5px 10px', fontSize: '11px', borderRadius: '4px',
                                  border: '1px solid var(--accent-brown)', background: 'transparent',
                                  color: 'var(--accent-brown)', cursor: 'pointer', fontWeight: 600
                                }}
                              >
                                + Pay
                              </button>
                              <button
                                onClick={() => setPrintData({
                                  staff: s,
                                  payroll: { ...row, final_salary: finalSalary },
                                  month: months[month - 1],
                                  year
                                })}
                                style={{
                                  padding: '5px', background: 'transparent',
                                  border: '1px solid var(--border-medium)',
                                  borderRadius: '4px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center'
                                }}
                              >
                                <Printer size={14} color="var(--text-secondary)" />
                              </button>
                            </div>

                            {showPaymentForm === s.id && (
                              <div style={{
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-light)',
                                borderRadius: '6px',
                                padding: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}>
                                <input
                                  type="number"
                                  className="input"
                                  style={{ padding: '6px', fontSize: '13px' }}
                                  placeholder={'Max ৳' + remaining.toLocaleString()}
                                  value={paymentForm.amount}
                                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                />
                                <input
                                  type="date"
                                  className="input"
                                  style={{ padding: '6px', fontSize: '13px' }}
                                  value={paymentForm.date}
                                  onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                />
                                <input
                                  className="input"
                                  style={{ padding: '6px', fontSize: '13px' }}
                                  placeholder="Notes (optional)"
                                  value={paymentForm.notes}
                                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                />
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    onClick={() => savePayment(s.id)}
                                    style={{
                                      flex: 1, padding: '6px', fontSize: '12px',
                                      background: 'var(--accent-brown)', color: 'white',
                                      border: 'none', borderRadius: '4px',
                                      cursor: 'pointer', fontWeight: 600
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setShowPaymentForm(null)}
                                    style={{
                                      padding: '6px 10px', fontSize: '12px',
                                      background: 'transparent',
                                      border: '1px solid var(--border-medium)',
                                      borderRadius: '4px', cursor: 'pointer',
                                      color: 'var(--text-muted)'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {staffPayments.length > 0 && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '6px' }}>
                                {staffPayments.map(p => (
                                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                    <span>
                                      {new Date(p.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                      {p.notes ? ' · ' + p.notes : ''}
                                    </span>
                                    <span style={{ color: '#1e8e3e', fontWeight: 600 }}>
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
            )}

            <div style={{
              padding: '20px 24px',
              background: 'var(--accent-brown)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: '0 0 12px 12px'
            }}>
              <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-display)', margin: 0, fontWeight: 500 }}>
                Grand Total — {months[month - 1]} {year}
              </h2>
              <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', margin: 0 }}>
                ৳{grandTotal.toLocaleString()}
              </h2>
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