'use client'

import { useState, useEffect } from 'react'

export default function RemarksPage() {
  const [remarks, setRemarks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRemarks()
  }, [])

  const fetchRemarks = async () => {
    try {
      const token = localStorage.getItem('cc_token')
      const staffId = localStorage.getItem('cc_staff_id')
      
      const res = await fetch(`/api/staff/${staffId}/remarks`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setRemarks(data.remarks || [])
    } catch (error) {
      console.error('Error fetching remarks:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', marginBottom: '8px' }}>
        My Remarks & Feedback
      </h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px' }}>
        Manager comments and performance notes
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9C8A76' }}>
          Loading remarks...
        </div>
      ) : remarks.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#9C8A76' }}>
          No remarks yet. Keep up the good work!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {remarks.map((remark, idx) => (
            <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #6B3A2A' }}>
              <div style={{ fontSize: '12px', color: '#9C8A76', fontWeight: 600, marginBottom: '8px' }}>
                {new Date(remark.created_at).toLocaleDateString()}
              </div>
              <p style={{ fontSize: '14px', color: '#1F1F1F', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                {remark.remark_text}
              </p>
              <div style={{ fontSize: '12px', color: '#9C8A76' }}>
                From: {remark.admin_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
