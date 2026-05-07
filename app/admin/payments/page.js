'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Plus, TrendingUp } from 'lucide-react'

const styles = {
  container: { padding: '32px' },
  header: { marginBottom: '32px' },
  title: { fontSize: '32px', fontWeight: 800, color: '#1F1F1F', margin: '0 0 8px 0', letterSpacing: '-0.5px' },
  subtitle: { fontSize: '14px', color: '#9C8A76', margin: '0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' },
  card: { background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  statLabel: { fontSize: '12px', color: '#9C8A76', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  statValue: { fontSize: '20px', fontWeight: 800, color: '#1F1F1F', letterSpacing: '-0.5px' },
  progressBar: { height: '6px', background: '#E0E0E0', borderRadius: '3px', overflow: 'hidden', marginTop: '12px' },
  progressFill: { height: '100%', background: '#C9943A', transition: 'width 0.3s' },
  button: { width: '100%', padding: '12px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '12px', transition: 'all 0.2s' },
  badge: { display: 'inline-block', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#FFFFFF', borderRadius: '12px', padding: '32px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px rgba(0,0,0,0.15)' }
}

export default function PaymentsPage() {
  const [staffList, setStaffList] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [paymentStats, setPaymentStats] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStaff()
    fetchPaymentStats()
  }, [currentMonth, currentYear])

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff/list')
      const data = await res.json()
      setStaffList(data.staff || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchPaymentStats = async () => {
    try {
      const res = await fetch(`/api/payments/stats?month=${currentMonth}&year=${currentYear}`)
      const data = await res.json()
      setPaymentStats(data.stats || {})
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedStaff || !paymentForm.amount) {
      alert('Please fill all required fields')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/payments/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          month: currentMonth,
          year: currentYear,
          amount: parseFloat(paymentForm.amount),
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          notes: paymentForm.notes
        })
      })

      if (res.ok) {
        setShowModal(false)
        setPaymentForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', notes: '' })
        setSelectedStaff(null)
        fetchPaymentStats()
      }
    } catch (error) {
      alert('Error recording payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Salary Payments</h1>
        <p style={styles.subtitle}>Track salary payment installments per employee</p>
      </div>

      {/* Month/Year Selector */}
      <div style={{display: 'flex', gap: '16px', marginBottom: '32px'}}>
        <select 
          value={currentMonth}
          onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
          style={{padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px'}}
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input 
          type="number" 
          value={currentYear}
          onChange={(e) => setCurrentYear(parseInt(e.target.value))}
          style={{padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px', width: '100px'}}
        />
      </div>

      {/* Staff Payment Cards */}
      <div style={styles.grid}>
        {staffList.map(staff => {
          const stats = paymentStats[staff.id] || { final_salary: 0, total_paid: 0, remaining_balance: 0 }
          const progressPercent = stats.final_salary > 0 ? (stats.total_paid / stats.final_salary) * 100 : 0
          const isPaid = stats.remaining_balance === 0

          return (
            <div key={staff.id} style={{...styles.card, borderLeft: `4px solid ${isPaid ? '#2E7D32' : '#C9943A'}`}}>
              <div style={{marginBottom: '16px'}}>
                <h3 style={{fontSize: '15px', fontWeight: 700, color: '#1F1F1F', margin: '0 0 4px 0'}}>{staff.full_name}</h3>
                <p style={{fontSize: '12px', color: '#9C8A76', margin: '0'}}>Designation: {staff.designation_editable || 'N/A'}</p>
              </div>

              <div style={{background: '#F5F5F5', padding: '12px', borderRadius: '6px', marginBottom: '16px'}}>
                <div style={styles.statLabel}>Final Salary</div>
                <div style={{...styles.statValue, color: '#C9943A'}}>৳ {stats.final_salary.toLocaleString('en-BD')}</div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px'}}>
                <div style={{background: '#E8F5E9', padding: '12px', borderRadius: '6px'}}>
                  <div style={{...styles.statLabel, color: '#2E7D32'}}>Paid</div>
                  <div style={{fontSize: '16px', fontWeight: 700, color: '#2E7D32'}}>৳ {stats.total_paid.toLocaleString('en-BD')}</div>
                </div>
                <div style={{background: '#FFEBEE', padding: '12px', borderRadius: '6px'}}>
                  <div style={{...styles.statLabel, color: '#D32F2F'}}>Remaining</div>
                  <div style={{fontSize: '16px', fontWeight: 700, color: '#D32F2F'}}>৳ {stats.remaining_balance.toLocaleString('en-BD')}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={styles.progressBar}>
                <div style={{...styles.progressFill, width: `${progressPercent}%`}}></div>
              </div>
              <div style={{fontSize: '11px', color: '#9C8A76', marginTop: '6px', textAlign: 'center', fontWeight: 600}}>
                {Math.round(progressPercent)}% Paid
              </div>

              {isPaid && stats.final_salary > 0 ? (
                <div style={{...styles.badge, background: '#E8F5E9', color: '#2E7D32', width: '100%', textAlign: 'center', marginTop: '12px'}}>
                  Fully Paid
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSelectedStaff(staff)
                    setShowModal(true)
                  }}
                  style={{...styles.button, background: '#2E7D32'}}
                  onMouseEnter={(e) => e.target.style.background = '#1B5E20'}
                  onMouseLeave={(e) => e.target.style.background = '#2E7D32'}
                >
                  Record Payment
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Payment Modal */}
      {showModal && selectedStaff && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{fontSize: '20px', fontWeight: 800, color: '#1F1F1F', marginBottom: '24px', letterSpacing: '-0.5px'}}>Record Payment</h2>
            
            <div style={{marginBottom: '16px'}}>
              <label style={{fontSize: '13px', color: '#9C8A76', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Staff Name</label>
              <div style={{padding: '12px', background: '#F5F5F5', borderRadius: '6px', marginTop: '6px', color: '#1F1F1F', fontWeight: 700}}>
                {selectedStaff.full_name}
              </div>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{fontSize: '13px', color: '#9C8A76', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Final Salary</label>
              <div style={{padding: '12px', background: '#F5F5F5', borderRadius: '6px', marginTop: '6px', color: '#1F1F1F', fontWeight: 700}}>
                ৳ {(paymentStats[selectedStaff.id]?.final_salary || 0).toLocaleString('en-BD')}
              </div>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{fontSize: '13px', color: '#9C8A76', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Payment Amount (৳) *</label>
              <input 
                type="number" 
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                style={{width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '6px', marginTop: '6px', fontSize: '14px'}}
                placeholder="0"
                max={paymentStats[selectedStaff.id]?.remaining_balance || 0}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{fontSize: '13px', color: '#9C8A76', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Payment Date *</label>
              <input 
                type="date" 
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                style={{width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '6px', marginTop: '6px', fontSize: '14px'}}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{fontSize: '13px', color: '#9C8A76', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Payment Method</label>
              <select 
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                style={{width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '6px', marginTop: '6px', fontSize: '14px'}}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="check">Check</option>
              </select>
            </div>

            <div style={{marginBottom: '24px'}}>
              <label style={{fontSize: '13px', color: '#9C8A76', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Notes (Optional)</label>
              <textarea 
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                style={{width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '6px', marginTop: '6px', fontSize: '14px', fontFamily: 'inherit'}}
                rows="3"
                placeholder="Additional notes..."
              />
            </div>

            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={() => setShowModal(false)}
                style={{flex: 1, padding: '12px', background: '#E0E0E0', color: '#1F1F1F', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px'}}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={loading}
                style={{flex: 1, padding: '12px', background: '#2E7D32', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: loading ? 0.6 : 1}}
              >
                {loading ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
