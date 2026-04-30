'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import { Upload, Check, AlertCircle, ChevronLeft, Calendar, FileText, ChevronDown, ChevronUp } from 'lucide-react'

export default function AttendanceImportPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const fileInputRef = useRef(null)

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState([])
  const [matchedRecords, setMatchedRecords] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [importMode, setImportMode] = useState('summary')
  const [expandedRows, setExpandedRows] = useState({})

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const nameAliases = {
    'shahdat': 'shahadat',
    'sehazad': 'sehazad',
    'rabiul': 'robiul',
    'alam noor': 'alam nur',
    'esha': 'esa',
    'ajoy': 'ajoy',
    'mankhin': 'ajoy',
    'sumon': 'sumon',
    'rafat': 'rafat',
    'hafizur': 'hafizur',
    'masum': 'masum',
    'sadman': 'sadman',
    'safkat': 'safkat',
    'ripon': 'ripon'
  }

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
    fetchStaff()
  }, [router])

  async function fetchStaff() {
    const { data } = await supabase.from('staff').select('id, name').eq('is_active', true).order('sort_order')
    setStaff(data || [])
  }

  function normalizeName(name) {
    if (!name) return ''
    let n = name.toLowerCase().trim()
    for (const [key, val] of Object.entries(nameAliases)) {
      if (n.includes(key)) return val
    }
    return n
  }

  function findBestMatch(rysenovaName) {
    if (!rysenovaName) return null
    const normalized = normalizeName(rysenovaName)

    let match = staff.find(s => normalizeName(s.name) === normalized)
    if (match) return match.id

    match = staff.find(s => {
      const sName = normalizeName(s.name)
      return sName.includes(normalized) || normalized.includes(sName)
    })
    if (match) return match.id

    // word by word matching
    const words = normalized.split(' ').filter(w => w.length > 2)
    for (const word of words) {
      match = staff.find(s => normalizeName(s.name).includes(word))
      if (match) return match.id
    }

    return null
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    processFile(file)
  }

  const processFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      // Parse CSV properly handling quoted fields with newlines
      const rows = parseCSV(text)
      if (importMode === 'summary') {
        processSummaryFormat(rows)
      } else {
        processDailyFormat(rows)
      }
    }
    reader.readAsText(file)
  }

  function parseCSV(text) {
    const rows = []
    let currentRow = []
    let currentCell = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"' && !inQuotes) {
        inQuotes = true
      } else if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          currentCell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim())
        currentCell = ''
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
        if (char === '\r') i++
        currentRow.push(currentCell.trim())
        rows.push(currentRow)
        currentRow = []
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim())
      rows.push(currentRow)
    }
    return rows
  }

  function parseDays(val) {
    if (!val || val === '--' || val === '-') return 0
    const match = String(val).match(/^(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  function processSummaryFormat(rows) {
    // Format:
    // Row 0: Company name
    // Row 1: Report title
    // Row 2: Date range
    // Row 3: Empty
    // Row 4: Headers
    // Row 5+: Data

    const results = []

    for (let i = 5; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length < 5) continue
      const name = row[0]
      if (!name) continue
      if (name.toLowerCase().includes('employee')) continue
      if (name.toLowerCase().includes('generated')) continue
      if (name.toLowerCase().includes('total')) continue

      // Columns: Employee(0), EmpNum(1), Designation(2), Present(3), Absent(4)...
      const present = parseDays(row[3])
      const absent = parseDays(row[4])

      // Late check-in count from column 9 (Late Check In)
      // Format: "23 Days | 96 h 39 m" or "23 Days" or "--"
      let late = 0
      if (row[9] && row[9] !== '--') {
        const lateMatch = String(row[9]).match(/^(\d+)/)
        if (lateMatch) late = parseInt(lateMatch[1])
      }

      results.push({
        rysenovaName: name,
        present_days: present,
        absent_days: absent,
        late_days: late,
        staff_id: findBestMatch(name) || ''
      })
    }

    setMatchedRecords(results)
    if (results.length > 0) {
      addToast(`Parsed ${results.length} staff records`, 'success')
    } else {
      addToast('No records found. Check file format.', 'error')
    }
  }

  function processDailyFormat(rows) {
    // Row 4: Headers with day columns from index 8
    const header = rows[4] || []
    const dayColumns = []
    for (let i = 8; i < header.length; i++) {
      const h = header[i]
      if (h && /^\d+/.test(h)) {
        const dayNum = parseInt(h.match(/^(\d+)/)[1])
        dayColumns.push({ index: i, day: dayNum })
      }
    }

    const results = []

    for (let i = 5; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length < 9) continue
      const name = row[0]
      if (!name) continue
      if (name.toLowerCase().includes('employee')) continue
      if (name.toLowerCase().includes('generated')) continue

      const dailyData = []
      let presentCount = 0
      let absentCount = 0
      let lateCount = 0

      for (const dayCol of dayColumns) {
        const cell = row[dayCol.index] || ''
        if (!cell || cell === '-') continue

        let status = 'present'
        let checkIn = null
        let checkOut = null

        if (cell.toLowerCase() === 'absent') {
          status = 'absent'
          absentCount++
        } else if (cell.includes(' - ') || cell.includes(':')) {
          // Extract first time before newline
          const mainPart = cell.split('\n')[0]
          const dashIdx = mainPart.indexOf(' - ')

          if (dashIdx > -1) {
            checkIn = mainPart.substring(0, dashIdx).trim()
            const afterDash = mainPart.substring(dashIdx + 3).trim()
            checkOut = (afterDash === '--' || afterDash === '') ? null : afterDash
          } else {
            checkIn = mainPart.trim()
          }

          if (checkIn) {
            const timeMatch = checkIn.match(/(\d+):(\d+)\s*(AM|PM)/i)
            if (timeMatch) {
              let hour = parseInt(timeMatch[1])
              const minute = parseInt(timeMatch[2])
              const ampm = timeMatch[3].toUpperCase()

              if (ampm === 'PM' && hour < 12) hour += 12
              if (ampm === 'AM' && hour === 12) hour = 0

              if (hour >= 19) {
                status = 'present'
              } else if (hour >= 14) {
                status = (hour > 14 || (hour === 14 && minute > 15)) ? 'late' : 'present'
              } else {
                status = (hour > 8 || (hour === 8 && minute > 15)) ? 'late' : 'present'
              }
            }
          }

          if (status === 'late') lateCount++
          else presentCount++
        } else {
          continue
        }

        dailyData.push({
          day: dayCol.day,
          date: `${year}-${String(month).padStart(2, '0')}-${String(dayCol.day).padStart(2, '0')}`,
          status,
          check_in_time: checkIn,
          check_out_time: checkOut
        })
      }

      results.push({
        rysenovaName: name,
        present_days: presentCount + lateCount,
        absent_days: absentCount,
        late_days: lateCount,
        staff_id: findBestMatch(name) || '',
        daily: dailyData
      })
    }

    setMatchedRecords(results)
    if (results.length > 0) {
      addToast(`Parsed ${results.length} staff records`, 'success')
    } else {
      addToast('No records found. Check file format.', 'error')
    }
  }

  const handleManualMatch = (index, staffId) => {
    const updated = [...matchedRecords]
    updated[index].staff_id = staffId
    setMatchedRecords(updated)
  }

  const toggleExpand = (idx) => {
    setExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const handleImport = async () => {
    const unmatched = matchedRecords.some(r => !r.staff_id)
    if (unmatched) {
      if (!confirm('Some records are unmatched and will be skipped. Continue?')) return
    }

    try {
      setLoading(true)
      const recordsToProcess = matchedRecords.filter(r => r.staff_id)

      if (importMode === 'daily') {
        const dailyAttendance = []
        recordsToProcess.forEach(r => {
          r.daily.forEach(day => {
            dailyAttendance.push({
              staff_id: r.staff_id,
              date: day.date,
              status: day.status,
              check_in_time: day.check_in_time,
              check_out_time: day.check_out_time,
              note: 'Rysenova import'
            })
          })
        })

        if (dailyAttendance.length > 0) {
          const chunkSize = 50
          for (let i = 0; i < dailyAttendance.length; i += chunkSize) {
            const chunk = dailyAttendance.slice(i, i + chunkSize)
            const { error } = await supabase.from('attendance').upsert(chunk, { onConflict: 'staff_id,date' })
            if (error) throw error
          }
        }
      }

      const summaryRecords = recordsToProcess.map(r => ({
        staff_id: r.staff_id,
        month: parseInt(month),
        year: parseInt(year),
        present_days: r.present_days,
        absent_days: r.absent_days,
        late_days: r.late_days,
        source: 'rysenova'
      }))

      const { error: summaryError } = await supabase
        .from('monthly_attendance_summary')
        .upsert(summaryRecords, { onConflict: 'staff_id,month,year' })

      if (summaryError) throw summaryError

      addToast(`Successfully imported ${recordsToProcess.length} staff records for ${months[month - 1]} ${year}`, 'success')
      setMatchedRecords([])
    } catch (err) {
      addToast(err.message || 'Import failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const totalPresent = matchedRecords.reduce((s, r) => s + (r.present_days || 0), 0)
  const totalLate = matchedRecords.reduce((s, r) => s + (r.late_days || 0), 0)
  const totalAbsent = matchedRecords.reduce((s, r) => s + (r.absent_days || 0), 0)
  const matchedCount = matchedRecords.filter(r => r.staff_id).length

  return (
    <div style={{ background: '#FAF7F2', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button onClick={() => router.back()} style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#9C8A76' }}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1C1410', margin: 0 }}>Attendance Import</h1>
            <p style={{ color: '#9C8A76', fontSize: '13px', margin: '4px 0 0 0' }}>Upload Rysenova CSV to sync attendance data</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['summary', 'daily'].map(mode => (
            <button
              key={mode}
              onClick={() => { setImportMode(mode); setMatchedRecords([]) }}
              style={{
                padding: '8px 20px', borderRadius: '20px', border: 'none',
                background: importMode === mode ? '#8B5E3C' : 'white',
                color: importMode === mode ? 'white' : '#9C8A76',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(28,20,16,0.06)',
                textTransform: 'capitalize'
              }}
            >
              {mode === 'summary' ? 'Summary Mode' : 'Daily Mode'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>

          {/* Left panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E8E0D4', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1C1410', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#8B5E3C" /> Import Settings
              </h2>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Month</label>
                <select className="input" value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: '100%' }}>
                  {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Year</label>
                <input type="number" className="input" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: '100%' }} />
              </div>

              <div
                style={{
                  border: isDragging ? '2px dashed #8B5E3C' : '2px dashed #D4C8B8',
                  background: isDragging ? '#FDF8F4' : '#FDFAF7',
                  borderRadius: '10px', padding: '32px 16px',
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
                onClick={() => fileInputRef.current.click()}
              >
                <Upload size={28} color={isDragging ? '#8B5E3C' : '#C8B8A8'} style={{ marginBottom: '10px' }} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1C1410', margin: '0 0 4px 0' }}>Drop CSV file here</p>
                <p style={{ fontSize: '11px', color: '#9C8A76', margin: 0 }}>or click to browse</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" style={{ display: 'none' }} />
              </div>
            </div>

            {matchedRecords.length > 0 && (
              <div style={{ background: '#8B5E3C', borderRadius: '12px', padding: '20px', color: 'white' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Parsed Summary</p>
                {[
                  { label: 'Staff found', value: matchedRecords.length },
                  { label: 'Matched', value: matchedCount },
                  { label: 'Present days', value: totalPresent },
                  { label: 'Late days', value: totalLate },
                  { label: 'Absent days', value: totalAbsent },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ opacity: 0.8 }}>{item.label}</span>
                    <span style={{ fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E8E0D4', boxShadow: '0 1px 4px rgba(28,20,16,0.06)', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1C1410', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <FileText size={18} color="#8B5E3C" /> Data Preview
              </h2>
              {matchedRecords.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={loading}
                  style={{ background: loading ? '#D4C8B8' : '#1e8e3e', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {loading ? 'Importing...' : <><Check size={16} /> Confirm Import</>}
                </button>
              )}
            </div>

            {matchedRecords.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#C8B8A8' }}>
                <AlertCircle size={48} strokeWidth={1} style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '15px', color: '#9C8A76' }}>Upload a Rysenova CSV to preview</p>
                <p style={{ fontSize: '12px', color: '#C8B8A8', marginTop: '6px' }}>
                  Mode: {importMode === 'summary' ? 'Summary (totals only)' : 'Daily (day by day with check-in/out times)'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F5F0E8', borderBottom: '2px solid #E8E0D4' }}>
                      <th style={{ padding: '10px 12px', color: '#9C8A76', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Rysenova Name</th>
                      <th style={{ padding: '10px 12px', color: '#9C8A76', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Matched Staff</th>
                      <th style={{ padding: '10px 12px', color: '#1e8e3e', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Present</th>
                      <th style={{ padding: '10px 12px', color: '#fa7b17', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Late</th>
                      <th style={{ padding: '10px 12px', color: '#d93025', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Absent</th>
                      <th style={{ padding: '10px 12px', color: '#9C8A76', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                      {importMode === 'daily' && <th style={{ padding: '10px 12px' }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {matchedRecords.map((record, idx) => (
                      <Fragment key={idx}>
                        <tr style={{ borderBottom: '1px solid #F0EBE3', background: expandedRows[idx] ? '#FDFAF7' : 'white' }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#1C1410' }}>{record.rysenovaName}</td>
                          <td style={{ padding: '12px' }}>
                            <select
                              className="input"
                              style={{ padding: '5px 8px', fontSize: '12px', background: record.staff_id ? '#F0FDF4' : '#FEF2F2', borderColor: record.staff_id ? '#BBF7D0' : '#FECACA' }}
                              value={record.staff_id}
                              onChange={e => handleManualMatch(idx, e.target.value)}
                            >
                              <option value="">-- Unmatched --</option>
                              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#1e8e3e', fontWeight: 700 }}>{record.present_days}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#fa7b17', fontWeight: 700 }}>{record.late_days}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#d93025', fontWeight: 700 }}>{record.absent_days}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {record.staff_id
                              ? <span style={{ background: '#e6f4ea', color: '#1e8e3e', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>MATCHED</span>
                              : <span style={{ background: '#fce8e6', color: '#d93025', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>NO MATCH</span>
                            }
                          </td>
                          {importMode === 'daily' && (
                            <td style={{ padding: '12px' }}>
                              <button onClick={() => toggleExpand(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C8A76' }}>
                                {expandedRows[idx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </td>
                          )}
                        </tr>
                        {expandedRows[idx] && record.daily && (
                          <tr>
                            <td colSpan={7} style={{ padding: '0 12px 16px' }}>
                              <div style={{ background: '#F5F0E8', borderRadius: '8px', padding: '12px', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid #E8E0D4' }}>
                                      {['Day', 'Date', 'Check In', 'Check Out', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '6px 8px', color: '#9C8A76', fontWeight: 600, textAlign: 'left' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {record.daily.map((day, dIdx) => (
                                      <tr key={dIdx} style={{ borderBottom: '1px solid #F0EBE3' }}>
                                        <td style={{ padding: '6px 8px', color: '#5C4A36' }}>{day.day}</td>
                                        <td style={{ padding: '6px 8px', color: '#5C4A36' }}>{day.date}</td>
                                        <td style={{ padding: '6px 8px', color: '#1C1410' }}>{day.check_in_time || '--'}</td>
                                        <td style={{ padding: '6px 8px', color: '#1C1410' }}>{day.check_out_time || '--'}</td>
                                        <td style={{ padding: '6px 8px' }}>
                                          <span style={{
                                            color: day.status === 'present' ? '#1e8e3e' : day.status === 'late' ? '#fa7b17' : '#d93025',
                                            fontWeight: 700, fontSize: '11px', textTransform: 'uppercase'
                                          }}>
                                            {day.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}