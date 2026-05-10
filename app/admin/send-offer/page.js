'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Send } from 'lucide-react'

export default function SendOfferPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [discount, setDiscount] = useState(5)
  const [validDays, setValidDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  const handleSearch = async (q) => {
    setSearch(q)
    if (!q.trim()) {
      setMembers([])
      return
    }

    try {
      setSearching(true)
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/manager/search-members?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setMembers(Array.isArray(data) ? data : (data.members || []))
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
    }
  }

  const handleSendOffer = async () => {
    if (!selectedMember || !discount || !validDays) {
      alert('Please select member and fill all fields')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/admin/send-offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          member_id: selectedMember.id,
          discount: parseInt(discount),
          valid_days: parseInt(validDays)
        })
      })

      const data = await res.json()
      if (res.ok) {
        alert(`Offer sent to ${selectedMember.full_name}!`)
        setSelectedMember(null)
        setSearch('')
        setMembers([])
        setDiscount(5)
        setValidDays(7)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1F1F1F', marginBottom: '8px' }}>Send Special Offer</h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px' }}>Send SMS + Email offer to members</p>

      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        
        {/* Search Member */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Search Member</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9C8A76' }} />
            <input
              type="text"
              placeholder="Search by name, card, or phone..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Search Results */}
        {members.length > 0 && (
          <div style={{ marginBottom: '24px', maxHeight: '300px', overflowY: 'auto' }}>
            {members.map(m => (
              <div
                key={m.id}
                onClick={() => { setSelectedMember(m); setMembers([]) }}
                style={{
                  padding: '12px',
                  border: selectedMember?.id === m.id ? '2px solid #6B3A2A' : '1px solid #E0E0E0',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  background: selectedMember?.id === m.id ? '#FDF8F4' : 'white'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{m.full_name}</div>
                <div style={{ fontSize: '12px', color: '#9C8A76' }}>{m.card_number}</div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Member */}
        {selectedMember && (
          <div style={{ background: '#FDF8F4', border: '2px solid #C9943A', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#6B3A2A', marginBottom: '8px' }}>{selectedMember.full_name}</div>
            <div style={{ fontSize: '13px', color: '#9C8A76' }}>{selectedMember.phone}</div>
          </div>
        )}

        {/* Discount Input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Discount Percentage (%)</label>
          <input
            type="number"
            min="1"
            max="50"
            value={discount}
            onChange={e => setDiscount(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Valid Days Input */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Valid for Days</label>
          <input
            type="number"
            min="1"
            max="90"
            value={validDays}
            onChange={e => setValidDays(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Preview */}
        {selectedMember && (
          <div style={{ background: '#E3F2FD', border: '1px solid #BBDEFB', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1565C0', marginBottom: '8px', textTransform: 'uppercase' }}>Preview SMS</div>
            <div style={{ fontSize: '13px', color: '#1565C0', lineHeight: '1.5' }}>
              Crown Coffee: Special offer for you! Get {discount}% discount on all items. Valid for {validDays} days. Visit us and enjoy!
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSendOffer}
          disabled={!selectedMember || loading}
          style={{
            width: '100%',
            padding: '12px',
            background: !selectedMember || loading ? '#9C8A76' : '#6B3A2A',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: !selectedMember || loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Send size={16} />
          {loading ? 'Sending...' : 'Send Offer'}
        </button>
      </div>
    </div>
  )
}
