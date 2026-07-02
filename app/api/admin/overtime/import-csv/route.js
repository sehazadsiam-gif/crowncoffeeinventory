export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { validateSession } from '../../../../../lib/auth'
import { supabase } from '../../../../../lib/supabase'
import { calculateStaffOvertime } from '../../../../../lib/overtime'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader ? authHeader.replace('Bearer ', '') : null
    const session = await validateSession(token)

    if (!session || (session.role !== 'admin' && session.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n')

    const headerLine = lines[4]
    if (!headerLine) {
        return NextResponse.json({ error: 'Invalid CSV format (missing header line)' }, { status: 400 })
    }
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
    
    // Detect month/year from headers or default to current
    const now = new Date()
    let importMonth = now.getMonth() + 1
    let importYear = now.getFullYear()

    // Try to find month in headers (e.g. "May")
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
    for (const h of headers) {
        const lowerH = h.toLowerCase()
        const foundMonth = months.findIndex(m => lowerH.includes(m))
        if (foundMonth !== -1) {
            importMonth = foundMonth + 1
            break
        }
    }

    const attendanceRecords = []
    const errors = []

    let currentEmployee = null
    let currentEmployeeData = null
    let dataBuffer = []

    for (let i = 5; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const cells = line.split(',').map(c => c.trim().replace(/"/g, ''))

      if (cells[0] && !cells[0].match(/^\d{1,2}/) && cells[0] !== 'Absent' && cells[0] !== 'Not Found') {
        if (currentEmployee && dataBuffer.length > 0) {
          processEmployeeData(currentEmployee, currentEmployeeData, dataBuffer, attendanceRecords, errors, headers, importMonth, importYear)
        }
        
        currentEmployee = cells[0]
        currentEmployeeData = {
          name: cells[0],
          number: cells[1],
          designation: cells[2]
        }
        dataBuffer = cells.slice(8)
      } else {
        if (dataBuffer.length > 0) {
          dataBuffer = dataBuffer.concat(cells)
        }
      }
    }

    if (currentEmployee && dataBuffer.length > 0) {
      processEmployeeData(currentEmployee, currentEmployeeData, dataBuffer, attendanceRecords, errors, headers, importMonth, importYear)
    }

    if (attendanceRecords.length === 0) {
      return NextResponse.json({ error: 'No valid attendance records found', debugInfo: { totalLines: lines.length, headerLine, headerCount: headers.length, errors } }, { status: 400 })
    }

    const { data: staffList } = await supabase
      .from('staff')
      .select('id, name')

    const attendanceToInsert = []

    for (const record of attendanceRecords) {
      // Ignore zkteco_id (ztkeo id), match by name only as requested
      // We use a more flexible name matching to ensure better hit rate
      let staff = staffList.find(s => {
        const dbName = s.name.toLowerCase().trim()
        const csvName = record.staffName.toLowerCase().trim()
        return dbName === csvName || dbName.includes(csvName) || csvName.includes(dbName)
      })

      if (staff) {
        attendanceToInsert.push({
          staff_id: staff.id,
          date: record.date,
          check_in_time: record.checkIn,
          check_out_time: record.checkOut
        })
      } else {
        errors.push(`Staff not found: ${record.staffName} (CSV Number: ${record.staffNumber})`)
      }
    }

    if (attendanceToInsert.length > 0) {
      await supabase
        .from('attendance')
        .upsert(attendanceToInsert, { onConflict: 'staff_id,date' })

      // Calculate overtime for all affected staff automatically after import
      const uniqueStaffIds = [...new Set(attendanceToInsert.map(a => a.staff_id))]
      for (const staffId of uniqueStaffIds) {
        try {
          await calculateStaffOvertime(staffId, importMonth, importYear)
        } catch (calcError) {
          console.error(`Calculation failed for staff ${staffId}:`, calcError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: attendanceToInsert.length,
      errors: errors.slice(0, 10),
      records: attendanceToInsert.slice(0, 5),
      detectedMonth: importMonth,
      detectedYear: importYear
    }, { status: 200 })

  } catch (error) {
    console.error('Import CSV error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function processEmployeeData(employeeName, employeeData, cells, attendanceRecords, errors, headers, month, year) {
  let dateIndex = 8

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
    const cell = cells[cellIndex]
    
    if (cell === 'Absent' || cell === 'Not Found' || cell === '' || cell === '-') {
      dateIndex++
      continue
    }

    if (cell && cell.includes('AM') || cell.includes('PM')) {
      const dateHeader = headers[dateIndex]
      if (!dateHeader) {
          dateIndex++
          continue
      }
      const dateMatch = dateHeader.match(/(\d{1,2})/)
      
      if (!dateMatch) {
        dateIndex++
        continue
      }

      const dayNum = parseInt(dateMatch[1])
      const date = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

      const timeMatch = cell.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/)

      if (timeMatch) {
        let inHour = parseInt(timeMatch[1])
        const inMin = parseInt(timeMatch[2])
        const inPeriod = timeMatch[3].toUpperCase()

        if (inPeriod === 'PM' && inHour !== 12) inHour += 12
        if (inPeriod === 'AM' && inHour === 12) inHour = 0

        let outHour = parseInt(timeMatch[4])
        const outMin = parseInt(timeMatch[5])
        const outPeriod = timeMatch[6].toUpperCase()

        if (outPeriod === 'PM' && outHour !== 12) outHour += 12
        if (outPeriod === 'AM' && outHour === 12) outHour = 0

        const checkIn = `${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')}`
        const checkOut = `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')}`

        attendanceRecords.push({
          staffName: employeeName,
          staffNumber: employeeData.number,
          date,
          checkIn,
          checkOut
        })
      }

      dateIndex++
    }
  }
}
