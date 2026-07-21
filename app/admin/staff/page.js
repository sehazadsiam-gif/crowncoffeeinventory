
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
    serial: 999, email: '', employee_id: '',
    shift_start: '08:00', weekly_off: 'Friday', grace_minutes: 15, is_rostered: true,
    nid: '', blood_group: '', photo_url: ''
  })
  const [selectedCardStaff, setSelectedCardStaff] = useState(null)
  const [editingStaff, setEditingStaff] = useState(null)
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
      // Custom or auto generate CC-001 format ID
      const nextNum = (staff.length || 0) + 1
      const empId = form.employee_id.trim() || `CC-${String(nextNum).padStart(3, '0')}`

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
        employee_id: empId,
        shift_start: form.shift_start || '08:00',
        weekly_off: form.weekly_off || 'Friday',
        grace_minutes: parseInt(form.grace_minutes) || 15,
        is_rostered: form.is_rostered !== false,
        nid: form.nid,
        blood_group: form.blood_group,
        photo_url: form.photo_url
      }]).select()

      if (error) throw error

      if (data && data.length > 0) {
        await supabase.from('leave_balance').insert([{
          staff_id: data[0].id,
          year: new Date().getFullYear()
        }])
        setSelectedCardStaff(data[0])
      }

      addToast(`Staff member added! ID: ${empId}`, 'success')
      setShowAddForm(false)
      setForm({
        name: '', designation: '', contract_type: 'full_time',
        base_salary: '', join_date: new Date().toISOString().split('T')[0],
        emergency_contact: '', emergency_phone: '', notes: '',
        serial: 999, email: '', employee_id: '',
        shift_start: '08:00', weekly_off: 'Friday', grace_minutes: 15, is_rostered: true,
        nid: '', blood_group: '', photo_url: ''
      })
      fetchStaff()
    } catch (err) {
      addToast(err.message || 'Error adding staff', 'error')
    }
  }

  async function handleUpdateStaff() {
    if (!editingStaff || !editingStaff.id) return
    try {
      const { error } = await supabase
        .from('staff')
        .update({
          name: editingStaff.name,
          employee_id: editingStaff.employee_id,
          designation: editingStaff.designation,
          shift_start: editingStaff.shift_start || '08:00',
          weekly_off: editingStaff.weekly_off || 'Friday',
          grace_minutes: parseInt(editingStaff.grace_minutes) || 15,
          is_rostered: editingStaff.is_rostered !== false,
          base_salary: parseFloat(editingStaff.base_salary) || 0,
          nid: editingStaff.nid || null,
          blood_group: editingStaff.blood_group || null,
          photo_url: editingStaff.photo_url || null,
          emergency_contact: editingStaff.emergency_contact || null,
          emergency_phone: editingStaff.emergency_phone || null
        })
        .eq('id', editingStaff.id)

      if (error) throw error

      addToast('Staff details updated successfully', 'success')
      setEditingStaff(null)
      fetchStaff()
    } catch (err) {
      addToast('Error updating staff: ' + err.message, 'error')
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
                      onClick={() => setEditingStaff({ ...s })}
                      title="Edit Staff / Change ID"
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Edit
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Employee ID (e.g. CC-001)</label>
              <input
                className="input"
                placeholder="Auto-assigned if blank"
                value={form.employee_id}
                onChange={e => setForm({ ...form, employee_id: e.target.value })}
              />
            </div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Designation *</label>
              <input
                className="input"
                placeholder="e.g. Barista / Kitchen Staff"
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
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Shift Start (08:00 - 23:00)</label>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>NID Number</label>
              <input
                className="input"
                placeholder="National ID"
                value={form.nid}
                onChange={e => setForm({ ...form, nid: e.target.value })}
              />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Blood Group</label>
              <select
                className="input"
                value={form.blood_group}
                onChange={e => setForm({ ...form, blood_group: e.target.value })}
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Photo URL</label>
              <input
                className="input"
                placeholder="Image URL (optional)"
                value={form.photo_url}
                onChange={e => setForm({ ...form, photo_url: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Emergency Contact Name</label>
              <input
                className="input"
                placeholder="e.g. Spouse / Relative"
                value={form.emergency_contact}
                onChange={e => setForm({ ...form, emergency_contact: e.target.value })}
              />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--text-secondary)' }}>Emergency Phone</label>
              <input
                className="input"
                placeholder="Emergency phone number"
                value={form.emergency_phone}
                onChange={e => setForm({ ...form, emergency_phone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ background: '#FAF7F2', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E8E0D4' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#6B3A2A', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={form.is_rostered}
                onChange={e => setForm({ ...form, is_rostered: e.target.checked })}
              /> Include in Duty Roster & Attendance Tracking (Front Service)
            </label>
            <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 24px' }}>
              Uncheck for Kitchen/Back-office staff who should not appear in weekly rosters.
            </p>
          </div>
        </div>
      </Modal>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <Modal
          isOpen={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          title="Edit Staff Member Details"
          confirmLabel="Save Changes"
          onConfirm={handleUpdateStaff}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={editingStaff.name || ''}
                  onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Employee ID (Key)</label>
                <input
                  className="input"
                  value={editingStaff.employee_id || ''}
                  onChange={e => setEditingStaff({ ...editingStaff, employee_id: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Designation</label>
                <input
                  className="input"
                  value={editingStaff.designation || ''}
                  onChange={e => setEditingStaff({ ...editingStaff, designation: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Base Salary (৳)</label>
                <input
                  className="input"
                  type="number"
                  value={editingStaff.base_salary || ''}
                  onChange={e => setEditingStaff({ ...editingStaff, base_salary: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">NID Number</label>
                <input
                  className="input"
                  value={editingStaff.nid || ''}
                  onChange={e => setEditingStaff({ ...editingStaff, nid: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Blood Group</label>
                <select
                  className="input"
                  value={editingStaff.blood_group || ''}
                  onChange={e => setEditingStaff({ ...editingStaff, blood_group: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label className="label">Photo URL</label>
                <input
                  className="input"
                  placeholder="Image URL"
                  value={editingStaff.photo_url || ''}
                  onChange={e => setEditingStaff({ ...editingStaff, photo_url: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Emergency Contact Name</label>
                <input
                  className="input"
                  value={editingStaff.emergency_contact || ''}
                  onChange={e => setEditingStaff({ ...editingStaff, emergency_contact: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Emergency Phone</label>
                <input
                  className="input"
                  value={editingStaff.emergency_phone || ''}
                  onChange={e => setEditingStaff({ ...editingStaff, emergency_phone: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Shift Start</label>
                <input
                  className="input"
                  type="time"
                  value={editingStaff.shift_start || '08:00'}
                  onChange={e => setEditingStaff({ ...editingStaff, shift_start: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Weekly Off</label>
                <select
                  className="input"
                  value={editingStaff.weekly_off || 'Friday'}
                  onChange={e => setEditingStaff({ ...editingStaff, weekly_off: e.target.value })}
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
                <label className="label">Grace (Mins)</label>
                <input
                  className="input"
                  type="number"
                  value={editingStaff.grace_minutes || 15}
                  onChange={e => setEditingStaff({ ...editingStaff, grace_minutes: e.target.value })}
                />
              </div>
            </div>

            <div style={{ background: '#FAF7F2', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E8E0D4' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#6B3A2A', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={editingStaff.is_rostered !== false}
                  onChange={e => setEditingStaff({ ...editingStaff, is_rostered: e.target.checked })}
                /> Include in Duty Roster & Attendance Tracking (Front Service)
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Staff ID Card Modal */}
      {selectedCardStaff && (
        <Modal
          isOpen={!!selectedCardStaff}
          onClose={() => setSelectedCardStaff(null)}
          title="Printable Staff ID Card"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            {/* Simple ID Card Container */}
            <div id="printable-id-card" style={{
              width: '320px',
              background: '#FFFFFF',
              border: '2px solid #6B3A2A',
              borderRadius: '16px',
              padding: '20px',
              color: '#1C1410',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              textAlign: 'center',
              position: 'relative',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {/* Header Banner */}
              <div style={{
                background: '#6B3A2A',
                color: 'white',
                margin: '-20px -20px 16px -20px',
                padding: '14px 12px',
                borderTopLeftRadius: '14px',
                borderTopRightRadius: '14px'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px', color: '#D4933A' }}>CROWN COFFEE</div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.9 }}>Official Staff ID Card</div>
              </div>

              {/* Photo & Main Badges */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                {selectedCardStaff.photo_url ? (
                  <img
                    src={selectedCardStaff.photo_url}
                    alt={selectedCardStaff.name}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #6B3A2A' }}
                  />
                ) : (
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#FAF7F2',
                    border: '3px solid #6B3A2A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#6B3A2A'
                  }}>
                    {selectedCardStaff.name ? selectedCardStaff.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'CC'}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1C1410', marginBottom: '2px' }}>{selectedCardStaff.name}</div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#6B3A2A', fontWeight: 700, marginBottom: '10px' }}>
                {selectedCardStaff.designation}
              </div>

              <div style={{
                display: 'inline-block',
                background: '#FAF7F2',
                border: '1px dashed #6B3A2A',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#6B3A2A',
                marginBottom: '14px'
              }}>
                ID: {selectedCardStaff.employee_id || 'CC-001'}
              </div>

              {/* Details Grid */}
              <div style={{
                background: '#F9F6F0',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '11px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#777' }}>NID:</span>
                  <span style={{ fontWeight: 600 }}>{selectedCardStaff.nid || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#777' }}>Blood Group:</span>
                  <span style={{ fontWeight: 700, color: '#d32f2f' }}>{selectedCardStaff.blood_group || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#777' }}>Emergency Contact:</span>
                  <span style={{ fontWeight: 600 }}>{selectedCardStaff.emergency_phone || selectedCardStaff.emergency_contact || 'N/A'}</span>
                </div>
              </div>

              {/* QR Code */}
              <div style={{ background: 'white', padding: '8px', borderRadius: '8px', display: 'inline-block', border: '1px solid #E8E0D4' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(selectedCardStaff.employee_id || selectedCardStaff.id)}`}
                  alt="Staff QR Code"
                  style={{ width: '90px', height: '90px', display: 'block' }}
                />
              </div>
              <div style={{ fontSize: '9px', color: '#999', marginTop: '4px' }}>Scan for attendance / check-in</div>
            </div>

            <button
              onClick={() => window.print()}
              className="btn-primary"
              style={{ background: '#6B3A2A', color: 'white', border: 'none', width: '100%', padding: '12px' }}
            >
              Print Staff ID Card
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
