export async function exportPayrollToExcel(data, filename = 'Payroll.xlsx') {
  const XLSX = require('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll')
  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 }
  ]
  XLSX.writeFile(workbook, filename)
}

export async function exportMembersToExcel(data, filename = 'Members.xlsx') {
  const XLSX = require('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Members')
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 }
  ]
  XLSX.writeFile(workbook, filename)
}

export async function exportAttendanceToExcel(data, filename = 'Attendance.xlsx') {
  const XLSX = require('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance')
  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 }
  ]
  XLSX.writeFile(workbook, filename)
}
