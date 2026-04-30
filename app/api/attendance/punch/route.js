import { supabase } from '../../../../lib/supabase'

export async function GET(request) {
  return new Response('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  })
}

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let punches = []

    if (contentType.includes('application/json')) {
      // JSON format from bridge script
      const body = await request.json()
      if (body.userId && body.punchTime) {
        punches.push({
          userId: String(body.userId),
          punchTime: body.punchTime,
          status: body.status || '0'
        })
      }
    } else {
      // ADMS format from ZKTeco direct push
      const body = await request.text()
      console.log('ADMS push received:', body)

      const lines = body.split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        if (line.startsWith('table=') || line.startsWith('Stamp=')) continue
        const parts = line.trim().split('\t')
        if (parts.length >= 2) {
          punches.push({
            userId: parts[0]?.trim(),
            punchTime: parts[1]?.trim(),
            status: parts[2]?.trim() || '0'
          })
        }
      }

      const attLogMatch = body.match(/AttLog=([^\n&]+)/)
      if (attLogMatch) {
        const logParts = attLogMatch[1].split('\t')
        if (logParts.length >= 2) {
          punches.push({
            userId: logParts[0]?.trim(),
            punchTime: logParts[1]?.trim(),
            status: logParts[2]?.trim() || '0'
          })
        }
      }
    }

    for (const punch of punches) {
      if (!punch.userId || !punch.punchTime) continue

      const punchDate = new Date(punch.punchTime)
      if (isNaN(punchDate.getTime())) continue

      const dateStr = punchDate.toISOString().split('T')[0]
      const hour = punchDate.getHours()
      const minute = punchDate.getMinutes()
      const timeInMinutes = hour * 60 + minute

      // Find staff by zkteco_id
      const { data: staffMember } = await supabase
        .from('staff')
        .select('id, name')
        .eq('zkteco_id', parseInt(punch.userId))
        .single()

      // Determine punch type
      let punchType = 'check_in'
      if (timeInMinutes >= 1140) {
        punchType = 'check_out'
      } else if (timeInMinutes >= 720) {
        punchType = 'check_in' // afternoon shift check in
      }

      // Store punch in attendance_punches table
      await supabase.from('attendance_punches').insert([{
        staff_id: staffMember?.id || null,
        zkteco_id: parseInt(punch.userId),
        punch_time: punchDate.toISOString(),
        punch_date: dateStr,
        punch_type: punchType,
        raw_data: JSON.stringify(punch)
      }])

      // Determine attendance status
      let status = 'present'
      if (timeInMinutes >= 1140) {
        // Check-out punch, skip attendance marking
        continue
      } else if (timeInMinutes > 855) {
        status = 'late' // after 2:15 PM
      } else if (timeInMinutes >= 840) {
        status = 'present' // 2:00-2:15 PM on time
      } else if (timeInMinutes > 495) {
        status = 'late' // after 8:15 AM
      } else {
        status = 'present' // before 8:15 AM on time
      }

      if (staffMember) {
        await supabase.from('attendance').upsert({
          staff_id: staffMember.id,
          date: dateStr,
          status: status,
          note: 'Auto via fingerprint at ' + punch.punchTime
        }, { onConflict: 'staff_id,date' })

        console.log('Attendance marked:', staffMember.name, dateStr, status)
      }
    }

    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })

  } catch (error) {
    console.error('Punch error:', error)
    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
