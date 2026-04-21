'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { 
  User, Wallet, CalendarDays, Receipt, Clock, 
  TrendingUp, LogOut, CheckCircle, AlertCircle, 
  ArrowLeft, Download
} from 'lucide-react'
import dynamic from 'next/dynamic'

const PaySlip = dynamic(() => import('../../../components/PaySlip'), { ssr: false })

export default function StaffPortalDashboard() {
  const [staff, setStaff] = useState(null)
  const [payroll, setPayroll] = useState([])
  const [attendance, setAttendance] = useState([])
  const [advances, setAdvances] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [printData, setPrintData] = useState(null)
  
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    const staffId = localStorage.getItem('staffPortalId')
    if (!staffId) {
      router.push('/portal')
      return
    }
    fetchPortalData(staffId)
  }, [])

  async function fetchPortalData(id) {
    try {
      setLoading(true)
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()

      const [staffRes, payRes, attRes, advRes, histRes] = await Promise.all([
        supabase.from('staff').select('*').eq('id', id).single(),
        supabase.from('payroll_entries').select('*').eq('staff_id', id).eq('month', currentMonth).eq('year', currentYear).single(),
        supabase.from('attendance').select('*').eq('staff_id', id).order('date', { ascending: false }).limit(31),
        supabase.from('advance_log').select('*').eq('staff_id', id).eq('month', currentMonth).eq('year', currentYear),
        supabase.from('salary_payments').select('*').eq('staff_id', id).eq('month', currentMonth).eq('year', currentYear)
      ])

      if (staffRes.error) throw staffRes.error
      setStaff(staffRes.data)
      setPayroll(payRes.data || null)
      setAttendance(attRes.data || [])
      setAdvances(advRes.data || [])
      setPayments(histRes.data || [])
    } catch (err) {
      console.error(err)
      addToast('Error loading your data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('staffPortalId')
    router.push('/portal')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px' }}>
        <div className="loader"></div>
      </div>
    </div>
  )

  const currentMonthName = new Date().toLocaleString('default', { month: 'long' })
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const netPay = payroll?.final_salary || 0
  const remaining = Math.max(0, netPay - totalPaid)
  const isFullyPaid = netPay > 0 && remaining === 0

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px 80px' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              width: '60px', height: '60px', borderRadius: '50%', 
              background: 'var(--accent-brown)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={30} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', color: 'var(--text-primary)', fontWeight: 700 }}>Hello, {staff?.name}!</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Welcome to your Crown Coffee dashboard</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary" style={{ fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            <LogOut size={14} /> Exit Portal
          </button>
        </div>

        {/* Progress Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          
          {/* Salary Progress */}
          <div className="card-premium" style={{ background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {currentMonthName} Earnings
              </p>
              <Wallet size={18} style={{ color: 'var(--accent-brown)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>৳{netPay.toLocaleString()}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Net Pay</p>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', margin: '12px 0' }}>
              <div style={{ 
                height: '100%', 
                width: netPay > 0 ? (totalPaid / netPay * 100) + '%' : '0%', 
                background: isFullyPaid ? 'var(--success)' : 'var(--accent-brown)', 
                borderRadius: '3px',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Paid: ৳{totalPaid.toLocaleString()}</span>
              <span style={{ fontWeight: 700, color: remaining > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {isFullyPaid ? 'Fully Paid' : `Remaining: ৳${remaining.toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="card-premium" style={{ background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Attendance Progress
              </p>
              <CalendarDays size={18} style={{ color: 'var(--accent-brown)' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {attendance.slice(0, 15).map(a => {
                let color = 'var(--success)'
                if (a.status === 'absent') color = 'var(--danger)'
                else if (a.status === 'late' || a.status === 'half_day') color = 'var(--warning)'
                return (
                  <div key={a.id} title={a.date} style={{ width: '14px', height: '14px', borderRadius: '50%', background: color }} />
                )
              })}
              {attendance.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No records yet this month</p>}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
              Showing your last 15 working days.
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Payment History */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Receipt size={18} style={{ color: 'var(--accent-brown)' }} /> Recent Payments
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {payments.map(p => (
                <div key={p.id} style={{ padding: '12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>৳{Number(p.amount).toLocaleString()}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(p.payment_date).toLocaleDateString()}</p>
                  </div>
                  <span className="badge badge-green">Received</span>
                </div>
              ))}
              {payments.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>No payments recorded yet.</p>}
            </div>
          </div>

          {/* Advance History */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={18} style={{ color: 'var(--danger)' }} /> Advances Taken
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {advances.map(a => (
                <div key={a.id} style={{ padding: '12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--danger)' }}>৳{Number(a.amount).toLocaleString()}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.reason || 'Personal advance'}</p>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(a.date).toLocaleDateString()}</span>
                </div>
              ))}
              {advances.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>No advances this month.</p>}
            </div>
          </div>
        </div>

        {/* Payslip Section */}
        {payroll && (
          <div className="card-premium" style={{ marginTop: '24px', background: 'var(--accent-brown)', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Monthly Payslip</h3>
                <p style={{ fontSize: '13px', opacity: 0.8 }}>View and download your salary breakdown for {currentMonthName}.</p>
              </div>
              <button 
                onClick={() => setPrintData({
                  staff: staff,
                  payroll: payroll,
                  month: currentMonthName,
                  year: new Date().getFullYear()
                })}
                className="btn-secondary" 
                style={{ background: 'white', border: 'none', color: 'var(--accent-brown)', fontWeight: 700 }}
              >
                <Download size={16} /> View Payslip
              </button>
            </div>
          </div>
        )}

      </main>

      {printData && (
        <PaySlip data={printData} onClose={() => setPrintData(null)} />
      )}
    </div>
  )
}
