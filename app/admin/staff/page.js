
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/Toast'
import Link from 'next/link'
import { Users, Plus, UserX, UserCheck, Trash2, QrCode } from 'lucide-react'

export default function StaffDirectory() {
  const router = useRouter()
  const { addToast } = useToast()
  const [staff, setStaff] = useState([])
  const [filter, setFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', designation: '', contract_type: 'full_time',
    base_salary: '', join_date: new Date().toISOString().split('T')[0],
    emergency_contact: '', emergency_phone: '', notes: '',
    serial: 999, email: '',
    shift_start: '10:00', weekly_off: 'Friday', grace_minutes: 15
  })
  const [selectedCardStaff, setSelectedCardStaff] = useState(null)
  const [isSorting, setIsSorting] = useState(false)
  const [tempSerials, setTempSerials] = useState({})

    useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      router.replace('/')
      return
    }
     fetchStaff() }, [])

  async function fetchStaff() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('staff').select('*').order('serial', { ascending: true }).order('name', { ascending: true })
      if (error) throw error
      setStaff(data || [])
    } catch (err) {
      addToast('Error loading staff', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddStaff() {
    if (!form.name || !form.designation || !form.base_salary) {
      return addToast('Please fill required fields', 'error')
    }
    try {
      // Auto generate CC-001 format ID
      const nextNum = (staff.length || 0) + 1
      const generatedEmpId = `CC-${String(nextNum).padStart(3, '0')}`

      const { data, error } = await supabase.from('staff').insert([{
        name: form.name,
        designation: form.designation,
        contract_type: form.contract_type,
        base_salary: parseFloat(form.base_salary) || 0,
        join_date: form.join_date,
        emergency_contact: form.emergency_contact,
        emergency_phone: form.emergency_phone,
        notes: form.notes,
        serial: parseInt(form.serial) || 999,
        email: form.email,
        employee_id: generatedEmpId,
        shift_start: form.shift_start || '10:00',
        weekly_off: form.weekly_off || 'Friday',
        grace_minutes: parseInt(form.grace_minutes) || 15
      }]).select()

      if (error) throw error

      if (data && data.length > 0) {
        await supabase.from('leave_balance').insert([{
          staff_id: data[0].id,
          year: new Date().getFullYear()
        }])
        // Auto-open ID card modal for immediate printing
        setSelectedCardStaff(data[0])
      }

      addToast(`Staff member added! ID: ${generatedEmpId}`, 'success')
      setShowAddForm(false)
      setForm({
        name: '', designation: '', contract_type: 'full_time',
        base_salary: '', join_date: new Date().toISOString().split('T')[0],
        emergency_contact: '', emergency_phone: '', notes: '',
        serial: 999, email: '',
        shift_start: '10:00', weekly_off: 'Friday', grace_minutes: 15
      })
      fetchStaff()
    } catch (err) {
      addToast(err.message || 'Error adding staff', 'error')
    }
  }

  async function toggleStatus(id, currentStatus) {
    try {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: !currentStatus })
        .eq('id', id)
      if (error) throw error
      fetchStaff()
    } catch (err) {
      addToast('Error updating status', 'error')
    }
  }

  async function deleteStaff(id, name) {
    if (!confirm(`Are you sure you want to permanently DELETE ${name}? This will remove all their records.`)) return
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id)
      if (error) throw error
      addToast('Staff member deleted permanently', 'success')
      fetchStaff()
    } catch (err) {
      addToast('Error deleting staff: ' + err.message, 'error')
    }
  }

  async function handleSaveSerials() {
    try {
      setLoading(true)
      const updates = Object.entries(tempSerials).map(([id, serial]) => ({
        id,
        serial: parseInt(serial) || 999
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('staff')
          .update({ serial: update.serial })
          .eq('id', update.id)
        if (error) throw error
      }

      addToast('Staff ordering updated', 'success')
      setIsSorting(false)
      setTempSerials({})
      fetchStaff()
    } catch (err) {
      addToast('Error updating order: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredStaff = staff.filter(s => {
    if (filter === 'active') return s.is_active
    if (filter === 'inactive') return !s.is_active
    return true
  })

  return (
    <div className="hr-theme">
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', color: 'var(--text-primary)' }}>Staff Directory</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Manage your Crown Coffee team</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn-secondary"
              onClick={() => {
                if (isSorting) {
                  handleSaveSerials()
                } else {
                  const initial = {}
                  staff.forEach(s => initial[s.id] = s.serial || 999)
                  setTempSerials(initial)
                  setIsSorting(true)
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isSorting ? 'var(--accent-green)' : 'transparent', color: isSorting ? 'white' : 'var(--text-secondary)' }}
            >
              {isSorting ? 'Save Ordering' : 'Adjust Serials'}
            </button>
            {isSorting && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsSorting(false)
                  setTempSerials({})
                }}
              >
                Cancel
              </button>
            )}
            <button
              className="btn-primary"
              onClick={() => setShowAddForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> Add Staff Member
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['all', 'active', 'inactive'].map(f => {
            const isActive = filter === f
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: '1px solid ' + (isActive ? 'var(--accent-blue)' : 'var(--border-medium)'),
                  background: isActive ? 'var(--accent-blue)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}
              >
                {f === 'all' ? 'All (' + staff.length + ')' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div className="loader"></div>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <Users
              size={40}
              style={{ margin: '0 auto 16px', color: 'var(--text-muted)', opacity: 0.4 }}
            />
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              No staff members found.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {filteredStaff.map(s => {
              const cardBorderColor = s.is_active ? 'var(--accent-blue)' : 'var(--text-muted)'
              const cardOpacity = s.is_active ? 1 : 0.7
              const statusBg = s.is_active ? '#e6f4ea' : '#fce8e6'
              const statusColor = s.is_active ? '#1e8e3e' : '#d93025'

              return (
                <div
                  key={s.id}
                  className="card"
                  style={{
                    opacity: cardOpacity,
                    borderLeft: '4px solid ' + cardBorderColor
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{
                        fontSize: '22px',
                        marginBottom: '4px',
                        fontFamily: 'var(--font-display)',
                        color: 'var(--text-primary)'
                      }}>
                        {s.name}
                      </h2>
                      {isSorting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Serial:</span>
                          <input
                            type="number"
                            className="input"
                            style={{ padding: '2px 8px', width: '70px', fontSize: '12px', height: '28px' }}
                            value={tempSerials[s.id] ?? s.serial ?? 999}
                            onChange={e => setTempSerials({ ...tempSerials, [s.id]: e.target.value })}
                          />
                        </div>
                      ) : (
                        <p style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          fontFamily: 'var(--font-body)'
                        }}>
                          {s.designation} {s.serial !== 999 && <span style={{ marginLeft: '8px', opacity: 0.6 }}>#{s.serial}</span>}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: statusBg,
                      color: statusColor,
                      fontWeight: 600,
                      fontFamily: 'var(--font-body)',
                      letterSpacing: '0.05em'
                    }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Base Salary</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>
                        ৳{s.base_salary?.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Per Day</span>
                      <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                        ৳{Math.round(s.base_salary / 30).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Joined</span>
                      <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {s.join_date
                          ? new Date(s.join_date).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })
                          : 'N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Contract</span>
                      <span style={{ fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {s.contract_type?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-light)'
                  }}>
                    <button
                      onClick={() => setSelectedCardStaff(s)}
                      title="Generate ID Card / QR Sticker"
                      style={{
                        padding: '8px 12px',
                        background: '#FAF7F2',
                        border: '1px solid #E8E0D4',
                        borderRadius: '6px',
                        color: '#6B3A2A',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <QrCode size={14} /> ID Card
                    </button>
                    <button
                      onClick={() => toggleStatus(s.id, s.is_active)}
                      title={s.is_active ? 'Deactivate' : 'Activate'}
                      style={{
                        width: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {s.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                    <button
                      onClick={() => deleteStaff(s.id, s.name)}
                      title="Delete Permanently"
                      style={{
                        width: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: '1px solid #fce8e6',
                        borderRadius: '6px',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Add Staff Member"
        confirmLabel="Add Staff"
        onConfirm={handleAddStaff}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label" style={{ color: 'var(--text-secondary)' }}>Full Name *</label>
            <input
              className="input"
              placeholder="e.g. Shahadat Hossain"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="label" style={{ color: 'var(--text-secondary)' }}>Email Address (for notifications)</label>
            <input
              className="input"
              type="email"
              placeholder="e.g. staff@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="label" style={{ color: 'var(--text-secondary)' }}>Display Serial (for sorting)</label>
            <input
              className="input"
              type="number"
              placeholder="e.g. 1, 2, 3... (999 for default)"
              value={form.serial}
              onChange={e => setForm({ ...form, serial: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Designation *</label>
              <input
                className="input"
                placeholder="e.g. Manager"
                value={form.designation}
                onChange={e => setForm({ ...form, designation: e.target.value })}
              />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Contract Type</label>
              <select
                className="input"
                value={form.contract_type}
                onChange={e => setForm({ ...form, contract_type: e.target.value })}
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Base Salary (৳) *</label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 21000"
                value={form.base_salary}
                onChange={e => setForm({ ...form, base_salary: e.target.value })}
              />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Join Date</label>
              <input
                className="input"
                type="date"
                value={form.join_date}
                onChange={e => setForm({ ...form, join_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Shift Start</label>
              <input
                className="input"
                type="time"
                value={form.shift_start}
                onChange={e => setForm({ ...form, shift_start: e.target.value })}
              />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Weekly Off</label>
              <select
                className="input"
                value={form.weekly_off}
                onChange={e => setForm({ ...form, weekly_off: e.target.value })}
              >
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Grace (Mins)</label>
              <input
                className="input"
                type="number"
                value={form.grace_minutes}
                onChange={e => setForm({ ...form, grace_minutes: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Emergency Contact</label>
              <input
                className="input"
                placeholder="Contact name"
                value={form.emergency_contact}
                onChange={e => setForm({ ...form, emergency_contact: e.target.value })}
              />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Emergency Phone</label>
              <input
                className="input"
                placeholder="Phone number"
                value={form.emergency_phone}
                onChange={e => setForm({ ...form, emergency_phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label" style={{ color: 'var(--text-secondary)' }}>Notes</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* ID Card / QR Sticker Modal */}
      {selectedCardStaff && (
        <Modal
          isOpen={!!selectedCardStaff}
          onClose={() => setSelectedCardStaff(null)}
          title="Employee Printable ID Card / QR Sticker"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            {/* Card Preview Container */}
            <div id="printable-id-card" style={{
              width: '320px',
              background: 'linear-gradient(135deg, #6B3A2A 0%, #3D1E15 100%)',
              borderRadius: '16px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', color: '#D4933A' }}>CC</div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8, marginBottom: '16px' }}>Crown Coffee Staff ID</div>
              
              <div style={{ background: 'white', padding: '12px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedCardStaff.employee_id || selectedCardStaff.id)}`}
                  alt="QR Code"
                  style={{ width: '130px', height: '130px', display: 'block' }}
                />
              </div>

              <div style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>{selectedCardStaff.name}</div>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#D4933A', fontWeight: 700 }}>{selectedCardStaff.designation}</div>
              <div style={{ marginTop: '12px', fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', display: 'inline-block' }}>
                {selectedCardStaff.employee_id || 'CC-001'}
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="btn-primary"
              style={{ background: '#6B3A2A', color: 'white', border: 'none', width: '100%', padding: '12px' }}
            >
              Print ID Card / Sticker
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
