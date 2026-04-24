'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { TrendingUp, Award, CalendarDays } from 'lucide-react'

export default function PayrollHistoryPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [history, setHistory] = useState([])
  const [staffList, setStaffList] = useState([])
  const [staffId, setStaffId] = useState('all')
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

    useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
     fetchData() }, [staffId, year])

  async function fetchData() {
    try {
      setLoading(true)
      const [staffRes, histRes] = await Promise.all([
        supabase.from('staff').select('id, name, designation, serial').order('serial', { ascending: true }).order('name', { ascending: true }),
        supabase.from('payroll_entries')
          .select('*, staff(name, designation)')
          .eq('year', year)
          .eq('is_paid', true)
          .order('month', { ascending: false })
      ])
      if (staffRes.error) throw staffRes.error
      setStaffList(staffRes.data || [])

      let data = histRes.data || []
      if (staffId !== 'all') data = data.filter(d => d.staff_id === staffId)
      setHistory(data)
    } catch (err) {
      addToast('Error loading history', 'error')
    } finally {
      setLoading(false)
    }
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const totalPaid = history.reduce((sum, h) => sum + Number(h.final_salary), 0)

  const monthlyTotals = Array(12).fill(0)
  history.forEach(h => { monthlyTotals[h.month - 1] += Number(h.final_salary) })
  const maxMonth = Math.max(...monthlyTotals, 1)

  const uniqueMonths = new Set(history.map(h => h.month)).size
  const avgMonthly = uniqueMonths > 0 ? totalPaid / uniqueMonths : 0
  const highestMonthVal = Math.max(...monthlyTotals)
  const highestMonthIdx = monthlyTotals.indexOf(highestMonthVal)

  return (
    <div>
      <Navbar />
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Payroll History
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
              Historical salary records and analytics
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              className="input"
              value={staffId}
              onChange={e => setStaffId(e.target.value)}
            >
              <option value="all">All Staff</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: '#e6f4ea', color: '#1e8e3e', borderRadius: '12px', flexShrink: 0 }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Total Paid ({year})
              </p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                ৳{totalPaid.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: '#feefe3', color: '#fa7b17', borderRadius: '12px', flexShrink: 0 }}>
              <CalendarDays size={22} />
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Avg Monthly Payroll
              </p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                ৳{Math.round(avgMonthly).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: '#fce8e6', color: '#d93025', borderRadius: '12px', flexShrink: 0 }}>
              <Award size={22} />
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Highest Paid Month
              </p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {highestMonthVal > 0 ? months[highestMonthIdx] : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontFamily: 'var(--font-display)' }}>
            Monthly Comparison
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {monthlyTotals.map((val, idx) => {
              if (val === 0) return null
              const widthPct = Math.max(1, (val / maxMonth) * 100) + '%'
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ width: '36px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {months[idx]}
                  </span>
                  <div style={{ flex: 1, background: 'var(--bg-subtle)', height: '22px', borderRadius: '11px', overflow: 'hidden' }}>
                    <div style={{
                      width: widthPct,
                      height: '100%',
                      background: 'var(--accent-brown)',
                      borderRadius: '11px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <span style={{ width: '90px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    ৳{val.toLocaleString()}
                  </span>
                </div>
              )
            })}
            {monthlyTotals.every(v => v === 0) && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                No data for {year}.
              </p>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <h3 style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', fontFamily: 'var(--font-display)' }}>
            Detailed Records
          </h3>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div className="loader"></div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                    {['Month', 'Staff', 'Base Salary', 'Additions', 'Deductions', 'Net Paid'].map(h => (
                      <th key={h} style={{ padding: '14px 16px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => {
                    const additions = (
                      Number(h.overtime_pay) +
                      Number(h.service_charge) +
                      Number(h.bonus) +
                      Number(h.lunch_dinner) +
                      Number(h.morning_food) +
                      (Number(h.miscellaneous) > 0 ? Number(h.miscellaneous) : 0)
                    )
                    const deductions = (
                      Number(h.advance_taken) +
                      Number(h.others_taken) +
                      (Number(h.miscellaneous) < 0 ? Math.abs(Number(h.miscellaneous)) : 0)
                    )
                    return (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {months[h.month - 1]}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                            {h.staff?.name}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {h.staff?.designation}
                          </p>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                          ৳{Number(h.base_salary || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#1e8e3e', fontWeight: 500 }}>
                          +৳{additions.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#d93025', fontWeight: 500 }}>
                          -৳{deductions.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--accent-brown)', fontSize: '15px' }}>
                          ৳{Number(h.final_salary).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No paid payroll records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}