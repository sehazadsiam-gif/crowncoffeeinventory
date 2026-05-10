'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Gift, ArrowLeft, Send, Loader2, Calendar } from 'lucide-react'

export default function SpecialOffersPage() {
  const router = useRouter()
  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState(null)
  const [customOfferModal, setCustomOfferModal] = useState(null)
  
  const [customOffer, setCustomOffer] = useState({
    title: 'Crown Coffee Special Offer',
    discount_percent: 15,
    offer_text: '',
    valid_days: 7,
    description: 'Enjoy this exclusive offer on your next visit!'
  })

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    if (!search) {
      setFilteredMembers(members)
    } else {
      const s = search.toLowerCase()
      setFilteredMembers(members.filter(m => 
        m.full_name.toLowerCase().includes(s) || 
        m.email.toLowerCase().includes(s) || 
        m.phone.includes(search) ||
        m.occasion_name.toLowerCase().includes(s)
      ))
    }
  }, [search, members])

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/admin/members/special-offers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      let processed = []

      data.members.forEach(m => {
        // Handle Birthday
        if (m.date_of_birth) {
          const dob = new Date(m.date_of_birth)
          let nextOccur = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
          if (nextOccur < today) nextOccur.setFullYear(today.getFullYear() + 1)
          
          const diffTime = Math.abs(nextOccur - today)
          const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          processed.push({
            ...m,
            occasion_name: 'Birthday',
            daysUntil: daysUntil,
            isToday: daysUntil === 0 || daysUntil === 365,
            actualDate: m.date_of_birth
          })
        }

        // Handle Custom Special Dates
        if (m.custom_special_dates && m.custom_special_dates.length > 0) {
          m.custom_special_dates.forEach(sd => {
            let nextOccur = new Date(today.getFullYear(), sd.month - 1, sd.day)
            if (nextOccur < today) nextOccur.setFullYear(today.getFullYear() + 1)
            
            const diffTime = Math.abs(nextOccur - today)
            const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            processed.push({
              ...m,
              occasion_name: sd.occasion_name,
              daysUntil: daysUntil,
              isToday: daysUntil === 0 || daysUntil === 365,
              actualDate: `${today.getFullYear()}-${sd.month.toString().padStart(2, '0')}-${sd.day.toString().padStart(2, '0')}`
            })
          })
        }
      })
      
      // Sort by upcoming
      processed.sort((a, b) => a.daysUntil - b.daysUntil)
      
      setMembers(processed)
      setFilteredMembers(processed)
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendOffer = async (memberId, offerType, customOfferData = null) => {
    setSendingId(memberId)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/admin/members/send-special-offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          member_id: memberId,
          offerType,
          customOffer: customOfferData
        })
      })

      if (res.ok) {
        alert('Offer sent successfully!')
        if (customOfferModal) setCustomOfferModal(null)
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Failed to send offer')
      }
    } catch (err) {
      alert('Network error while sending offer')
    } finally {
      setSendingId(null)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#9C8A76' }}>Loading special occasions...</div>
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button 
          onClick={() => router.push('/admin/members')}
          style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#424242', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', margin: 0 }}>Special Occasions & Offers</h1>
          <p style={{ color: '#9C8A76', margin: '4px 0 0 0' }}>Send personalized birthday and custom offers to your members</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '32px', maxWidth: '500px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9C8A76' }} />
        <input
          type="text"
          placeholder="Search by name, email, phone or occasion..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {filteredMembers.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #E0E0E0', color: '#9C8A76' }}>
            <Gift size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ fontSize: '18px', fontWeight: 600 }}>No occasions found</p>
            <p>Try a different search or ensure members have their date of birth listed.</p>
          </div>
        ) : filteredMembers.map(member => (
          <div key={`${member.id}-${member.occasion_name}`} style={{ 
            background: 'white', 
            borderRadius: '16px', 
            border: member.isToday ? '2px solid #C9943A' : '1px solid #E0E0E0',
            overflow: 'hidden',
            boxShadow: member.isToday ? '0 8px 24px rgba(201, 148, 58, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            {member.isToday && (
              <div style={{ background: '#C9943A', color: 'white', padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                🎉 {member.occasion_name} Today! 🎉
              </div>
            )}
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1F1F1F', margin: '0 0 4px 0' }}>{member.full_name}</h3>
                  <div style={{ fontSize: '13px', color: '#5C4A36', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} /> 
                    <span style={{ fontWeight: 700 }}>{member.occasion_name}:</span>
                    {new Date(member.actualDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    <span style={{ color: '#C9943A', fontWeight: 700, marginLeft: '8px' }}>
                      ({member.isToday ? 'Today' : `In ${member.daysUntil} days`})
                    </span>
                  </div>
                </div>
                <div style={{ background: '#F5F5F5', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: '#424242' }}>
                  {member.tier.toUpperCase()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', padding: '16px', background: '#FAFAFA', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9C8A76', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Total Visits</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#1F1F1F' }}>{member.total_visits || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9C8A76', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Contact</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F1F1F', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.phone || member.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => sendOffer(member.id, member.occasion_name === 'Birthday' ? 'birthday' : 'custom', member.occasion_name !== 'Birthday' ? { ...customOffer, title: `${member.occasion_name} Special`, description: `Enjoy this special offer for your ${member.occasion_name}!` } : null)}
                  disabled={sendingId === member.id}
                  style={{ 
                    flex: 1, padding: '12px', background: '#C9943A', color: 'white', border: 'none', 
                    borderRadius: '8px', cursor: sendingId === member.id ? 'not-allowed' : 'pointer', 
                    fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s', opacity: sendingId === member.id ? 0.7 : 1
                  }}
                >
                  {sendingId === member.id ? <Loader2 size={16} className="spin" /> : <Gift size={16} />}
                  Send {member.occasion_name === 'Birthday' ? 'Birthday' : 'Special'} Offer
                </button>
                <button
                  onClick={() => setCustomOfferModal(member)}
                  style={{ 
                    flex: 1, padding: '12px', background: '#F5F5F5', color: '#1F1F1F', border: '1px solid #E0E0E0', 
                    borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                  }}
                >
                  <Send size={16} />
                  Custom Offer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Offer Modal */}
      {customOfferModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#1F1F1F', fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0' }}>Send Custom Offer</h2>
            <p style={{ color: '#9C8A76', margin: '0 0 24px 0' }}>To {customOfferModal.full_name} ({customOfferModal.email})</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#424242', marginBottom: '8px' }}>Offer Title</label>
                <input 
                  type="text" 
                  value={customOffer.title} 
                  onChange={e => setCustomOffer({ ...customOffer, title: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#424242', marginBottom: '8px' }}>Discount %</label>
                  <input 
                    type="number" 
                    value={customOffer.discount_percent} 
                    onChange={e => setCustomOffer({ ...customOffer, discount_percent: parseInt(e.target.value) || 0, offer_text: '' })}
                    style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '8px', boxSizing: 'border-box' }}
                    placeholder="e.g. 15"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#424242', marginBottom: '8px' }}>OR Custom Text</label>
                  <input 
                    type="text" 
                    value={customOffer.offer_text} 
                    onChange={e => setCustomOffer({ ...customOffer, offer_text: e.target.value, discount_percent: 0 })}
                    style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '8px', boxSizing: 'border-box' }}
                    placeholder="e.g. BUY 1 GET 1"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#424242', marginBottom: '8px' }}>Valid For (Days)</label>
                  <input 
                    type="number" 
                    value={customOffer.valid_days} 
                    onChange={e => setCustomOffer({ ...customOffer, valid_days: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#424242', marginBottom: '8px' }}>Description</label>
                <textarea 
                  value={customOffer.description} 
                  onChange={e => setCustomOffer({ ...customOffer, description: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '8px', boxSizing: 'border-box', minHeight: '100px', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setCustomOfferModal(null)}
                style={{ flex: 1, padding: '14px', background: '#F5F5F5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, color: '#424242' }}
              >
                Cancel
              </button>
              <button
                onClick={() => sendOffer(customOfferModal.id, 'custom', customOffer)}
                disabled={sendingId === customOfferModal.id}
                style={{ flex: 2, padding: '14px', background: '#2E7D32', color: 'white', border: 'none', borderRadius: '8px', cursor: sendingId === customOfferModal.id ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {sendingId === customOfferModal.id ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                Send Offer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
