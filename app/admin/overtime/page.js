'use client'

import { useState } from 'react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function OvertimePage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)

  const calculateOvertime = async () => {
    setLoading(true)
    try {
      alert('Overtime calculation started')
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Overtime Management</h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px' }}>Calculate and manage staff overtime</p>

      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Month</label>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            style={{ width: '100%', padding: '10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Year</label>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))}
            style={{ width: '100%', padding: '10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px' }} />
        </div>
        <div></div>
        <button onClick={calculateOvertime} disabled={loading}
          style={{ padding: '10px 20px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </div>

      <div style={{ marginTop: '32px', padding: '40px', background: '#FDF8F4', borderRadius: '12px', textAlign: 'center', color: '#9C8A76' }}>
        Select month and year, then click Calculate to compute overtime for all staff based on attendance records.
      </div>
    </div>
  )
}
