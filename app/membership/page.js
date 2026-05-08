'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const COUNTRIES = [
  { code: '+880', name: 'Bangladesh (BD)' },
  { code: '+1', name: 'USA (+1)' },
  { code: '+44', name: 'UK (+44)' },
  { code: '+91', name: 'India (+91)' }
]

export default function MembershipPage() {
  const router = useRouter()
  const [countryCode, setCountryCode] = useState('+880')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
    occupation: ''
  })
  const [specialDates, setSpecialDates] = useState([{ occasion_name: '', month: '', day: '' }])
  const [agreePromo, setAgreePromo] = useState(false)
  const [agreeAccuracy, setAgreeAccuracy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill all required fields')
      return
    }

    if (!form.email.includes('@')) {
      setError('Invalid email')
      return
    }

    if (form.phone.replace(/\D/g, '').length < 9) {
      setError('Invalid phone number')
      return
    }

    if (!agreePromo || !agreeAccuracy) {
      setError('Please agree to terms')
      return
    }

    setLoading(true)

    try {
      const fullPhone = countryCode + form.phone.replace(/\D/g, '')
      const filteredDates = specialDates.filter(d => d.occasion_name && d.month && d.day)

      console.log('Submitting:', { ...form, phone: fullPhone, special_dates: filteredDates })

      const res = await fetch('/api/members/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: fullPhone,
          date_of_birth: form.date_of_birth,
          address: form.address,
          occupation: form.occupation,
          special_dates: filteredDates
        })
      })

      const data = await res.json()
      console.log('Response:', res.status, data)

      if (res.ok) {
        alert('✓ Application submitted successfully!')
        router.push('/membership/success')
      } else {
        setError(data.error || 'Error submitting')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B3A2A', textDecoration: 'none', fontSize: '14px', fontWeight: 700, marginBottom: '20px' }}>
          <ArrowLeft size={18} />
          Back
        </Link>

        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', margin: '0 0 8px 0' }}>Membership Application</h1>
        <p style={{ color: '#9C8A76', margin: '0 0 32px 0' }}>Join Crown Coffee family</p>

        {error && (
          <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: '8px', padding: '16px', marginBottom: '24px', color: '#C62828', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '16px', padding: '32px' }}>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase' }}>Full Name *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({...form, full_name: e.target.value})}
              placeholder="Your name"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase' }}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              placeholder="your@email.com"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase' }}>Phone *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={{ padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px' }}
              >
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
              </select>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({...form, phone: e.target.value})}
                placeholder="17XXXXXXXX"
                style={{ padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase' }}>Date of Birth</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({...form, date_of_birth: e.target.value})}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase' }}>Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({...form, address: e.target.value})}
              placeholder="Your address"
              rows={3}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase' }}>Occupation</label>
            <input
              type="text"
              value={form.occupation}
              onChange={(e) => setForm({...form, occupation: e.target.value})}
              placeholder="Your occupation"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid #E0E0E0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1F1F1F', margin: '0', textTransform: 'uppercase' }}>Special Dates (up to 10)</h3>
              {specialDates.length < 10 && (
                <button
                  type="button"
                  onClick={() => setSpecialDates([...specialDates, { occasion_name: '', month: '', day: '' }])}
                  style={{ background: 'none', border: 'none', color: '#6B3A2A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}
                >
                  <Plus size={16} />
                  Add
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {specialDates.map((date, idx) => (
                <div key={idx} style={{ background: '#FDF8F4', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 80px 1fr', gap: '8px', alignItems: 'end' }}>
                  <input
                    type="text"
                    placeholder="Occasion"
                    value={date.occasion_name}
                    onChange={(e) => setSpecialDates(specialDates.map((d, i) => i === idx ? {...d, occasion_name: e.target.value} : d))}
                    style={{ padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <select
                    value={date.month}
                    onChange={(e) => setSpecialDates(specialDates.map((d, i) => i === idx ? {...d, month: e.target.value} : d))}
                    style={{ padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '12px' }}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Day"
                    value={date.day}
                    onChange={(e) => setSpecialDates(specialDates.map((d, i) => i === idx ? {...d, day: e.target.value} : d))}
                    style={{ padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setSpecialDates(specialDates.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer', fontSize: '18px' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '13px', color: '#5C4A36' }}>
              <input
                type="checkbox"
                checked={agreePromo}
                onChange={(e) => setAgreePromo(e.target.checked)}
                style={{ marginTop: '2px' }}
              />
              I agree to receive promotional emails
            </label>
            <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '13px', color: '#5C4A36' }}>
              <input
                type="checkbox"
                checked={agreeAccuracy}
                onChange={(e) => setAgreeAccuracy(e.target.checked)}
                style={{ marginTop: '2px' }}
              />
              I confirm information is accurate
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? '#9C8A76' : '#6B3A2A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
            {loading ? 'Submitting...' : 'Apply for Membership'}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
