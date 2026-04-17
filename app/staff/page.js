'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import Link from 'next/link'
import { Users, Plus, Edit2, UserX, UserCheck, Eye } from 'lucide-react'

export default function StaffDirectory() {
  const { addToast } = useToast()
  const [staff, setStaff] = useState([])
  const [filter, setFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', designation: '', contract_type: 'full_time',
    base_salary: '', join_date: new Date().toISOString().split('T')[0],
    emergency_contact: '', emergency_phone: '', notes: ''
  })

  useEffect(() => { fetchStaff() }, [])

  async function fetchStaff() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('staff').select('*').order('name')
      if (error) throw error
      setStaff(data || [])
    } catch (err) {
      addToast('Error loading staff', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddStaff() {
    if (!form.name || !form.designation || !form.base_salary) return addToast('Please fill required fields', 'error')
    try {
      const { data, error } = await supabase.from('staff').insert([{
        name: form.name,
        designation: form.designation,
        contract_type: form.contract_type,
        base_salary: parseFloat(form.base_salary) || 0,
        join_date: form.join_date,
        emergency_contact: form.emergency_contact,
        emergency_phone: form.emergency_phone,
        notes: form.notes
      }]).select()
      
      if (error) throw error

      if (data && data.length > 0) {
        const staffId = data[0].id
        await supabase.from('leave_balance').insert([{
          staff_id: staffId,
          year: new Date().getFullYear()
        }])
      }

      addToast('Staff member added successfully', 'success')
      setShowAddForm(false)
      setForm({
        name: '', designation: '', contract_type: 'full_time',
        base_salary: '', join_date: new Date().toISOString().split('T')[0],
        emergency_contact: '', emergency_phone: '', notes: ''
      })
      fetchStaff()
    } catch (err) {
      addToast(err.message || 'Error adding staff', 'error')
    }
  }

  async function toggleStatus(id, currentStatus) {
    try {
      const { error } = await supabase.from('staff').update({ is_active: !currentStatus }).eq('id', id)
      if (error) throw error
      fetchStaff()
    } catch (err) {
      addToast('Error updating status', 'error')
    }
  }

  const filteredStaff = staff.filter(s => {
    if (filter === 'active') return s.is_active
    if (filter === 'inactive') return !s.is_active
    return true
  })

  return (
    <div className="hr-theme">
      <Navbar />
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', color: 'var(--hr-text-primary)' }}>Staff Directory</h1>
            <p style={{ color: 'var(--hr-text-muted)' }}>Manage your Crown Coffee team</p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Add Staff Member
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['all', 'active', 'inactive'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: \`1px solid \${filter === f ? 'var(--hr-primary)' : 'var(--border-medium)'}\`,
                background: filter === f ? 'var(--hr-primary)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--hr-text-secondary)',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}><div className="loader"></div></div>
        ) : filteredStaff.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <Users size={40} style={{ margin: '0 auto 16px', color: 'var(--hr-text-muted)', opacity: 0.5 }} />
            <p>No staff members found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredStaff.map(s => (
              <div key={s.id} className="card" style={{ opacity: s.is_active ? 1 : 0.7, borderLeft: \`4px solid \${s.is_active ? 'var(--hr-primary)' : 'var(--hr-text-muted)'}\` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', marginBottom: '4px' }}>{s.name}</h2>
                    <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hr-text-muted)', fontWeight: 600 }}>{s.designation}</p>
                  </div>
                  <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: s.is_active ? '#e6f4ea' : '#fce8e6', color: s.is_active ? '#1e8e3e' : '#d93025', fontWeight: 600 }}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--hr-text-muted)' }}>Base Salary</span>
                    <span style={{ fontWeight: 600, color: 'var(--hr-primary)' }}>৳{s.base_salary?.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--hr-text-muted)' }}>Joined</span>
                    <span style={{ fontWeight: 500 }}>{new Date(s.join_date).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--hr-text-muted)' }}>Contract</span>
                    <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{s.contract_type?.replace('_', ' ')}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                  <Link href={\`/staff/\${s.id}\`} style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px', color: 'var(--hr-primary)', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
                    View Profile
                  </Link>
                  <button onClick={() => toggleStatus(s.id, s.is_active)} style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-medium)', borderRadius: '6px', color: 'var(--hr-text-secondary)', cursor: 'pointer' }}>
                    {s.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal isOpen={showAddForm} onClose={() => setShowAddForm(false)} title="Add Staff Member" confirmLabel="Add Staff" onConfirm={handleAddStaff}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label" style={{ color: 'var(--hr-text-secondary)' }}>Full Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label" style={{ color: 'var(--hr-text-secondary)' }}>Designation *</label>
              <input className="input" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--hr-text-secondary)' }}>Contract Type</label>
              <select className="input" value={form.contract_type} onChange={e => setForm({...form, contract_type: e.target.value})}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label" style={{ color: 'var(--hr-text-secondary)' }}>Base Salary (৳) *</label>
              <input className="input" type="number" value={form.base_salary} onChange={e => setForm({...form, base_salary: e.target.value})} />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--hr-text-secondary)' }}>Join Date</label>
              <input className="input" type="date" value={form.join_date} onChange={e => setForm({...form, join_date: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label" style={{ color: 'var(--hr-text-secondary)' }}>Emergency Contact</label>
              <input className="input" value={form.emergency_contact} onChange={e => setForm({...form, emergency_contact: e.target.value})} />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--hr-text-secondary)' }}>Emergency Phone</label>
              <input className="input" value={form.emergency_phone} onChange={e => setForm({...form, emergency_phone: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label" style={{ color: 'var(--hr-text-secondary)' }}>Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
