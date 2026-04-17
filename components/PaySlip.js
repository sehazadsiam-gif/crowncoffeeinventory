'use client'
import { useEffect } from 'react'

export default function PaySlip({ data, onClose }) {
  useEffect(() => {
    // Slight delay to allow render, then print
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    
    const handleAfterPrint = () => {
      onClose()
    }
    window.addEventListener('afterprint', handleAfterPrint)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [onClose])

  if (!data) return null

  const { staff, payroll, month, year } = data
  const { base_salary, per_hour_rate } = staff
  
  const earnings = [
    { label: 'Base Salary', amount: Number(base_salary) },
    { label: \`Overtime (\${payroll.overtime_hours || 0} hrs @ ৳\${Math.round(per_hour_rate)})\`, amount: Number(payroll.overtime_pay) },
    { label: 'Service Charge', amount: Number(payroll.service_charge) },
    { label: 'Bonus', amount: Number(payroll.bonus) },
    { label: 'Lunch / Dinner', amount: Number(payroll.lunch_dinner) },
    { label: 'Morning Food', amount: Number(payroll.morning_food) }
  ]
  if (Number(payroll.miscellaneous) > 0) {
    earnings.push({ label: \`Miscellaneous \${payroll.miscellaneous_note ? '('+payroll.miscellaneous_note+')' : ''}\`, amount: Number(payroll.miscellaneous) })
  }

  const deductions = [
    { label: 'Advance Taken', amount: Number(payroll.advance_taken) },
    { label: 'Others Taken', amount: Number(payroll.others_taken) }
  ]
  if (Number(payroll.miscellaneous) < 0) {
    deductions.push({ label: \`Miscellaneous \${payroll.miscellaneous_note ? '('+payroll.miscellaneous_note+')' : ''}\`, amount: Math.abs(Number(payroll.miscellaneous)) })
  }

  const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0)

  return (
    <>
      <div className="print-overlay" style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 9999, display: 'flex', justifyContent: 'center', padding: '40px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '800px', color: 'black', fontFamily: 'serif' }}>
          
          <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '20px', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '36px', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Crown Coffee</h1>
            <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 'normal' }}>SALARY SLIP</h2>
            <p style={{ fontSize: '16px', margin: '10px 0 0 0', fontWeight: 'bold' }}>{month} {year}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px', fontSize: '14px' }}>
            <div>
              <p style={{ margin: '5px 0' }}><strong>Employee Name:</strong> {staff.name}</p>
              <p style={{ margin: '5px 0' }}><strong>Designation:</strong> {staff.designation}</p>
            </div>
            <div>
              <p style={{ margin: '5px 0' }}><strong>Date of Joining:</strong> {new Date(staff.join_date).toLocaleDateString()}</p>
              <p style={{ margin: '5px 0' }}><strong>Contract Type:</strong> {staff.contract_type?.replace('_', ' ')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '40px' }}>
            {/* Earnings Table */}
            <div style={{ flex: 1 }}>
              <h3 style={{ borderBottom: '1px solid black', paddingBottom: '5px', marginBottom: '15px' }}>Earnings</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <tbody>
                  {earnings.map((e, i) => e.amount > 0 && (
                    <tr key={i}>
                      <td style={{ padding: '8px 0' }}>{e.label}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>৳{e.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid black', fontWeight: 'bold' }}>
                    <td style={{ padding: '12px 0' }}>Total Earnings</td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>৳{totalEarnings.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions Table */}
            <div style={{ flex: 1 }}>
              <h3 style={{ borderBottom: '1px solid black', paddingBottom: '5px', marginBottom: '15px' }}>Deductions</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <tbody>
                  {deductions.map((d, i) => d.amount > 0 && (
                    <tr key={i}>
                      <td style={{ padding: '8px 0' }}>{d.label}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>৳{d.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {deductions.filter(d => d.amount > 0).length === 0 && (
                    <tr>
                      <td style={{ padding: '8px 0', fontStyle: 'italic', color: '#666' }}>No deductions</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>-</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: '1px solid black', fontWeight: 'bold' }}>
                    <td style={{ padding: '12px 0' }}>Total Deductions</td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>৳{totalDeductions.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: '40px', background: '#f5f5f5', padding: '20px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>NET SALARY</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ padding: '5px 15px', border: \`2px solid \${payroll.is_paid ? '#1e8e3e' : '#d93025'}\`, color: payroll.is_paid ? '#1e8e3e' : '#d93025', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '4px' }}>
                {payroll.is_paid ? 'PAID' : 'UNPAID'}
              </span>
              <h2 style={{ margin: 0, fontSize: '28px' }}>৳{payroll.final_salary?.toLocaleString()}</h2>
            </div>
          </div>

          <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ borderTop: '1px solid black', paddingTop: '10px', width: '200px', textAlign: 'center' }}>
              Employer Signature
            </div>
            <div style={{ borderTop: '1px solid black', paddingTop: '10px', width: '200px', textAlign: 'center' }}>
              Employee Signature
            </div>
          </div>

          <div style={{ marginTop: '60px', textAlign: 'center', fontSize: '12px', color: '#666', borderTop: '1px dotted #ccc', paddingTop: '20px' }}>
            Crown Coffee Inventory and Stock Management &bull; Generated on {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-overlay, .print-overlay * { visibility: visible; }
          .print-overlay { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 0 !important; }
        }
      `}</style>
    </>
  )
}
