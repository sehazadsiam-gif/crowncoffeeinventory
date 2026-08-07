'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { DollarSign, Download, Plus, Eye } from 'lucide-react'

export default function PayrollPage() {
  const router = useRouter()
  const [month, setMonth] = useState(7)
  const [year, setYear] = useState(2026)
  const [staffList, setStaffList] = useState([])
  const [payrollData, setPayrollData] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStaff()
    fetchPayroll()
  }, [month, year])

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff/list?rostered_only=true')
      const data = await res.json()
      setStaffList(data.staff || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchPayroll = async () => {
    try {
      const res = await fetch(`/api/payroll/list?month=${month}&year=${year}`)
      const data = await res.json()
      const grouped = {}
      data.payroll?.forEach(p => {
        grouped[p.staff_id] = p
      })
      setPayrollData(grouped)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '32px 40px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', marginBottom: '8px' }}>
        Payroll Management
      </h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px' }}>
        Monthly salary calculation and tracking
      </p>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <select 
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px' }}
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input 
          type="number" 
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', width: '100px' }}
        />
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F5F5F5' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Staff Name</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Base Salary</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Final Salary</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map(staff => {
              const payroll = payrollData[staff.id] || {}
              return (
                <tr key={staff.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{staff.name || staff.full_name}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 700 }}>৳ {(staff.base_salary || 0).toLocaleString('en-BD')}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#6B3A2A' }}>৳ {(payroll.final_salary || 0).toLocaleString('en-BD')}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => router.push(`/admin/payroll/${staff.id}?month=${month}&year=${year}`)}
                      style={{ padding: '6px 12px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
