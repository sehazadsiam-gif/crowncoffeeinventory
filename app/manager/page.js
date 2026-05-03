'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, Coffee, LogOut, CheckCircle, 
  User, CreditCard, Star, Loader2, Users, Clock
} from 'lucide-react'

export default function ManagerDashboard() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [todayVisits, setTodayVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [username, setUsername] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const checkAuth = useCallback(() => {
    const role = localStorage.getItem('cc_role')
    const user = localStorage.getItem('cc_username')
    if (role !== 'manager' && role !== 'admin') {
      router.replace('/manager/login')
      return false
    }
    setUsername(user)
    return true
  }, [router])

  const fetchTodayVisits = useCallback(async () => {
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/manager/today-visits', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      const data = await res.json()
      setTodayVisits(data.visits || [])
    } catch (err) {
      console.error('Fetch visits error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (checkAuth()) {
      fetchTodayVisits()
      const interval = setInterval(fetchTodayVisits, 60000)
      return () => clearInterval(interval)
    }
  }, [checkAuth, fetchTodayVisits])

  async function handleSearch(q) {
    setSearch(q)
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/manager/search-members?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSearchResults(data || [])
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  async function recordVisit(memberId, name) {
    setActionLoading(memberId)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/manager/record-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ member_id: memberId })
      })
      const data = await res.json()
      if (res.ok) {
        let msg = `Visit Recorded for ${name}`
        if (data.free_coffee_earned) msg += " — Free Coffee Earned!"
        setSuccessMessage(msg)
        
        // Refresh data
        fetchTodayVisits()
        handleSearch(search)
        
        // Clear message after 3s
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        alert(data.error || 'Failed to record visit')
      }
    } catch (err) {
      alert('Network error')
    } finally {
      setActionLoading(null)
    }
  }

  function handleLogout() {
    localStorage.removeItem('cc_token')
    localStorage.removeItem('cc_role')
    localStorage.removeItem('cc_username')
    router.replace('/manager/login')
  }

  if (loading && todayVisits.length === 0) return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <Loader2 className="spin" color="#6B3A2A" />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', paddingBottom: 80 }}>
      {/* Manager Navbar */}
      <nav style={{ 
        background: '#FFFFFF', 
        borderBottom: '1px solid #E2E8F0', 
        padding: '0 24px', 
        height: 64, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#6B3A2A', color: '#FFFFFF', padding: '6px 10px', borderRadius: 8, fontWeight: 800 }}>CC</div>
          <span style={{ fontWeight: 800, color: '#0F172A', letterSpacing: '0.05em' }}>MEMBERSHIP PORTAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>{username}</span>
          <button onClick={handleLogout} style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
        
        {/* SUCCESS NOTIFICATION */}
        {successMessage && (
          <div style={{
            position: 'fixed', top: 84, left: '50%', transform: 'translateX(-50%)',
            background: '#10B981', color: 'white', padding: '12px 24px', borderRadius: 12,
            fontWeight: 700, boxShadow: '0 4px 12px rgba(16,185,129,0.2)', zIndex: 1000,
            animation: 'slideDown 0.3s ease-out'
          }}>
            {successMessage}
          </div>
        )}

        {/* SECTION 1: Member Lookup */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1C1410', margin: '0 0 8px' }}>Membership Verification</h1>
          <p style={{ fontSize: 16, color: '#9C8A76' }}>Enter card number, name or phone to verify</p>
        </div>

        <section style={{ marginBottom: 48 }}>
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <Search size={24} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#9C8A76' }} />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Start typing to search members..."
              style={{
                width: '100%', padding: '20px 20px 20px 60px', border: '2px solid #E8E0D4', borderRadius: 16,
                fontSize: 18, color: '#1C1410', boxShadow: '0 4px 20px rgba(107,58,42,0.05)', outline: 'none',
                transition: 'all 0.2s ease'
              }}
              className="search-input"
            />
            {searchLoading && <Loader2 size={24} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: '#9C8A76', animation: 'spin 1s linear infinite' }} />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {searchResults.map(m => (
              <MemberCard 
                key={m.id} 
                member={m} 
                onRecord={() => recordVisit(m.id, m.full_name)} 
                loading={actionLoading === m.id} 
                justRecorded={successMessage.includes(m.full_name)}
              />
            ))}
            {search.length >= 2 && searchResults.length === 0 && !searchLoading && (
              <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: 16, color: '#9C8A76' }}>
                No members found matching "{search}"
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: Today's Visits */}
        <section style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #E8E0D4', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1C1410', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color="#6B3A2A" /> Today's Visits
            </h2>
            <span style={{ background: '#F5F0E8', color: '#6B3A2A', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
              {todayVisits.length} visits recorded today
            </span>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Card</th>
                  <th style={thStyle}>Time</th>
                </tr>
              </thead>
              <tbody>
                {todayVisits.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: '#9C8A76', fontSize: 14 }}>No visits recorded yet today</td></tr>
                ) : todayVisits.map((v, i) => (
                  <tr key={i} style={{ borderBottom: i === todayVisits.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                    <td style={tdStyle}>{v.full_name}</td>
                    <td style={tdStyle}><code style={{ fontSize: 12, color: '#6B3A2A', background: '#F5F0E8', padding: '2px 6px', borderRadius: 4 }}>{v.card_number}</code></td>
                    <td style={tdStyle}>{new Date(v.visited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .spin { animation: spin 1s linear infinite; }
        .search-input:focus { border-color: #6B3A2A !important; box-shadow: 0 4px 20px rgba(107,58,42,0.1) !important; }
      `}</style>
    </div>
  )
}

function MemberCard({ member, onRecord, loading, justRecorded }) {
  const [expanded, setExpanded] = useState(false)
  const isFreeCoffee = member.punch_count % 10 === 0 && member.punch_count > 0
  const discount = member.tier === 'gold' ? '10%' : '5%'

  useEffect(() => {
    if (justRecorded) {
      const timer = setTimeout(() => setExpanded(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [justRecorded])

  return (
    <div style={{ 
      background: '#FFFFFF', 
      borderRadius: 16, 
      border: expanded ? '2px solid #6B3A2A' : '1px solid #E8E0D4', 
      overflow: 'hidden', 
      transition: 'all 0.2s',
      boxShadow: expanded ? '0 8px 24px rgba(107,58,42,0.1)' : '0 2px 8px rgba(0,0,0,0.02)'
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h4 style={{ fontSize: 18, fontWeight: 800, color: '#1C1410', margin: 0 }}>{member.full_name}</h4>
            <span style={{ 
              fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12, 
              background: member.tier === 'gold' ? '#FEF3C7' : '#E8E0D4', 
              color: member.tier === 'gold' ? '#92400E' : '#6B3A2A',
              textTransform: 'uppercase'
            }}>
              {member.tier}
            </span>
            <span style={{ 
              fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12, 
              background: '#F0FDF4', color: '#166534'
            }}>
              Active
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <code style={{ fontSize: 14, color: '#6B3A2A', fontWeight: 600 }}>{member.card_number}</code>
            <span style={{ fontSize: 14, color: '#C9943A', fontWeight: 700 }}>{discount} Discount</span>
          </div>
        </div>
        
        <div style={{ textAlign: 'right', minWidth: 100 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9C8A76', textTransform: 'uppercase', margin: '0 0 2px' }}>Punches</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#6B3A2A', margin: 0 }}>{member.punch_count % 10}/10</p>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 24px 24px', borderTop: '1px solid #F1F5F9', background: '#FAFAFA' }}>
          <div style={{ paddingTop: 20 }}>
            {isFreeCoffee && (
              <div style={{ 
                background: '#6B3A2A', color: '#FFFFFF', padding: '14px', borderRadius: 12, 
                textAlign: 'center', marginBottom: 20, fontWeight: 800, fontSize: 14,
                letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(107,58,42,0.2)'
              }}>
                FREE COFFEE EARNED
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#9C8A76', marginBottom: 12, textTransform: 'uppercase' }}>PUNCH CARD PROGRESS</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} style={{
                      width: 24, height: 24, borderRadius: '50%', border: '2px solid #6B3A2A',
                      background: i < (member.punch_count % 10) ? '#6B3A2A' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}>
                      {i < (member.punch_count % 10) && <CheckCircle size={14} style={{ color: '#FFFFFF' }} />}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#9C8A76', marginBottom: 12, textTransform: 'uppercase' }}>STATS</p>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#1C1410', margin: 0 }}>{member.total_visits}</p>
                    <p style={{ fontSize: 11, color: '#9C8A76', margin: 0 }}>Total Visits</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#1C1410', margin: 0 }}>{member.tier === 'gold' ? '10%' : '5%'}</p>
                    <p style={{ fontSize: 11, color: '#9C8A76', margin: 0 }}>Current Disc.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={e => { e.stopPropagation(); onRecord(); }}
              disabled={loading}
              style={{
                width: '100%', padding: '16px', background: '#10B981', color: '#FFFFFF',
                border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                transition: 'all 0.2s'
              }}
              className="record-btn"
            >
              {loading ? <Loader2 size={20} className="spin" /> : <CheckCircle size={20} />}
              RECORD VISIT
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9C8A76', textTransform: 'uppercase', padding: '12px 16px' }
const tdStyle = { fontSize: 14, color: '#1C1410', padding: '16px 16px', fontWeight: 500 }
