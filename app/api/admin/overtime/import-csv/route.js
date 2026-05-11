export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { validateSession } from '../../../../../lib/auth'
import { supabase } from '../../../../../lib/supabase'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader ? authHeader.replace('Bearer ', '') : null
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 })
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const employeeIndex = headers.findIndex(h => h.includes('employee'))
    const dateStartIndex = 1

    const attendanceRecords = []
    const errors = []

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(c => c.trim())
      const employeeName = cells[employeeIndex]

      if (!employeeName || employeeName === 'Not Found') continue

      const { data: staffData } = await supabase
        .from('admin_accounts')
        .select('id, username, base_salary')
        .ilike('username', `%${employeeName}%`)
        .single()
        .catch(() => ({ data: null }))

      if (!staffData) {
        errors.push(`Employee not found: ${employeeName}`)
        continue
      }

      for (let dateIdx = dateStartIndex; dateIdx < cells.length; dateIdx++) {
        const cellValue = cells[dateIdx]
        const header = headers[dateIdx]

        if (!header || !cellValue || cellValue === 'Absent' || cellValue === 'Not Found') {
          continue
        }

        if (cellValue.includes('AM') || cellValue.includes('PM')) {
          const times = cellValue.split('-').map(t => t.trim())
          if (times.length < 2) continue

          const checkInTime = parseTime(times[0])
          const checkOutTime = parseTime(times[1])

          if (!checkInTime || !checkOutTime) continue

          const dateStr = header.split(' ')[0]
          const attendanceDate = parseDate(dateStr)

          attendanceRecords.push({
            staff_id: staffData.id,
            staff_name: staffData.username,
            date: attendanceDate,
            check_in: checkInTime,
            check_out: checkOutTime,
            base_salary: staffData.base_salary
          })
        }
      }
    }

    if (attendanceRecords.length === 0) {
      return NextResponse.json({ error: 'No valid attendance records found' }, { status: 400 })
    }

    const { data: inserted, error: insertError } = await supabase
      .from('attendance')
      .upsert(
        attendanceRecords.map(r => ({
          staff_id: r.staff_id,
          date: r.date,
          check_in_time: r.check_in,
          check_out_time: r.check_out
        })),
        { onConflict: 'staff_id,date' }
      )

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: attendanceRecords.length,
      errors: errors,
      records: attendanceRecords.slice(0, 5)
    }, { status: 200 })

  } catch (error) {
    console.error('Import CSV error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function parseTime(timeStr) {
  if (!timeStr) return null

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return null

  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const period = match[3]?.toUpperCase()

  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function parseDate(dateStr) {
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return null

  const month = String(match[1]).padStart(2, '0')
  const day = String(match[2]).padStart(2, '0')
  const year = match[3]

  return `${year}-${month}-${day}`
}
