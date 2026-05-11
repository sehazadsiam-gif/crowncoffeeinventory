'use client'

import { useState, useEffect } from 'react'
import { Upload, Download } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function OvertimePage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [csvFile, setCsvFile] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [overtimeData, setOvertimeData] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [importMessage, setImportMessage] = useState('')

  useEffect(() => {
    loadStaffList()
  }, [])

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setCsvFile(file)
    setLoading(true)
    setImportMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/admin/overtime/import-csv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        setImportMessage(`✅ Imported ${data.imported} attendance records`)
        loadStaffList()
      } else {
        setImportMessage(`❌ Error: ${data.error}`)
      }
    } catch (e) {
      setImportMessage(`❌ Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadStaffList = async () => {
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/staff/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setStaffList(data.staff || [])
    } catch (e) {
      console.error('Load staff error:', e)
    }
  }

  const calculateOvertime = async (staffId) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/admin/overtime/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ staff_id: staffId, month, year })
      })

      const data = await res.json()

      if (res.ok) {
        setOvertimeData(data)
        setSelectedStaff(data.staffName)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Overtime Management</h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px' }}>Upload Rysenova CSV and calculate overtime</p>

      {/* CSV Upload Section */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '32px', border: '2px dashed #E0E0E0' }}>
        <label style={{ display: 'block', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '32px' }}>
            <Upload size={32} color="#6B3A2A" />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1F1F1F' }}>Upload Rysenova CSV</div>
              <div style={{ fontSize: '12px', color: '#9C8A76' }}>Click or drag CSV file here</div>
            </div>
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            style={{ display: 'none' }}
          />
        </label>
        {csvFile && <div style={{ textAlign: 'center', color: '#2E7D32', fontSize: '12px', fontWeight: 700 }}>✅ {csvFile.name}</div>}
        {importMessage && <div style={{ textAlign: 'center', color: importMessage.includes('✅') ? '#2E7D32' : '#D32F2F', fontSize: '12px', marginTop: '8px' }}>{importMessage}</div>}
      </div>

      {/* Month/Year and Calculate */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Month</label>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            style={{ width: '100%', padding: '10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Year</label>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))}
            style={{ width: '100%', padding: '10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px' }} />
        </div>
      </div>

      {/* Staff List - Select to Calculate */}
      {staffList.length > 0 && !overtimeData && (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '16px', background: '#F5F5F5', borderBottom: '1px solid #E0E0E0', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Select Staff to Calculate Overtime</div>
          {staffList.map(staff => (
            <div key={staff.id} style={{ padding: '12px 16px', borderBottom: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{staff.name || staff.username}</div>
                <div style={{ fontSize: '12px', color: '#9C8A76' }}>Base: {staff.base_salary} TK</div>
                {staff.overtime_hours_month > 0 && (
                  <div style={{ fontSize: '12px', color: '#2E7D32', fontWeight: 600 }}>
                    OT: {staff.overtime_pay_month} TK ({staff.overtime_hours_month} hrs)
                  </div>
                )}
              </div>
              <button onClick={() => calculateOvertime(staff.id)} disabled={loading}
                style={{ padding: '8px 16px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                Calculate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Overtime Results */}
      {overtimeData && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
              {overtimeData.staffName} - {MONTHS[overtimeData.month - 1]} {overtimeData.year}
            </h2>
            
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: '#FDF8F4', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#9C8A76', fontWeight: 700, marginBottom: '6px' }}>Base Salary</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#6B3A2A' }}>{overtimeData.baseSalary} TK</div>
              </div>
              <div style={{ background: '#FDF8F4', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#9C8A76', fontWeight: 700, marginBottom: '6px' }}>Hourly Rate</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#6B3A2A' }}>{overtimeData.hourlyRate} TK</div>
              </div>
              <div style={{ background: '#FDF8F4', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#9C8A76', fontWeight: 700, marginBottom: '6px' }}>Days Worked</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#6B3A2A' }}>{overtimeData.daysWorked}</div>
              </div>
              <div style={{ background: '#E8F5E9', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#1B5E20', fontWeight: 700, marginBottom: '6px' }}>Total OT Pay</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#2E7D32' }}>{overtimeData.totalOvertimePay} TK</div>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F5F5F5' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Date</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Check-in</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Check-out</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Hours</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>OT Hours</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>OT Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {overtimeData.overtimeRecords.map((record, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E0E0E0' }}>
                      <td style={{ padding: '10px', fontSize: '12px' }}>{record.date}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px' }}>{record.checkIn}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px' }}>{record.checkOut}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px' }}>{record.actualHours.toFixed(1)}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: record.overtimeHours > 0 ? '#F57C00' : '#9C8A76' }}>{record.overtimeHours.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#2E7D32' }}>{record.overtimePay.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={() => setOvertimeData(null)}
            style={{ padding: '10px 20px', background: '#9C8A76', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
            Back to Staff List
          </button>
        </div>
      )}
    </div>
  )
}
