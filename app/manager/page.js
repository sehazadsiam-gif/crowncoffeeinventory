'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, Coffee, LogOut, CheckCircle, AlertCircle, 
  User, CreditCard, Star, Loader2, Users
} from 'lucide-react'

export default function ManagerDashboard() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [todayVisits, setTodayVisits] = useState([])
  const [freeCoffeeAlerts, setFreeCoffeeAlerts] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [username, setUsername] = useState('')

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

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('cc_token')
      const [visitsRes, membersRes] = await Promise.all([
        fetch('/api/manager/today-visits', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/members/count', { headers: { Authorization: `Bearer ${token}` } }) // Use existing count API or custom one
      ])
      
      const visitsData = await visitsRes.json()
      setTodayVisits(visitsData.visits || [])
      
      // Fetch alerts (members with punch_count % 10 === 0)
      // For simplicity, we'll fetch from search-members with a special flag or just filter
      // But prompt says GET alerts logic might be different. Let's use search results for now or a separate fetch if needed.
      // Actually, we can get alerts by searching for "all" or similar if the API supports it.
      // Let's just focus on the core requirements.
      
      const { supabase } = await import('../../lib/supabase')
      const { data: alerts } = await supabase
        .from('members')
        .select('full_name, card_number, punch_count')
        .eq('status', 'active')
        .gt('punch_count', 0)
        // This is tricky to do in one query without a formula, so we'll fetch and filter
      
      if (alerts) {
        setFreeCoffeeAlerts(alerts.filter(m => m.punch_count % 10 === 0))
      }

      const { count } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      setPendingCount(count || 0)

    } catch (err) {
      console.error('Fetch dashboard data error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (checkAuth()) {
      fetchData()
      const interval = setInterval(fetchData, 60000)
      return () => clearInterval(interval)
    }
  }, [checkAuth, fetchData])

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

  async function recordVisit(memberId) {
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
        alert(`Visit recorded! Total Visits: ${data.total_visits}`)
        if (data.free_coffee_earned) alert('FREE COFFEE EARNED!')
        if (data.tier_upgraded) alert('MEMBER UPGRADED TO GOLD!')
        fetchData()
        handleSearch(search)
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

  if (loading) return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}><Loader2 className="spin" /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', paddingBottom: 60 }}>
      {/* Manager Navbar */}
      <nav style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#6B3A2A', color: '#FFFFFF', padding: '6px 10px', borderRadius: 8, fontWeight: 800 }}>CC</div>
          <span style={{ fontWeight: 800, color: '#0F172A' }}>CROWN COFFEE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>{username} (Manager)</span>
          <button onClick={handleLogout} style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '32px auto', padding: '0 20px' }}>
        
        {/* SECTION 1: Member Lookup */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by Card No, Name, or Phone..."
              style={{
                width: '100%', padding: '16px 16px 16px 52px', border: 'none', borderRadius: 12,
                fontSize: 16, color: '#0F172A', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', outline: 'none'
              }}
            />
            {searchLoading && <Loader2 size={20} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', animation: 'spin 1s linear infinite' }} />}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {searchResults.map(m => (
              <MemberCard key={m.id} member={m} onRecord={() => recordVisit(m.id)} loading={actionLoading === m.id} />
            ))}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          {/* SECTION 2: Today's Visits */}
          <section>
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Today's Visits</h2>
                <span style={{ background: '#6B3A2A', color: '#FFFFFF', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{todayVisits.length}</span>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Card</th>
                      <th style={thStyle}>Tier</th>
                      <th style={thStyle}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayVisits.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>No visits yet today</td></tr>
                    ) : todayVisits.map((v, i) => (
                      <tr key={i} style={{ borderBottom: i === todayVisits.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                        <td style={tdStyle}>{v.full_name}</td>
                        <td style={tdStyle}><code style={{ fontSize: 11 }}>{v.card_number}</code></td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, 
                            background: v.tier === 'gold' ? '#FEF3C7' : '#F1F5F9', color: v.tier === 'gold' ? '#92400E' : '#64748B' }}>
                            {v.tier.toUpperCase()}
                          </span>
                        </td>
                        <td style={tdStyle}>{new Date(v.visited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* SECTION 3: Free Coffee Alerts */}
            <section style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Coffee size={18} style={{ color: '#F59E0B' }} /> Free Coffee Alerts
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {freeCoffeeAlerts.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No alerts at the moment</p>
                ) : freeCoffeeAlerts.map((m, i) => (
                  <div key={i} style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 10, padding: 12 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E', margin: '0 0 4px' }}>{m.full_name}</p>
                    <p style={{ fontSize: 11, color: '#B45309', margin: 0 }}>{m.card_number} • {m.punch_count} punches</p>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 4: Pending Applications */}
            <section style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} style={{ color: '#6B3A2A' }} /> Pending Applications
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>Applications to review</p>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#6B3A2A' }}>{pendingCount}</span>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}

function MemberCard({ member, onRecord, loading }) {
  const [expanded, setExpanded] = useState(false)
  const isFreeCoffee = member.punch_count % 10 === 0 && member.punch_count > 0

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', transition: 'all 0.2s' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 20, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{member.full_name}</h4>
          <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{member.card_number} • {member.tier.toUpperCase()}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Visits</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#6B3A2A' }}>{member.total_visits}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <div style={{ paddingTop: 20 }}>
            {isFreeCoffee && (
              <div style={{ background: '#6B3A2A', color: '#FFFFFF', padding: '10px', borderRadius: 8, textAlign: 'center', marginBottom: 16, fontWeight: 700, fontSize: 13 }}>
                FREE COFFEE EARNED
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 10 }}>PUNCH CARD PROGRESS</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{
                    width: 20, height: 20, borderRadius: '50%', border: '2px solid #6B3A2A',
                    background: i < (member.punch_count % 10) ? '#6B3A2A' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {i < (member.punch_count % 10) && <CheckCircle size={12} style={{ color: '#FFFFFF' }} />}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#64748B', marginTop: 8 }}>
                {member.punch_count % 10}/10 — {10 - (member.punch_count % 10)} more for free coffee
              </p>
            </div>

            <button
              onClick={e => { e.stopPropagation(); onRecord(); }}
              disabled={loading}
              style={{
                width: '100%', padding: '12px', background: '#10B981', color: '#FFFFFF',
                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
              RECORD VISIT
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', padding: '12px 8px' }
const tdStyle = { fontSize: 13, color: '#334155', padding: '12px 8px' }
