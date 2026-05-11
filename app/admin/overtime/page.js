'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/Toast'
import { 
  FileSpreadsheet, Calendar, Calculator, 
  ChevronRight, Edit3, Eye, Download, 
  AlertCircle, CheckCircle2, History,
  RefreshCw, Save, X
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function OvertimeManagement() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [staffList, setStaffList] = useState([])
  const [overtimeSummary, setOvertimeSummary] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [detailedLogs, setDetailedLogs] = useState([])
  
  const [overrideForm, setOverrideForm] = useState({
    manual_overtime_hours: '',
    manual_overtime_pay: '',
    notes: ''
  })
  const [importStatus, setImportStatus] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
    fetchStaffAndSummary()
  }, [selectedMonth, selectedYear])

  async function fetchStaffAndSummary() {
    setLoading(true)
    try {
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, name, base_salary, hourly_rate, shift_hours, is_active')
        .eq('is_active', true)
        .order('name')
      
      if (staffError) throw staffError
      setStaffList(staff)

      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]

      const { data: logs, error: logsError } = await supabase
        .from('overtime_logs')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)

      if (logsError) throw logsError

      const summary = staff.map(s => {
        const staffLogs = logs.filter(l => l.staff_id === s.id)
        const totalHours = staffLogs.reduce((sum, l) => sum + (l.manual_override ? (l.manual_overtime_hours || 0) : (l.overtime_hours || 0)), 0)
        const totalPay = staffLogs.reduce((sum, l) => sum + (l.manual_override ? (l.manual_overtime_pay || 0) : (l.overtime_pay || 0)), 0)
        const daysWorked = staffLogs.length
        const hasOverride = staffLogs.some(l => l.manual_override)

        return {
          ...s,
          total_ot_hours: totalHours,
          total_ot_pay: totalPay,
          days_worked: daysWorked,
          has_override: hasOverride
        }
      })

      setOvertimeSummary(summary)
    } catch (err) {
      addToast('Error loading data: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCalculateAll() {
    setCalculating(true)
    try {
      let successCount = 0
      for (const staff of staffList) {
        const res = await fetch('/api/admin/overtime/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: staff.id, month: selectedMonth, year: selectedYear })
        })
        if (res.ok) successCount++
      }
      addToast(`Calculated overtime for ${successCount} staff members`, 'success')
      fetchStaffAndSummary()
    } catch (err) {
      addToast('Calculation failed: ' + err.message, 'error')
    } finally {
      setCalculating(false)
    }
  }

  async function handleImportCSV(e) {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setLoading(true)
    try {
      const res = await fetch('/api/admin/overtime/import-csv', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        setImportStatus(`Imported ${data.imported_count} records. Calculated for ${data.calculated_count} staff.`)
        addToast('Import successful', 'success')
        fetchStaffAndSummary()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      addToast('Import failed: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function viewDetails(staff) {
    setSelectedStaff(staff)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/overtime/logs?staff_id=${staff.id}&month=${selectedMonth}&year=${selectedYear}`)
      const data = await res.json()
      if (data.success) {
        setDetailedLogs(data.logs)
        setShowDetailModal(true)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      addToast('Error loading details: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function openOverride(log) {
    setSelectedLog(log)
    setOverrideForm({
      manual_overtime_hours: log.manual_overtime_hours || log.overtime_hours || '',
      manual_overtime_pay: log.manual_overtime_pay || log.overtime_pay || '',
      notes: log.notes || ''
    })
    setShowOverrideModal(true)
  }

  async function handleSaveOverride() {
    try {
      const res = await fetch(`/api/admin/overtime/${selectedLog.id}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideForm)
      })
      const data = await res.json()
      if (data.success) {
        addToast('Override saved', 'success')
        setShowOverrideModal(false)
        viewDetails(selectedStaff)
        fetchStaffAndSummary()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      addToast('Error saving override: ' + err.message, 'error')
    }
  }

  async function handleResetOverride(logId) {
    if (!confirm('Are you sure you want to reset to calculated values?')) return
    try {
      const res = await fetch(`/api/admin/overtime/${logId}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true })
      })
      const data = await res.json()
      if (data.success) {
        addToast('Override reset', 'success')
        viewDetails(selectedStaff)
        fetchStaffAndSummary()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      addToast('Error resetting: ' + err.message, 'error')
    }
  }

  function handleExport() {
    const exportData = overtimeSummary.map(s => ({
      'Staff Name': s.name,
      'Base Salary': s.base_salary,
      'Hourly Rate': s.hourly_rate,
      'Days Worked': s.days_worked,
      'Total OT Hours': s.total_ot_hours,
      'Total OT Pay': s.total_ot_pay,
      'Manual Override': s.has_override ? 'Yes' : 'No'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Overtime Summary')
    XLSX.writeFile(wb, `Overtime_Report_${selectedYear}_${selectedMonth}.xlsx`)
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="admin-theme" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Overtime Management</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Track, calculate, and adjust staff overtime payments</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleExport} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} /> Export Excel
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px' }}>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--accent-blue)" /> Select Period
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Month</label>
                  <select className="input" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Year</label>
                  <select className="input" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <button onClick={handleCalculateAll} disabled={calculating} className="btn-primary" style={{ marginTop: '8px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {calculating ? <RefreshCw size={18} className="spin" /> : <Calculator size={18} />}
                  Calculate Overtime
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', border: '1px dashed var(--accent-blue)', background: 'var(--bg-subtle)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={18} color="var(--accent-blue)" /> Import Attendance
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Upload CSV with: <code>staff_id, date, check_in, check_out</code>
              </p>
              <label className="btn-secondary" style={{ width: '100%', cursor: 'pointer', textAlign: 'center', display: 'block' }}>
                <input type="file" accept=".csv,.xlsx" hidden onChange={handleImportCSV} />
                Upload File
              </label>
              {importStatus && (
                <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'white', border: '1px solid var(--border-light)', fontSize: '12px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} /> {importStatus}
                </div>
              )}
            </div>
          </aside>

          <section>
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                  <tr>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>Staff Name</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>Base Salary</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>Rate/Hr</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>Days</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>OT Hours</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>OT Pay</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>Manual</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center' }}><div className="loader" style={{ margin: '0 auto' }}></div></td></tr>
                  ) : overtimeSummary.length === 0 ? (
                    <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No staff records found for this period.</td></tr>
                  ) : (
                    overtimeSummary.map(staff => (
                      <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{staff.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ID: {staff.id.slice(0, 8)}</div>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>৳{staff.base_salary?.toLocaleString()}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>৳{staff.hourly_rate?.toFixed(2)}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>{staff.days_worked}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 700, color: 'var(--accent-blue)' }}>{staff.total_ot_hours?.toFixed(1)}h</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-green)' }}>৳{staff.total_ot_pay?.toLocaleString()}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          {staff.has_override && <AlertCircle size={16} color="var(--warning)" title="Contains manual overrides" />}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <button onClick={() => viewDetails(staff)} className="btn-icon" title="View Daily Details" style={{ padding: '6px', borderRadius: '6px', background: 'var(--bg-subtle)', color: 'var(--accent-blue)', border: 'none', cursor: 'pointer' }}>
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={`Overtime Details: ${selectedStaff?.name}`} width="900px">
        <div style={{ marginBottom: '20px', display: 'flex', gap: '24px', padding: '16px', background: 'var(--bg-subtle)', borderRadius: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Monthly Summary</div>
            <div style={{ display: 'flex', gap: '32px', marginTop: '8px' }}>
              <div><div style={{ fontSize: '20px', fontWeight: 800 }}>{selectedStaff?.total_ot_hours?.toFixed(1)}h</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total OT Hours</div></div>
              <div><div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-green)' }}>৳{selectedStaff?.total_ot_pay?.toLocaleString()}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total OT Pay</div></div>
              <div><div style={{ fontSize: '20px', fontWeight: 800 }}>{selectedStaff?.days_worked}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Days Worked</div></div>
            </div>
          </div>
        </div>
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid var(--border-light)' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700 }}>In</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700 }}>Out</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700 }}>Actual Hrs</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700 }}>OT Hrs</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 700 }}>OT Pay</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {detailedLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)', background: log.manual_override ? '#fffaf0' : 'transparent' }}>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>{log.check_in?.slice(0, 5)}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>{log.check_out?.slice(0, 5)}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>{log.actual_hours}h</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>{log.manual_override ? <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{log.manual_overtime_hours}h*</span> : <span>{log.overtime_hours}h</span>}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>৳{log.manual_override ? log.manual_overtime_pay : log.overtime_pay}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}><div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}><button onClick={() => openOverride(log)} className="btn-icon" style={{ padding: '4px', color: 'var(--text-secondary)' }} title="Edit/Override"><Edit3 size={14} /></button>{log.manual_override && <button onClick={() => handleResetOverride(log.id)} className="btn-icon" style={{ padding: '4px', color: 'var(--danger)' }} title="Reset to Calculated"><History size={14} /></button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal isOpen={showOverrideModal} onClose={() => setShowOverrideModal(false)} title="Manual OT Override" confirmLabel="Save Changes" onConfirm={handleSaveOverride}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', fontSize: '13px' }}><strong>Date:</strong> {selectedLog && new Date(selectedLog.date).toLocaleDateString()} <br /><strong>Calculated:</strong> {selectedLog?.overtime_hours}h (৳{selectedLog?.overtime_pay})</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label className="label">OT Hours</label><input type="number" step="0.1" className="input" value={overrideForm.manual_overtime_hours} onChange={e => { const hours = e.target.value; const pay = hours * (selectedStaff?.hourly_rate || 0); setOverrideForm({ ...overrideForm, manual_overtime_hours: hours, manual_overtime_pay: pay.toFixed(2) }); }} /></div>
            <div><label className="label">OT Pay (৳)</label><input type="number" className="input" value={overrideForm.manual_overtime_pay} onChange={e => setOverrideForm({ ...overrideForm, manual_overtime_pay: e.target.value })} /></div>
          </div>
          <div><label className="label">Notes / Reason</label><textarea className="input" rows={3} placeholder="e.g. Worked through lunch, special event..." value={overrideForm.notes} onChange={e => setOverrideForm({ ...overrideForm, notes: e.target.value })} /></div>
        </div>
      </Modal>

      <style jsx>{`
        .btn-primary { background: var(--accent-blue); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .btn-secondary { background: white; color: var(--text-primary); border: 1px solid var(--border-medium); padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-secondary:hover { background: var(--bg-subtle); }
        .card { background: white; border-radius: 16px; border: 1px solid var(--border-light); box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-medium); font-size: 14px; outline: none; }
        .input:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .label { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; display: block; }
        .btn-icon { border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .btn-icon:hover { transform: scale(1.1); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
