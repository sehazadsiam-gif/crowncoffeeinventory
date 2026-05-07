'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { 
  Printer, Plus, Trash2, X, History, ChevronUp, ChevronDown, 
  Search, Calculator, FileSpreadsheet, Eye, Save, RotateCcw,
  User, DollarSign, Clock, AlertCircle, Info, CheckCircle, TrendingUp,
  MessageSquare
} from 'lucide-react'
import dynamic from 'next/dynamic'
import * as XLSX from 'xlsx'
import { exportPayrollToExcel } from '../../../../lib/export'

const PaySlip = dynamic(() => import('../../../components/PaySlip'), { ssr: false })

export default function PayrollPage() {
  const router = useRouter()
  const { addToast } = useToast()
  
  // State
  const [staff, setStaff] = useState([])
  const [payroll, setPayroll] = useState({})
  const [payments, setPayments] = useState({})
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStaffDetail, setSelectedStaffDetail] = useState(null)
  const [printData, setPrintData] = useState(null)
  const [recalculating, setRecalculating] = useState({})
  const [showPaymentForm, setShowPaymentForm] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [remarkModal, setRemarkModal] = useState(null)
  const [remarkText, setRemarkText] = useState('')
  const [savingRemark, setSavingRemark] = useState(false)

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // Fetch Data
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
    await Promise.all([
      fetchPayroll(m, y),
      fetchPayments(m, y)
    ])
    setLoading(false)
  }

  async function fetchPayroll(m, y) {
    try {
      const [staffRes, payRes, advRes, summaryRes] = await Promise.all([
        supabase.from('staff').select('*').eq('is_active', true).order('serial', { ascending: true }),
        supabase.from('payroll_entries').select('*').eq('month', m).eq('year', y),
        supabase.from('advance_log').select('staff_id, amount').eq('month', m).eq('year', y),
        supabase.from('monthly_attendance_summary').select('*').eq('month', m).eq('year', y)
      ])

      const summaryMap = {}
      ;(summaryRes.data || []).forEach(s => { summaryMap[s.staff_id] = s })

      const advancesMap = {}
      ;(advRes.data || []).forEach(a => { advancesMap[a.staff_id] = (advancesMap[a.staff_id] || 0) + Number(a.amount) })

      const payMap = {}
      ;(payRes.data || []).forEach(p => {
        payMap[p.staff_id] = {
          ...p,
          advance_taken: Math.max(Number(p.advance_taken), advancesMap[p.staff_id] || 0)
        }
      })

      const activeStaff = staffRes.data || []
      for (const s of activeStaff) {
        if (!payMap[s.id]) {
          const calc = await recalculateStaff(s.id, m, y, false)
          payMap[s.id] = {
            staff_id: s.id, month: m, year: y,
            ...calc,
            advance_taken: advancesMap[s.id] || 0,
            others_taken: 0,
            miscellaneous_plus: 0,
            miscellaneous_minus: 0,
            service_charge: 0,
            bonus: 0,
            overtime_hours: 0,
            is_paid: false,
            isNew: true
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
    const { data } = await supabase.from('salary_payments').select('*').eq('month', m).eq('year', y)
    const map = {}
    ;(data || []).forEach(p => {
      if (!map[p.staff_id]) map[p.staff_id] = []
      map[p.staff_id].push(p)
    })
    setPayments(map)
  }

  async function recalculateStaff(staffId, m, y, updateState = true) {
    try {
      if (updateState) setRecalculating(prev => ({ ...prev, [staffId]: true }))
      const res = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, month: m, year: y })
      })
      const data = await res.json()
      if (updateState) {
        setPayroll(prev => ({
          ...prev,
          [staffId]: { ...prev[staffId], ...data }
        }))
        addToast('Recalculated', 'success')
      }
      return data
    } catch (err) {
      if (updateState) addToast('Recalculation failed', 'error')
      return {}
    } finally {
      if (updateState) setRecalculating(prev => ({ ...prev, [staffId]: false }))
    }
  }

  async function calculateAll() {
    if (!confirm('Recalculate all staff for this month?')) return
    setLoading(true)
    for (const s of staff) {
      await recalculateStaff(s.id, month, year)
    }
    setLoading(false)
    addToast('All staff recalculated', 'success')
  }

  function handleInput(staffId, field, value) {
    setPayroll(prev => {
      const row = { ...prev[staffId], [field]: value }
      const base = Number(row.base_salary) || 0
      const ot_pay = (Number(row.overtime_hours) || 0) * Math.floor(Math.floor(base / 30) / 10)
      
      row.final_salary = Math.round(
        base + ot_pay + (Number(row.service_charge) || 0) + (Number(row.bonus) || 0) + 
        (Number(row.lunch_dinner) || 0) + (Number(row.morning_food) || 0) - 
        (Number(row.advance_taken) || 0) - (Number(row.others_taken) || 0) - 
        (Number(row.unpaid_leave_deduction) || 0) - (Number(row.late_deduction) || 0) + 
        (Number(row.miscellaneous_plus) || 0) - (Number(row.miscellaneous_minus) || 0)
      )
      return { ...prev, [staffId]: row }
    })
  }

  async function saveRow(staffId) {
    const row = payroll[staffId]
    if (!row) return
    try {
      const { error } = await supabase.from('payroll_entries').upsert({
        staff_id: row.staff_id,
        month: Number(row.month),
        year: Number(row.year),
        overtime_hours: Number(row.overtime_hours) || 0,
        service_charge: Number(row.service_charge) || 0,
        bonus: Number(row.bonus) || 0,
        lunch_dinner: Number(row.lunch_dinner) || 0,
        morning_food: Number(row.morning_food) || 0,
        advance_taken: Number(row.advance_taken) || 0,
        others_taken: Number(row.others_taken) || 0,
        miscellaneous_plus: Number(row.miscellaneous_plus) || 0,
        miscellaneous_minus: Number(row.miscellaneous_minus) || 0,
        manual_unpaid_days: row.manual_unpaid_days === null ? null : Number(row.manual_unpaid_days),
        late_waived: row.late_waived || false,
        final_salary: row.final_salary
      }, { onConflict: 'staff_id,month,year' })
      
      if (error) throw error
      addToast('Saved successfully', 'success')
    } catch (err) {
      addToast('Save failed', 'error')
    }
  }

  const handleExport = () => {
    const data = filteredStaff.map(s => {
      const row = payroll[s.id] || {}
      return {
        Name: s.name,
        Designation: s.designation_editable || s.designation,
        'Base Salary': row.base_salary,
        Present: row.present_days,
        Late: row.late_days,
        Absent: row.absent_days,
        'Final Salary': row.final_salary,
        'Paid Amount': (payments[s.id] || []).reduce((sum, p) => sum + Number(p.amount), 0)
      }
    })
    exportPayrollToExcel(data, `Payroll_${months[month-1]}_${year}.xlsx`)
  }

  // Derived Stats
  const filteredStaff = useMemo(() => {
    return staff.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [staff, searchTerm])

  const stats = useMemo(() => {
    const total = staff.reduce((acc, s) => acc + (payroll[s.id]?.final_salary || 0), 0)
    const paid = Object.values(payments).flat().reduce((acc, p) => acc + Number(p.amount), 0)
    return {
      total,
      paid,
      pending: total - paid,
      average: staff.length ? Math.round(total / staff.length) : 0
    }
  }, [staff, payroll, payments])

  if (loading && !staff.length) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="loader"></div></div>

  return (
    <div className="fade-in">
      
      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '32px 24px' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#6B3A2A', margin: 0 }}>Payroll Management</h1>
            <p style={{ color: '#9C8A76', fontSize: '15px', marginTop: '4px' }}>
              {months[month - 1]} {year} - Calculate & Track Salary
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={handleExport} 
              className="no-print"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#e6f4ea', color: '#1e8e3e', borderRadius: '8px', fontWeight: 600 }}
            >
              <FileSpreadsheet size={18} /> Export to Excel
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: '140px' }}>
                {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: '100px' }} />
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px', padding: '16px 24px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9C8A76' }} />
            <input 
              type="text" 
              placeholder="Search by staff name..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '40px' }} 
            />
          </div>
          <button className="btn-gold" onClick={calculateAll} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={18} /> Calculate All
          </button>
        </div>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'Total Payroll', val: stats.total, icon: <DollarSign size={24} />, color: '#6B3A2A' },
            { label: 'Paid Amount', val: stats.paid, icon: <CheckCircle size={24} />, color: '#1e8e3e' },
            { label: 'Pending', val: stats.pending, icon: <Clock size={24} />, color: '#d93025' },
            { label: 'Average Salary', val: stats.average, icon: <TrendingUp size={24} />, color: '#1565c0' }
          ].map((stat, i) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ background: stat.color + '15', color: stat.color, padding: '12px', borderRadius: '12px' }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#1C1410' }}>৳{stat.val.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* MAIN TABLE */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '1800px' }}>
              <thead>
                <tr>
                  <th colSpan="6" style={{ background: '#FAF7F2', borderRight: '1px solid #E8E0D4' }}>Group 1 - Staff Info</th>
                  <th colSpan="5" style={{ background: '#e6f4ea', borderRight: '1px solid #E8E0D4' }}>Group 2 - Allowances</th>
                  <th colSpan="5" style={{ background: '#fce8e6', borderRight: '1px solid #E8E0D4' }}>Group 3 - Deductions</th>
                  <th colSpan="4" style={{ background: '#fef7e0' }}>Group 4 - Summary</th>
                </tr>
                <tr>
                  <th style={{ width: '180px' }}>Name</th>
                  <th>Designation</th>
                  <th>Base</th>
                  <th>Pres</th>
                  <th>Late</th>
                  <th style={{ borderRight: '1px solid #E8E0D4' }}>Abs</th>
                  
                  <th>Morning F</th>
                  <th>Lunch+Din</th>
                  <th>Service Ch</th>
                  <th>Bonus</th>
                  <th style={{ borderRight: '1px solid #E8E0D4' }}>OT Pay</th>
                  
                  <th>Unpaid Lv</th>
                  <th>Late Cut</th>
                  <th>Advance</th>
                  <th>Others</th>
                  <th style={{ borderRight: '1px solid #E8E0D4' }}>Misc (-)</th>
                  
                  <th>Final Salary</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(s => {
                  const row = payroll[s.id] || {}
                  const staffPayments = payments[s.id] || []
                  const paid = staffPayments.reduce((acc, p) => acc + Number(p.amount), 0)
                  const rem = row.final_salary - paid

                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, color: '#6B3A2A' }}>{s.name}</td>
                      <td>{s.designation_editable || s.designation}</td>
                      <td><input type="number" value={row.base_salary || 0} onChange={e => handleInput(s.id, 'base_salary', e.target.value)} style={{ width: '80px' }} /></td>
                      <td><span className="badge badge-success">{row.present_days || 0}</span></td>
                      <td><span className="badge badge-warning">{row.late_days || 0}</span></td>
                      <td style={{ borderRight: '1px solid #E8E0D4' }}><span className="badge badge-danger">{row.absent_days || 0}</span></td>
                      
                      <td style={{ background: '#f8fdf9' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>৳{row.morning_food || 0}</div>
                        <div style={{ fontSize: '10px', color: '#9C8A76' }}>Read-only</div>
                      </td>
                      <td style={{ background: '#f8fdf9' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>৳{row.lunch_dinner || 0}</div>
                        <div style={{ fontSize: '10px', color: '#9C8A76' }}>Read-only</div>
                      </td>
                      <td style={{ background: '#f8fdf9' }}><input type="number" value={row.service_charge || 0} onChange={e => handleInput(s.id, 'service_charge', e.target.value)} style={{ width: '80px' }} /></td>
                      <td style={{ background: '#f8fdf9' }}><input type="number" value={row.bonus || 0} onChange={e => handleInput(s.id, 'bonus', e.target.value)} style={{ width: '80px' }} /></td>
                      <td style={{ background: '#f8fdf9', borderRight: '1px solid #E8E0D4' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input type="number" value={row.overtime_hours || 0} onChange={e => handleInput(s.id, 'overtime_hours', e.target.value)} style={{ width: '50px' }} />
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e8e3e' }}>৳{row.overtime_pay || 0}</div>
                        </div>
                      </td>
                      
                      <td style={{ background: '#fff9f9' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#d93025' }}>-৳{row.unpaid_leave_deduction || 0}</div>
                        <input type="number" placeholder="Days" value={row.manual_unpaid_days ?? ''} onChange={e => handleInput(s.id, 'manual_unpaid_days', e.target.value)} style={{ width: '60px', marginTop: '4px', padding: '4px' }} />
                      </td>
                      <td style={{ background: '#fff9f9' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#d93025' }}>-৳{row.late_deduction || 0}</div>
                        <button 
                          onClick={() => handleInput(s.id, 'late_waived', !row.late_waived)}
                          style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', marginTop: '4px', background: row.late_waived ? '#1e8e3e' : '#d93025', color: 'white' }}
                        >
                          {row.late_waived ? 'Waived' : 'Waive'}
                        </button>
                      </td>
                      <td style={{ background: '#fff9f9' }}><input type="number" value={row.advance_taken || 0} onChange={e => handleInput(s.id, 'advance_taken', e.target.value)} style={{ width: '80px', color: '#d93025' }} /></td>
                      <td style={{ background: '#fff9f9' }}><input type="number" value={row.others_taken || 0} onChange={e => handleInput(s.id, 'others_taken', e.target.value)} style={{ width: '80px', color: '#d93025' }} /></td>
                      <td style={{ background: '#fff9f9', borderRight: '1px solid #E8E0D4' }}><input type="number" value={row.miscellaneous_minus || 0} onChange={e => handleInput(s.id, 'miscellaneous_minus', e.target.value)} style={{ width: '80px', color: '#d93025' }} /></td>
                      
                      <td style={{ background: '#fffcf5', fontWeight: 800, fontSize: '16px', color: '#6B3A2A' }}>৳{(row.final_salary || 0).toLocaleString()}</td>
                      <td style={{ background: '#fffcf5' }}>
                        {rem <= 0 ? <span className="badge badge-success">Paid</span> : <span className="badge badge-danger">Due: ৳{rem.toLocaleString()}</span>}
                      </td>
                      <td style={{ background: '#fffcf5' }}>
                        <button 
                          onClick={() => { setRemarkModal(s); setRemarkText(''); }} 
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', color: '#6B3A2A', fontWeight: 600, fontSize: '12px' }}
                        >
                          <MessageSquare size={16} /> Remark
                        </button>
                      </td>
                      <td style={{ background: '#fffcf5' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => setSelectedStaffDetail(s.id)} title="View Details"><Eye size={16} color="#6B3A2A" /></button>
                          <button onClick={() => saveRow(s.id)} title="Save Changes"><Save size={16} color="#1e8e3e" /></button>
                          <button onClick={() => recalculateStaff(s.id, month, year)} title="Reset to Defaults"><RotateCcw size={16} color="#9C8A76" /></button>
                          <button onClick={() => setPrintData({ staff: s, payroll: { ...row, is_waived: row.late_waived }, month: months[month - 1], year })} title="Print Payslip"><Printer size={16} color="#1565c0" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL FOR DETAILS */}
        {selectedStaffDetail && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(28, 20, 16, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px' }}>
            <div className="card fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#6B3A2A' }}>Staff Payroll Details</h2>
                <button onClick={() => setSelectedStaffDetail(null)}><X size={24} /></button>
              </div>
              
              {(() => {
                const s = staff.find(st => st.id === selectedStaffDetail)
                const row = payroll[selectedStaffDetail]
                const staffPayments = payments[selectedStaffDetail] || []
                const paid = staffPayments.reduce((acc, p) => acc + Number(p.amount), 0)
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      <div style={{ background: '#FAF7F2', padding: '16px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#9C8A76', fontWeight: 700, textTransform: 'uppercase' }}>Staff Name</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#6B3A2A' }}>{s.name}</div>
                      </div>
                      <div style={{ background: '#FAF7F2', padding: '16px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#9C8A76', fontWeight: 700, textTransform: 'uppercase' }}>Designation</div>
                        <div style={{ fontSize: '16px', fontWeight: 700 }}>{s.designation_editable || s.designation}</div>
                      </div>
                      <div style={{ background: '#FAF7F2', padding: '16px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#9C8A76', fontWeight: 700, textTransform: 'uppercase' }}>Base Salary</div>
                        <div style={{ fontSize: '16px', fontWeight: 700 }}>৳{row.base_salary?.toLocaleString()}</div>
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={16} color="#1e8e3e" /> Attendance Summary
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        <div style={{ border: '1px solid #E8E0D4', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e8e3e' }}>{row.present_days}</div>
                          <div style={{ fontSize: '11px', color: '#9C8A76' }}>Days Present</div>
                        </div>
                        <div style={{ border: '1px solid #E8E0D4', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#C9943A' }}>{row.late_days}</div>
                          <div style={{ fontSize: '11px', color: '#9C8A76' }}>Days Late</div>
                        </div>
                        <div style={{ border: '1px solid #E8E0D4', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#d93025' }}>{row.absent_days}</div>
                          <div style={{ fontSize: '11px', color: '#9C8A76' }}>Days Absent</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div style={{ background: '#e6f4ea', padding: '20px', borderRadius: '16px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#1e8e3e', textTransform: 'uppercase', marginBottom: '16px' }}>Earnings</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span>Base Salary</span> <span>৳{row.base_salary}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span>Overtime ({row.overtime_hours}h)</span> <span>৳{row.overtime_pay}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span>Service Charge</span> <span>৳{row.service_charge}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span>Bonus</span> <span>৳{row.bonus}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span>Meal Allowances</span> <span>৳{(row.lunch_dinner || 0) + (row.morning_food || 0)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ background: '#fce8e6', padding: '20px', borderRadius: '16px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#d93025', textTransform: 'uppercase', marginBottom: '16px' }}>Deductions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span>Unpaid Leave</span> <span>৳{row.unpaid_leave_deduction}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span>Late Cut</span> <span>৳{row.late_deduction}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span>Advance Taken</span> <span>৳{row.advance_taken}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span>Others</span> <span>৳{row.others_taken}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>Payment History</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {staffPayments.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#9C8A76', fontSize: '13px' }}>No payments recorded yet</div>
                        ) : (
                          staffPayments.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E8E0D4' }}>
                              <div>
                                <div style={{ fontWeight: 700 }}>৳{Number(p.amount).toLocaleString()}</div>
                                <div style={{ fontSize: '11px', color: '#9C8A76' }}>{new Date(p.payment_date).toLocaleDateString()}</div>
                              </div>
                              {p.notes && <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#5C4A36' }}>{p.notes}</div>}
                            </div>
                          ))
                        )}
                        <button className="btn-primary" onClick={() => setShowPaymentForm(selectedStaffDetail)} style={{ marginTop: '12px' }}>Record New Payment</button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* PAYMENT FORM MODAL */}
        {showPaymentForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(28, 20, 16, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <div className="card fade-in" style={{ width: '100%', maxWidth: '400px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Record Payment</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Amount</label>
                  <input type="number" placeholder="৳" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Date</label>
                  <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Notes</label>
                  <textarea value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} style={{ width: '100%', height: '80px' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={async () => {
                    const amount = Number(paymentForm.amount)
                    if (!amount || amount <= 0) return addToast('Enter valid amount', 'error')
                    try {
                      const { error } = await supabase.from('salary_payments').insert([{
                        staff_id: showPaymentForm, month, year, amount,
                        payment_date: paymentForm.date, notes: paymentForm.notes
                      }])
                      if (error) throw error
                      addToast('Payment recorded', 'success')
                      setShowPaymentForm(null)
                      setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
                      fetchPayments(month, year)
                    } catch (err) { addToast('Payment error', 'error') }
                  }}>Record</button>
                  <button onClick={() => setShowPaymentForm(null)} style={{ flex: 1, border: '1px solid #E8E0D4', borderRadius: '8px', fontWeight: 600 }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REMARK MODAL */}
        {remarkModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(28, 20, 16, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <div className="card fade-in" style={{ width: '100%', maxWidth: '500px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#6B3A2A', marginBottom: '8px' }}>Add Remark</h2>
              <p style={{ color: '#9C8A76', fontSize: '14px', marginBottom: '24px' }}>Staff: <strong>{remarkModal.name}</strong></p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Remark Content</label>
                  <textarea 
                    value={remarkText} 
                    onChange={e => setRemarkText(e.target.value)} 
                    placeholder="Enter performance feedback or notes..."
                    style={{ width: '100%', height: '120px', padding: '12px', borderRadius: '8px', border: '1px solid #E8E0D4' }} 
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1 }} 
                    disabled={savingRemark || !remarkText.trim()}
                    onClick={async () => {
                      try {
                        setSavingRemark(true)
                        const token = localStorage.getItem('cc_token')
                        const res = await fetch(`/api/admin/staff/\${remarkModal.id}/add-remark`, {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer \${token}`
                          },
                          body: JSON.stringify({ remark_text: remarkText })
                        })
                        const data = await res.json()
                        if (data.success) {
                          addToast('Remark added successfully', 'success')
                          setRemarkModal(null)
                          setRemarkText('')
                        } else {
                          throw new Error(data.error)
                        }
                      } catch (err) {
                        addToast(err.message || 'Failed to add remark', 'error')
                      } finally {
                        setSavingRemark(false)
                      }
                    }}
                  >
                    {savingRemark ? 'Saving...' : 'Save Remark'}
                  </button>
                  <button onClick={() => setRemarkModal(null)} style={{ flex: 1, border: '1px solid #E8E0D4', borderRadius: '8px', fontWeight: 600 }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {printData && <PaySlip data={printData} onClose={() => setPrintData(null)} />}

      <style jsx global>{`
        table { border-collapse: separate; border-spacing: 0; }
        th { position: sticky; top: 0; z-index: 10; }
        td { white-space: nowrap; }
        input[type="number"]::-webkit-inner-spin-button { display: none; }
      `}</style>
    </div>
  )
}