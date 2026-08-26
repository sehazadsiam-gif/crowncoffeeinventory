'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/Toast'
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  Edit,
  Search,
  DollarSign,
  Clock,
  CheckCircle2,
  BarChart3,
  ListFilter,
  Users,
  Sparkles,
  Bot,
  Send,
  Zap,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle
} from 'lucide-react'
import * as xlsx from 'xlsx'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function AttendanceReportsPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const todayStr = new Date().toISOString().split('T')[0]
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({ summary: {}, reports: [], daily_logs: [], staff: [] })

  const [activeTab, setActiveTab] = useState('daily') // 'daily' | 'monthly' | 'heatmap' | 'ai_agent'
  const [searchQuery, setSearchQuery] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)

  // Date Filters
  const [selectedSingleDate, setSelectedSingleDate] = useState(todayStr)
  const [dateFrom, setDateFrom] = useState(todayStr)
  const [dateTo, setDateTo] = useState(todayStr)
  const [filterMode, setFilterMode] = useState('single') // 'single' | 'range' | 'month'

  // AI Agent States
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnswer, setAiAnswer] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [anomaliesLoading, setAnomaliesLoading] = useState(false)

  // Edit / Add Log Modal State
  const [editingLog, setEditingLog] = useState(null)
  const [editForm, setEditForm] = useState({
    staff_id: '',
    date: todayStr,
    status: 'present',
    check_in_at: '',
    check_out_at: '',
    break_start_at: '',
    break_end_at: '',
    minutes_late: 0,
    hours_worked: '',
    overtime_hours: '',
    notes: ''
  })
  const [savingLog, setSavingLog] = useState(false)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    fetchAnomalies()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      router.replace('/')
      return
    }
    if (filterMode === 'single') {
      fetchReport(selectedSingleDate, selectedSingleDate)
    } else if (filterMode === 'range') {
      fetchReport(dateFrom, dateTo)
    } else {
      fetchReport()
    }
  }, [month, year, filterMode, selectedSingleDate, router])

  async function fetchReport(customFrom, customTo) {
    try {
      setLoading(true)
      let url
      if (customFrom && customTo) {
        url = `/api/attendance/report?from=${customFrom}&to=${customTo}`
      } else if (filterMode === 'single' && selectedSingleDate) {
        url = `/api/attendance/report?from=${selectedSingleDate}&to=${selectedSingleDate}`
      } else {
        url = `/api/attendance/report?month=${month}&year=${year}`
      }
      const res = await fetch(url)
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

  // Quick Date Navigation
  function handlePrevDay() {
    const d = new Date(selectedSingleDate)
    d.setDate(d.getDate() - 1)
    const prevStr = d.toISOString().split('T')[0]
    setSelectedSingleDate(prevStr)
    fetchReport(prevStr, prevStr)
  }

  function handleNextDay() {
    const d = new Date(selectedSingleDate)
    d.setDate(d.getDate() + 1)
    const nextStr = d.toISOString().split('T')[0]
    setSelectedSingleDate(nextStr)
    fetchReport(nextStr, nextStr)
  }

  function handleGoToday() {
    setSelectedSingleDate(todayStr)
    fetchReport(todayStr, todayStr)
  }

  function handlePrevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear(y => y - 1)
    } else {
      setMonth(m => m - 1)
    }
  }

  function handleNextMonth() {
    if (month === 12) {
      setMonth(1)
      setYear(y => y + 1)
    } else {
      setMonth(m => m + 1)
    }
  }

  function handleApplyDateRange() {
    if (!dateFrom || !dateTo) { addToast('Please select both dates', 'error'); return }
    if (dateFrom > dateTo) { addToast('From date must be before To date', 'error'); return }
    setFilterMode('range')
    fetchReport(dateFrom, dateTo)
  }

  async function handleBulkDayOff() {
    const targetDate = filterMode === 'single' ? selectedSingleDate : todayStr
    const dateInput = prompt('Enter date to mark ALL staff as Day Off (YYYY-MM-DD):', targetDate)
    if (!dateInput) return
    try {
      setLoading(true)
      const res = await fetch('/api/attendance/bulk-dayoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateInput, notes: 'Cafe Closed / Holiday' })
      })
      const json = await res.json()
      if (res.ok) {
        addToast(json.message || 'Marked all staff as Day Off', 'success')
        fetchReport()
      } else {
        addToast(json.error || 'Failed bulk day-off', 'error')
      }
    } catch (e) {
      addToast('Bulk day-off error', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleApplyToPayroll() {
    if (!confirm(`Apply attendance data for ${months[month - 1]} ${year} directly to Monthly Payroll?`)) return
    try {
      setApplyLoading(true)
      const res = await fetch('/api/attendance/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_to_payroll', month, year })
      })
      const json = await res.json()
      if (res.ok) {
        addToast(json.message || 'Applied to Payroll successfully!', 'success')
      } else {
        addToast(json.error || 'Failed to apply to payroll', 'error')
      }
    } catch (err) {
      addToast('Failed to sync with payroll', 'error')
    } finally {
      setApplyLoading(false)
    }
  }

  function toLocalDatetimeInput(isoStr) {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return ''
    const tzOffset = d.getTimezoneOffset() * 60000
    return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16)
  }

  function openEditModal(log) {
    setEditingLog(log)
    setEditForm({
      staff_id: log.staff_id || '',
      date: log.date || selectedSingleDate || todayStr,
      status: log.status || 'present',
      check_in_at: toLocalDatetimeInput(log.check_in_at),
      check_out_at: toLocalDatetimeInput(log.check_out_at),
      break_start_at: toLocalDatetimeInput(log.break_start_at),
      break_end_at: toLocalDatetimeInput(log.break_end_at),
      minutes_late: log.minutes_late || 0,
      hours_worked: log.hours_worked !== undefined && log.hours_worked !== null ? log.hours_worked : '',
      overtime_hours: log.overtime_hours !== undefined && log.overtime_hours !== null ? log.overtime_hours : '',
      notes: log.notes || ''
    })
  }

  function openNewLogModal() {
    const staffList = reportData.staff || reportData.reports || []
    const defaultStaffId = staffList[0]?.id || staffList[0]?.staff_id || ''
    const targetDate = filterMode === 'single' ? selectedSingleDate : todayStr
    setEditingLog({ isNew: true, date: targetDate })
    setEditForm({
      staff_id: defaultStaffId,
      date: targetDate,
      status: 'present',
      check_in_at: `${targetDate}T11:00`,
      check_out_at: `${targetDate}T21:00`,
      break_start_at: '',
      break_end_at: '',
      minutes_late: 0,
      hours_worked: 10,
      overtime_hours: 0,
      notes: 'Manual Entry'
    })
  }

  function applyQuickPreset(preset) {
    const d = editForm.date || selectedSingleDate || todayStr
    if (preset === '11am_shift') {
      setEditForm(prev => ({ ...prev, status: 'present', check_in_at: `${d}T11:00`, check_out_at: `${d}T21:00`, hours_worked: 10, overtime_hours: 0, minutes_late: 0 }))
    } else if (preset === '1pm_shift') {
      setEditForm(prev => ({ ...prev, status: 'present', check_in_at: `${d}T13:00`, check_out_at: `${d}T23:00`, hours_worked: 10, overtime_hours: 0, minutes_late: 0 }))
    } else if (preset === 'day_off') {
      setEditForm(prev => ({ ...prev, status: 'off', check_in_at: '', check_out_at: '', hours_worked: 0, overtime_hours: 0, minutes_late: 0, notes: 'Day Off' }))
    } else if (preset === 'absent') {
      setEditForm(prev => ({ ...prev, status: 'absent', check_in_at: '', check_out_at: '', hours_worked: 0, overtime_hours: 0, minutes_late: 0, notes: 'Absent' }))
    }
  }

  async function handleSaveLog() {
    if (!editingLog) return
    if (editingLog.isNew && !editForm.staff_id) { addToast('Please select a staff member', 'error'); return }
    try {
      setSavingLog(true)
      const res = await fetch('/api/attendance/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_log',
          log_id: editingLog.id,
          staff_id: editForm.staff_id || editingLog.staff_id,
          date: editForm.date || editingLog.date,
          status: editForm.status,
          check_in_at: editForm.check_in_at ? new Date(editForm.check_in_at).toISOString() : null,
          check_out_at: editForm.check_out_at ? new Date(editForm.check_out_at).toISOString() : null,
          break_start_at: editForm.break_start_at ? new Date(editForm.break_start_at).toISOString() : null,
          break_end_at: editForm.break_end_at ? new Date(editForm.break_end_at).toISOString() : null,
          minutes_late: editForm.minutes_late,
          hours_worked: editForm.hours_worked !== '' ? editForm.hours_worked : undefined,
          overtime_hours: editForm.overtime_hours !== '' ? editForm.overtime_hours : undefined,
          notes: editForm.notes
        })
      })
      const json = await res.json()
      if (res.ok) {
        addToast(json.message || 'Attendance entry saved!', 'success')
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

  async function handleDeleteLog(log) {
    const logObj = typeof log === 'object' ? log : (editingLog?.id === log ? editingLog : { id: log })
    if (!logObj?.id && !logObj?.staff_id) return
    if (!confirm(`Are you sure you want to delete or clear attendance for ${logObj.staff_name || 'this staff'} on ${logObj.date}?`)) return
    try {
      setSavingLog(true)
      const res = await fetch('/api/attendance/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_log', log_id: logObj.id, staff_id: logObj.staff_id, date: logObj.date })
      })
      const json = await res.json()
      if (res.ok) {
        addToast('Attendance record removed successfully!', 'success')
        setEditingLog(null)
        fetchReport()
      } else {
        addToast(json.error || 'Failed to delete record', 'error')
      }
    } catch (err) {
      addToast('Error deleting record', 'error')
    } finally {
      setSavingLog(false)
    }
  }

  function handleExportCSV() {
    if (activeTab === 'daily' && filteredLogs?.length) {
      const rows = filteredLogs.map(log => ({
        'Staff Name': log.staff_name,
        'Employee ID': log.employee_id,
        'Designation': log.designation || 'Staff',
        'Date': log.date_formatted,
        'Status': log.status?.toUpperCase(),
        'Check In': log.check_in_formatted,
        'Break': log.break_formatted || '--',
        'Check Out': log.check_out_formatted,
        'Hours Worked': `${log.hours_worked || 0} hrs`,
        'Overtime': `${log.overtime_hours || 0} hrs`,
        'Late Duration': log.minutes_late > 0 ? `${(log.minutes_late / 60).toFixed(2)} hrs` : '0'
      }))
      const worksheet = xlsx.utils.json_to_sheet(rows)
      const workbook = xlsx.utils.book_new()
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Daily Logs')
      xlsx.writeFile(workbook, `Crown_Coffee_Daily_Logs_${months[month - 1]}_${year}.xlsx`)
      addToast('Daily Logs Excel exported successfully!', 'success')
      return
    }

    if (!reportData.reports?.length) return

    const rows = reportData.reports.map(r => ({
      'Staff Name': r.name,
      'Employee ID': r.employee_id,
      'Designation': r.designation,
      'Month / Year': `${months[month - 1]} ${year}`,
      'Present Days': r.present || 0,
      'Late Days': r.late || 0,
      'Absent Days': r.absent || 0,
      'Total Worked Hours': `${r.total_hours || 0} hrs`,
      'Overtime Hours': `${r.total_overtime_hours || 0} hrs`
    }))

    const worksheet = xlsx.utils.json_to_sheet(rows)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary')
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
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Crown_Coffee_Attendance_${months[month - 1]}_${year}.pdf`)
      addToast('PDF downloaded!', 'success')
    } catch (e) {
      addToast('PDF export failed', 'error')
    }
  }

  async function handleAskAI(q) {
    const queryToUse = (typeof q === 'string' ? q : aiQuestion).trim()
    if (!queryToUse) return
    try {
      setAiLoading(true)
      setAiAnswer(null)
      const res = await fetch('/api/attendance/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryToUse })
      })
      const json = await res.json()
      if (res.ok && json.answer) {
        setAiAnswer(json.answer)
      } else {
        addToast(json.error || 'AI query failed', 'error')
      }
    } catch (err) {
      addToast('Network error querying AI agent', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleScanAnomalies() {
    try {
      setAnomaliesLoading(true)
      const res = await fetch('/api/attendance/agent/anomalies', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        addToast('AI Anomaly & Pattern Scan completed!', 'success')
        fetchAnomalies()
      } else {
        addToast(json.error || 'Anomaly scan failed', 'error')
      }
    } catch (err) {
      addToast('Error running AI anomaly scan', 'error')
    } finally {
      setAnomaliesLoading(false)
    }
  }

  async function fetchAnomalies() {
    try {
      const res = await fetch('/api/attendance/agent/anomalies')
      const json = await res.json()
      if (res.ok) {
        setAnomalies(json.anomalies || [])
      }
    } catch (err) {}
  }

  async function handleDismissAnomaly(id) {
    try {
      const res = await fetch('/api/attendance/agent/anomalies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        setAnomalies(prev => prev.filter(a => a.id !== id))
        addToast('Anomaly dismissed', 'info')
      }
    } catch (err) {}
  }

  const filteredLogs = useMemo(() => {
    return (reportData.daily_logs || []).filter(l =>
      l.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.date_formatted?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [reportData.daily_logs, searchQuery])

  const filteredReports = useMemo(() => {
    return (reportData.reports || []).filter(r =>
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [reportData.reports, searchQuery])

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans)', color: '#0F172A' }}>
      <Navbar />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* TOP HERO & PRIMARY ACTIONS */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <Calendar size={22} color="#D97706" />
              </div>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  Attendance & Overtime Ledger
                </h1>
                <p style={{ color: '#64748B', margin: '2px 0 0 0', fontSize: '13px' }}>
                  Review staff hours, modify daily attendance logs, view heatmaps, and sync to Payroll.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={openNewLogModal}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#0F172A', color: 'white', fontWeight: 800,
                padding: '9px 16px', borderRadius: '10px', fontSize: '13px',
                border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(15,23,42,0.2)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={16} /> Add Attendance
            </button>

            <button
              onClick={handleApplyToPayroll}
              disabled={applyLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#059669', color: 'white', fontWeight: 800,
                padding: '9px 16px', borderRadius: '10px', fontSize: '13px',
                border: 'none', cursor: applyLoading ? 'wait' : 'pointer',
                boxShadow: '0 2px 8px rgba(5,150,105,0.2)',
                transition: 'all 0.15s ease'
              }}
            >
              <DollarSign size={16} />
              {applyLoading ? 'Syncing...' : 'Sync with Payroll'}
            </button>

            <button
              onClick={handleBulkDayOff}
              title="Mark all staff as off for holidays"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#FEF3C7', border: '1px solid #FCD34D',
                color: '#92400E', fontWeight: 800, padding: '9px 14px',
                borderRadius: '10px', fontSize: '13px', cursor: 'pointer'
              }}
            >
              <Calendar size={15} /> Day Off
            </button>

            <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '3px', borderRadius: '10px' }}>
              <button
                onClick={handleExportCSV}
                title="Export Excel Worksheet"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'white', border: '1px solid #CBD5E1',
                  color: '#334155', fontWeight: 700, padding: '7px 12px',
                  borderRadius: '7px', fontSize: '12px', cursor: 'pointer'
                }}
              >
                <FileSpreadsheet size={14} color="#16A34A" /> Excel
              </button>

              <button
                onClick={handleExportPDF}
                title="Export PDF Document"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'white', border: '1px solid #CBD5E1',
                  color: '#334155', fontWeight: 700, padding: '7px 12px',
                  borderRadius: '7px', fontSize: '12px', cursor: 'pointer'
                }}
              >
                <FileText size={14} color="#DC2626" /> PDF
              </button>
            </div>
          </div>
        </div>

        {/* KPI SUMMARY CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Active Staff</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A' }}>{reportData.summary?.total_staff || 0}</div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Present Days</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#16A34A' }}>{reportData.summary?.total_present_days || 0}</div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Late Count</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#DC2626' }}>
                {reportData.summary?.total_late_occurrences || 0}
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginLeft: '6px' }}>({reportData.summary?.total_late_hours || 0} hrs)</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Worked Hours</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A' }}>{reportData.summary?.total_hours_worked || 0} <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>hrs</span></div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Overtime</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#D97706' }}>{reportData.summary?.total_overtime_hours || 0} <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>hrs</span></div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS & FILTER BAR */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {/* Row 1: View Tab Switcher & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            
            {/* Tab Pills */}
            <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '12px' }}>
              <button
                onClick={() => setActiveTab('daily')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '9px', border: 'none',
                  background: activeTab === 'daily' ? '#0F172A' : 'transparent',
                  color: activeTab === 'daily' ? 'white' : '#64748B',
                  fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                <ListFilter size={15} /> Daily Logs ({filteredLogs.length})
              </button>

              <button
                onClick={() => setActiveTab('monthly')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '9px', border: 'none',
                  background: activeTab === 'monthly' ? '#0F172A' : 'transparent',
                  color: activeTab === 'monthly' ? 'white' : '#64748B',
                  fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                <BarChart3 size={15} /> Staff Summary ({filteredReports.length})
              </button>

              <button
                onClick={() => setActiveTab('heatmap')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '9px', border: 'none',
                  background: activeTab === 'heatmap' ? '#0F172A' : 'transparent',
                  color: activeTab === 'heatmap' ? 'white' : '#64748B',
                  fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                <Calendar size={15} /> Heatmap
              </button>

              <button
                onClick={() => setActiveTab('ai_agent')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '9px', border: 'none',
                  background: activeTab === 'ai_agent' ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' : 'transparent',
                  color: activeTab === 'ai_agent' ? 'white' : '#7C3AED',
                  fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease',
                  boxShadow: activeTab === 'ai_agent' ? '0 3px 10px rgba(124,58,237,0.25)' : 'none'
                }}
              >
                <Sparkles size={15} color={activeTab === 'ai_agent' ? 'white' : '#7C3AED'} /> AI Intelligence
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search staff name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 32px 8px 34px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#F8FAFC'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Date Controls & Sub-Filter Bar */}
          <div style={{
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '3px', background: '#F8FAFC', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <button
                  onClick={() => {
                    setFilterMode('single')
                    fetchReport(selectedSingleDate, selectedSingleDate)
                  }}
                  style={{
                    border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                    background: filterMode === 'single' ? '#0F172A' : 'transparent',
                    color: filterMode === 'single' ? 'white' : '#64748B'
                  }}
                >
                  📅 Single Day
                </button>

                <button
                  onClick={() => setFilterMode('range')}
                  style={{
                    border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                    background: filterMode === 'range' ? '#0F172A' : 'transparent',
                    color: filterMode === 'range' ? 'white' : '#64748B'
                  }}
                >
                  📆 Date Range
                </button>

                <button
                  onClick={() => {
                    setFilterMode('month')
                    fetchReport()
                  }}
                  style={{
                    border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                    background: filterMode === 'month' ? '#0F172A' : 'transparent',
                    color: filterMode === 'month' ? 'white' : '#64748B'
                  }}
                >
                  🗓️ Full Month
                </button>
              </div>

              {/* Mode Specific Quick Date Navigation */}
              {filterMode === 'single' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={handlePrevDay}
                    title="Previous Day"
                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', display: 'flex', color: '#334155' }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <input
                    type="date"
                    value={selectedSingleDate}
                    onChange={e => {
                      setSelectedSingleDate(e.target.value)
                      fetchReport(e.target.value, e.target.value)
                    }}
                    style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '5px 10px', fontSize: '13px', fontWeight: 700, color: '#0F172A', outline: 'none', background: 'white' }}
                  />

                  <button
                    onClick={handleNextDay}
                    title="Next Day"
                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', display: 'flex', color: '#334155' }}
                  >
                    <ChevronRight size={16} />
                  </button>

                  <button
                    onClick={handleGoToday}
                    style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Today
                  </button>
                </div>
              )}

              {filterMode === 'range' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '5px 10px', fontSize: '13px', fontWeight: 700, color: '#0F172A', outline: 'none', background: 'white' }}
                  />
                  <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700 }}>to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '5px 10px', fontSize: '13px', fontWeight: 700, color: '#0F172A', outline: 'none', background: 'white' }}
                  />
                  <button
                    onClick={handleApplyDateRange}
                    style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Filter Range
                  </button>
                </div>
              )}

              {filterMode === 'month' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={handlePrevMonth}
                    title="Previous Month"
                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', display: 'flex', color: '#334155' }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <select
                    value={month}
                    onChange={e => setMonth(parseInt(e.target.value))}
                    style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '5px 10px', fontSize: '13px', fontWeight: 800, color: '#0F172A', background: 'white' }}
                  >
                    {months.map((m, idx) => (
                      <option key={idx} value={idx + 1}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={year}
                    onChange={e => setYear(parseInt(e.target.value))}
                    style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '5px 10px', fontSize: '13px', fontWeight: 800, color: '#0F172A', background: 'white' }}
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleNextMonth}
                    title="Next Month"
                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', display: 'flex', color: '#334155' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, background: '#F8FAFC', padding: '5px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              {filterMode === 'single'
                ? `📅 Date: ${selectedSingleDate}`
                : filterMode === 'range'
                ? `📆 Range: ${dateFrom} to ${dateTo}`
                : `🗓️ Month: ${months[month - 1]} ${year}`}
            </div>
          </div>
        </div>

        {/* MAIN VIEW CONTENT CONTAINER */}
        <div id="report-pdf-container" style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: '#0F172A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 700, color: '#64748B' }}>Loading attendance records...</div>
            </div>
          ) : activeTab === 'daily' ? (

            /* TAB 1: DAILY LOGS BREAKDOWN */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                    Daily Attendance Logs
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    Showing {filteredLogs.length} entries for current date filter
                  </p>
                </div>

                <button
                  onClick={openNewLogModal}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: '#EFF6FF', border: '1px solid #BFDBFE',
                    color: '#1D4ED8', fontWeight: 800, padding: '7px 14px',
                    borderRadius: '8px', fontSize: '12px', cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> Add Record
                </button>
              </div>

              {filteredLogs.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                  <Calendar size={32} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#334155', marginBottom: '4px' }}>No Attendance Logs Found</div>
                  <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '400px', margin: '0 auto 16px' }}>
                    No check-in or shift entries recorded for this selection. You can manually record attendance now.
                  </p>
                  <button
                    onClick={openNewLogModal}
                    style={{ background: '#0F172A', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                  >
                    + Add New Entry
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#F8FAFC' }}>
                        <th style={{ padding: '12px 14px' }}>Staff Member</th>
                        <th style={{ padding: '12px 14px' }}>Date</th>
                        <th style={{ padding: '12px 14px' }}>Status</th>
                        <th style={{ padding: '12px 14px' }}>Check In</th>
                        <th style={{ padding: '12px 14px' }}>Break</th>
                        <th style={{ padding: '12px 14px' }}>Check Out</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>Hours Worked</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>Overtime</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(log => {
                        const isLate = log.status === 'late' || (log.minutes_late && log.minutes_late > 0)
                        const isOff = log.status === 'off'
                        const isAbsent = log.status === 'absent'
                        const isLeave = log.status === 'on_leave'

                        let statusBadge = { bg: '#DCFCE7', color: '#15803D', text: '🟢 Present', border: '#86EFAC' }
                        if (isLate) statusBadge = { bg: '#FEF3C7', color: '#B45309', text: `🟡 Late (${log.minutes_late || 0}m)`, border: '#FDE68A' }
                        else if (isAbsent) statusBadge = { bg: '#FEE2E2', color: '#B91C1C', text: '🔴 Absent', border: '#FCA5A5' }
                        else if (isOff) statusBadge = { bg: '#F1F5F9', color: '#475569', text: '⚪ Day Off', border: '#CBD5E1' }
                        else if (isLeave) statusBadge = { bg: '#DBEAFE', color: '#1E40AF', text: '🔵 On Leave', border: '#93C5FD' }

                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.1s' }} className="hover:bg-slate-50">
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '32px', height: '32px', borderRadius: '8px',
                                  background: '#EEF2FF', color: '#4338CA', fontWeight: 900,
                                  fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                  {(log.staff_name || 'S').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>{log.staff_name}</div>
                                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                                    {log.employee_id}{log.designation ? ` • ${log.designation}` : ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                              {log.date_formatted}
                            </td>
                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center',
                                background: statusBadge.bg, color: statusBadge.color,
                                border: `1px solid ${statusBadge.border}`,
                                padding: '3px 9px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 800
                              }}>
                                {statusBadge.text}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '12.5px' }}>
                              {log.check_in_formatted || '--'}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#D97706', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '12.5px' }}>
                              {log.break_formatted || '--'}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2563EB', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '12.5px' }}>
                              {log.check_out_formatted || '--'}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span style={{ fontWeight: 900, color: '#0F172A', fontSize: '13px' }}>
                                {log.hours_worked !== undefined && log.hours_worked !== null ? `${log.hours_worked} hrs` : '--'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span style={{
                                fontWeight: 800,
                                color: log.overtime_hours > 0 ? '#D97706' : '#94A3B8',
                                background: log.overtime_hours > 0 ? '#FFFBEB' : '#F8FAFC',
                                border: log.overtime_hours > 0 ? '1px solid #FCD34D' : '1px solid #E2E8F0',
                                padding: '3px 8px',
                                borderRadius: '8px',
                                fontSize: '11.5px'
                              }}>
                                {log.overtime_hours > 0 ? `+${log.overtime_hours}h` : '0h'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => openEditModal(log)}
                                  style={{
                                    background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '7px',
                                    padding: '5px 10px', fontSize: '11.5px', fontWeight: 800, color: '#0F172A',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                >
                                  <Edit size={13} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteLog(log)}
                                  style={{
                                    background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '7px',
                                    padding: '5px 10px', fontSize: '11.5px', fontWeight: 800, color: '#DC2626',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'monthly' ? (

            /* TAB 2: STAFF MONTHLY SUMMARY TABLE */
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                  Staff Monthly Attendance Summary ({months[month - 1]} {year})
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  Overall aggregated punctuality score, total days worked, and overtime hours per staff member.
                </p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#F8FAFC' }}>
                      <th style={{ padding: '12px 14px' }}>Staff Member</th>
                      <th style={{ padding: '12px 14px' }}>Designation</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Present</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Late</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Absent</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Punctuality</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Overtime</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Hours</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map(r => {
                      const totalDuty = (r.present || 0) + (r.late || 0) + (r.absent || 0)
                      const score = totalDuty > 0 ? Math.round(((r.present || 0) / totalDuty) * 100) : 100
                      const scoreColor = score >= 90 ? '#16A34A' : score >= 75 ? '#D97706' : '#DC2626'

                      return (
                        <tr key={r.staff_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>{r.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>ID: {r.employee_id}</div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748B', fontWeight: 600 }}>{r.designation}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#16A34A', fontWeight: 800 }}>{r.present}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#DC2626', fontWeight: 800 }}>{r.late}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#94A3B8', fontWeight: 700 }}>{r.absent}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 900, color: scoreColor, background: `${scoreColor}15`, padding: '3px 9px', borderRadius: '8px', fontSize: '12px' }}>
                              {score}%
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#D97706', fontWeight: 800 }}>{r.total_overtime_hours} hrs</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, color: '#0F172A' }}>{r.total_hours} hrs</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setSearchQuery(r.name)
                                setActiveTab('daily')
                              }}
                              style={{
                                background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px',
                                padding: '4px 10px', fontSize: '11.5px', fontWeight: 700, color: '#334155', cursor: 'pointer'
                              }}
                            >
                              View Logs
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'heatmap' ? (

            /* TAB 3: VISUAL HEATMAP CALENDAR */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                    Attendance Heatmap ({months[month - 1]} {year})
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    Click on any day cell to view, edit, or add attendance for that staff member.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px', fontWeight: 700, background: '#F8FAFC', padding: '6px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#16A34A' }} /> Present</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#D97706' }} /> Late</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#DC2626' }} /> Absent</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#CBD5E1' }} /> Off</span>
                </div>
              </div>

              {filteredReports.map(staff => {
                const daysInMonth = new Date(year, month, 0).getDate()
                const staffLogs = (reportData.daily_logs || []).filter(l => l.staff_id === staff.staff_id)
                const logMap = {}
                staffLogs.forEach(l => { logMap[l.date] = l })

                return (
                  <div key={staff.staff_id} style={{ background: '#F8FAFC', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                        {staff.name} <span style={{ color: '#64748B', fontWeight: 600, fontSize: '12px' }}>({staff.employee_id})</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', gap: '6px' }}>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const dayNum = i + 1
                        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                        const log = logMap[dateKey]
                        let bg = '#E2E8F0'
                        let title = `${dayNum} ${months[month-1]}: No record`

                        if (log) {
                          if (log.status === 'present') bg = '#16A34A'
                          else if (log.status === 'late') bg = '#D97706'
                          else if (log.status === 'absent') bg = '#DC2626'
                          else bg = '#94A3B8'
                          title = `${dayNum} ${months[month-1]}: ${log.status.toUpperCase()} (${log.time_range})`
                        }

                        return (
                          <div
                            key={dayNum}
                            title={title}
                            onClick={() => {
                              if (log) {
                                openEditModal(log)
                              } else {
                                setEditingLog({ isNew: true, staff_name: staff.name, employee_id: staff.employee_id, date: dateKey })
                                setEditForm({
                                  staff_id: staff.staff_id,
                                  date: dateKey,
                                  status: 'present',
                                  check_in_at: `${dateKey}T11:00`,
                                  check_out_at: `${dateKey}T21:00`,
                                  break_start_at: '',
                                  break_end_at: '',
                                  minutes_late: 0,
                                  hours_worked: 10,
                                  overtime_hours: 0,
                                  notes: 'Manual Entry'
                                })
                              }
                            }}
                            style={{
                              aspectRatio: '1/1',
                              borderRadius: '6px',
                              background: bg,
                              color: log ? 'white' : '#64748B',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              border: log ? 'none' : '1px dashed #CBD5E1'
                            }}
                          >
                            {dayNum}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : activeTab === 'ai_agent' ? (

            /* TAB 4: AI INTELLIGENCE AGENT */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)',
                borderRadius: '16px',
                padding: '24px 28px',
                color: 'white',
                boxShadow: '0 4px 16px rgba(76,29,149,0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '11px' }}>
                      <Sparkles size={14} color="#A78BFA" /> GEMINI AI AGENT
                    </div>
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: 'white' }}>
                    AI Attendance Intelligence Assistant
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#DDD6FE', maxWidth: '600px' }}>
                    Ask questions about punctuality, repeated lateness, overtime risks, or run anomaly scans.
                  </p>
                </div>

                <button
                  onClick={handleScanAnomalies}
                  disabled={anomaliesLoading}
                  style={{
                    background: 'white',
                    color: '#4C1D95',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: 900,
                    fontSize: '13px',
                    cursor: anomaliesLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  <Zap size={16} color="#7C3AED" /> {anomaliesLoading ? 'Scanning...' : 'Run Anomaly Scan'}
                </button>
              </div>

              {/* Natural Language Query Assistant */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={18} color="#7C3AED" /> Ask AI Attendance Assistant
                </h3>

                {/* Preset Chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {[
                    "Who was late more than 2 times this month?",
                    "Summarize top overtime hours for all staff",
                    "Which staff member has the lowest punctuality score?"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setAiQuestion(preset); handleAskAI(preset) }}
                      style={{
                        background: 'white',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Question Input */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Type your attendance query..."
                    value={aiQuestion}
                    onChange={e => setAiQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAskAI()}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', background: 'white' }}
                  />
                  <button
                    onClick={() => handleAskAI()}
                    disabled={aiLoading || !aiQuestion.trim()}
                    style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: aiLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Send size={15} /> {aiLoading ? 'Thinking...' : 'Ask AI'}
                  </button>
                </div>

                {aiAnswer && (
                  <div style={{ marginTop: '16px', background: 'white', border: '1px solid #C7D2FE', borderRadius: '12px', padding: '16px', fontSize: '13.5px', color: '#1E1B4B', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: 800, color: '#4F46E5', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} /> AI Analysis
                    </div>
                    <div style={{ whiteSpace: 'pre-line' }}>{aiAnswer}</div>
                  </div>
                )}
              </div>

              {/* Anomalies List */}
              {anomalies.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                    Detected Anomalies & Alerts ({anomalies.length})
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {anomalies.map(item => (
                      <div key={item.id} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#92400E' }}>
                            {item.detail?.staff_name || item.staff?.name || 'Staff Member'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#B45309', marginTop: '3px' }}>
                            {item.type === 'repeated_lateness' && `Late ${item.detail?.late_count} times in 30 days`}
                            {item.type === 'overtime_risk' && `High Overtime: ${item.detail?.hours_worked} total hours`}
                            {item.type === 'high_absence' && `High Absence: ${item.detail?.absent_count} absent days`}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDismissAnomaly(item.id)}
                          style={{ background: 'white', border: '1px solid #FCD34D', color: '#92400E', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* MODAL: ADD / EDIT ATTENDANCE RECORD */}
        {editingLog && (
          <Modal
            isOpen={!!editingLog}
            onClose={() => setEditingLog(null)}
            title={editingLog.isNew ? '➕ Record New Attendance' : `✏️ Edit Attendance: ${editingLog.staff_name || 'Staff'}`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '80vh', overflowY: 'auto', paddingRight: '4px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: '#0F172A' }}>Staff Member</label>
                  {editingLog.isNew ? (
                    <select
                      value={editForm.staff_id}
                      onChange={e => setEditForm({ ...editForm, staff_id: e.target.value })}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', fontWeight: 700, background: 'white' }}
                    >
                      {(reportData.staff || reportData.reports || []).map(s => (
                        <option key={s.id || s.staff_id} value={s.id || s.staff_id}>
                          {s.name} ({s.employee_id || 'Staff'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', paddingTop: '4px' }}>
                      {editingLog.staff_name || 'Staff Member'}
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>ID: {editingLog.employee_id}</div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: '#0F172A' }}>Attendance Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', fontWeight: 700, background: 'white' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', color: '#64748B' }}>
                  ⚡ Quick Shift Fill
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => applyQuickPreset('11am_shift')}
                    style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #FDE68A', background: '#FFFBEB', color: '#B45309', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                  >
                    ☀️ 11:00 AM – 9:00 PM (10h)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPreset('1pm_shift')}
                    style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#4338CA', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                  >
                    🌙 1:00 PM – 11:00 PM (10h)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPreset('day_off')}
                    style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                  >
                    🏖️ Day Off (0h)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPreset('absent')}
                    style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                  >
                    ❌ Absent
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Attendance Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px', fontWeight: 700 }}
                >
                  <option value="present">🟢 Present</option>
                  <option value="late">🟡 Late</option>
                  <option value="absent">🔴 Absent</option>
                  <option value="on_leave">🔵 On Leave</option>
                  <option value="off">⚪ Day Off</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Check-In Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.check_in_at}
                    onChange={e => setEditForm({ ...editForm, check_in_at: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Check-Out Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.check_out_at}
                    onChange={e => setEditForm({ ...editForm, check_out_at: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Worked Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 10.0"
                    value={editForm.hours_worked}
                    onChange={e => setEditForm({ ...editForm, hours_worked: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Overtime (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1.0"
                    value={editForm.overtime_hours}
                    onChange={e => setEditForm({ ...editForm, overtime_hours: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Minutes Late</label>
                  <input
                    type="number"
                    value={editForm.minutes_late}
                    onChange={e => setEditForm({ ...editForm, minutes_late: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Break Start</label>
                  <input
                    type="datetime-local"
                    value={editForm.break_start_at || ''}
                    onChange={e => setEditForm({ ...editForm, break_start_at: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Break End</label>
                  <input
                    type="datetime-local"
                    value={editForm.break_end_at || ''}
                    onChange={e => setEditForm({ ...editForm, break_end_at: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Remarks / Notes</label>
                <textarea
                  value={editForm.notes}
                  placeholder="e.g. Adjusted check-in time, verified shift..."
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', height: '60px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                {!editingLog.isNew ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteLog(editingLog)}
                    disabled={savingLog}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingLog(null)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLog}
                    disabled={savingLog}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0F172A', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}
                  >
                    {savingLog ? 'Saving...' : (editingLog.isNew ? 'Save Attendance' : 'Update Record')}
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

      </main>
    </div>
  )
}
