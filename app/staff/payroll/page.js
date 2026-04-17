'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Printer, Download, Save } from 'lucide-react'
import PaySlip from '../../../components/PaySlip'

export default function PayrollPage() {
  const { addToast } = useToast()
  const [staff, setStaff] = useState([])
  const [payroll, setPayroll] = useState({})
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [printData, setPrintData] = useState(null)

  useEffect(() => { fetchPayroll() }, [month, year])

  async function fetchPayroll() {
    try {
      setLoading(true)
      const [staffRes, payRes, advRes] = await Promise.all([
        supabase.from('staff').select('*').eq('is_active', true).order('name'),
        supabase.from('payroll_entries').select('*').eq('month', month).eq('year', year),
        supabase.from('advance_log').select('staff_id, amount').eq('month', month).eq('year', year)
      ])

      const advancesMap = {}
      ;(advRes.data || []).forEach(a => {
        advancesMap[a.staff_id] = (advancesMap[a.staff_id] || 0) + Number(a.amount)
      })

      const payMap = {}
      ;(payRes.data || []).forEach(p => {
        payMap[p.staff_id] = { ...p, advance_taken: Math.max(p.advance_taken, advancesMap[p.staff_id] || 0) }
      })

      const activeStaff = staffRes.data || []
      const finalPay = { ...payMap }

      // Generate missing rows
      for (const s of activeStaff) {
        if (!finalPay[s.id]) {
          finalPay[s.id] = {
            staff_id: s.id, month, year,
            overtime_hours: 0, overtime_pay: 0, service_charge: 0, bonus: 0,
            lunch_dinner: 0, morning_food: 0, advance_taken: advancesMap[s.id] || 0,
            others_taken: 0, miscellaneous: 0, miscellaneous_note: '', is_paid: false
          }
        }
      }

      setStaff(activeStaff)
      setPayroll(finalPay)
    } catch (err) {
      addToast('Error loading payroll', 'error')
    } finally {
      setLoading(false)
    }
  }

  function calculateFinalSalary(s, p) {
    const base = Number(s.base_salary) || 0
    const ot = (Number(p.overtime_hours) || 0) * (Number(s.per_hour_rate) || 0)
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
        row.overtime_pay = (Number(value) || 0) * (s?.per_hour_rate || 0)
      }
      return { ...prev, [staffId]: row }
    })
  }

  async function handleBlur(staffId) {
    const row = payroll[staffId]
    const s = staff.find(st => st.id === staffId)
    const finalSalary = calculateFinalSalary(s, row)

    try {
      const { error } = await supabase.from('payroll_entries').upsert({
        ...row,
        final_salary: finalSalary,
      }, { onConflict: 'staff_id, month, year' })
      if (error) throw error
    } catch (err) {
      addToast('Auto-save failed', 'error')
    }
  }

  async function togglePaid(staffId) {
    const isPaid = !payroll[staffId].is_paid
    handleInput(staffId, 'is_paid', isPaid)
    
    // Immediate save for paid toggle
    const row = { ...payroll[staffId], is_paid: isPaid }
    const s = staff.find(st => st.id === staffId)
    const finalSalary = calculateFinalSalary(s, row)

    try {
      await supabase.from('payroll_entries').upsert({
        ...row, final_salary: finalSalary, paid_date: isPaid ? new Date().toISOString() : null
      }, { onConflict: 'staff_id, month, year' })
      addToast(isPaid ? 'Marked as paid' : 'Marked as unpaid', 'success')
    } catch (err) { }
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const grandTotal = staff.reduce((acc, s) => acc + calculateFinalSalary(s, payroll[s.id]), 0)

  return (
    <>
      <div className="hr-theme">
        <Navbar />
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px 60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '32px', color: 'var(--hr-text-primary)' }}>Monthly Payroll</h1>
              <p style={{ color: 'var(--hr-text-muted)' }}>Manage and generate payslips</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select className="input" style={{ width: '150px' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
                {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <input type="number" className="input" style={{ width: '100px' }} value={year} onChange={e => setYear(Number(e.target.value))} />
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}><div className="loader"></div></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)', fontSize: '12px', textTransform: 'uppercase', color: 'var(--hr-text-muted)' }}>
                    <th style={{ padding: '16px' }}>Staff</th>
                    <th style={{ padding: '16px' }}>Base</th>
                    <th style={{ padding: '16px' }}>OT (Hrs)</th>
                    <th style={{ padding: '16px' }}>Srv Chrg</th>
                    <th style={{ padding: '16px' }}>Bonus</th>
                    <th style={{ padding: '16px' }}>Lunch/Morn</th>
                    <th style={{ padding: '16px' }}>Advance/Other</th>
                    <th style={{ padding: '16px' }}>Misc</th>
                    <th style={{ padding: '16px' }}>Net Pay</th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => {
                    const row = payroll[s.id]
                    if (!row) return null
                    const finalSalary = calculateFinalSalary(s, row)
                    
                    const inputStyle = { width: '80px', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--border-light)', outline: 'none' }
                    
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)', opacity: row.is_paid ? 0.8 : 1 }}>
                        <td style={{ padding: '12px 16px' }}>
                          <p style={{ fontWeight: 600, fontSize: '14px' }}>{s.name}</p>
                          <p style={{ fontSize: '11px', color: 'var(--hr-text-muted)' }}>{s.designation}</p>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>৳{s.base_salary}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <input type="number" style={inputStyle} value={row.overtime_hours} onChange={e => handleInput(s.id, 'overtime_hours', e.target.value)} onBlur={() => handleBlur(s.id)} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input type="number" style={inputStyle} value={row.service_charge} onChange={e => handleInput(s.id, 'service_charge', e.target.value)} onBlur={() => handleBlur(s.id)} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input type="number" style={inputStyle} value={row.bonus} onChange={e => handleInput(s.id, 'bonus', e.target.value)} onBlur={() => handleBlur(s.id)} />
                        </td>
                        <td style={{ padding: '12px 16px', display: 'flex', gap: '4px' }}>
                          <input type="number" style={{...inputStyle, width: '60px'}} placeholder="L" value={row.lunch_dinner} onChange={e => handleInput(s.id, 'lunch_dinner', e.target.value)} onBlur={() => handleBlur(s.id)} />
                          <input type="number" style={{...inputStyle, width: '60px'}} placeholder="M" value={row.morning_food} onChange={e => handleInput(s.id, 'morning_food', e.target.value)} onBlur={() => handleBlur(s.id)} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="number" style={{...inputStyle, width: '60px', color: 'var(--hr-primary)'}} placeholder="Adv" value={row.advance_taken} onChange={e => handleInput(s.id, 'advance_taken', e.target.value)} onBlur={() => handleBlur(s.id)} title="Advance Taken" />
                            <input type="number" style={{...inputStyle, width: '60px'}} placeholder="Oth" value={row.others_taken} onChange={e => handleInput(s.id, 'others_taken', e.target.value)} onBlur={() => handleBlur(s.id)} title="Others Taken" />
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input type="number" style={{...inputStyle, color: row.miscellaneous < 0 ? '#d93025' : '#1e8e3e'}} value={row.miscellaneous} onChange={e => handleInput(s.id, 'miscellaneous', e.target.value)} onBlur={() => handleBlur(s.id)} title="Miscellaneous" />
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '16px', color: 'var(--hr-primary)' }}>
                          ৳{finalSalary.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => togglePaid(s.id)} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: 'none', background: row.is_paid ? '#e6f4ea' : 'var(--bg-subtle)', color: row.is_paid ? '#1e8e3e' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
                              {row.is_paid ? 'Paid' : 'Mark Paid'}
                            </button>
                            <button onClick={() => setPrintData({ staff: s, payroll: { ...row, final_salary: finalSalary }, month: months[month-1], year })} style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border-medium)', borderRadius: '4px', cursor: 'pointer' }}>
                              <Printer size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            
            <div style={{ padding: '24px', background: 'var(--hr-primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 12px 12px' }}>
              <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', margin: 0 }}>Grand Total</h2>
              <h2 style={{ fontSize: '32px', fontFamily: 'var(--font-display)', margin: 0 }}>৳{grandTotal.toLocaleString()}</h2>
            </div>
          </div>
        </main>
      </div>

      {printData && <PaySlip data={printData} onClose={() => setPrintData(null)} />}
    </>
  )
}
