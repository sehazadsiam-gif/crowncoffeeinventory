'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import { Search, X, Check, Eye, Send, Ban, Star, Coffee, AlertCircle, TrendingUp, Calendar, MessageSquare, UserPlus, Users } from 'lucide-react'

const MONTHS_EN = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function AdminMembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, newThisMonth: 0, visitsThisMonth: 0, avgRating: 0 })
  const [widgets, setWidgets] = useState({ upcomingDates: [], reEngage: [], tierUpgrade: [], feedbackStats: [] })
  const [detailModal, setDetailModal] = useState(null)
  const [offerModal, setOfferModal] = useState(null)
  const [memberDetails, setMemberDetails] = useState({})
  const [offerForm, setOfferForm] = useState({ subject: '', message: '', discount_percent: 10, valid_days: 7 })
  const [actionLoading, setActionLoading] = useState(null)

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('cc_token') : null

  const fetchMembers = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) { router.replace('/'); return }
      const { supabase } = await import('../../../lib/supabase')

      const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setMembers(data || [])

      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [visitsRes, feedbackRes, specialDatesRes] = await Promise.all([
        supabase.from('member_visits').select('visited_at').gte('visited_at', firstOfMonth),
        supabase.from('member_feedback').select('rating, created_at'),
        supabase.from('member_special_dates').select('*, members(full_name, card_number, email)').order('month').order('day')
      ])

      const visitsThisMonth = visitsRes.data?.length || 0
      const ratings = feedbackRes.data || []
      const avgRating = ratings.length ? (ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length).toFixed(1) : 0

      setStats({
        total: data.length,
        active: data.filter(m => m.status === 'active').length,
        pending: data.filter(m => m.status === 'pending').length,
        newThisMonth: data.filter(m => m.created_at >= firstOfMonth).length,
        visitsThisMonth,
        avgRating
      })

      const upcoming = specialDatesRes.data?.filter(sd => {
        const date = new Date(now.getFullYear(), sd.month - 1, sd.day)
        const diff = (date - now) / (1000 * 60 * 60 * 24)
        return diff >= 0 && diff <= 7
      }) || []

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recentVisits } = await supabase
        .from('member_visits')
        .select('member_id')
        .gte('visited_at', thirtyDaysAgo)

      const recentIds = new Set((recentVisits || []).map(v => v.member_id))
      const reEngage = (data || []).filter(m => m.status === 'active' && m.total_visits > 0 && !recentIds.has(m.id)).slice(0, 5)

      const lastThreeMonths = [0, 1, 2].map(offset => {
        const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
        return { month: d.getMonth() + 1, year: d.getFullYear() }
      })

      const feedbackStatsList = await Promise.all(lastThreeMonths.map(async ({ month, year }) => {
        const start = new Date(year, month - 1, 1).toISOString()
        const end = new Date(year, month, 0, 23, 59, 59).toISOString()
        const { data: fb } = await supabase.from('member_feedback').select('rating').gte('created_at', start).lte('created_at', end)
        const avg = fb?.length ? (fb.reduce((s, f) => s + (f.rating || 0), 0) / fb.length).toFixed(1) : null
        const label = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
        return { month: label, avg, count: fb?.length || 0 }
      }))

      setWidgets({
        upcomingDates: upcoming,
        reEngage,
        tierUpgrade: (data || []).filter(m => m.status === 'active' && m.tier === 'silver' && m.total_visits >= 25),
        feedbackStats: feedbackStatsList.filter(f => f.count > 0)
      })

    } catch (err) {
      console.error('Fetch members error:', err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  async function handleApprove(memberId) {
    setActionLoading(memberId)
    try {
      const res = await fetch('/api/members/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ member_id: memberId })
      })
      const data = await res.json()
      if (res.ok) { alert(`Approved! Card: ${data.card_number}`); fetchMembers() }
      else alert(data.error || 'Failed')
    } catch { alert('Network error') }
    finally { setActionLoading(null) }
  }

  async function handleSendTierUpgrade(memberId) {
    setActionLoading(memberId)
    try {
      const res = await fetch('/api/members/send-tier-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ member_id: memberId })
      })
      if (res.ok) { alert('Upgrade email sent!'); fetchMembers() }
      else { const d = await res.json(); alert(d.error || 'Failed') }
    } catch { alert('Error') }
    finally { setActionLoading(null) }
  }

  async function handleReject(memberId) {
    if (!confirm('Reject this application?')) return
    setActionLoading(memberId)
    try {
      const { supabase } = await import('../../../lib/supabase')
      await supabase.from('members').update({ status: 'rejected' }).eq('id', memberId)
      fetchMembers()
    } catch { alert('Error') }
    finally { setActionLoading(null) }
  }

  async function handleDeactivate(memberId) {
    if (!confirm('Deactivate this member?')) return
    setActionLoading(memberId)
    try {
      const { supabase } = await import('../../../lib/supabase')
      await supabase.from('members').update({ status: 'inactive' }).eq('id', memberId)
      fetchMembers()
    } catch { alert('Error') }
    finally { setActionLoading(null) }
  }

  async function openDetailModal(member) {
    setDetailModal(member)
    try {
      const { supabase } = await import('../../../lib/supabase')
      const [dates, visits, feedback] = await Promise.all([
        supabase.from('member_special_dates').select('*').eq('member_id', member.id),
        supabase.from('member_visits').select('*').eq('member_id', member.id).order('visited_at', { ascending: false }).limit(10),
        supabase.from('member_feedback').select('*').eq('member_id', member.id)
      ])
      setMemberDetails({
        special_dates: dates.data || [],
        visits: visits.data || [],
        feedback: feedback.data || [],
        avgRating: feedback.data?.length
          ? (feedback.data.reduce((s, f) => s + (f.rating || 0), 0) / feedback.data.length).toFixed(1)
          : 'N/A'
      })
    } catch { setMemberDetails({}) }
  }

  async function handleSendOffer() {
    if (!offerModal || !offerForm.subject || !offerForm.message) {
      alert('Fill in subject and message')
      return
    }
    setActionLoading('offer')
    try {
      const res = await fetch('/api/members/send-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ member_id: offerModal.id, ...offerForm })
      })
      if (res.ok) {
        alert('Offer sent!')
        setOfferModal(null)
        setOfferForm({ subject: '', message: '', discount_percent: 10, valid_days: 7 })
      } else {
        const d = await res.json()
        alert(d.error || 'Failed')
      }
    } catch { alert('Network error') }
    finally { setActionLoading(null) }
  }

  const filtered = members.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        m.card_number?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 20px', background: '#FAF7F2', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1C1410', marginBottom: 24 }}>Member Management</h1>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard label="Active Members" value={stats.active} icon={<Users size={20} />} color="#1e8e3e" />
          <StatCard label="New This Month" value={stats.newThisMonth} icon={<UserPlus size={20} />} color="#8B5E3C" />
          <StatCard label="Visits This Month" value={stats.visitsThisMonth} icon={<TrendingUp size={20} />} color="#6B3A2A" />
          <StatCard label="Average Rating" value={`${stats.avgRating} / 5`} icon={<Star size={20} />} color="#C9943A" />
          <StatCard label="Pending" value={stats.pending} icon={<AlertCircle size={20} />} color={stats.pending > 0 ? '#d93025' : '#9C8A76'} highlight={stats.pending > 0} />
        </div>

        {/* Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 36 }}>

          {/* Upcoming Dates */}
          <Widget title="Upcoming Special Dates (7 Days)" icon={<Calendar size={16} />}>
            {widgets.upcomingDates.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9C8A76', textAlign: 'center', padding: '16px 0' }}>No upcoming dates</p>
            ) : (
              <table style={widgetTable}>
                <thead>
                  <tr>
                    <th style={wTh}>Name</th>
                    <th style={wTh}>Occasion</th>
                    <th style={wTh}>Date</th>
                    <th style={wTh}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {widgets.upcomingDates.map((sd, i) => (
                    <tr key={i}>
                      <td style={wTd}>{sd.members?.full_name}</td>
                      <td style={wTd}>{sd.occasion_name}</td>
                      <td style={wTd}>{sd.day} {MONTHS_EN[sd.month]}</td>
                      <td style={wTd}>
                        <button
                          onClick={() => setOfferModal({ id: sd.member_id, full_name: sd.members?.full_name })}
                          style={wBtn}
                        >
                          <Send size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Widget>

          {/* Tier Upgrades */}
          <Widget title="Ready for Gold Upgrade" icon={<TrendingUp size={16} />}>
            {widgets.tierUpgrade.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9C8A76', textAlign: 'center', padding: '16px 0' }}>No upgrades pending</p>
            ) : (
              <table style={widgetTable}>
                <thead>
                  <tr>
                    <th style={wTh}>Name</th>
                    <th style={wTh}>Visits</th>
                    <th style={wTh}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {widgets.tierUpgrade.map((m, i) => (
                    <tr key={i}>
                      <td style={wTd}>{m.full_name}</td>
                      <td style={wTd}>{m.total_visits}</td>
                      <td style={wTd}>
                        <button
                          onClick={() => handleSendTierUpgrade(m.id)}
                          disabled={actionLoading === m.id}
                          style={wBtn}
                        >
                          {actionLoading === m.id ? '...' : 'Upgrade'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Widget>

          {/* Re-engage */}
          <Widget title="Not Visited in 30 Days" icon={<AlertCircle size={16} />}>
            {widgets.reEngage.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9C8A76', textAlign: 'center', padding: '16px 0' }}>All members active</p>
            ) : (
              <table style={widgetTable}>
                <thead>
                  <tr>
                    <th style={wTh}>Name</th>
                    <th style={wTh}>Visits</th>
                    <th style={wTh}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {widgets.reEngage.map((m, i) => (
                    <tr key={i}>
                      <td style={wTd}>{m.full_name}</td>
                      <td style={wTd}>{m.total_visits}</td>
                      <td style={wTd}>
                        <button onClick={() => setOfferModal(m)} style={wBtn}>
                          <Send size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Widget>

          {/* Feedback */}
          <Widget title="Feedback Performance" icon={<MessageSquare size={16} />}>
            {widgets.feedbackStats.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9C8A76', textAlign: 'center', padding: '16px 0' }}>No feedback yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {widgets.feedbackStats.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F0EBE3' }}>
                    <span style={{ fontSize: 13, color: '#5C4A36' }}>{f.month}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#C9943A' }}>{f.avg} / 5</span>
                      <p style={{ fontSize: 11, color: '#9C8A76', margin: 0 }}>{f.count} ratings</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Widget>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: '#F5F0E8', borderRadius: 8, padding: 4 }}>
            {['all', 'pending', 'active', 'inactive'].map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '7px 16px', borderRadius: 6, border: 'none',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  textTransform: 'uppercase',
                  background: filter === t ? '#8B5E3C' : 'transparent',
                  color: filter === t ? 'white' : '#9C8A76'
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9C8A76' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, card..."
              style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #E8E0D4', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white' }}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="loader" /></div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: 10, overflow: 'auto', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#F5F0E8' }}>
                  {['Name', 'Card No', 'Email', 'Phone', 'Tier', 'Visits', 'Status', 'Applied', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9C8A76', fontSize: 14 }}>
                      No members found
                    </td>
                  </tr>
                ) : filtered.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                    <td style={tdStyle}><span style={{ fontWeight: 600, color: '#1C1410' }}>{m.full_name}</span></td>
                    <td style={tdStyle}>
                      <code style={{ background: '#F5F0E8', padding: '2px 6px', borderRadius: 4, fontSize: 12, color: '#6B3A2A' }}>
                        {m.card_number || '-'}
                      </code>
                    </td>
                    <td style={tdStyle}>{m.email}</td>
                    <td style={tdStyle}>{m.phone}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: m.tier === 'gold' ? '#fef7e0' : '#F5F0E8',
                        color: m.tier === 'gold' ? '#C9943A' : '#9C8A76'
                      }}>
                        {(m.tier || 'silver').toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>{m.total_visits}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: m.status === 'active' ? '#e6f4ea' : m.status === 'pending' ? '#fef7e0' : '#fce8e6',
                        color: m.status === 'active' ? '#1e8e3e' : m.status === 'pending' ? '#B07830' : '#d93025'
                      }}>
                        {m.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td style={tdStyle}>
                      {m.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(m.id)} disabled={actionLoading === m.id} style={btnApprove}>
                            {actionLoading === m.id ? '...' : 'Approve'}
                          </button>
                          <button onClick={() => handleReject(m.id)} disabled={actionLoading === m.id} style={btnReject}>
                            Reject
                          </button>
                        </>
                      )}
                      {m.status === 'active' && (
                        <>
                          <button onClick={() => openDetailModal(m)} style={btnAction}>View</button>
                          <button onClick={() => setOfferModal(m)} style={btnAction}>Offer</button>
                          <button onClick={() => handleDeactivate(m.id)} style={btnAction}>Deactivate</button>
                        </>
                      )}
                      {m.status === 'inactive' && (
                        <span style={{ fontSize: 12, color: '#9C8A76' }}>Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div style={overlayStyle} onClick={() => setDetailModal(null)}>
          <div style={{ ...modalStyle, maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#6B3A2A', margin: 0 }}>{detailModal.full_name}</h2>
              <button onClick={() => setDetailModal(null)} style={closeBtn}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                ['Card Number', detailModal.card_number || '-'],
                ['Tier', (detailModal.tier || 'silver').toUpperCase()],
                ['Email', detailModal.email],
                ['Phone', detailModal.phone],
                ['Total Visits', detailModal.total_visits],
                ['Member Since', detailModal.member_since ? new Date(detailModal.member_since).toLocaleDateString('en-GB') : '-']
              ].map(([l, v], i) => (
                <div key={i} style={{ background: '#F5F0E8', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9C8A76', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1410', margin: 0 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Punch Card */}
            <div style={{ background: '#F5F0E8', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6B3A2A' }}>
                  Punch Card ({(detailModal.punch_count || 0) % 10}/10)
                </span>
                <Coffee size={16} color="#6B3A2A" />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: '2px solid #8B5E3C',
                    background: i < ((detailModal.punch_count || 0) % 10) ? '#8B5E3C' : 'transparent'
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#9C8A76', marginTop: 8 }}>
                {10 - ((detailModal.punch_count || 0) % 10)} more visits for free coffee
              </p>
            </div>

            {/* Gold Upgrade Progress */}
            <div style={{ background: '#F5F0E8', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6B3A2A', marginBottom: 8 }}>
                Gold Upgrade ({Math.min(detailModal.total_visits || 0, 25)}/25 visits)
              </p>
              <div style={{ background: '#E8E0D4', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(((detailModal.total_visits || 0) / 25) * 100, 100)}%`,
                  height: '100%', background: '#C9943A', borderRadius: 20
                }} />
              </div>
              {detailModal.tier === 'silver' && (detailModal.total_visits || 0) >= 25 && (
                <button
                  onClick={() => handleSendTierUpgrade(detailModal.id)}
                  disabled={actionLoading === detailModal.id}
                  style={{ marginTop: 12, width: '100%', padding: 10, background: '#C9943A', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                >
                  {actionLoading === detailModal.id ? 'Sending...' : 'Send Gold Upgrade Email'}
                </button>
              )}
            </div>

            {/* Special Dates */}
            {memberDetails.special_dates?.length > 0 && (
              <div style={{ background: '#F5F0E8', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#6B3A2A', marginBottom: 10 }}>Special Dates</p>
                {memberDetails.special_dates.map((sd, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #E8E0D4' }}>
                    <span style={{ color: '#5C4A36' }}>{sd.occasion_name}</span>
                    <span style={{ color: '#9C8A76' }}>{sd.day} {MONTHS_EN[sd.month]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Visit History */}
            {memberDetails.visits?.length > 0 && (
              <div style={{ background: '#F5F0E8', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#6B3A2A', marginBottom: 10 }}>Recent Visits</p>
                {memberDetails.visits.map((v, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #E8E0D4' }}>
                    <span style={{ color: '#5C4A36' }}>
                      {new Date(v.visited_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{ color: '#9C8A76' }}>{v.recorded_by}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Average Rating */}
            {memberDetails.avgRating && memberDetails.avgRating !== 'N/A' && (
              <div style={{ background: '#fef7e0', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#B07830' }}>Average Feedback Rating</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#C9943A' }}>{memberDetails.avgRating} / 5</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {offerModal && (
        <div style={overlayStyle} onClick={() => setOfferModal(null)}>
          <div style={{ ...modalStyle, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#6B3A2A', margin: 0 }}>
                Send Offer to {offerModal.full_name}
              </h2>
              <button onClick={() => setOfferModal(null)} style={closeBtn}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Subject</label>
                <input
                  value={offerForm.subject}
                  onChange={e => setOfferForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Special offer for you!"
                  style={formInput}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Message</label>
                <textarea
                  value={offerForm.message}
                  onChange={e => setOfferForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Write your offer message..."
                  rows={4}
                  style={{ ...formInput, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Discount %</label>
                  <input type="number" value={offerForm.discount_percent} onChange={e => setOfferForm(f => ({ ...f, discount_percent: e.target.value }))} style={formInput} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Valid Days</label>
                  <input type="number" value={offerForm.valid_days} onChange={e => setOfferForm(f => ({ ...f, valid_days: e.target.value }))} style={formInput} />
                </div>
              </div>
              <button
                onClick={handleSendOffer}
                disabled={actionLoading === 'offer'}
                style={{ padding: 12, background: actionLoading === 'offer' ? '#D4C8B8' : '#8B5E3C', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
              >
                {actionLoading === 'offer' ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StatCard({ label, value, icon, color, highlight }) {
  return (
    <div style={{
      background: 'white',
      border: highlight ? `2px solid ${color}` : '1px solid #E8E0D4',
      borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(28,20,16,0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: '#9C8A76', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ color }}>{icon}</div>
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color: '#1C1410', margin: 0 }}>{value}</p>
    </div>
  )
}

function Widget({ title, icon, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E8E0D4', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1410', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px 0' }}>
        <span style={{ color: '#8B5E3C' }}>{icon}</span> {title}
      </h3>
      {children}
    </div>
  )
}

const thStyle = { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 14px', borderBottom: '2px solid #E8E0D4' }
const tdStyle = { padding: '12px 14px', fontSize: 13, color: '#5C4A36' }
const widgetTable = { width: '100%', borderCollapse: 'collapse' }
const wTh = { fontSize: 10, color: '#9C8A76', textAlign: 'left', padding: '4px 0', borderBottom: '1px solid #F0EBE3', fontWeight: 600, textTransform: 'uppercase' }
const wTd = { fontSize: 12, color: '#5C4A36', padding: '7px 0', borderBottom: '1px solid #F5F0E8' }
const wBtn = { background: '#8B5E3C', color: 'white', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }
const btnAction = { padding: '4px 10px', background: '#F5F0E8', border: 'none', borderRadius: 6, fontSize: 12, color: '#5C4A36', cursor: 'pointer', marginRight: 6, fontWeight: 600 }
const btnApprove = { padding: '4px 10px', background: '#e6f4ea', border: 'none', borderRadius: 6, fontSize: 12, color: '#1e8e3e', cursor: 'pointer', marginRight: 6, fontWeight: 600 }
const btnReject = { padding: '4px 10px', background: '#fce8e6', border: 'none', borderRadius: 6, fontSize: 12, color: '#d93025', cursor: 'pointer', fontWeight: 600 }
const formInput = { width: '100%', padding: '10px 12px', border: '1px solid #E8E0D4', borderRadius: 8, fontSize: 14, fontFamily: 'system-ui, sans-serif', outline: 'none', boxSizing: 'border-box' }
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }
const modalStyle = { background: 'white', borderRadius: 14, padding: 28, width: '100%', maxHeight: '85vh', overflowY: 'auto' }
const closeBtn = { background: '#F5F0E8', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9C8A76' }