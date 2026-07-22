'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/Toast'
import { FileSpreadsheet, FileText, Calendar, Edit, Search, DollarSign } from 'lucide-react'
import * as xlsx from 'xlsx'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function AttendanceReportsPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({ summary: {}, reports: [], daily_logs: [] })
  
  const [activeTab, setActiveTab] = useState('daily') // 'daily' | 'monthly'
  const [searchQuery, setSearchQuery] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)

  // Edit Log Modal State
  const [editingLog, setEditingLog] = useState(null)
  const [editForm, setEditForm] = useState({
    status: 'present',
    check_in_at: '',
    check_out_at: '',
    minutes_late: 0,
    notes: ''
  })
  const [savingLog, setSavingLog] = useState(false)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      router.replace('/')
      return
    }

    fetchReport()
  }, [month, year, router])

  async function fetchReport() {
    try {
      setLoading(true)
      const res = await fetch(`/api/attendance/report?month=${month}&year=${year}`)
      const json = await res.json()
      if (res.ok) {
        setReportData(json)
      } else {
        addToast(json.error || 'Failed to load report', 'error')
      }
    } catch (err) {
      addToast('Error loading report', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleApplyToPayroll() {
    try {
      setApplyLoading(true)
      const res = await fetch('/api/attendance/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_to_payroll',
          month,
          year
        })
      })
      const json = await res.json()
      if (res.ok) {
        addToast(`✅ ${json.message || 'Applied to Payroll successfully!'}`, 'success')
        setTimeout(() => {
          router.push('/staff/payroll')
        }, 1200)
      } else {
        addToast(json.error || 'Failed to apply to payroll', 'error')
      }
    } catch (err) {
      addToast('Failed to sync with payroll', 'error')
    } finally {
      setApplyLoading(false)
    }
  }

  function openEditModal(log) {
    setEditingLog(log)
    setEditForm({
      status: log.status || 'present',
      check_in_at: log.check_in_at ? new Date(log.check_in_at).toISOString().slice(0, 16) : '',
      check_out_at: log.check_out_at ? new Date(log.check_out_at).toISOString().slice(0, 16) : '',
      minutes_late: log.minutes_late || 0,
      notes: log.notes || ''
    })
  }

  async function handleSaveLog() {
    if (!editingLog) return
    try {
      setSavingLog(true)
      const res = await fetch('/api/attendance/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_log',
          log_id: editingLog.id,
          status: editForm.status,
          check_in_at: editForm.check_in_at ? new Date(editForm.check_in_at).toISOString() : null,
          check_out_at: editForm.check_out_at ? new Date(editForm.check_out_at).toISOString() : null,
          minutes_late: editForm.minutes_late,
          notes: editForm.notes
        })
      })
      const json = await res.json()
      if (res.ok) {
        addToast('Daily attendance entry updated!', 'success')
        setEditingLog(null)
        fetchReport()
      } else {
        addToast(json.error || 'Failed to save log', 'error')
      }
    } catch (err) {
      addToast('Error saving log', 'error')
    } finally {
      setSavingLog(false)
    }
  }

  function handleExportCSV() {
    if (!reportData.reports?.length) return

    const rows = reportData.reports.map(r => ({
      'Employee ID': r.employee_id,
      'Staff Name': r.name,
      'Designation': r.designation,
      'Present Days': r.present,
      'Late Days': r.late,
      'Absent Days': r.absent,
      'On Leave': r.on_leave,
      'Off Days': r.off,
      'Total Days Worked': r.total_days_worked,
      'Total Hours Worked': r.total_hours,
      'Total Overtime Hours': r.total_overtime_hours,
      'Total Late Minutes': r.total_late_minutes
    }))

    const worksheet = xlsx.utils.json_to_sheet(rows)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Attendance Report')
    xlsx.writeFile(workbook, `Crown_Coffee_Attendance_${months[month - 1]}_${year}.xlsx`)
    addToast('Excel exported successfully!', 'success')
  }

  async function handleExportPDF() {
    const element = document.getElementById('report-pdf-container')
    if (!element) return

    try {
      addToast('Generating PDF...', 'info')
      const canvas = await html2canvas(element, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Crown_Coffee_Attendance_${months[month - 1]}_${year}.pdf`)
      addToast('PDF downloaded!', 'success')
    } catch (e) {
      addToast('PDF export failed', 'error')
    }
  }

  const filteredLogs = (reportData.daily_logs || []).filter(l =>
    l.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.date_formatted.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredReports = (reportData.reports || []).filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #faf7f2)' }}>
      <Navbar />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px 60px' }}>
        
        {/* Header & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={28} color="#D4933A" /> Monthly Attendance & Overtime Report
            </h1>
            <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '14px' }}>
              Daily log breakdowns, lateness records, overtime hours, and 1-click Payroll integration.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '6px 12px', borderRadius: '12px', border: '1px solid #CBD5E1', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <select
                value={month}
                onChange={e => setMonth(parseInt(e.target.value))}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: '14px', cursor: 'pointer', color: '#0F172A' }}
              >
                {months.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>

              <select
                value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: '14px', cursor: 'pointer', color: '#0F172A' }}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleApplyToPayroll}
              disabled={applyLoading}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#059669',
                border: 'none',
                color: 'white',
                fontWeight: 800,
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '14px',
                cursor: applyLoading ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
              }}
            >
              <DollarSign size={18} />
              {applyLoading ? 'Applying to Payroll...' : 'Apply to Monthly Payroll'}
            </button>

            <button
              onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', fontWeight: 700, padding: '10px 14px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer' }}
            >
              <FileSpreadsheet size={16} /> Excel
            </button>

            <button
              onClick={handleExportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0F172A', border: 'none', color: 'white', fontWeight: 700, padding: '10px 14px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer' }}
            >
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('daily')}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'daily' ? '#0F172A' : '#F1F5F9',
                color: activeTab === 'daily' ? 'white' : '#475569',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              🗓️ Daily Attendance Breakdown ({filteredLogs.length})
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'monthly' ? '#0F172A' : '#F1F5F9',
                color: activeTab === 'monthly' ? 'white' : '#475569',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              📊 Monthly Staff Totals ({filteredReports.length})
            </button>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search staff name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Main PDF Exportable Container */}
        <div id="report-pdf-container" style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '32px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          
          {/* Company Brand Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0F172A', paddingBottom: '16px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0 }}>CROWN COFFEE</h2>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#D4933A', fontWeight: 800 }}>
                Official Monthly Attendance & Overtime Ledger
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{months[month - 1]} {year}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Generated: {new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          {/* Company Summary KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px', background: '#F8FAFC', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Total Staff</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>{reportData.summary?.total_staff || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Total Days Worked</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#16A34A' }}>{reportData.summary?.total_present_days || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Late Occurrences</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#DC2626' }}>{reportData.summary?.total_late_occurrences || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Total Hours Worked</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#2563EB' }}>{reportData.summary?.total_hours_worked || 0} hrs</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Total Overtime</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#D4933A' }}>{reportData.summary?.total_overtime_hours || 0} hrs</div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}><div className="loader"></div></div>
          ) : activeTab === 'daily' ? (
            /* TAB 1: DAILY BREAKDOWN VIEW */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Daily Attendance Log Breakdown (Showing {filteredLogs.length} entries)
                </h3>
              </div>

              {filteredLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                  No daily attendance logs found for {months[month - 1]} {year}.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {filteredLogs.map(log => (
                    <div
                      key={log.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Left: Staff Name & Date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: '#0F172A',
                          color: '#D4933A',
                          fontWeight: 900,
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {log.staff_name.slice(0, 2).toUpperCase()}
                        </div>

                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                            {log.staff_name} <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>({log.employee_id})</span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#475569', fontWeight: 700, marginTop: '2px' }}>
                            📅 Date: <strong style={{ color: '#0F172A' }}>{log.date_formatted}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Timing & Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800 }}>DUTY TIMING</div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                            ⏰ {log.time_range}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 800,
                          background: log.status === 'present' ? '#DCFCE7' : (log.status === 'late' ? '#FEE2E2' : '#F1F5F9'),
                          color: log.status === 'present' ? '#15803D' : (log.status === 'late' ? '#B91C1C' : '#475569'),
                          border: log.status === 'present' ? '1px solid #86EFAC' : (log.status === 'late' ? '1px solid #FCA5A5' : '1px solid #CBD5E1')
                        }}>
                          {log.status === 'present' && '✅ Present'}
                          {log.status === 'late' && `🔴 Late (${log.minutes_late} mins late)`}
                          {log.status === 'absent' && '⚠️ Absent'}
                          {log.status === 'on_leave' && '🏖️ On Leave'}
                          {log.status === 'off' && '🌴 Day Off'}
                        </div>

                        {/* Overtime & Hours Worked */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                            Worked: <strong>{log.hours_worked}h</strong>
                          </div>
                          {log.overtime_hours > 0 ? (
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#D4933A' }}>
                              ⚡ {log.overtime_hours}h Overtime
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>No Overtime</div>
                          )}
                        </div>
                      </div>

                      {/* Right: Edit Button */}
                      <button
                        onClick={() => openEditModal(log)}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#0F172A',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Edit size={14} /> Edit Entry
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: MONTHLY SUMMARY TABLE */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #0F172A', color: '#0F172A', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px' }}>ID</th>
                    <th style={{ padding: '12px' }}>Staff Name</th>
                    <th style={{ padding: '12px' }}>Designation</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Present Days</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Late Days</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Absent Days</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Overtime Hours</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Total Worked Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => (
                    <tr key={r.staff_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A' }}>{r.employee_id}</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A' }}>{r.name}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{r.designation}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#16A34A', fontWeight: 800 }}>{r.present}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#DC2626', fontWeight: 800 }}>{r.late}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#94A3B8', fontWeight: 700 }}>{r.absent}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#D4933A', fontWeight: 800 }}>{r.total_overtime_hours} hrs</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, color: '#0F172A' }}>{r.total_hours} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Modal: Edit Daily Attendance Log */}
        {editingLog && (
          <Modal
            isOpen={!!editingLog}
            onClose={() => setEditingLog(null)}
            title={`Edit Attendance: ${editingLog.staff_name}`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', color: '#334155' }}>
                <div><strong>Staff:</strong> {editingLog.staff_name} ({editingLog.employee_id})</div>
                <div><strong>Date:</strong> {editingLog.date_formatted}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Attendance Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 700 }}
                >
                  <option value="present">✅ Present</option>
                  <option value="late">🔴 Late</option>
                  <option value="absent">⚠️ Absent</option>
                  <option value="on_leave">🏖️ On Leave</option>
                  <option value="off">🌴 Day Off</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Check-In Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.check_in_at}
                    onChange={e => setEditForm({ ...editForm, check_in_at: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Check-Out Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.check_out_at}
                    onChange={e => setEditForm({ ...editForm, check_out_at: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Minutes Late (if applicable)</label>
                <input
                  type="number"
                  value={editForm.minutes_late}
                  onChange={e => setEditForm({ ...editForm, minutes_late: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Admin Notes / Reason</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes for manual adjustment..."
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => setEditingLog(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F1F5F9', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLog}
                  disabled={savingLog}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#0F172A', color: 'white', fontWeight: 800 }}
                >
                  {savingLog ? 'Saving Changes...' : 'Save Log Entry'}
                </button>
              </div>
            </div>
          </Modal>
        )}

      </main>
    </div>
  )
}
