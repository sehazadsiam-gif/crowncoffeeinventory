'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowLeft } from 'lucide-react'

export default function MemberVisitsPage() {
  const router = useRouter()
  const [members, setMembers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    if (!search) {
      setFiltered(members)
      return
    }
    setFiltered(members.filter(m =>
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
    ))
  }, [search, members])

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/manager/members-visits', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setMembers(data.members || [])
      setFiltered(data.members || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getPunchProgress = (punchCount) => {
    const current = (punchCount || 0) % 10
    return current
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <button
        onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B3A2A', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, marginBottom: '24px' }}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', marginBottom: '8px' }}>
        Member Visit Records
      </h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px' }}>
        {members.length} active members
      </p>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#9C8A76' }} />
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#9C8A76', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Total Members</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#6B3A2A' }}>{members.length}</div>
        </div>
        <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#9C8A76', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Total Visits</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#2E7D32' }}>
            {members.reduce((sum, m) => sum + (m.total_visits || 0), 0)}
          </div>
        </div>
        <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#9C8A76', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Gold Members</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#F57C00' }}>
            {members.filter(m => m.tier === 'gold').length}
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F5F5F5' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Member</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Total Visits</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Free Coffees Earned</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Punch Progress</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Tier</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#9C8A76' }}>No members found</td>
              </tr>
            ) : (
              filtered.map(m => {
                const punchProgress = getPunchProgress(m.punch_count)
                const freeCoffeesEarned = Math.floor((m.punch_count || 0) / 10)
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1F1F1F', marginBottom: '4px' }}>{m.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#9C8A76' }}>{m.phone}</div>
                      {m.card_number && (
                        <div style={{ fontSize: '11px', color: '#6B3A2A', fontFamily: 'monospace', fontWeight: 700 }}>{m.card_number}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#2E7D32' }}>{m.total_visits || 0}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#1976D2' }}>{freeCoffeesEarned}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {/* Punch card visual */}
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: i < punchProgress ? '#1976D2' : '#E0E0E0',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 700
                            }}
                          >
                            {i < punchProgress ? '✓' : ''}
                          </div>
                        ))}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#9C8A76', marginTop: '4px' }}>
                        {punchProgress}/10
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: m.tier === 'gold' ? '#FFF3E0' : '#F5F5F5',
                        color: m.tier === 'gold' ? '#F57C00' : '#757575'
                      }}>
                        {m.tier === 'gold' ? '⭐ Gold' : 'Silver'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
