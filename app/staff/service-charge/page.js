'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Percent, CheckCircle2 } from 'lucide-react'

export default function ServiceChargePage() {
  const { addToast } = useToast()
  const [staff, setStaff] = useState([])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [totalAmount, setTotalAmount] = useState('')
  const [distType, setDistType] = useState('equal')
  const [percentages, setPercentages] = useState({})
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [staffRes, histRes] = await Promise.all([
        supabase.from('staff').select('id, name, designation').eq('is_active', true).order('name'),
        supabase.from('service_charge_pool').select('*').order('year', { ascending: false }).order('month', { ascending: false })
      ])
      if (staffRes.error) throw staffRes.error
      const activeStaff = staffRes.data || []
      setStaff(activeStaff)
      setHistory(histRes.data || [])

      const initialPct = {}
      const equalShare = activeStaff.length > 0 ? (100 / activeStaff.length).toFixed(2) : 0
      activeStaff.forEach(s => { initialPct[s.id] = equalShare })
      setPercentages(initialPct)
    } catch (err) {
      addToast('Error loading data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const currentTotalPct = Object.values(percentages).reduce((s, p) => s + Number(p || 0), 0)
  const isValidPct = distType === 'equal' || Math.abs(currentTotalPct - 100) < 0.1
  const amountToDistribute = parseFloat(totalAmount) || 0

  async function applyDistribution() {
    if (amountToDistribute <= 0) return addToast('Enter a valid total amount', 'error')
    if (!isValidPct) return addToast('Percentages must total 100%', 'error')

    try {
      const { error: poolErr } = await supabase.from('service_charge_pool').upsert({
        month, year, total_amount: amountToDistribute,
        distribution_type: distType, is_distributed: true
      }, { onConflict: 'month,year' })
      if (poolErr) throw poolErr

      const updates = staff.map(s => {
        const share = distType === 'equal'
          ? amountToDistribute / staff.length
          : amountToDistribute * (Number(percentages[s.id] || 0) / 100)
        return supabase.from('payroll_entries').upsert({
          staff_id: s.id, month, year, service_charge: Math.round(share)
        }, { onConflict: 'staff_id,month,year' })
      })
      await Promise.all(updates)

      addToast('Service charge distributed to payroll', 'success')
      fetchData()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    }
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div>
      <Navbar />
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Service Charge</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Distribute monthly service charge among staff</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {monthNames.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" className="input" style={{ width: '100px' }} value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>

          <div className="card">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label className="label">Total Amount to Distribute (৳)</label>
                <input
                  type="number"
                  className="input"
                  style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent-brown)' }}
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  placeholder="e.g. 50000"
                />
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label className="label">Distribution Method</label>
                <select className="input" value={distType} onChange={e => setDistType(e.target.value)}>
                  <option value="equal">Equal Split</option>
                  <option value="custom">Custom Percentage</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}><div className="loader"></div></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Staff</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Share %</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => {
                    const sharePct = distType === 'equal' ? (100 / staff.length) : Number(percentages[s.id] || 0)
                    const shareAmt = Math.round(amountToDistribute * (sharePct / 100))
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{s.name}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.designation}</p>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {distType === 'equal' ? (
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>{sharePct.toFixed(2)}%</span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                className="input"
                                style={{ width: '80px', padding: '6px' }}
                                value={percentages[s.id] || ''}
                                onChange={e => setPercentages(prev => ({ ...prev, [s.id]: e.target.value }))}
                              />
                              <Percent size={13} color="var(--text-muted)" />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '15px', color: 'var(--accent-brown)' }}>
                          ৳{shareAmt.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
              {distType === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total:</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: isValidPct ? '#1e8e3e' : '#d93025' }}>
                    {currentTotalPct.toFixed(1)}%
                  </span>
                  {!isValidPct && <span style={{ fontSize: '12px', color: '#d93025' }}>Must equal 100%</span>}
                </div>
              )}
              <button
                className="btn-primary"
                onClick={applyDistribution}
                disabled={!isValidPct || amountToDistribute <= 0}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle2 size={16} /> Apply to Payroll
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <h3 style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', fontFamily: 'var(--font-display)' }}>Distribution History</h3>
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {history.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No history found.</p>
              ) : history.map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                      {new Date(h.year, h.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {h.distribution_type} split &bull; {h.is_distributed ? 'Applied' : 'Draft'}
                    </p>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--accent-brown)' }}>
                    ৳{Number(h.total_amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}