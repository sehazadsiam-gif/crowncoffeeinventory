import { supabase } from './supabase'

export function calculateHourlyRate(baseSalary) {
  return baseSalary / 30 / 10
}

export function calculateActualHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  
  const inParts = checkIn.split(':')
  const outParts = checkOut.split(':')
  
  const inHour = parseInt(inParts[0])
  const inMin = parseInt(inParts[1])
  const outHour = parseInt(outParts[0])
  const outMin = parseInt(outParts[1])
  
  const inMinutes = inHour * 60 + inMin
  const outMinutes = outHour * 60 + outMin
  
  let diff = outMinutes - inMinutes
  if (diff < 0) diff = diff + 24 * 60
  
  return parseFloat((diff / 60).toFixed(2))
}

export function calculateOvertimeHours(actualHours, shiftHours) {
  shiftHours = shiftHours || 10
  const ot = actualHours - shiftHours
  return ot > 0 ? parseFloat(ot.toFixed(2)) : 0
}

export function calculateOvertimePay(overtimeHours, hourlyRate) {
  return parseFloat((overtimeHours * hourlyRate).toFixed(2))
}
