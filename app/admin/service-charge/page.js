'use client'

import { useState, useEffect } from 'react'
import { DollarSign, AlertCircle, Check } from 'lucide-react'

const styles = {
  container: { padding: '32px' },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#1F1F1F',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#9C8A76',
    margin: '0'
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#9C8A76',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '16px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  inputLabel: {
    fontSize: '13px',
    color: '#9C8A76',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    display: 'block'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 700,
    color: '#1F1F1F',
    background: '#F5F5F5',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #E0E0E0'
  },
  td: {
    padding: '14px 12px',
    borderBottom: '1px solid #E0E0E0',
    fontSize: '14px'
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#6B3A2A',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  buttonHover: {
    background: '#8B5E3C',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }
}

export default function ServiceChargePage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [totalAmount, setTotalAmount] = useState('')
  const [distributionMethod, setDistributionMethod] = useState('equal')
  const [allocations, setAllocations] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff/list')
      const data = await res.json()
      setStaffList(data.staff || [])
    } catch (error) {
      setMessage('Error loading staff')
    }
  }

  const handleAmountChange = (e) => {
    const amount = parseFloat(e.target.value) || 0
    setTotalAmount(amount)

    if (distributionMethod === 'equal' && staffList.length > 0) {
      const perStaff = Math.floor(amount / staffList.length)
      const newAllocations = staffList.map(s => ({
        staff_id: s.id,
        staff_name: s.full_name,
        amount: perStaff,
        percentage: amount > 0 ? Math.round((perStaff / amount) * 100) : 0
      }))
      setAllocations(newAllocations)
    }
  }

  const handleDistribute = async () => {
    if (!totalAmount || allocations.length === 0) {
      setMessage('Please enter amount and ensure allocations are set')
      return
    }

    setLoading(true)
    setMessage('')
    
    try {
      const res = await fetch('/api/service-charge/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          year,
          total_amount: totalAmount,
          distribution_method: distributionMethod,
          allocations: allocations.map(a => ({
            staff_id: a.staff_id,
            amount: a.amount
          }))
        })
      })

      if (res.ok) {
        setMessage('✓ Service charge distributed successfully')
        setTimeout(() => {
          setTotalAmount('')
          setAllocations([])
          setMessage('')
        }, 2000)
      } else {
        setMessage('Error distributing service charge')
      }
    } catch (error) {
      setMessage('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMethodChange = (method) => {
    setDistributionMethod(method)
    if (method === 'equal' && totalAmount && staffList.length > 0) {
      const perStaff = Math.floor(totalAmount / staffList.length)
      const newAllocations = staffList.map(s => ({
        staff_id: s.id,
        staff_name: s.full_name,
        amount: perStaff,
        percentage: Math.round((perStaff / totalAmount) * 100)
      }))
      setAllocations(newAllocations)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Service Charge Distribution</h1>
        <p style={styles.subtitle}>Distribute monthly service charge among staff members</p>
      </div>

      {message && (
        <div style={{...styles.card, background: message.includes('✓') ? '#E8F5E9' : '#FFEBEE', borderLeft: `4px solid ${message.includes('✓') ? '#2E7D32' : '#D32F2F'}`}}>
          <div style={{color: message.includes('✓') ? '#2E7D32' : '#D32F2F', fontSize: '14px', fontWeight: 600}}>
            {message}
          </div>
        </div>
      )}

      {/* Input Section */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Configuration</div>
        
        <div style={styles.grid}>
          <div>
            <label style={styles.inputLabel}>Total Amount (৳)</label>
            <input 
              type="number" 
              value={totalAmount}
              onChange={handleAmountChange}
              style={styles.input}
              placeholder="0"
            />
          </div>
          <div>
            <label style={styles.inputLabel}>Month</label>
            <select 
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              style={styles.input}
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.inputLabel}>Year</label>
            <input 
              type="number" 
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              style={styles.input}
            />
          </div>
        </div>

        <div style={{marginTop: '24px'}}>
          <div style={styles.sectionTitle}>Distribution Method</div>
          <div style={{display: 'flex', gap: '16px'}}>
            {['equal', 'custom'].map(method => (
              <label key={method} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 14px', background: distributionMethod === method ? '#F5F5F5' : 'transparent', borderRadius: '6px', border: `2px solid ${distributionMethod === method ? '#6B3A2A' : '#E0E0E0'}`, transition: 'all 0.2s'}}>
                <input 
                  type="radio" 
                  name="method"
                  value={method}
                  checked={distributionMethod === method}
                  onChange={() => handleMethodChange(method)}
                  style={{cursor: 'pointer'}}
                />
                <span style={{fontSize: '14px', fontWeight: 600, color: '#1F1F1F', textTransform: 'capitalize'}}>
                  {method === 'equal' ? 'Equal Split' : 'Custom'}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Allocations Preview */}
      {allocations.length > 0 && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Allocation Preview</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{...styles.th, textAlign: 'left'}}>Staff Name</th>
                <th style={{...styles.th, textAlign: 'right'}}>Amount (৳)</th>
                <th style={{...styles.th, textAlign: 'right'}}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{alloc.staff_name}</td>
                  <td style={{...styles.td, textAlign: 'right', fontWeight: 600}}>৳ {alloc.amount.toLocaleString('en-BD')}</td>
                  <td style={{...styles.td, textAlign: 'right', fontWeight: 600}}>{alloc.percentage}%</td>
                </tr>
              ))}
              <tr style={{background: '#F5F5F5', fontWeight: 700}}>
                <td style={{...styles.td, fontWeight: 700}}>Total</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 700}}>৳ {allocations.reduce((sum, a) => sum + a.amount, 0).toLocaleString('en-BD')}</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 700}}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleDistribute}
        disabled={loading || !totalAmount}
        style={{
          ...styles.button,
          opacity: loading || !totalAmount ? 0.6 : 1,
          cursor: loading || !totalAmount ? 'not-allowed' : 'pointer'
        }}
        onMouseEnter={(e) => {
          if (!loading && totalAmount) {
            Object.assign(e.target.style, styles.buttonHover)
          }
        }}
        onMouseLeave={(e) => {
          Object.assign(e.target.style, {background: '#6B3A2A', transform: 'none'})
        }}
      >
        {loading ? 'Distributing...' : 'Distribute Service Charge'}
      </button>
    </div>
  )
}