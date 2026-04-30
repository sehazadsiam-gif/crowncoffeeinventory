'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { 
  Clock, Calendar, Users, RefreshCw, Download, 
  Search, Filter, ChevronLeft, ChevronRight, User,
  FileSpreadsheet, ArrowRight, ArrowLeft
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function PunchLogPage() {
  const router = useRouter()
  const [punches, setPunches] = useState([])
  const [importedLogs, setImportedLogs] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [staffFilter, setStaffFilter] = useState('all')

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
    fetchData()
    fetchStaff()
  }, [selectedDate])

  async function fetchStaff() {
    const { data } = await supabase.from('staff').select('id, name, zkteco_id').order('name')
    setStaff(data || [])
  }

  async function fetchData() {
    setLoading(true)
    try {
      // 1. Fetch from attendance_punches (Raw machine data)
      const { data: punchData, error: punchError } = await supabase
        .from('attendance_punches')
        .select(`*, staff (name)`)
        .eq('punch_date', selectedDate)
        .order('punch_time', { ascending: true })

      if (punchError) throw punchError
      setPunches(punchData || [])

      // 2. Fetch from attendance table (Imported data)
      const { data: attendanceData, error: attError } = await supabase
        .from('attendance')
        .select(`*, staff (name, zkteco_id)`)
        .eq('date', selectedDate)
        .not('check_in_time', 'is', null)

      if (attError) throw attError
      setImportedLogs(attendanceData || [])

    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const groupedLogs = useMemo(() => {
    const groups = {}
    
    // Process machine punches
    punches.forEach(p => {
      const key = p.staff_id || `zk_${p.zkteco_id}`
      if (!groups[key]) {
        groups[key] = {
          staff_id: p.staff_id,
          zkteco_id: p.zkteco_id,
          name: p.staff?.name || 'Unknown Staff',
          punches: [],
          source: 'Machine'
        }
      }
      groups[key].punches.push(p)
    })

    const machineResults = Object.values(groups).map(group => {
      const sorted = [...group.punches].sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time))
      const first = sorted[0]
      const last = sorted.length > 1 ? sorted[sorted.length - 1] : null
      
      const punchDate = new Date(first.punch_time)
      const hour = punchDate.getHours()
      const minute = punchDate.getMinutes()
      const timeInMinutes = hour * 60 + minute
      
      let statusLabel = 'On Time'
      let statusColor = 'var(--success)'

      if (timeInMinutes >= 1140) {
        statusLabel = 'Check Out Only'
        statusColor = 'var(--text-muted)'
      } else if (timeInMinutes > 855) {
        statusLabel = 'Late (PM)'
        statusColor = 'var(--danger)'
      } else if (timeInMinutes >= 840) {
        statusLabel = 'On Time (PM)'
        statusColor = 'var(--success)'
      } else if (timeInMinutes > 495) {
        statusLabel = 'Late (AM)'
        statusColor = 'var(--danger)'
      }

      return {
        ...group,
        check_in: first?.punch_time,
        check_out: last?.punch_time,
        statusLabel,
        statusColor
      }
    })

    // Process imported logs
    const importedResults = importedLogs.map(log => {
      let statusLabel = log.status.charAt(0).toUpperCase() + log.status.slice(1)
      let statusColor = log.status === 'late' ? 'var(--danger)' : 'var(--success)'

      return {
        staff_id: log.staff_id,
        zkteco_id: log.staff?.zkteco_id || 0,
        name: log.staff?.name || 'Unknown',
        check_in: log.check_in_time, // already string e.g. "8:06 AM"
        check_out: log.check_out_time,
        statusLabel,
        statusColor,
        source: 'Import'
      }
    })

    // Merge and filter
    return [...machineResults, ...importedResults].filter(g => staffFilter === 'all' || g.staff_id === staffFilter)
  }, [punches, importedLogs, staffFilter])

  const exportToCSV = () => {
    const data = groupedLogs.map(g => ({
      'Staff Name': g.name,
      'ZKTeco ID': g.zkteco_id,
      'Date': selectedDate,
      'Check In': g.source === 'Machine' ? (g.check_in ? new Date(g.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-') : g.check_in,
      'Check Out': g.source === 'Machine' ? (g.check_out ? new Date(g.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-') : (g.check_out || '-'),
      'Status': g.statusLabel,
      'Source': g.source
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Punch Log")
    XLSX.writeFile(wb, `punch_log_${selectedDate}.xlsx`)
  }

  const formatTime = (isoString, source) => {
    if (!isoString) return '-'
    if (source === 'Import') return isoString
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const presentCount = groupedLogs.length

  return (
    <div className="hr-theme">
      <Navbar />
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', color: 'var(--text-primary)' }}>Punch Log</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Machine punches and imported attendance data</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-secondary" 
              onClick={fetchData}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button 
              className="btn-primary" 
              onClick={exportToCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={16} /> Export to XLSX
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'var(--accent-blue-dim)', padding: '12px', borderRadius: '12px', color: 'var(--accent-blue)' }}>
              <Calendar size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Select Date</label>
              <input 
                type="date" 
                className="input" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '12px', color: '#d97706' }}>
              <User size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Filter Staff</label>
              <select 
                className="input" 
                value={staffFilter} 
                onChange={e => setStaffFilter(e.target.value)}
              >
                <option value="all">All Staff</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.zkteco_id})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--accent-blue)', color: 'white' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ fontSize: '12px', opacity: 0.8, fontWeight: 600, textTransform: 'uppercase' }}>Total Records</p>
              <p style={{ fontSize: '24px', fontWeight: 800 }}>{presentCount}</p>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr style={{ background: '#5d4037' }}>
                  <th style={{ color: 'white', padding: '16px' }}>Staff Name</th>
                  <th style={{ color: 'white', padding: '16px' }}>ZKTeco ID</th>
                  <th style={{ color: 'white', padding: '16px' }}>Source</th>
                  <th style={{ color: 'white', padding: '16px' }}>Check In</th>
                  <th style={{ color: 'white', padding: '16px' }}>Check Out</th>
                  <th style={{ color: 'white', padding: '16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '60px' }}>
                      <div className="loader"></div>
                      <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading records...</p>
                    </td>
                  </tr>
                ) : groupedLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '60px' }}>
                      <Clock size={40} style={{ margin: '0 auto 16px', color: 'var(--text-muted)', opacity: 0.3 }} />
                      <p style={{ color: 'var(--text-muted)' }}>No records found for this date.</p>
                    </td>
                  </tr>
                ) : (
                  groupedLogs.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.name}</td>
                      <td><code>{row.zkteco_id}</code></td>
                      <td>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {row.source}
                        </span>
                      </td>
                      <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{formatTime(row.check_in, row.source)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{formatTime(row.check_out, row.source)}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '11px', 
                          fontWeight: 700,
                          background: row.statusColor + '15',
                          color: row.statusColor,
                          border: `1px solid ${row.statusColor}30`
                        }}>
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
