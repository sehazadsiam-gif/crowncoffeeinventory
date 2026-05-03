'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export default function MembershipPage() {
  const router = useRouter()
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  useEffect(() => {
    fetch('/api/members/count')
      .then(r => r.json())
      .then(d => setMemberCount(d.count || 0))
      .catch(() => {})
  }, [])

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }

    const phoneDigits = form.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      setError('Phone number must have at least 10 digits.')
      return
    }

    if (!agreePromo || !agreeAccuracy) {
      setError('Please agree to both checkboxes to continue.')
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
          special_dates: filteredDates
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      router.push(`/membership/success?name=${encodeURIComponent(form.full_name)}&email=${encodeURIComponent(form.email)}`)
    } catch (err) {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* LEFT PANEL */}
      <div className="membership-left" style={{
        width: '42%', background: '#6B3A2A', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px 40px'
      }}>
        {/* Dot grid background */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {/* CC Monogram */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            border: '3px solid #C9943A', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 24px'
          }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: '#C9943A', fontFamily: 'Georgia, serif', letterSpacing: '-2px' }}>CC</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.12em', marginBottom: 8 }}>
            CROWN COFFEE
          </h1>

          {/* Gold divider */}
          <div style={{ width: 60, height: 2, background: '#C9943A', margin: '0 auto 24px' }} />

          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.7, maxWidth: 280, margin: '0 auto 32px' }}>
            Join our family. Enjoy lifetime rewards.
          </p>

          {/* Member counter */}
          <div style={{
            background: 'rgba(201,148,58,0.15)', border: '1px solid rgba(201,148,58,0.3)',
            borderRadius: 12, padding: '14px 24px', display: 'inline-block'
          }}>
            <p style={{ color: '#C9943A', fontSize: 15, fontWeight: 600, margin: 0 }}>
              Join {memberCount}+ happy members
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="membership-right" style={{
        width: '58%', background: '#FFFFFF', overflowY: 'auto',
        padding: '40px 48px'
      }}>
        {/* Back link */}
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#64748B', fontSize: 14, fontWeight: 500,
          textDecoration: 'none', marginBottom: 32
        }}>
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Apply for Membership
        </h2>
        <p style={{ color: '#64748B', fontSize: 15, marginBottom: 36, lineHeight: 1.6 }}>
          Get 5% discount instantly. Upgrade to Gold for 10% after 25 visits.
        </p>

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: Personal Information */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#6B3A2A', marginBottom: 20, paddingBottom: 8, borderBottom: '1px solid #E2E8F0' }}>
              Personal Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => handleFormChange('full_name', e.target.value)}
                  placeholder="Enter your full name"
                  style={inputStyle}
                  required
                  id="membership-fullname"
                />
              </div>

              <div>
                <label style={labelStyle}>Email Address <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => handleFormChange('email', e.target.value)}
                  placeholder="your@email.com"
                  style={inputStyle}
                  required
                  id="membership-email"
                />
              </div>

              <div>
                <label style={labelStyle}>Phone Number <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => handleFormChange('phone', e.target.value)}
                  placeholder="+880 1XXX-XXXXXX"
                  style={inputStyle}
                  required
                  id="membership-phone"
                />
              </div>

              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => handleFormChange('date_of_birth', e.target.value)}
                  style={inputStyle}
                  id="membership-dob"
                />
              </div>

              <div>
                <label style={labelStyle}>Occupation</label>
                <input
                  type="text"
                  value={form.occupation}
                  onChange={e => handleFormChange('occupation', e.target.value)}
                  placeholder="e.g. Engineer, Student"
                  style={inputStyle}
                  id="membership-occupation"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Address</label>
                <textarea
                  value={form.address}
                  onChange={e => handleFormChange('address', e.target.value)}
                  placeholder="Your address (optional)"
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 56 }}
                  id="membership-address"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Special Dates */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#6B3A2A', marginBottom: 4, paddingBottom: 8, borderBottom: '1px solid #E2E8F0' }}>
              Your Special Dates (Optional)
            </h3>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
              We will send you special offers on these dates
            </p>

            {specialDates.map((sd, idx) => (
              <div key={idx} style={{
                display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12,
                background: '#FAF7F2', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0'
              }}>
                <div style={{ flex: 2 }}>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Occasion</label>
                  <input
                    type="text"
                    value={sd.occasion_name}
                    onChange={e => updateSpecialDate(idx, 'occasion_name', e.target.value)}
                    placeholder="e.g. Birthday, Anniversary"
                    style={{ ...inputStyle, fontSize: 13 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Month</label>
                  <select
                    value={sd.month}
                    onChange={e => updateSpecialDate(idx, 'month', e.target.value)}
                    style={{ ...inputStyle, fontSize: 13 }}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 0.6 }}>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Day</label>
                  <select
                    value={sd.day}
                    onChange={e => updateSpecialDate(idx, 'day', e.target.value)}
                    style={{ ...inputStyle, fontSize: 13 }}
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                {(specialDates.length > 1) && (
                  <button
                    type="button"
                    onClick={() => removeSpecialDate(idx)}
                    style={{
                      background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 8,
                      width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#EF4444', flexShrink: 0
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}

            {specialDates.length < 10 && (
              <button
                type="button"
                onClick={addSpecialDate}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: '1px dashed #C9943A',
                  borderRadius: 8, padding: '8px 16px', color: '#C9943A',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Plus size={15} />
                Add Another Date
              </button>
            )}
          </div>

          {/* SECTION 3: Agreement */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#6B3A2A', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #E2E8F0' }}>
              Agreement
            </h3>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12,
              cursor: 'pointer', fontSize: 14, color: '#334155', lineHeight: 1.5
            }}>
              <input
                type="checkbox"
                checked={agreePromo}
                onChange={e => setAgreePromo(e.target.checked)}
                style={{ marginTop: 3, accentColor: '#6B3A2A', width: 16, height: 16 }}
                id="membership-agree-promo"
              />
              I agree to receive promotional emails from Crown Coffee
            </label>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              cursor: 'pointer', fontSize: 14, color: '#334155', lineHeight: 1.5
            }}>
              <input
                type="checkbox"
                checked={agreeAccuracy}
                onChange={e => setAgreeAccuracy(e.target.checked)}
                style={{ marginTop: 3, accentColor: '#6B3A2A', width: 16, height: 16 }}
                id="membership-agree-accuracy"
              />
              I confirm the information provided is accurate
            </label>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '12px 16px', color: '#DC2626',
              fontSize: 14, marginBottom: 16
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px 24px', background: loading ? '#9B8B7A' : '#6B3A2A',
              color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 16,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s ease', fontFamily: 'var(--font-sans)'
            }}
            id="membership-submit"
          >
            {loading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
            {loading ? 'Submitting...' : 'Apply for Membership'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .membership-left {
            width: 100% !important;
            min-height: 180px !important;
            height: 180px !important;
            padding: 24px 20px !important;
          }
          .membership-right {
            width: 100% !important;
            padding: 24px 20px !important;
          }
          div[style*="display: flex"][style*="minHeight: 100vh"] {
            flex-direction: column !important;
          }
        }
        @media (max-width: 768px) {
          div:first-child {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
  fontFamily: 'var(--font-sans)'
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #CBD5E1',
  borderRadius: 8,
  fontSize: 14,
  color: '#0F172A',
  background: '#FFFFFF',
  outline: 'none',
  fontFamily: 'var(--font-sans)',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
}
