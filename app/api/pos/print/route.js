import { NextResponse } from 'next/server'
import net from 'net'

export async function POST(request) {
  try {
    const body = await request.json()
    const { type, ip, port, data, items, invoice_id, table, cashier, date } = body

    if (!ip || !data) {
      return NextResponse.json({ error: 'IP and print content (data) are required' }, { status: 400 })
    }

    // Attempt direct network printing over TCP socket
    const printPromise = new Promise((resolve, reject) => {
      const client = new net.Socket()
      const printerPort = parseInt(port) || 9100

      // Set timeout for printer connection
      client.setTimeout(3000)

      client.connect(printerPort, ip, () => {
        // Connected! Send raw ESC/POS bytes or text
        client.write(data, 'utf-8', () => {
          client.destroy()
          resolve({ success: true, method: 'tcp' })
        })
      })

      client.on('error', (err) => {
        client.destroy()
        reject(err)
      })

      client.on('timeout', () => {
        client.destroy()
        reject(new Error('Connection timeout to printer'))
      })
    })

    const result = await printPromise
    return NextResponse.json({ success: true, method: 'tcp', details: result })
  } catch (error) {
    console.warn('Direct IP printing failed, falling back to browser print:', error.message)
    // Return success: false, but instruct frontend to trigger local browser printing window
    return NextResponse.json({ 
      success: false, 
      fallback: true, 
      message: `Direct TCP printing to printer failed (${error.message}). Triggering browser print fallback.` 
    })
  }
}
