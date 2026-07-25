'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/Toast'
import { FileSpreadsheet, FileText, Calendar, Edit, Search, DollarSign, Clock, CheckCircle2, AlertCircle, BarChart3, ListFilter, Users, ArrowRight, Sparkles, Bot, Send, Zap, ShieldAlert, Check, Trash2 } from 'lucide-react'
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

  const [activeTab, setActiveTab] = useState('daily') // 'daily' | 'monthly' | 'heatmap' | 'ai_agent'
  const [searchQuery, setSearchQuery] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)

  // AI Agent States
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnswer, setAiAnswer] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [anomaliesLoading, setAnomaliesLoading] = useState(false)

  useEffect(() => {
    fetchAnomalies()
  }, [])

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

  // Date range filter (for Daily Breakdown tab)
  const todayStr = new Date().toISOString().split('T')[0]
  const firstOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(todayStr)
  const [useCustomRange, setUseCustomRange] = useState(false)

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

  async function fetchReport(customFrom, customTo) {
    try {
      setLoading(true)
      let url
      if (customFrom && customTo) {
        url = `/api/attendance/report?from=${customFrom}&to=${customTo}`
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

  function handleApplyDateRange() {
    if (!dateFrom || !dateTo) { addToast('Please select both dates', 'error'); return }
    if (dateFrom > dateTo) { addToast('From date must be before To date', 'error'); return }
    setUseCustomRange(true)
    fetchReport(dateFrom, dateTo)
  }

  function handleClearRange() {
    setUseCustomRange(false)
    fetchReport()
  }

  async function handleBulkDayOff() {
    const dateInput = prompt('Enter date to mark ALL staff as Day Off (YYYY-MM-DD):', new Date().toISOString().split('T')[0])
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
        addToast(json.message || 'Applied to Payroll successfully!', 'success')
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

  async function handleDeleteLog(logId) {
    const idToDelete = logId || editingLog?.id
    if (!idToDelete) return
    if (!confirm('Are you sure you want to delete this attendance record?')) return
    try {
      setSavingLog(true)
      const res = await fetch('/api/attendance/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_log',
          log_id: idToDelete
        })
      })
      const json = await res.json()
      if (res.ok) {
        addToast('Attendance record deleted successfully!', 'success')
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
        'Name': `${log.staff_name} (${log.employee_id})`,
        'Date(Selected Range)': log.date_formatted,
        'Check In': log.check_in_formatted,
        'Break Duration': log.break_formatted || '--',
        'Check Out': log.check_out_formatted,
        'Overtime': `${log.overtime_hours || 0} hrs`,
        'Late': log.minutes_late > 0 ? `${(log.minutes_late / 60).toFixed(2).replace(/\.00$/, '')} hrs late` : 'On Time'
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
      'Name': `${r.name} (${r.employee_id})`,
      'Date(Selected Range)': `${months[month - 1]} ${year}`,
      'Check In': `${r.present || 0} present days`,
      'Check Out': `${r.total_hours || 0} hrs total`,
      'Overtime': `${r.total_overtime_hours || 0} hrs`,
      'Late': `${r.late || 0} late days (${( (r.total_late_minutes || 0) / 60 ).toFixed(2).replace(/\.00$/, '')} hrs)`
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
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans)' }}>
      <Navbar />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* Header & Main Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={28} color="#D4933A" /> Attendance & Overtime Reports
            </h1>
            <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '14px' }}>
              Daily log breakdowns, monthly summaries, heat maps, and 1-click Payroll sync.
            </p>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleBulkDayOff}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', border: '1px solid #F59E0B', color: '#B45309', fontWeight: 800, padding: '10px 14px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer' }}
            >
              <Calendar size={15} /> Mark All Day Off
            </button>

            <button
              onClick={handleApplyToPayroll}
              disabled={applyLoading}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#059669', border: 'none', color: 'white', fontWeight: 800, padding: '10px 18px', borderRadius: '12px', fontSize: '14px', cursor: applyLoading ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.25)' }}
            >
              <DollarSign size={18} />
              {applyLoading ? 'Applying...' : 'Apply to Monthly Payroll'}
            </button>

            <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #CBD5E1', color: '#334155', fontWeight: 700, padding: '10px 14px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer' }}>
              <FileSpreadsheet size={16} /> Excel
            </button>

            <button onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0F172A', border: 'none', color: 'white', fontWeight: 700, padding: '10px 14px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer' }}>
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>

        {/* Section Navigation & Filters Panel */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            
            {/* View Switcher Tabs */}
            <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '12px' }}>
              <button
                onClick={() => setActiveTab('daily')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '9px', border: 'none',
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
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '9px', border: 'none',
                  background: activeTab === 'monthly' ? '#0F172A' : 'transparent',
                  color: activeTab === 'monthly' ? 'white' : '#64748B',
                  fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                <BarChart3 size={15} /> Monthly Summary ({filteredReports.length})
              </button>

              <button
                onClick={() => setActiveTab('heatmap')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '9px', border: 'none',
                  background: activeTab === 'heatmap' ? '#0F172A' : 'transparent',
                  color: activeTab === 'heatmap' ? 'white' : '#64748B',
                  fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                <Calendar size={15} /> Attendance Heat Map
              </button>

              <button
                onClick={() => setActiveTab('ai_agent')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '9px', border: 'none',
                  background: activeTab === 'ai_agent' ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' : 'transparent',
                  color: activeTab === 'ai_agent' ? 'white' : '#7C3AED',
                  fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease',
                  boxShadow: activeTab === 'ai_agent' ? '0 4px 12px rgba(124,58,237,0.3)' : 'none'
                }}
              >
                <Sparkles size={15} color={activeTab === 'ai_agent' ? 'white' : '#7C3AED'} /> AI Intelligence Agent
              </button>
            </div>

            {/* Filter Controls (Month/Year & Search) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', alignItems: 'center' }}>
                <Calendar size={14} color="#64748B" />
                <select
                  value={month}
                  onChange={e => { setMonth(parseInt(e.target.value)); setUseCustomRange(false) }}
                  style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: '13px', cursor: 'pointer', color: '#0F172A', outline: 'none' }}
                >
                  {months.map((m, idx) => (
                    <option key={idx} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={e => { setYear(parseInt(e.target.value)); setUseCustomRange(false) }}
                  style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: '13px', cursor: 'pointer', color: '#0F172A', outline: 'none' }}
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search staff name or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

          </div>

          {/* Date Range Sub-Bar (Daily Breakdown only) */}
          {activeTab === 'daily' && (
            <div style={{ paddingTop: '12px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>Date Range Filter:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', fontWeight: 600, color: '#0F172A', outline: 'none' }}
                />
                <span style={{ color: '#94A3B8' }}>→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', fontWeight: 600, color: '#0F172A', outline: 'none' }}
                />
                <button
                  onClick={handleApplyDateRange}
                  style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                >
                  Filter Range
                </button>
                {useCustomRange && (
                  <button
                    onClick={handleClearRange}
                    style={{ background: '#F1F5F9', color: '#374155', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '7px 12px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                {useCustomRange
                  ? `Showing range: ${dateFrom} to ${dateTo}`
                  : `Showing full month: ${months[month - 1]} ${year}`}
              </div>
            </div>
          )}
        </div>

        {/* Main PDF & View Container */}
        <div id="report-pdf-container" style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '32px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          
          {/* Executive Company Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0F172A', paddingBottom: '16px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: 0 }}>CROWN COFFEE</h2>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#D4933A', fontWeight: 800 }}>
                Official Attendance & Payroll Ledger
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>{months[month - 1]} {year}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Generated: {new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          {/* Top KPI Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px', background: '#F8FAFC', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Total Staff</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>{reportData.summary?.total_staff || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Days Worked</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#16A34A' }}>{reportData.summary?.total_present_days || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Late Occurrences</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#DC2626' }}>{reportData.summary?.total_late_occurrences || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Total Worked Hours</div>
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

            /* TAB 1: ORGANIZED DAILY BREAKDOWN TABLE */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Daily Breakdown Logs ({filteredLogs.length} entries)
                </h3>
              </div>

              {filteredLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                  No daily attendance logs found for selected filter.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #0F172A', color: '#0F172A', fontSize: '12px', textTransform: 'uppercase', background: '#F8FAFC' }}>
                        <th style={{ padding: '12px' }}>Name</th>
                        <th style={{ padding: '12px' }}>Date (Selected Range)</th>
                        <th style={{ padding: '12px' }}>Check In</th>
                        <th style={{ padding: '12px' }}>Break</th>
                        <th style={{ padding: '12px' }}>Check Out</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Overtime</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Late</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A' }}>
                            {log.staff_name}
                            <span style={{ display: 'block', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                              ID: {log.employee_id}{log.designation ? ` • ${log.designation}` : ''}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                            {log.date_formatted}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                            {log.check_in_formatted}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#D97706', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                            {log.break_formatted || '--'}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#2563EB', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                            {log.check_out_formatted}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 800,
                              color: log.overtime_hours > 0 ? '#D4933A' : '#64748B',
                              background: log.overtime_hours > 0 ? '#FFFBEB' : '#F1F5F9',
                              border: log.overtime_hours > 0 ? '1px solid #FCD34D' : '1px solid #E2E8F0',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}>
                              {log.overtime_hours > 0 ? `${log.overtime_hours} hrs` : '0 hrs'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 800,
                              color: log.minutes_late > 0 ? '#DC2626' : log.check_in_at ? '#16A34A' : '#64748B',
                              background: log.minutes_late > 0 ? '#FEE2E2' : log.check_in_at ? '#DCFCE7' : '#F1F5F9',
                              border: log.minutes_late > 0 ? '1px solid #FCA5A5' : log.check_in_at ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}>
                              {log.minutes_late > 0
                                ? `${(log.minutes_late / 60).toFixed(2).replace(/\.00$/, '')} hrs late`
                                : log.check_in_at
                                ? 'On Time'
                                : (log.status === 'absent' ? 'Absent' : 'Not Checked In')}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => openEditModal(log)}
                                style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit size={12} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'monthly' ? (

            /* TAB 2: ORGANIZED MONTHLY SUMMARY TABLE */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #0F172A', color: '#0F172A', fontSize: '12px', textTransform: 'uppercase', background: '#F8FAFC' }}>
                    <th style={{ padding: '12px' }}>ID</th>
                    <th style={{ padding: '12px' }}>Staff Name</th>
                    <th style={{ padding: '12px' }}>Designation</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Present Days</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Late Days</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Absent Days</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Punctuality Score</th>
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
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {(() => {
                          const totalDuty = (r.present || 0) + (r.late || 0) + (r.absent || 0)
                          const score = totalDuty > 0 ? Math.round(((r.present || 0) / totalDuty) * 100) : 100
                          const color = score >= 90 ? '#16A34A' : score >= 75 ? '#D97706' : '#DC2626'
                          return (
                            <span style={{ fontWeight: 900, color, background: `${color}15`, padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                              {score}%
                            </span>
                          )
                        })()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#D4933A', fontWeight: 800 }}>{r.total_overtime_hours} hrs</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, color: '#0F172A' }}>{r.total_hours} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'heatmap' ? (

            /* TAB 3: HEAT MAP CALENDAR GRID */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '12px', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#16A34A' }} /> Present</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#D97706' }} /> Late</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#DC2626' }} /> Absent</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#CBD5E1' }} /> Off / Leave</span>
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
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        Punctuality: <strong style={{ color: '#16A34A' }}>{Math.round(((staff.present || 0) / ((staff.present || 0) + (staff.late || 0) + (staff.absent || 0) || 1)) * 100)}%</strong>
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
                            onClick={() => log && openEditModal(log)}
                            style={{
                              aspectRatio: '1/1',
                              borderRadius: '6px',
                              background: bg,
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: log ? 'pointer' : 'default',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
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

            /* TAB 4: AI ATTENDANCE INTELLIGENCE AGENT */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* AI Agent Banner Header */}
              <div style={{
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)',
                borderRadius: '20px',
                padding: '28px 32px',
                color: 'white',
                boxShadow: '0 10px 30px rgba(76,29,149,0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.05em' }}>
                      <Sparkles size={16} color="#A78BFA" /> GEMINI AI AGENT ACTIVE
                    </div>
                    <span style={{ fontSize: '12px', color: '#C4B5FD', fontWeight: 600 }}>Privacy Guaranteed</span>
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: 'white' }}>
                    AI Attendance Intelligence Agent
                  </h2>
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#DDD6FE', maxWidth: '650px' }}>
                    Ask any question about staff attendance, late arrivals, overtime breakdown, or click below to run AI anomaly detection scans.
                  </p>
                </div>

                <button
                  onClick={handleScanAnomalies}
                  disabled={anomaliesLoading}
                  style={{
                    background: 'white',
                    color: '#4C1D95',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    fontWeight: 900,
                    fontSize: '13px',
                    cursor: anomaliesLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                  }}
                >
                  <Zap size={18} color="#7C3AED" /> {anomaliesLoading ? 'Scanning...' : 'Run AI Anomaly Scan'}
                </button>
              </div>

              {/* Natural Language Query Assistant */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={20} color="#7C3AED" /> Ask AI Attendance Assistant
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748B' }}>
                  Ask questions in plain English about attendance records, lateness, and shift duty.
                </p>

                {/* Preset Prompt Chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {[
                    "Who was late more than 2 times this month?",
                    "Summarize top overtime hours for all staff",
                    "Which staff member has the lowest punctuality score?",
                    "Show kitchen staff attendance summary"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setAiQuestion(preset); handleAskAI(preset) }}
                      style={{
                        background: 'white',
                        border: '1px solid #CBD5E1',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      💡 {preset}
                    </button>
                  ))}
                </div>

                {/* Query Input Box */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Ask AI anything about attendance (e.g. Who was late on Friday?)"
                    value={aiQuestion}
                    onChange={e => setAiQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAskAI() }}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white'
                    }}
                  />
                  <button
                    onClick={() => handleAskAI()}
                    disabled={aiLoading}
                    style={{
                      background: '#7C3AED',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: aiLoading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Send size={16} /> {aiLoading ? 'Thinking...' : 'Ask AI'}
                  </button>
                </div>

                {/* AI Answer Output */}
                {aiAnswer && (
                  <div style={{ marginTop: '20px', background: 'white', border: '1px solid #C4B5FD', borderRadius: '14px', padding: '20px', boxShadow: '0 4px 16px rgba(124,58,237,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#7C3AED', fontWeight: 800, fontSize: '13px' }}>
                      <Sparkles size={16} /> AI Insights Response:
                    </div>
                    <div style={{ fontSize: '14px', color: '#0F172A', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                      {aiAnswer}
                    </div>
                  </div>
                )}
              </div>

              {/* Anomaly & Pattern Detector Results */}
              <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={20} color="#DC2626" /> Detected Attendance Anomalies ({anomalies.length})
                  </h3>
                  <button
                    onClick={handleScanAnomalies}
                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                  >
                    Rescan Patterns
                  </button>
                </div>

                {anomalies.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', color: '#64748B', fontSize: '13px' }}>
                    No critical attendance anomalies or burnout risks detected. All staff operating normally!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {anomalies.map(item => {
                      const isCritical = item.severity === 'critical'
                      return (
                        <div key={item.id} style={{
                          background: isCritical ? '#FEF2F2' : '#FFFBEB',
                          border: isCritical ? '1px solid #FCA5A5' : '1px solid #FCD34D',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justify: 'space-between'
                        }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <span style={{
                                fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
                                background: isCritical ? '#DC2626' : '#D97706', color: 'white',
                                padding: '3px 8px', borderRadius: '10px'
                              }}>
                                {item.severity || 'Warning'}
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                                {new Date(item.flagged_at).toLocaleDateString('en-GB')}
                              </span>
                            </div>

                            <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A', marginBottom: '4px' }}>
                              {item.detail?.staff_name || item.staff?.name || 'Staff Member'}
                            </div>

                            <div style={{ fontSize: '13px', color: isCritical ? '#991B1B' : '#92400E', fontWeight: 700, marginBottom: '6px' }}>
                              {item.type === 'repeated_lateness' && `Repeated Lateness: ${item.detail?.late_count} times in 30 days`}
                              {item.type === 'overtime_risk' && `Overtime Burnout Risk: ${item.detail?.hours_worked} total hours`}
                              {item.type === 'high_absence' && `High Absence: ${item.detail?.absent_count} absent days`}
                            </div>
                          </div>

                          <button
                            onClick={() => handleDismissAnomaly(item.id)}
                            style={{
                              marginTop: '12px',
                              background: 'white',
                              border: isCritical ? '1px solid #FCA5A5' : '1px solid #FCD34D',
                              color: isCritical ? '#991B1B' : '#92400E',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            Dismiss Flag
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : null}

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
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">On Leave</option>
                  <option value="off">Day Off</option>
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Minutes Late</label>
                <input
                  type="number"
                  value={editForm.minutes_late}
                  onChange={e => setEditForm({ ...editForm, minutes_late: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', height: '60px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <button
                  onClick={() => handleDeleteLog(editingLog.id)}
                  disabled={savingLog}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Trash2 size={15} /> Delete Record
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setEditingLog(null)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveLog}
                    disabled={savingLog}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0F172A', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}
                  >
                    {savingLog ? 'Saving...' : 'Save Changes'}
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
