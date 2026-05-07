'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Calendar, User, Clock, CheckCircle } from 'lucide-react'

export default function StaffRemarksPage() {
  const [remarks, setRemarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffInfo, setStaffInfo] = useState({ name: '', role: 'staff' })
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    const staffName = localStorage.getItem('cc_staff_name')
    
    if (!token || role !== 'staff') {
      router.replace('/')
      return
    }
    
    setStaffInfo({ name: staffName, role: role })
    fetchRemarks(token)
  }, [router])

  async function fetchRemarks(token) {
    try {
      const res = await fetch('/api/staff/remarks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.remarks) {
        setRemarks(data.remarks)
      }
    } catch (err) {
      console.error('Error fetching remarks:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `\${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `\${Math.floor(diffInSeconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div style={{ background: '#FAF7F2', minHeight: '100vh' }}>
      
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px' }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#6B3A2A', margin: 0 }}>My Remarks & Feedback</h1>
          <p style={{ color: '#9C8A76', fontSize: '16px', marginTop: '4px' }}>Manager comments and performance notes</p>
        </header>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
            <div className="loader"></div>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {remarks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* LATEST REMARK */}
                <div className="card fade-in" style={{ 
                  borderLeft: '6px solid #1e8e3e',
                  background: 'white',
                  padding: '32px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ background: '#e6f4ea', color: '#1e8e3e', padding: '10px', borderRadius: '12px' }}>
                        <MessageSquare size={24} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e8e3e', textTransform: 'uppercase' }}>Latest Remark</div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#1C1410' }}>{new Date(remarks[0].created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                    </div>
                    <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      <CheckCircle size={14} style={{ marginRight: '6px' }} /> Read
                    </span>
                  </div>
                  <p style={{ fontSize: '16px', color: '#5C4A36', lineHeight: 1.6, marginBottom: '24px' }}>
                    "{remarks[0].remark_text}"
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F5F0E8', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9C8A76', fontSize: '14px' }}>
                      <User size={16} /> From: <strong style={{ color: '#6B3A2A' }}>{remarks[0].created_by_name || 'Admin'}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9C8A76', fontSize: '12px' }}>
                      <Clock size={14} /> {formatTimeAgo(remarks[0].created_at)}
                    </div>
                  </div>
                </div>

                {/* TIMELINE */}
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#6B3A2A', marginTop: '24px', marginBottom: '8px' }}>Timeline</h3>
                <div style={{ position: 'relative', paddingLeft: '32px' }}>
                  <div style={{ position: 'absolute', left: '15px', top: '0', bottom: '0', width: '2px', background: '#E8E0D4' }}></div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {remarks.map((remark, index) => (
                      <div key={remark.id} className="fade-in" style={{ position: 'relative' }}>
                        <div style={{ 
                          position: 'absolute', 
                          left: '-24px', 
                          top: '20px', 
                          width: '16px', 
                          height: '16px', 
                          borderRadius: '50%', 
                          background: index === 0 ? '#1e8e3e' : '#C9943A',
                          border: '4px solid #FAF7F2'
                        }}></div>
                        
                        <div className="card" style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9C8A76', fontSize: '13px', fontWeight: '600' }}>
                              <Calendar size={14} /> {new Date(remark.created_at).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: '12px', color: '#1e8e3e', fontWeight: '700' }}>✓ Read</div>
                          </div>
                          <p style={{ fontSize: '14px', color: '#5C4A36', lineHeight: 1.5 }}>{remark.remark_text}</p>
                          <div style={{ marginTop: '12px', fontSize: '12px', color: '#9C8A76' }}>
                            From: {remark.created_by_name || 'Admin'} • {formatTimeAgo(remark.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 40px' }} className="card">
                <MessageSquare size={64} color="#E8E0D4" style={{ marginBottom: '24px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#6B3A2A' }}>No remarks yet</h3>
                <p style={{ color: '#9C8A76', maxWidth: '300px', margin: '12px auto' }}>Keep up the good work! Your performance feedback will appear here.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx global>{\`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @media (max-width: 768px) {
          main {
            margin-left: 0 !important;
            padding: 80px 20px 40px !important;
          }
        }
      \`}</style>
    </div>
  )
}
