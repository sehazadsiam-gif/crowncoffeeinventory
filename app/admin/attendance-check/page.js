'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function AttendanceCheckPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [attendanceData, setAttendanceData] = useState([])
  const [calculations, setCalculations] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAttendanceData()

    const channel = supabase.channel('admin_attendance_check_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_log' }, () => {
        fetchAttendanceData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [month, year])

  const fetchAttendanceData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance/diagnostic?month=${month}&year=${year}`)
      const data = await res.json()
      setAttendanceData(data.attendance || [])
      calculateMetrics(data.attendance || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (records) => {
    const metrics = {}

    records.forEach(record => {
      if (!metrics[record.staff_id]) {
        metrics[record.staff_id] = {
          staff_name: record.staff_name,
          present: 0,
          late: 0,
          absent: 0,
          morning_food: 0,
          morning_food_details: [],
          late_details: []
        }
      }

      const stat = metrics[record.staff_id]

      if (record.status === 'present') stat.present++
      if (record.status === 'late') stat.late++
      if (record.status === 'absent') stat.absent++

      // Morning food calculation
      // Logic: Check-in between 7:30 AM - 9:00 AM = 40 TK
      // Must be PRESENT or LATE (not ABSENT)
      if (record.check_in_time && (record.status === 'present' || record.status === 'late')) {
        const time = parseTime(record.check_in_time)
        if (time >= 7.5 && time <= 9.0) {
          stat.morning_food += 40
          stat.morning_food_details.push({
            date: record.date,
            time: record.check_in_time,
            amount: 40,
            status: record.status
          })
        }
      }

      // Late details
      if (record.status === 'late') {
        stat.late_details.push({
          date: record.date,
          check_in: record.check_in_time,
          status: 'LATE'
        })
      }
    })

    setCalculations(metrics)
  }

  const parseTime = (timeStr) => {
    if (!timeStr) return 0
    // Handle both "7:30 AM" and "07:30 AM" formats
    const [time, period] = timeStr.split(' ')
    if (!time || !period) return 0
    
    let [hours, mins] = time.split(':').map(Number)
    if (period === 'PM' && hours < 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return hours + mins / 60
  }

  return (
    <div style={{ padding: '32px', background: '#FAFAFA', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1F1F1F', marginBottom: '8px', fontFamily: 'Segoe UI, sans-serif' }}>
        Attendance Diagnostic
      </h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px', fontFamily: 'Segoe UI, sans-serif' }}>
        Verify morning food, late calculations, and check_in_time data
      </p>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <select 
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontFamily: 'inherit' }}
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input 
          type="number" 
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', width: '100px', fontFamily: 'inherit' }}
        />
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9C8A76' }}>Loading diagnostic data...</div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {Object.entries(calculations).length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '12px', color: '#9C8A76' }}>
              No attendance records found for this period.
            </div>
          ) : (
            Object.entries(calculations).map(([staffId, data]) => (
              <div key={staffId} style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F1F1F', marginBottom: '20px', borderBottom: '1px solid #F5F5F5', paddingBottom: '12px' }}>
                  {data.staff_name}
                </h2>

                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ background: '#E8F5E9', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#2E7D32', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRESENT</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#2E7D32' }}>{data.present}</div>
                  </div>
                  <div style={{ background: '#FFF3E0', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#F57C00', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>LATE</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#F57C00' }}>{data.late}</div>
                  </div>
                  <div style={{ background: '#FFEBEE', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#D32F2F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ABSENT</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#D32F2F' }}>{data.absent}</div>
                  </div>
                  <div style={{ background: '#E3F2FD', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#1976D2', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>MORNING FOOD</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#1976D2' }}>৳ {data.morning_food}</div>
                  </div>
                </div>

                {/* Lunch & Dinner Summary */}
                <div style={{ marginBottom: '20px', padding: '16px', background: '#F5F5F5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Lunch + Dinner Calculation
                  </div>
                  <div style={{ fontSize: '14px', color: '#5C4A36' }}>
                    Present Days: <strong>{data.present}</strong> (Late days excluded)<br/>
                    Total (৳ 120/day): <strong>৳ {(data.present * 120).toLocaleString()}</strong>
                  </div>
                </div>

                {/* Late Deduction */}
                <div style={{ marginBottom: '24px', padding: '16px', background: '#FFF3E0', borderRadius: '8px', borderLeft: '4px solid #F57C00' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F57C00', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Late Deduction Rule
                  </div>
                  <div style={{ fontSize: '14px', color: '#5C4A36' }}>
                    Late Count: <strong>{data.late}</strong><br/>
                    Calculated Cut: <strong>{Math.floor(data.late / 3)} day(s)</strong> salary<br/>
                    <span style={{ fontSize: '12px', color: '#9C8A76' }}>(Every 3 late days = 1 day salary deduction)</span>
                  </div>
                </div>

                {/* Morning Food Details */}
                {data.morning_food_details.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Morning Food Eligible Days (7:30 - 9:00 AM)
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                        <thead>
                          <tr style={{ background: '#F8F9FA' }}>
                            <th style={tableHeaderStyle}>Date</th>
                            <th style={tableHeaderStyle}>Check-in</th>
                            <th style={tableHeaderStyle}>Status</th>
                            <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.morning_food_details.map((detail, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                              <td style={tableCellStyle}>{detail.date}</td>
                              <td style={{ ...tableCellStyle, fontWeight: 700 }}>{detail.time}</td>
                              <td style={tableCellStyle}>
                                <span style={{ ...badgeStyle, background: detail.status === 'late' ? '#FFF3E0' : '#E8F5E9', color: detail.status === 'late' ? '#F57C00' : '#2E7D32' }}>
                                  {detail.status.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 700, color: '#1976D2' }}>৳ {detail.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Late Details */}
                {data.late_details.length > 0 && (
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Late Record Details
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                        <thead>
                          <tr style={{ background: '#F8F9FA' }}>
                            <th style={tableHeaderStyle}>Date</th>
                            <th style={tableHeaderStyle}>Check-in Time</th>
                            <th style={tableHeaderStyle}>Shift</th>
                            <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.late_details.map((detail, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                              <td style={tableCellStyle}>{detail.date}</td>
                              <td style={{ ...tableCellStyle, fontWeight: 700 }}>{detail.check_in}</td>
                              <td style={tableCellStyle}>
                                {getShift(detail.check_in)}
                              </td>
                              <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                                <span style={{ ...badgeStyle, background: '#FFF3E0', color: '#F57C00' }}>
                                  LATE
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )

  function getShift(timeStr) {
    if (!timeStr) return 'Unknown'
    const [time, period] = timeStr.split(' ')
    let [hours] = time.split(':').map(Number)
    if (period === 'PM' && hours < 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return hours < 14 ? 'Morning' : 'Afternoon'
  }
}

const tableHeaderStyle = {
  padding: '12px 8px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 700,
  color: '#9C8A76',
  textTransform: 'uppercase',
  borderBottom: '2px solid #F0F0F0'
}

const tableCellStyle = {
  padding: '12px 8px',
  fontSize: '13px',
  color: '#1F1F1F'
}

const badgeStyle = {
  padding: '4px 10px',
  borderRadius: '20px',
  fontSize: '10px',
  fontWeight: 700,
  display: 'inline-block'
}
