'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar } from 'lucide-react'

export default function MemberDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMember()
  }, [params.id])

  const fetchMember = async () => {
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/members/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setMember(data.member)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#9C8A76' }}>Loading...</div>
  }

  if (!member) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#D32F2F' }}>Member not found</div>
  }

  const statusColor = {
    active: { bg: '#E8F5E9', text: '#2E7D32' },
    pending: { bg: '#FFF3E0', text: '#F57C00' },
    deactivated: { bg: '#FFEBEE', text: '#D32F2F' },
    deleted: { bg: '#F3E5F5', text: '#7B1FA2' }
  }[member.status] || { bg: '#E0E0E0', text: '#424242' }

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <button
        onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B3A2A', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, marginBottom: '24px' }}
      >
        <ArrowLeft size={18} />
        Back to Members
      </button>

      <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '16px', padding: '32px', marginBottom: '32px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #E0E0E0' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1F1F1F', margin: '0 0 8px 0' }}>
              {member.full_name}
            </h1>
            <p style={{ color: '#9C8A76', margin: '0', fontSize: '13px' }}>
              Member since {member.member_since ? new Date(member.member_since).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <span style={{ padding: '8px 16px', borderRadius: '12px', background: statusColor.bg, color: statusColor.text, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
            {member.status}
          </span>
        </div>

        {/* Contact Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9C8A76', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              <Mail size={16} />
              Email
            </div>
            <p style={{ color: '#1F1F1F', fontSize: '14px', margin: '0' }}>{member.email}</p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9C8A76', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              <Phone size={16} />
              Phone
            </div>
            <p style={{ color: '#1F1F1F', fontSize: '14px', margin: '0' }}>{member.phone}</p>
          </div>

          {member.date_of_birth && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9C8A76', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                <Calendar size={16} />
                Date of Birth
              </div>
              <p style={{ color: '#1F1F1F', fontSize: '14px', margin: '0' }}>
                {new Date(member.date_of_birth).toLocaleDateString()}
              </p>
            </div>
          )}

          {member.occupation && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9C8A76', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                <Briefcase size={16} />
                Occupation
              </div>
              <p style={{ color: '#1F1F1F', fontSize: '14px', margin: '0' }}>{member.occupation}</p>
            </div>
          )}

          {member.address && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9C8A76', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                <MapPin size={16} />
                Address
              </div>
              <p style={{ color: '#1F1F1F', fontSize: '14px', margin: '0' }}>{member.address}</p>
            </div>
          )}
        </div>

        {/* Membership Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px', padding: '24px', background: '#FDF8F4', borderRadius: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#9C8A76', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Tier</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#6B3A2A' }}>
              {member.tier === 'gold' ? '⭐ Gold' : 'Silver'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#9C8A76', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Total Visits</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#2E7D32' }}>{member.total_visits || 0}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#9C8A76', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Punches</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1976D2' }}>{member.punch_count || 0}/10</div>
          </div>
        </div>

        {member.card_number && (
          <div style={{ padding: '16px', background: '#E8F5E9', border: '1px solid #C8E6C9', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#2E7D32', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Card Number</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#1F1F1F', fontFamily: 'monospace' }}>{member.card_number}</div>
          </div>
        )}
      </div>
    </div>
  )
}
