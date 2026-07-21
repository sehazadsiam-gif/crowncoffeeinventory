'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import { Download, FileSpreadsheet, FileText, Calendar, Filter } from 'lucide-react'
import * as xlsx from 'xlsx'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function AttendanceReportsPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({ summary: {}, reports: [] })

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
      'Total Late Minutes': r.total_late_minutes
    }))

    const worksheet = xlsx.utils.json_to_sheet(rows)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Attendance Report')
    xlsx.writeFile(workbook, `Crown_Coffee_Attendance_${months[month - 1]}_${year}.xlsx`)
    addToast('CSV exported successfully!', 'success')
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #faf7f2)' }}>
      <Navbar />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px 60px' }}>
        
        {/* Header & Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Monthly Attendance Report
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
              Per-employee and company-wide attendance and total hours worked summary.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '6px 12px', borderRadius: '10px', border: '1px solid #E8E0D4' }}>
              <select
                value={month}
                onChange={e => setMonth(parseInt(e.target.value))}
                style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
              >
                {months.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>

              <select
                value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#E8F5E9', border: '1px solid #A5D6A7', color: '#2E7D32', fontWeight: 700 }}
            >
              <FileSpreadsheet size={16} /> Export Excel / CSV
            </button>

            <button
              onClick={handleExportPDF}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#6B3A2A', border: 'none', color: 'white' }}
            >
              <FileText size={16} /> Export PDF
            </button>
          </div>
        </div>

        {/* Exportable PDF Container */}
        <div id="report-pdf-container" style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8E0D4', padding: '32px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #6B3A2A', paddingBottom: '16px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#6B3A2A', margin: 0 }}>Crown Coffee</h2>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9C8A76' }}>Monthly Attendance & Worked Hours Report</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1C1410' }}>{months[month - 1]} {year}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>Generated: {new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          {/* Company-wide Summary KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px', background: '#FAF7F2', padding: '16px', borderRadius: '12px', border: '1px solid #F0EAE1' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#9C8A76', fontWeight: 700 }}>Total Active Staff</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#1C1410' }}>{reportData.summary?.total_staff || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#9C8A76', fontWeight: 700 }}>Total Days Worked</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#2E7D32' }}>{reportData.summary?.total_present_days || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#9C8A76', fontWeight: 700 }}>Late Occurrences</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#E65100' }}>{reportData.summary?.total_late_occurrences || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#9C8A76', fontWeight: 700 }}>Absent Days</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#C62828' }}>{reportData.summary?.total_absent_days || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#9C8A76', fontWeight: 700 }}>Total Hours Worked</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#01579B' }}>{reportData.summary?.total_hours_worked || 0} hrs</div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}><div className="loader"></div></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E8E0D4', color: '#6B3A2A', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>ID</th>
                    <th style={{ padding: '10px 12px' }}>Staff Name</th>
                    <th style={{ padding: '10px 12px' }}>Designation</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Present</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Late</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Absent</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>On Leave</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.reports?.map(r => (
                    <tr key={r.staff_id} style={{ borderBottom: '1px solid #F7F3EE' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#6B3A2A' }}>{r.employee_id}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1C1410' }}>{r.name}</td>
                      <td style={{ padding: '10px 12px', color: '#666' }}>{r.designation}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#2E7D32', fontWeight: 700 }}>{r.present}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#E65100', fontWeight: 700 }}>{r.late}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#C62828', fontWeight: 700 }}>{r.absent}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#01579B', fontWeight: 700 }}>{r.on_leave}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#1C1410' }}>{r.total_hours} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </main>
    </div>
  )
}
