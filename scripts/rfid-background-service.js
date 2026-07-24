/**
 * Crown Coffee - Node.js RFID Background Listener Service
 * 
 * Runs in the background on the PC connected to the RFID reader.
 * Submits RFID card scans directly to ccadmin.online API.
 * 
 * Usage:
 *   node scripts/rfid-background-service.js
 * Or with PM2:
 *   pm2 start scripts/rfid-background-service.js --name "cc-rfid"
 */

const https = require('https')
const http = require('http')
const readline = require('readline')

const API_URL = process.env.ATTENDANCE_API_URL || 'https://ccadmin.online/api/attendance/checkin'
const DEVICE_KEY = process.env.ATTENDANCE_DEVICE_KEY || ''

console.log('==========================================================')
console.log(' ☕ Crown Coffee RFID Node.js Service Running')
console.log(` Target API: ${API_URL}`)
console.log(' Ready! Scan an RFID card or type digits and press Enter...')
console.log('==========================================================')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

rl.on('line', (line) => {
  const cardCode = line.trim()
  if (cardCode && cardCode.length >= 3) {
    sendCheckin(cardCode)
  }
})

function sendCheckin(cardCode) {
  const timestamp = new Date().toLocaleString()
  console.log(`[${timestamp}] 💳 Scanned RFID Card: ${cardCode}`)

  const payload = JSON.stringify({
    identifier: cardCode,
    source: 'rfid'
  })

  const urlObj = new URL(API_URL)
  const isHttps = urlObj.protocol === 'https:'
  const requestFn = isHttps ? https.request : http.request

  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'User-Agent': 'CrownCoffee-Node-RFID/1.0',
      ...(DEVICE_KEY ? { 'x-device-key': DEVICE_KEY } : {})
    }
  }

  const req = requestFn(options, (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      try {
        const json = JSON.parse(data)
        if (json.blocked) {
          console.log(`[${timestamp}] ⚠️  Check-in blocked: ${json.staff?.name || 'Staff'} completed attendance for today.`)
        } else if (json.success) {
          const name = json.staff?.name || 'Staff'
          const action = (json.action || 'recorded').toUpperCase()
          const timeDisp = json.record?.check_in || json.record?.check_out || ''
          console.log(`[${timestamp}] ✅ SUCCESS! ${name} - ${action} (${timeDisp})`)
        } else {
          console.log(`[${timestamp}] ⚠️ API Message: ${json.error || data}`)
        }
      } catch (err) {
        console.log(`[${timestamp}] ❌ Response Error: ${data}`)
      }
    })
  })

  req.on('error', (err) => {
    console.error(`[${timestamp}] ❌ Network Error:`, err.message)
  })

  req.write(payload)
  req.end()
}
