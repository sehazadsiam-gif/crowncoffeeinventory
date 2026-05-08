'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const COUNTRIES = [
  { code: '+880', name: 'BD' },
  { code: '+1', name: 'USA' },
  { code: '+44', name: 'UK' },
  { code: '+91', name: 'India' },
]

export default function MembershipPage() {
  const router = useRouter()
  const [countryCode, setCountryCode] = useState('+880')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [address, setAddress] = useState('')
  const [occupation, setOccupation] = useState('')
  const [agree1, setAgree1] = useState(false)
  const [agree2, setAgree2] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')

    if (!fullName || !email || !phone) {
      setError('Name, email and phone are required')
      return
    }
    if (!agree1 || !agree2) {
      setError('Please agree to both terms')
      return
    }

    setLoading(true)
    try {
      const fullPhone = countryCode + phone.replace(/\D/g, '')
      const payload = {
        full_name: fullName,
        email: email.toLowerCase(),
        phone: fullPhone,
        date_of_birth: dob || null,
        address: address || null,
        occupation: occupation || null
      }

      console.log('Submitting:', payload)

      const res = await fetch('/api/members/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      console.log('Response:', res.status, data)

      if (res.ok) {
        router.push('/membership/success')
      } else {
        setError(data.error || 'Submission failed')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', padding: '40px 20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1F1F1F', marginBottom: '8px' }}>
          Membership Application
        </h1>
        <p style={{ color: '#9C8A76', marginBottom: '32px' }}>Join Crown Coffee family</p>

        {error && (
          <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', padding: '12px 16px', borderRadius: '8px', color: '#C62828', marginBottom: '24px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Full Name *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Phone *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px', minWidth: '90px' }}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
              </select>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="17XXXXXXXX"
                style={{ flex: 1, padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Date of Birth</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Address</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Your address" rows={2}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', resize: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Occupation</label>
            <input value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Your occupation"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#5C4A36' }}>
              <input type="checkbox" checked={agree1} onChange={e => setAgree1(e.target.checked)} />
              I agree to receive promotional emails from Crown Coffee
            </label>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#5C4A36' }}>
              <input type="checkbox" checked={agree2} onChange={e => setAgree2(e.target.checked)} />
              I confirm all information is accurate
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '14px', background: loading ? '#9C8A76' : '#6B3A2A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Submitting...' : 'Apply for Membership'}
          </button>
        </div>
      </div>
    </div>
  )
}
