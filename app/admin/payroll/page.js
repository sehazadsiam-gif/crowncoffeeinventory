'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import {
  DollarSign,
  Download,
  Plus,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Edit3,
  Check,
  X
} from 'lucide-react'

export default function PayrollPage() {
  const router = useRouter()
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [staffList, setStaffList] = useState([])
  const [payrollData, setPayrollData] = useState({})
  const [loading, setLoading] = useState(false)

  // Overtime GPS Verification Queue state
  const [otAudits, setOtAudits] = useState([])
  const [loadingAudits, setLoadingAudits] = useState(false)
  const [auditFilter, setAuditFilter] = useState('flagged') // 'all' | 'flagged' | 'verified'
  const [actionMessage, setActionMessage] = useState(null)
  const [customOtModal, setCustomOtModal] = useState(null) // { audit, hours }
  const [submittingAudit, setSubmittingAudit] = useState(false)

  useEffect(() => {
    fetchStaff()
    fetchPayroll()
    fetchOtAudits()
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

  const fetchOtAudits = async () => {
    setLoadingAudits(true)
    try {
      const res = await fetch(`/api/admin/overtime/gps-audit?month=${month}&year=${year}`)
      const data = await res.json()
      if (data.success) {
        setOtAudits(data.audits || [])
      }
    } catch (err) {
      console.error('Failed to load GPS overtime audits:', err)
    } finally {
      setLoadingAudits(false)
    }
  }

  const handleApproveOt = async (attendanceId, hours, notes) => {
    setSubmittingAudit(true)
    try {
      const res = await fetch('/api/admin/overtime/gps-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId,
          approvedOvertimeHours: hours,
          notes: notes || `Admin manually approved ${hours} hrs OT`
        })
      })

      const data = await res.json()
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: `✅ Successfully approved ${hours} hrs OT for record #${attendanceId}`
        })
        fetchOtAudits()
        fetchPayroll()
        if (customOtModal) setCustomOtModal(null)
      } else {
        setActionMessage({
          type: 'error',
          text: `❌ Error: ${data.error || 'Failed to update overtime'}`
        })
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: `❌ Error: ${err.message}` })
    } finally {
      setSubmittingAudit(false)
      setTimeout(() => setActionMessage(null), 5000)
    }
  }

  const flaggedAudits = otAudits.filter(a => a.discrepancy_status === 'discrepancy')
  const verifiedAudits = otAudits.filter(a => a.discrepancy_status === 'verified')
  const displayedAudits =
    auditFilter === 'flagged'
      ? flaggedAudits
      : auditFilter === 'verified'
      ? verifiedAudits
      : otAudits

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', margin: 0 }}>
            Payroll Management
          </h1>
          <p style={{ color: '#9C8A76', margin: '4px 0 0 0' }}>
            Monthly salary calculation, tracking & GPS overtime verification queue
          </p>
        </div>

        <Link
          href="/admin/live-tracking"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#107C41',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(16, 124, 65, 0.25)'
          }}
        >
          <MapPin size={16} />
          <span>24/7 Live Radar & GPS Map</span>
        </Link>
      </div>

      {/* Month/Year selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '24px 0 32px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9C8A76', textTransform: 'uppercase', marginBottom: '4px' }}>
            Month
          </label>
          <select 
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            style={{ padding: '10px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: '#FFF' }}
          >
            {[
              { m: 1, name: 'January' },
              { m: 2, name: 'February' },
              { m: 3, name: 'March' },
              { m: 4, name: 'April' },
              { m: 5, name: 'May' },
              { m: 6, name: 'June' },
              { m: 7, name: 'July' },
              { m: 8, name: 'August' },
              { m: 9, name: 'September' },
              { m: 10, name: 'October' },
              { m: 11, name: 'November' },
              { m: 12, name: 'December' }
            ].map(({ m, name }) => (
              <option key={m} value={m}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9C8A76', textTransform: 'uppercase', marginBottom: '4px' }}>
            Year
          </label>
          <input 
            type="number" 
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            style={{ padding: '10px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', width: '110px', fontSize: '14px', fontWeight: 600, background: '#FFF' }}
          />
        </div>

        <button
          onClick={() => { fetchPayroll(); fetchOtAudits(); }}
          style={{
            marginTop: '19px',
            padding: '10px 16px',
            background: '#F5F5F5',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={14} className={loadingAudits ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '13px',
            fontWeight: 700,
            background: actionMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: actionMessage.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${actionMessage.type === 'success' ? '#A7F3D0' : '#FECACA'}`
          }}
        >
          {actionMessage.text}
        </div>
      )}

      {/* ========================================================== */}
      {/* OVERTIME GPS VERIFICATION APPROVAL QUEUE (MANUAL REVIEW)    */}
      {/* ========================================================== */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '36px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#107C41" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#1F1F1F' }}>
                Overtime GPS Verification & Flagged Claims Queue
              </h2>
              {flaggedAudits.length > 0 && (
                <span
                  style={{
                    background: '#FEF2F2',
                    color: '#DC2626',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 800,
                    border: '1px solid #FCA5A5'
                  }}
                >
                  ⚠️ {flaggedAudits.length} FLAGGED
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#9C8A76', margin: '4px 0 0 0' }}>
              Overtime is verified against GPS departure logs. Claims must be manually reviewed and approved by an admin before payroll disbursement.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setAuditFilter('flagged')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: auditFilter === 'flagged' ? '#DC2626' : '#F5F5F5',
                color: auditFilter === 'flagged' ? '#FFFFFF' : '#666'
              }}
            >
              Flagged Only ({flaggedAudits.length})
            </button>
            <button
              onClick={() => setAuditFilter('verified')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: auditFilter === 'verified' ? '#107C41' : '#F5F5F5',
                color: auditFilter === 'verified' ? '#FFFFFF' : '#666'
              }}
            >
              GPS Verified ({verifiedAudits.length})
            </button>
            <button
              onClick={() => setAuditFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: auditFilter === 'all' ? '#6B3A2A' : '#F5F5F5',
                color: auditFilter === 'all' ? '#FFFFFF' : '#666'
              }}
            >
              All Claims ({otAudits.length})
            </button>
          </div>
        </div>

        {loadingAudits ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9C8A76' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Cross-referencing GPS logs...</div>
          </div>
        ) : displayedAudits.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              background: '#F9FAFB',
              borderRadius: '8px',
              color: '#6B7280',
              fontSize: '13px'
            }}
          >
            {auditFilter === 'flagged'
              ? '🎉 No overtime discrepancies detected for this month! All claims align with GPS logs.'
              : 'No overtime records found for this period.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Staff & Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Regular Shift</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>GPS Cafe Departure</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Claimed OT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>GPS Actual OT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>GPS Audit Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>Admin Approval Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedAudits.map((item) => {
                  const isFlagged = item.discrepancy_status === 'discrepancy'
                  return (
                    <tr
                      key={item.attendance_id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        background: isFlagged ? '#FFFDFD' : '#FFFFFF'
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{item.staff_name}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          ID: {item.employee_id || 'N/A'} · {item.date}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: '#4B5563' }}>
                        <div>Start: {item.shift_start?.slice(0, 5) || '10:00'}</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>10 hr scheduled</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {item.gps_departure_time ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={14} color="#107C41" />
                            <span style={{ fontWeight: 700, color: '#111827' }}>{item.gps_departure_time}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No GPS log</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#6B3A2A' }}>
                        {item.claimed_overtime_hours} hrs
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800 }}>
                        {item.gps_verified_ot_hours !== null ? (
                          <span style={{ color: isFlagged ? '#DC2626' : '#107C41' }}>
                            {item.gps_verified_ot_hours} hrs
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>N/A</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {isFlagged ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#FEF2F2',
                              color: '#DC2626',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              border: '1px solid #FCA5A5'
                            }}
                          >
                            <AlertTriangle size={12} />
                            Flagged ({item.discrepancy_hours}h gap)
                          </span>
                        ) : item.discrepancy_status === 'verified' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#ECFDF5',
                              color: '#065F46',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              border: '1px solid #A7F3D0'
                            }}
                          >
                            <CheckCircle2 size={12} />
                            GPS Verified
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF', fontSize: '11px' }}>Manual Review</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleApproveOt(item.attendance_id, item.claimed_overtime_hours, 'Approved full claimed OT')}
                            disabled={submittingAudit}
                            title="Approve employee claimed hours"
                            style={{
                              padding: '5px 9px',
                              background: '#F3F4F6',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Claimed ({item.claimed_overtime_hours}h)
                          </button>

                          {item.gps_verified_ot_hours !== null && (
                            <button
                              onClick={() => handleApproveOt(item.attendance_id, item.gps_verified_ot_hours, `Adjusted to GPS exit time: ${item.gps_departure_time}`)}
                              disabled={submittingAudit}
                              title="Approve GPS-verified hours based on cafe departure"
                              style={{
                                padding: '5px 9px',
                                background: '#107C41',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              GPS ({item.gps_verified_ot_hours}h)
                            </button>
                          )}

                          <button
                            onClick={() => setCustomOtModal({ audit: item, hours: item.gps_verified_ot_hours ?? item.claimed_overtime_hours })}
                            disabled={submittingAudit}
                            title="Set custom overtime hours"
                            style={{
                              padding: '5px 8px',
                              background: '#FFF',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* MONTHLY PAYROLL TABLE                                      */}
      {/* ========================================================== */}
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1F1F1F', marginBottom: '16px' }}>
        Monthly Payroll Register
      </h2>
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

      {/* Custom OT Adjustment Modal */}
      {customOtModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Manual Overtime Adjustment</h3>
              <button
                onClick={() => setCustomOtModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
              Adjust approved overtime hours for <strong>{customOtModal.audit.staff_name}</strong> on {customOtModal.audit.date}.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Approved Hours:
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={customOtModal.hours}
                onChange={(e) => setCustomOtModal({ ...customOtModal, hours: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '15px',
                  fontWeight: 700
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setCustomOtModal(null)}
                style={{
                  padding: '8px 14px',
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveOt(customOtModal.audit.attendance_id, customOtModal.hours, 'Manual admin override')}
                disabled={submittingAudit}
                style={{
                  padding: '8px 16px',
                  background: '#107C41',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Save & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

