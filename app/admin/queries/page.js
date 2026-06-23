'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { translations } from '../../../lib/i18n'
import { Moon, Sun, ArrowLeft, Check, X, RefreshCw, MessageSquare, Shield } from 'lucide-react'

export default function AdminQueriesPage() {
  const router = useRouter()
  const [lang, setLang] = useState('en')
  const [darkMode, setDarkMode] = useState(false)
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  
  // For replying
  const [replyText, setReplyText] = useState({})
  const [updatingId, setUpdatingId] = useState(null)

  const t = translations[lang]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      setDarkMode(isDark)
      if (isDark) {
        document.body.classList.add('dark-mode')
      } else {
        document.body.classList.remove('dark-mode')
      }
      
      const token = localStorage.getItem('cc_token')
      const role = localStorage.getItem('cc_role')
      if (!token || role !== 'admin') {
        router.push('/admin/login')
        return
      }
    }
    fetchQueries()
  }, [])

  const fetchQueries = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staffquery')
      const result = await res.json()
      if (result.data) {
        setQueries(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch queries:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id)
    try {
      const reply = replyText[id] || ''
      const res = await fetch('/api/staffquery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, admin_reply: reply })
      })
      if (!res.ok) throw new Error('Failed to update')
      
      // Update local state
      setQueries(queries.map(q => q.id === id ? { ...q, status: newStatus, admin_reply: reply } : q))
    } catch (err) {
      console.error(err)
      alert('Error updating status')
    } finally {
      setUpdatingId(null)
    }
  }

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (newMode) {
      document.body.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
    }
  }

  if (loading && queries.length === 0) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: darkMode ? '#0B0F19' : '#F8FAFC',
      transition: 'background-color 0.3s ease'
    }}>
      <div className="loader" style={{ width: '40px', height: '40px' }}></div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-base)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid var(--border-light)',
        backgroundColor: 'var(--bg-surface)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => router.push('/dashboard')} 
            style={{
              padding: '8px',
              borderRadius: '50%',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'var(--accent-blue-dim)', padding: '6px', borderRadius: '8px' }}>
              <Shield size={18} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {t.adminTitle}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Language Switch */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '2px',
            borderRadius: '20px',
            border: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-subtle)'
          }}>
            <button 
              onClick={() => setLang('en')} 
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                background: lang === 'en' ? 'var(--bg-surface)' : 'transparent',
                color: lang === 'en' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: lang === 'en' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('bn')} 
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                background: lang === 'bn' ? 'var(--bg-surface)' : 'transparent',
                color: lang === 'bn' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: lang === 'bn' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              BN
            </button>
          </div>
          
          {/* Dark Mode Switch */}
          <button 
            onClick={toggleDarkMode} 
            style={{
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            {darkMode ? <Sun size={18} style={{ color: 'var(--warning)' }} /> : <Moon size={18} style={{ color: 'var(--text-muted)' }} />}
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 16px 80px'
      }}>
        {/* Header Block */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
              {lang === 'bn' ? 'স্টাফদের ইনবক্স' : 'Staff Query Inbox'}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              {t.adminSubtitle}
            </p>
          </div>
          
          <button 
            onClick={fetchQueries} 
            className="btn-secondary"
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {lang === 'bn' ? 'রিফ্রেশ করুন' : 'Refresh'}
          </button>
        </div>

        {/* Query List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {queries.length === 0 ? (
            <div className="card" style={{
              padding: '60px 24px',
              textAlign: 'center',
              borderRadius: '16px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'var(--text-muted)'
              }}>
                <MessageSquare size={28} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>
                {lang === 'bn' ? 'কোনো মেসেজ নেই' : 'Inbox is Clean'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                {lang === 'bn' ? 'স্টাফদের থেকে কোনো নতুন মেসেজ পাওয়া যায়নি।' : 'No query messages have been received yet.'}
              </p>
            </div>
          ) : (
            queries.map((q) => {
              const isPending = q.status === 'Pending'
              const isApproved = q.status === 'Approved'
              const isRejected = q.status === 'Rejected'
              
              // Map types to Bangla
              const typeLabels = {
                'Requisition': lang === 'bn' ? 'রিকুইজিশন' : 'Requisition',
                'Leave Request': lang === 'bn' ? 'ছুটির আবেদন' : 'Leave Request',
                'Report Problem': lang === 'bn' ? 'সমস্যা রিপোর্ট' : 'Report Problem',
                'Other': lang === 'bn' ? 'অন্যান্য' : 'Other'
              }

              // Status badges
              let badgeClass = 'badge-gray'
              let statusText = q.status
              if (isPending) {
                badgeClass = 'badge-amber'
                statusText = lang === 'bn' ? 'অপেক্ষমান' : 'Pending'
              } else if (isApproved) {
                badgeClass = 'badge-green'
                statusText = lang === 'bn' ? 'অনুমোদিত' : 'Approved'
              } else if (isRejected) {
                badgeClass = 'badge-red'
                statusText = lang === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected'
              }

              return (
                <div key={q.id} className="card-premium" style={{
                  borderRadius: '16px',
                  border: isPending ? '1px solid var(--accent-blue-light)' : '1px solid var(--border-light)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: isPending ? '0 4px 15px rgba(37,99,235,0.05)' : 'var(--shadow-sm)'
                }}>
                  {/* Card Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid var(--border-light)',
                    paddingBottom: '14px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0' }}>
                        {q.staff_name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="badge badge-blue" style={{ fontSize: '11px', fontWeight: 700 }}>
                          {typeLabels[q.type] || q.type}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          • {new Date(q.created_at).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <span className={`badge ${badgeClass}`} style={{
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {statusText}
                    </span>
                  </div>

                  {/* Message body */}
                  <div style={{
                    fontSize: '15px',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    padding: '8px 0'
                  }}>
                    {q.message}
                  </div>

                  {/* Reply Input/History */}
                  {isPending ? (
                    <div style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid var(--border-light)',
                      marginTop: '8px'
                    }}>
                      <label style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        marginBottom: '8px',
                        letterSpacing: '0.5px'
                      }}>
                        {lang === 'bn' ? 'উত্তর লিখুন (ঐচ্ছিক)' : 'Write Reply (Optional)'}
                      </label>
                      <textarea
                        className="input"
                        placeholder={t.replyPlaceholder}
                        value={replyText[q.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [q.id]: e.target.value })}
                        style={{
                          width: '100%',
                          minHeight: '70px',
                          marginBottom: '12px',
                          borderRadius: '8px',
                          resize: 'vertical'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                          disabled={updatingId === q.id}
                          onClick={() => handleStatusChange(q.id, 'Rejected')}
                          className="btn-secondary"
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            color: 'var(--danger)',
                            borderColor: 'var(--danger)',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <X size={14} />
                          {t.btnReject}
                        </button>
                        <button
                          disabled={updatingId === q.id}
                          onClick={() => handleStatusChange(q.id, 'Approved')}
                          className="btn-primary"
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--success)',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Check size={14} />
                          {t.btnApprove}
                        </button>
                      </div>
                    </div>
                  ) : (
                    q.admin_reply && (
                      <div style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid var(--border-light)',
                        marginTop: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: isApproved ? 'var(--success)' : 'var(--danger)',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            A
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t.adminReply}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '13.5px',
                          color: 'var(--text-secondary)',
                          margin: '0 0 0 26px',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {q.admin_reply}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
