'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { Wallet, Plus, Trash2, Calendar } from 'lucide-react'

export default function AdvancesPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [staff, setStaff] = useState([])
  const [advances, setAdvances] = useState([])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({ staff_id: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '' })

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
    fetchData()
  }, [month, year])

  async function fetchData() {
    try {
      setLoading(true)
      const [staffRes, advRes] = await Promise.all([
        supabase.from('staff').select('id, name, designation, serial').eq('is_active', true).order('serial', { ascending: true }).order('name', { ascending: true }),
        supabase.from('advance_log').select('*, staff(name, designation)').eq('month', month).eq('year', year).order('date', { ascending: false })
      ])
      if (staffRes.error) throw staffRes.error
      setStaff(staffRes.data || [])
      setAdvances(advRes.data || [])
    } catch (err) {
      addToast('Error loading data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function updatePayrollAdvance(staffId, m, y) {
    const { data } = await supabase
      .from('advance_log')
      .select('amount')
      .eq('staff_id', staffId)
      .eq('month', m)
      .eq('year', y)

    const totalAdvance = (data || []).reduce(
      (sum, a) => sum + Number(a.amount), 0
    )

    const { error } = await supabase
      .from('payroll_entries')
      .upsert({
        staff_id: staffId,
        month: Number(m),
        year: Number(y),
        advance_taken: totalAdvance
      }, { onConflict: 'staff_id,month,year' })

    if (error) console.error('Error updating payroll advance:', error)
  }

  async function logAdvance() {
    if (!form.staff_id || !form.amount) return addToast('Please select staff and enter amount', 'error')

    const d = new Date(form.date)
    const m = d.getMonth() + 1
    const y = d.getFullYear()

    try {
      const { error } = await supabase.from('advance_log').insert([{
        staff_id: form.staff_id,
        amount: parseFloat(form.amount),
        date: form.date,
        reason: form.reason,
        month: m,
        year: y
      }])
      if (error) throw error

      await updatePayrollAdvance(form.staff_id, m, y)

      addToast('Advance logged successfully', 'success')
      setForm({ staff_id: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '' })
      if (m === month && y === year) fetchData()
    } catch (err) {
      addToast('Error logging advance', 'error')
    }
  }

  async function deleteAdvance(id, staffId, m, y) {
    try {
      await supabase.from('advance_log').delete().eq('id', id)
      await updatePayrollAdvance(staffId, m, y)
      addToast('Advance deleted', 'success')
      fetchData()
    } catch (err) {
      addToast('Error deleting advance', 'error')
    }
  }

  const totalThisMonth = advances.reduce((s, a) => s + Number(a.amount), 0)

  const perStaff = advances.reduce((acc, a) => {
    if (!acc[a.staff_id]) acc[a.staff_id] = { name: a.staff?.name, total: 0 }
    acc[a.staff_id].total += Number(a.amount)
    return acc
  }, {})

  return (
    <div className="hr-theme">
      <Navbar />
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', color: 'var(--hr-text-primary)' }}>Advance Log</h1>
            <p style={{ color: 'var(--hr-text-muted)' }}>Manage employee salary advances</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            <input type="number" className="input" style={{ width: '100px' }} value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }} className="advance-grid">

          {/* Left Col: Form & Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={18} /> Log New Advance</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label">Staff Member *</label>
                  <select className="input" value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})}>
                    <option value="">Select staff...</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.designation})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Amount (৳) *</label>
                  <input type="number" className="input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                <div>
                  <label className="label">Reason / Notes</label>
                  <input type="text" className="input" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
                </div>
                <button className="btn-primary" onClick={logAdvance}>Log Advance</button>
              </div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #d93025' }}>
              <p style={{ fontSize: '12px', color: 'var(--hr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Total This Month</p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: '#d93025', margin: '8px 0' }}>৳{totalThisMonth.toLocaleString()}</p>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.values(perStaff).map(s => (
                  <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#d93025' }}>৳{s.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <h3 style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} /> Monthly Records</h3>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}><div className="loader"></div></div>
            ) : advances.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--hr-text-muted)' }}>
                <Wallet size={32} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>No advances logged for this month.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', fontSize: '12px', textTransform: 'uppercase', color: 'var(--hr-text-muted)' }}>
                    <th style={{ padding: '12px 20px' }}>Date</th>
                    <th style={{ padding: '12px 20px' }}>Staff</th>
                    <th style={{ padding: '12px 20px' }}>Amount</th>
                    <th style={{ padding: '12px 20px' }}>Reason</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px 20px', fontSize: '14px' }}>{new Date(a.date).toLocaleDateString()}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <p style={{ fontWeight: 600, fontSize: '14px' }}>{a.staff?.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--hr-text-muted)' }}>{a.staff?.designation}</p>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#d93025' }}>৳{a.amount.toLocaleString()}</td>
                      <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--hr-text-secondary)' }}>{a.reason || '-'}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <button onClick={() => deleteAdvance(a.id, a.staff_id, a.month, a.year)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--hr-text-muted)' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>
      <style>{`@media (max-width: 768px) { .advance-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
