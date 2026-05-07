'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

const COUNTRIES = [
  { code: '+880', name: 'Bangladesh (BD)', key: 'bd' },
  { code: '+1', name: 'USA (+1)', key: 'us' },
  { code: '+44', name: 'UK (+44)', key: 'uk' },
  { code: '+91', name: 'India (+91)', key: 'in' },
  { code: '+92', name: 'Pakistan (+92)', key: 'pk' },
]

export default function MembershipPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countryCode, setCountryCode] = useState('+880')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
    occupation: ''
  })
  const [specialDates, setSpecialDates] = useState([
    { occasion_name: '', month: '', day: '' }
  ])
  const [agreePromo, setAgreePromo] = useState(false)
  const [agreeAccuracy, setAgreeAccuracy] = useState(false)

  function handleFormChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addSpecialDate() {
    if (specialDates.length >= 10) return
    setSpecialDates(prev => [...prev, { occasion_name: '', month: '', day: '' }])
  }

  function removeSpecialDate(index) {
    setSpecialDates(prev => prev.filter((_, i) => i !== index))
  }

  function updateSpecialDate(index, field, value) {
    setSpecialDates(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }

    // Phone validation - remove spaces and dashes, keep only digits
    const phoneDigits = form.phone.replace(/[\s\-()]/g, '')
    if (phoneDigits.length < 9) {
      setError('Please enter a valid phone number (at least 9 digits after country code).')
      return
    }

    // Format phone with country code
    const fullPhone = countryCode + phoneDigits

    if (!agreePromo) {
      setError('You must agree to receive emails to join')
      return
    }

    if (!agreeAccuracy) {
      setError('Please confirm the accuracy of your information')
      return
    }

    setLoading(true)
    const filteredDates = specialDates.filter(d => d.occasion_name && d.month && d.day)

    try {
      const res = await fetch('/api/members/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: fullPhone,
          special_dates: filteredDates
        })
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/membership/success')
      } else {
        setError(data.error || 'Error submitting form')
      }
    } catch (err) {
      setError('Error submitting form. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh', paddingTop: '40px', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', paddingLeft: '20px', paddingRight: '20px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B3A2A', textDecoration: 'none', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
            <ArrowLeft size={18} />
            Back
          </Link>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', margin: '0 0 8px 0' }}>
            Membership Application
          </h1>
          <p style={{ color: '#9C8A76', margin: '0', fontSize: '14px' }}>
            Join Crown Coffee family and get exclusive benefits
          </p>
        </div>

        {error && (
          <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: '8px', padding: '16px', marginBottom: '24px', color: '#C62828', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          
          {/* Full Name */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => handleFormChange('full_name', e.target.value)}
              placeholder="Enter your full name"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              placeholder="your@email.com"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Phone Number with Country Code */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Phone Number *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
              {/* Country Code Dropdown */}
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={{ padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
              >
                {COUNTRIES.map(country => (
                  <option key={country.key} value={country.code}>
                    {country.code} {country.name}
                  </option>
                ))}
              </select>

              {/* Phone Number Input */}
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                placeholder="17XXXXXXXX"
                style={{ padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#9C8A76', marginTop: '6px' }}>
              Example: {countryCode} 17XXXXXXXX
            </div>
          </div>

          {/* Date of Birth */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Date of Birth
            </label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => handleFormChange('date_of_birth', e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Address */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Address
            </label>
            <textarea
              value={form.address}
              onChange={(e) => handleFormChange('address', e.target.value)}
              placeholder="Street address, city, country"
              rows={3}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'none' }}
            />
          </div>

          {/* Occupation */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F1F1F', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Occupation
            </label>
            <input
              type="text"
              value={form.occupation}
              onChange={(e) => handleFormChange('occupation', e.target.value)}
              placeholder="Your occupation"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Special Dates Section */}
          <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid #E0E0E0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1F1F1F', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Special Dates (up to 10)
              </h3>
              {specialDates.length < 10 && (
                <button
                  type="button"
                  onClick={addSpecialDate}
                  style={{ background: 'none', border: 'none', color: '#6B3A2A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}
                >
                  <Plus size={16} />
                  Add Date
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {specialDates.map((date, idx) => (
                <div key={idx} style={{ background: '#FDF8F4', padding: '16px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 80px 1fr', gap: '12px', alignItems: 'end' }}>
                  <input
                    type="text"
                    placeholder="Occasion (e.g., Birthday)"
                    value={date.occasion_name}
                    onChange={(e) => updateSpecialDate(idx, 'occasion_name', e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}
                  />
                  <select
                    value={date.month}
                    onChange={(e) => updateSpecialDate(idx, 'month', e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}
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
                    onChange={(e) => updateSpecialDate(idx, 'day', e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecialDate(idx)}
                    style={{ background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer', justifySelf: 'center', fontSize: '18px' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '13px', color: '#5C4A36' }}>
              <input
                type="checkbox"
                checked={agreePromo}
                onChange={(e) => setAgreePromo(e.target.checked)}
                style={{ marginTop: '2px', cursor: 'pointer' }}
              />
              I agree to receive promotional emails and updates from Crown Coffee
            </label>
            <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '13px', color: '#5C4A36' }}>
              <input
                type="checkbox"
                checked={agreeAccuracy}
                onChange={(e) => setAgreeAccuracy(e.target.checked)}
                style={{ marginTop: '2px', cursor: 'pointer' }}
              />
              I confirm that all the information provided is accurate and correct
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? '#9C8A76' : '#6B3A2A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }}
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
