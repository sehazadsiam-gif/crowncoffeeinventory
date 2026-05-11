'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Loader2, User, Mail, Phone, Cake, MapPin, Briefcase, Star, CalendarHeart, ClipboardList, Coffee } from 'lucide-react'

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
  const [specialDates, setSpecialDates] = useState([{ occasion_name: '', date: '' }])
  const [agreePromo, setAgreePromo] = useState(false)
  const [agreeAccuracy, setAgreeAccuracy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState(null)
  const [hoverSubmit, setHoverSubmit] = useState(false)

  const handleDateInput = (value, field, index = null) => {
    let clean = value.replace(/\D/g, '')
    let formatted = ''
    if (clean.length > 0) {
      formatted = clean.substring(0, 2)
      if (clean.length > 2) {
        formatted += '-' + clean.substring(2, 4)
        if (clean.length > 4) formatted += '-' + clean.substring(4, 8)
      }
    }
    if (index !== null) {
      let cleanSM = value.replace(/\D/g, '').substring(0, 4)
      let formattedSM = ''
      if (cleanSM.length > 0) {
        formattedSM = cleanSM.substring(0, 2)
        if (cleanSM.length > 2) formattedSM += '-' + cleanSM.substring(2, 4)
      }
      setSpecialDates(specialDates.map((d, i) => i === index ? { ...d, date: formattedSM } : d))
    } else {
      setForm({ ...form, [field]: formatted })
    }
  }

  const completedFields = Object.values(form).filter(v => v.trim()).length
  const totalFields = 6
  const progress = Math.round((completedFields / totalFields) * 100)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill all required fields')
      return
    }
    if (!form.email.includes('@')) { setError('Invalid email address'); return }
    const phoneClean = form.phone.replace(/\D/g, '')
    if (countryCode === '+880' && phoneClean.length !== 10) {
      setError('Bangladesh phone must be 10 digits (e.g., 1712345678)')
      return
    } else if (countryCode !== '+880' && (phoneClean.length < 7 || phoneClean.length > 15)) {
      setError('Invalid phone number length')
      return
    }
    if (!agreePromo || !agreeAccuracy) { setError('Please agree to both terms'); return }
    setLoading(true)
    try {
      const fullPhone = countryCode + form.phone.replace(/\D/g, '')
      const filteredDates = specialDates.map(d => {
        if (!d.occasion_name || !d.date) return null
        const parts = d.date.split(/[-/.]/)
        if (parts.length < 2) return null
        return { occasion_name: d.occasion_name, day: parseInt(parts[0]), month: parseInt(parts[1]) }
      }).filter(Boolean)
      let dob = null
      if (form.date_of_birth) {
        const parts = form.date_of_birth.split(/[-/.]/)
        if (parts.length === 3) {
          dob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
      }
      const res = await fetch('/api/members/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: fullPhone,
          date_of_birth: dob,
          address: form.address,
          occupation: form.occupation,
          special_dates: filteredDates
        })
      })
      const data = await res.json()
      if (res.ok) {
        router.push('/membership/success')
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #FFF8F0 0%, #FFF0E6 50%, #FFF8F0 100%)', minHeight: '100vh', padding: '40px 20px', position: 'relative', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Back link */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#7B4A2E', textDecoration: 'none', fontSize: '13px', fontWeight: 700, marginBottom: '28px', background: 'rgba(255,255,255,0.7)', padding: '8px 14px', borderRadius: '20px', backdropFilter: 'blur(8px)', border: '1px solid rgba(123,74,46,0.15)', transition: 'all 0.2s' }}>
          <ArrowLeft size={16} /> Back to home
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #7B4A2E, #9C5A30)', borderRadius: '20px', padding: '16px', boxShadow: '0 4px 16px rgba(123,74,46,0.3)', animation: 'wiggle 3s ease-in-out infinite' }}>
              <Coffee size={32} color="white" />
            </div>
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#3D1F0F', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Join the Crown Coffee Family
          </h1>
          <p style={{ color: '#9C7A5A', margin: '0', fontSize: '14px' }}>
            Fill in your details and start earning rewards
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', border: '1px solid rgba(123,74,46,0.1)', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#7B4A2E' }}>Form Progress</span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: progress === 100 ? '#2E7D32' : '#7B4A2E' }}>
              {progress === 100 ? 'All filled!' : `${progress}% complete`}
            </span>
          </div>
          <div style={{ background: '#F0E6DC', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: progress === 100 ? 'linear-gradient(90deg, #2E7D32, #43A047)' : 'linear-gradient(90deg, #7B4A2E, #B5651D)',
              borderRadius: '99px',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'linear-gradient(135deg, #FFEBEE, #FFCDD2)', border: '1px solid #EF9A9A', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', color: '#B71C1C', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', animation: 'shake 0.3s ease' }}>
            {error}
          </div>
        )}

        {/* Form card */}
        <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '24px', padding: '36px', boxShadow: '0 8px 40px rgba(123,74,46,0.12), 0 2px 8px rgba(0,0,0,0.04)', border: '1px solid rgba(123,74,46,0.08)', backdropFilter: 'blur(12px)' }}>
          <form onSubmit={handleSubmit}>

            {/* Personal Info section */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Star size={14} color="#9C7A5A" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#9C7A5A', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Personal Info</span>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #E8D5C4, transparent)' }} />
              </div>
            </div>

            {/* Full Name */}
            <FieldGroup label="Full Name" icon={<User size={13} />} required>
              <StyledInput
                type="text"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Fatima Rahman"
                focused={focusedField === 'full_name'}
                onFocus={() => setFocusedField('full_name')}
                onBlur={() => setFocusedField(null)}
              />
            </FieldGroup>

            {/* Email */}
            <FieldGroup label="Email Address" icon={<Mail size={13} />} required>
              <StyledInput
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="hello@example.com"
                focused={focusedField === 'email'}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </FieldGroup>

            {/* Phone */}
            <FieldGroup label="Phone Number" icon={<Phone size={13} />} required>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '10px' }}>
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    border: '2px solid #E8D5C4',
                    borderRadius: '12px',
                    fontSize: '13px',
                    background: '#FFFBF8',
                    color: '#3D1F0F',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
                </select>
                <StyledInput
                  type="tel"
                  value={form.phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '')
                    const max = countryCode === '+880' ? 10 : 15
                    setForm({ ...form, phone: val.substring(0, max) })
                  }}
                  placeholder={countryCode === '+880' ? '1XXXXXXXXX' : 'Phone number'}
                  focused={focusedField === 'phone'}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </FieldGroup>

            {/* DOB */}
            <FieldGroup label="Date of Birth" icon={<Cake size={13} />} hint="Format: DD-MM-YYYY">
              <StyledInput
                type="text"
                value={form.date_of_birth}
                onChange={e => handleDateInput(e.target.value, 'date_of_birth')}
                placeholder="DD-MM-YYYY"
                focused={focusedField === 'dob'}
                onFocus={() => setFocusedField('dob')}
                onBlur={() => setFocusedField(null)}
              />
            </FieldGroup>

            {/* Address */}
            <FieldGroup label="Address" icon={<MapPin size={13} />}>
              <textarea
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Your street, area, city..."
                rows={3}
                onFocus={() => setFocusedField('address')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: `2px solid ${focusedField === 'address' ? '#7B4A2E' : '#E8D5C4'}`,
                  borderRadius: '12px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  resize: 'none',
                  background: '#FFFBF8',
                  color: '#3D1F0F',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: focusedField === 'address' ? '0 0 0 3px rgba(123,74,46,0.1)' : 'none',
                  outline: 'none'
                }}
              />
            </FieldGroup>

            {/* Occupation */}
            <FieldGroup label="Occupation" icon={<Briefcase size={13} />}>
              <StyledInput
                type="text"
                value={form.occupation}
                onChange={e => setForm({ ...form, occupation: e.target.value })}
                placeholder="e.g. Designer, Engineer, Teacher..."
                focused={focusedField === 'occupation'}
                onFocus={() => setFocusedField('occupation')}
                onBlur={() => setFocusedField(null)}
              />
            </FieldGroup>

            {/* Special Dates */}
            <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px dashed #E8D5C4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <CalendarHeart size={14} color="#9C7A5A" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#9C7A5A', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Special Dates</span>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #E8D5C4, transparent)' }} />
                {specialDates.length < 10 && (
                  <button
                    type="button"
                    onClick={() => setSpecialDates([...specialDates, { occasion_name: '', date: '' }])}
                    style={{
                      background: 'linear-gradient(135deg, #7B4A2E, #9C5A30)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: '20px',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      boxShadow: '0 2px 6px rgba(123,74,46,0.3)'
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(123,74,46,0.4)' }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(123,74,46,0.3)' }}
                  >
                    <Plus size={13} /> Add
                  </button>
                )}
              </div>
              <p style={{ fontSize: '12px', color: '#B09070', marginBottom: '12px', margin: '0 0 14px 0' }}>
                Anniversaries, birthdays of loved ones — we'll celebrate with you!
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {specialDates.map((date, idx) => (
                  <div key={idx} style={{
                    background: 'linear-gradient(135deg, #FFF8F2, #FFF3EA)',
                    padding: '14px',
                    borderRadius: '14px',
                    border: '1px solid rgba(123,74,46,0.1)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 36px',
                    gap: '8px',
                    alignItems: 'center',
                    transition: 'box-shadow 0.2s'
                  }}>
                    <input
                      type="text"
                      placeholder="Occasion (e.g. Anniversary)"
                      value={date.occasion_name}
                      onChange={e => setSpecialDates(specialDates.map((d, i) => i === idx ? { ...d, occasion_name: e.target.value } : d))}
                      style={{ padding: '9px 12px', border: '1.5px solid #E8D5C4', borderRadius: '10px', fontSize: '13px', background: 'white', color: '#3D1F0F', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <input
                      type="text"
                      placeholder="DD-MM"
                      value={date.date}
                      onChange={e => handleDateInput(e.target.value, 'date', idx)}
                      style={{ padding: '9px 12px', border: '1.5px solid #E8D5C4', borderRadius: '10px', fontSize: '13px', background: 'white', color: '#3D1F0F', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <button
                      type="button"
                      onClick={() => setSpecialDates(specialDates.filter((_, i) => i !== idx))}
                      style={{ background: '#FFEBEE', border: 'none', color: '#E53935', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#FFCDD2'}
                      onMouseOut={e => e.currentTarget.style.background = '#FFEBEE'}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms */}
            <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ClipboardList size={14} color="#9C7A5A" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#9C7A5A', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Agreements</span>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #E8D5C4, transparent)' }} />
              </div>
              <CuteCheckbox
                checked={agreePromo}
                onChange={e => setAgreePromo(e.target.checked)}
                label="I'd love to receive exclusive offers, new menu alerts & promo emails!"
              />
              <CuteCheckbox
                checked={agreeAccuracy}
                onChange={e => setAgreeAccuracy(e.target.checked)}
                label="I confirm all information I've provided is accurate and truthful."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              onMouseOver={() => setHoverSubmit(true)}
              onMouseOut={() => setHoverSubmit(false)}
              style={{
                width: '100%',
                padding: '16px',
                background: loading
                  ? '#B09070'
                  : hoverSubmit
                  ? 'linear-gradient(135deg, #5C3218, #8C4A20)'
                  : 'linear-gradient(135deg, #7B4A2E, #9C5A30)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.25s ease',
                boxShadow: loading ? 'none' : hoverSubmit ? '0 8px 24px rgba(123,74,46,0.5)' : '0 4px 14px rgba(123,74,46,0.35)',
                transform: hoverSubmit && !loading ? 'translateY(-1px)' : 'translateY(0)',
                letterSpacing: '0.3px'
              }}
            >
              {loading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Brewing your membership...</>
              ) : (
                <>Apply for Crown Coffee Membership</>
              )}
            </button>

          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg) scale(1); }
          50% { transform: rotate(5deg) scale(1.1); }
        }
        @keyframes float0 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(10deg); }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(14px) rotate(-8deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(5deg); }
          66% { transform: translateY(10px) rotate(-5deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        input::placeholder { color: #C4A882; }
        textarea::placeholder { color: #C4A882; }
        select:focus { outline: none; box-shadow: 0 0 0 3px rgba(123,74,46,0.1); border-color: #7B4A2E !important; }
      `}</style>
    </div>
  )
}

function FieldGroup({ label, icon, required, hint, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#5C3A1E', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', color: '#7B4A2E' }}>{icon}</span>
        {label}
        {required && <span style={{ color: '#E53935', fontSize: '14px' }}>*</span>}
        {hint && <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: '#B09070', fontSize: '11px', marginLeft: '4px' }}>— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function StyledInput({ focused, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '12px 14px',
        border: `2px solid ${focused ? '#7B4A2E' : '#E8D5C4'}`,
        borderRadius: '12px',
        fontSize: '14px',
        boxSizing: 'border-box',
        background: '#FFFBF8',
        color: '#3D1F0F',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: focused ? '0 0 0 3px rgba(123,74,46,0.1)' : 'none',
        outline: 'none'
      }}
    />
  )
}

function CuteCheckbox({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', padding: '12px 14px', background: checked ? 'linear-gradient(135deg, #FFF3EA, #FFE8D6)' : '#FAFAFA', borderRadius: '12px', border: `1.5px solid ${checked ? 'rgba(123,74,46,0.3)' : '#E8D5C4'}`, transition: 'all 0.2s', userSelect: 'none' }}>
      <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${checked ? '#7B4A2E' : '#C4A882'}`, background: checked ? '#7B4A2E' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0, marginTop: '1px' }}>
        {checked && <span style={{ color: 'white', fontSize: '12px', fontWeight: 900 }}>✓</span>}
        <input type="checkbox" checked={checked} onChange={onChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      </div>
      <span style={{ fontSize: '13px', color: '#5C3A1E', fontWeight: checked ? 600 : 400, lineHeight: '1.5', transition: 'font-weight 0.2s' }}>{label}</span>
    </label>
  )
}
