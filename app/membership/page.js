'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Plus, X, Loader2, User, Mail, Phone, 
  Cake, MapPin, Briefcase, Star, CalendarHeart, 
  ClipboardList, Coffee, Sparkles, Award, Gift, Zap
} from 'lucide-react'

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
      setError('Please fill in all required fields.')
      return
    }
    if (!form.email.includes('@')) { 
      setError('Please enter a valid email address.'); 
      return 
    }
    const phoneClean = form.phone.replace(/\D/g, '')
    if (countryCode === '+880' && phoneClean.length !== 10) {
      setError('Bangladesh mobile number must be 10 digits (e.g., 1712345678)')
      return
    } else if (countryCode !== '+880' && (phoneClean.length < 7 || phoneClean.length > 15)) {
      setError('Please enter a valid phone number length.')
      return
    }
    if (!agreePromo || !agreeAccuracy) { 
      setError('Please agree to both the terms & data accuracy conditions.'); 
      return 
    }
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
        router.push(`/membership/success?name=${encodeURIComponent(form.full_name)}&email=${encodeURIComponent(form.email)}`)
      } else {
        setError(data.error || 'Registration failed. Please try again.')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      background: '#FAF6F0', 
      minHeight: '100vh', 
      padding: '40px 20px', 
      position: 'relative', 
      overflow: 'hidden', 
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" 
    }}>
      {/* Decorative ambient gradients */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(201,148,58,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '45%', height: '45%', background: 'radial-gradient(circle, rgba(123,74,46,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* Navigation & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: '#1E110A', 
            textDecoration: 'none', 
            fontSize: '13px', 
            fontWeight: 700, 
            background: '#FFFFFF', 
            padding: '10px 18px', 
            borderRadius: '100px', 
            border: '1px solid #E8DCD3', 
            boxShadow: '0 2px 8px rgba(30,17,10,0.04)',
            transition: 'all 0.2s ease' 
          }}
          className="back-btn"
          >
            <ArrowLeft size={14} strokeWidth={2.5} /> Back to home
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(201,148,58,0.1)', color: '#C9943A', padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>
            <Sparkles size={13} /> PREMIUM EXCLUSIVE
          </div>
        </div>

        {/* Outer Grid Container */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '40px',
          alignItems: 'start'
        }}
        className="form-grid"
        >
          
          {/* Left Column: Visual VIP club card & values */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '28px',
            position: 'sticky',
            top: '40px'
          }}>
            
            {/* Title & Introduction */}
            <div>
              <h1 style={{ 
                fontSize: '38px', 
                fontWeight: 900, 
                color: '#1E110A', 
                margin: '0 0 10px 0', 
                letterSpacing: '-1px',
                lineHeight: 1.15
              }}>
                The Crown Coffee <br />
                <span style={{ 
                  background: 'linear-gradient(135deg, #7B4A2E, #C9943A)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 900
                }}>
                  Membership Club
                </span>
              </h1>
              <p style={{ color: '#5C524C', margin: '0', fontSize: '15px', lineHeight: 1.6 }}>
                Elevate your daily coffee ritual. Join a community built for coffee enthusiasts, earning exceptional rewards and instant member-only privileges.
              </p>
            </div>

            {/* Dynamic Live Member Card Preview */}
            <div className="card-vip-container" style={{
              background: 'linear-gradient(135deg, #1E110A 0%, #351F14 100%)',
              borderRadius: '24px',
              padding: '28px',
              position: 'relative',
              boxShadow: '0 20px 45px rgba(30,17,10,0.22)',
              border: '1px solid rgba(251,248,245,0.08)',
              overflow: 'hidden',
              aspectRatio: '1.6 / 1',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.3s ease'
            }}>
              {/* Card Gold Accent Pattern overlay */}
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                background: 'radial-gradient(circle at 80% 20%, rgba(201,148,58,0.12) 0%, transparent 60%)', 
                pointerEvents: 'none' 
              }} />

              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #C9943A, #E4B869)',
                      borderRadius: '8px',
                      padding: '6px',
                      boxShadow: '0 2px 8px rgba(201,148,58,0.3)'
                    }}>
                      <Coffee size={18} color="#1E110A" strokeWidth={2.5} />
                    </div>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: 800, 
                      color: '#FAF6F0', 
                      letterSpacing: '1px',
                      fontFamily: "'Georgia', serif"
                    }}>
                      CROWN COFFEE
                    </span>
                  </div>
                  <span style={{ fontSize: '9px', color: '#C9943A', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginTop: '6px', marginLeft: '34px' }}>
                    CLUB MEMBER
                  </span>
                </div>
                
                {/* Chip Icon */}
                <div style={{
                  width: '38px',
                  height: '28px',
                  background: 'linear-gradient(135deg, #E6D2B5 0%, #A2825A 100%)',
                  borderRadius: '6px',
                  opacity: 0.85,
                  position: 'relative'
                }}>
                  <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '1px', background: 'rgba(30,17,10,0.2)' }} />
                  <div style={{ position: 'absolute', left: '50%', top: '0', bottom: '0', width: '1px', background: 'rgba(30,17,10,0.2)' }} />
                </div>
              </div>

              {/* Card Middle: Member Name */}
              <div style={{ zIndex: 1, margin: '24px 0 12px 0' }}>
                <span style={{ fontSize: '9px', color: '#A2968E', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  CARDHOLDER
                </span>
                <span style={{ 
                  fontSize: '20px', 
                  fontWeight: 700, 
                  color: '#FAF6F0', 
                  letterSpacing: '0.5px',
                  fontFamily: "'Segoe UI', sans-serif",
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block'
                }}>
                  {form.full_name || 'YOUR NAME HERE'}
                </span>
              </div>

              {/* Card Footer */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-end', 
                zIndex: 1,
                borderTop: '1px solid rgba(250,246,240,0.1)',
                paddingTop: '12px' 
              }}>
                <div>
                  <span style={{ fontSize: '8px', color: '#A2968E', letterSpacing: '1px', display: 'block', textTransform: 'uppercase' }}>
                    MEMBER ID
                  </span>
                  <span style={{ fontSize: '11px', color: '#E4DCD3', fontFamily: 'monospace', fontWeight: 600 }}>
                    CC-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}-XXXXXX
                  </span>
                </div>
                <div style={{ 
                  background: 'linear-gradient(135deg, #C9943A, #A2825A)', 
                  color: '#1E110A', 
                  fontSize: '9px', 
                  fontWeight: 900, 
                  padding: '4px 10px', 
                  borderRadius: '100px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  boxShadow: '0 2px 10px rgba(201,148,58,0.2)' 
                }}>
                  SILVER TIER
                </div>
              </div>
            </div>

            {/* Elite Club Values List */}
            <div style={{ 
              background: '#FFFFFF', 
              borderRadius: '20px', 
              padding: '24px', 
              border: '1px solid #E8DCD3', 
              boxShadow: '0 4px 20px rgba(30,17,10,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1E110A', margin: '0 0 4px 0', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} style={{ color: '#C9943A' }} /> Exclusive Club Benefits
              </h3>
              
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ background: '#FAF6F0', borderRadius: '10px', padding: '8px', color: '#7B4A2E' }}>
                  <Gift size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E110A', margin: '0 0 2px 0' }}>FREE Coffee Faster</h4>
                  <p style={{ fontSize: '12px', color: '#5C524C', margin: '0', lineHeight: 1.4 }}>Earn your <strong>FREE coffee on every 5th visit</strong> (regularly 10 visits!).</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ background: '#FAF6F0', borderRadius: '10px', padding: '8px', color: '#7B4A2E' }}>
                  <Award size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E110A', margin: '0 0 2px 0' }}>VIP Lifetime Gold Tier</h4>
                  <p style={{ fontSize: '12px', color: '#5C524C', margin: '0', lineHeight: 1.4 }}>Upgrade automatically to Gold Tier at just <strong>11 visits</strong> for a lifetime 10% discount.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ background: '#FAF6F0', borderRadius: '10px', padding: '8px', color: '#7B4A2E' }}>
                  <Zap size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E110A', margin: '0 0 2px 0' }}>Birthday & Anniversary Gifts</h4>
                  <p style={{ fontSize: '12px', color: '#5C524C', margin: '0', lineHeight: 1.4 }}>Celebrate special dates with curated gifts, free bakery items, and custom offers.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: High-End Application Form */}
          <div style={{ 
            background: '#FFFFFF', 
            borderRadius: '24px', 
            padding: '36px', 
            boxShadow: '0 15px 40px rgba(30,17,10,0.06), 0 2px 8px rgba(0,0,0,0.02)', 
            border: '1px solid #E8DCD3',
            position: 'relative' 
          }}>
            {/* High-end progress indicator */}
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: '#E8DCD3', 
              borderTopLeftRadius: '24px', 
              borderTopRightRadius: '24px',
              overflow: 'hidden' 
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: progress === 100 ? 'linear-gradient(90deg, #2E7D32, #43A047)' : 'linear-gradient(90deg, #7B4A2E, #C9943A)',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>

            {/* Form Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #FAF6F0', paddingBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1E110A', margin: '0' }}>Membership Application</h2>
                <p style={{ fontSize: '12px', color: '#7B6E66', margin: '4px 0 0 0' }}>Provide your credentials below to initialize your account.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: '#7B6E66', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progress</span>
                <div style={{ fontSize: '15px', fontWeight: 900, color: progress === 100 ? '#2E7D32' : '#7B4A2E' }}>{progress}%</div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ 
                background: '#FDF2F2', 
                border: '1px solid #FDE8E8', 
                borderRadius: '12px', 
                padding: '12px 16px', 
                marginBottom: '24px', 
                color: '#9B1C1C', 
                fontSize: '13px', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                animation: 'shake 0.3s ease' 
              }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#9B1C1C', borderRadius: '50%' }}></span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Primary Required Details Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Star size={12} color="#C9943A" strokeWidth={3} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#7B6E66', textTransform: 'uppercase', letterSpacing: '1px' }}>Core Credentials</span>
                  <div style={{ flex: 1, height: '1px', background: '#FAF6F0' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Full Name */}
                  <FieldGroup label="Full Name" icon={<User size={14} />} required>
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
                  <FieldGroup label="Email Address" icon={<Mail size={14} />} required>
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
                  <FieldGroup label="Phone Number" icon={<Phone size={14} />} required>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px' }}>
                      <select
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        style={{
                          padding: '12px 14px',
                          border: '2px solid #E8DCD3',
                          borderRadius: '12px',
                          fontSize: '13px',
                          background: '#FFFFFF',
                          color: '#1E110A',
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={() => setFocusedField('phone_code')}
                        onBlur={() => setFocusedField(null)}
                        className={focusedField === 'phone_code' ? 'select-focused' : ''}
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
                </div>
              </div>

              {/* Secondary Demographics Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Star size={12} color="#7B4A2E" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#7B6E66', textTransform: 'uppercase', letterSpacing: '1px' }}>Additional Details</span>
                  <div style={{ flex: 1, height: '1px', background: '#FAF6F0' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Date of Birth */}
                  <FieldGroup label="Date of Birth" icon={<Cake size={14} />} hint="Format: DD-MM-YYYY">
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

                  {/* Occupation */}
                  <FieldGroup label="Occupation" icon={<Briefcase size={14} />}>
                    <StyledInput
                      type="text"
                      value={form.occupation}
                      onChange={e => setForm({ ...form, occupation: e.target.value })}
                      placeholder="e.g. Architect, Software Engineer, Teacher..."
                      focused={focusedField === 'occupation'}
                      onFocus={() => setFocusedField('occupation')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </FieldGroup>

                  {/* Address */}
                  <FieldGroup label="Physical Address" icon={<MapPin size={14} />}>
                    <textarea
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })}
                      placeholder="Your street address, area, city..."
                      rows={2}
                      onFocus={() => setFocusedField('address')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: `2px solid ${focusedField === 'address' ? '#C9943A' : '#E8DCD3'}`,
                        borderRadius: '12px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        resize: 'none',
                        background: '#FFFFFF',
                        color: '#1E110A',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s ease',
                        boxShadow: focusedField === 'address' ? '0 0 0 4px rgba(201,148,58,0.12)' : 'none',
                        outline: 'none'
                      }}
                    />
                  </FieldGroup>
                </div>
              </div>

              {/* Special Dates Dynamic Section */}
              <div style={{ 
                background: '#FAF6F0', 
                borderRadius: '16px', 
                padding: '20px', 
                border: '1px solid #E8DCD3' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarHeart size={15} style={{ color: '#7B4A2E' }} />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E110A' }}>Special Occasions</span>
                  </div>
                  {specialDates.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setSpecialDates([...specialDates, { occasion_name: '', date: '' }])}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E8DCD3',
                        color: '#7B4A2E',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: '100px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease'
                      }}
                      className="add-date-btn"
                    >
                      <Plus size={12} strokeWidth={2.5} /> Add Date
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: '#7B6E66', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                  Add birth anniversaries or wedding milestones — we love to surprise our members with complimentary treats!
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {specialDates.map((date, idx) => (
                    <div key={idx} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 110px 38px',
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      <input
                        type="text"
                        placeholder="Occasion (e.g. Anniversary)"
                        value={date.occasion_name}
                        onChange={e => setSpecialDates(specialDates.map((d, i) => i === idx ? { ...d, occasion_name: e.target.value } : d))}
                        style={{ 
                          padding: '10px 12px', 
                          border: '1.5px solid #E8DCD3', 
                          borderRadius: '10px', 
                          fontSize: '13px', 
                          background: 'white', 
                          color: '#1E110A', 
                          outline: 'none', 
                          fontFamily: 'inherit',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={() => setFocusedField(`spec_occ_${idx}`)}
                        onBlur={() => setFocusedField(null)}
                        className={focusedField === `spec_occ_${idx}` ? 'special-input-focused' : ''}
                      />
                      <input
                        type="text"
                        placeholder="DD-MM"
                        value={date.date}
                        onChange={e => handleDateInput(e.target.value, 'date', idx)}
                        style={{ 
                          padding: '10px 12px', 
                          border: '1.5px solid #E8DCD3', 
                          borderRadius: '10px', 
                          fontSize: '13px', 
                          background: 'white', 
                          color: '#1E110A', 
                          outline: 'none', 
                          fontFamily: 'inherit',
                          textAlign: 'center',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={() => setFocusedField(`spec_date_${idx}`)}
                        onBlur={() => setFocusedField(null)}
                        className={focusedField === `spec_date_${idx}` ? 'special-input-focused' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setSpecialDates(specialDates.filter((_, i) => i !== idx))}
                        style={{ 
                          background: '#FDF2F2', 
                          border: 'none', 
                          color: '#EF5350', 
                          cursor: 'pointer', 
                          width: '38px', 
                          height: '38px', 
                          borderRadius: '10px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          transition: 'background 0.2s' 
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#FDE8E8'}
                        onMouseOut={e => e.currentTarget.style.background = '#FDF2F2'}
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agreements & Checkboxes */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <ClipboardList size={12} color="#7B4A2E" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#7B6E66', textTransform: 'uppercase', letterSpacing: '1px' }}>Terms & Agreements</span>
                  <div style={{ flex: 1, height: '1px', background: '#FAF6F0' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <CuteCheckbox
                    checked={agreePromo}
                    onChange={e => setAgreePromo(e.target.checked)}
                    label="I would like to receive exclusive club offers, new coffee blends & promotional releases."
                  />
                  <CuteCheckbox
                    checked={agreeAccuracy}
                    onChange={e => setAgreeAccuracy(e.target.checked)}
                    label="I certify that all details provided in this application are correct and accurate."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                onMouseOver={() => setHoverSubmit(true)}
                onMouseOut={() => setHoverSubmit(false)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: loading
                    ? '#CCCCCC'
                    : hoverSubmit
                    ? 'linear-gradient(135deg, #1E110A 0%, #3F2314 100%)'
                    : 'linear-gradient(135deg, #2C1A11 0%, #1E110A 100%)',
                  color: '#FFFFFF',
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
                  boxShadow: loading ? 'none' : hoverSubmit ? '0 8px 24px rgba(30,17,10,0.25)' : '0 4px 14px rgba(30,17,10,0.12)',
                  transform: hoverSubmit && !loading ? 'translateY(-1px)' : 'translateY(0)',
                  letterSpacing: '0.3px',
                  marginTop: '10px'
                }}
              >
                {loading ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing Membership...</>
                ) : (
                  <>Submit Membership Application</>
                )}
              </button>

            </form>
          </div>
        </div>
      </div>

      {/* Global CSS styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        
        input::placeholder { color: #BDB2AA; }
        textarea::placeholder { color: #BDB2AA; }
        
        select:focus { 
          border-color: #C9943A !important; 
          box-shadow: 0 0 0 4px rgba(201,148,58,0.12) !important;
        }

        .select-focused {
          border-color: #C9943A !important;
        }

        .special-input-focused {
          border-color: #C9943A !important;
        }

        .back-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(30,17,10,0.08) !important;
          border-color: #C9943A !important;
          color: #C9943A !important;
        }

        .add-date-btn:hover {
          border-color: #7B4A2E !important;
          background: #FAF6F0 !important;
          transform: scale(1.02);
        }

        .card-vip-container:hover {
          transform: translateY(-4px) rotate(0.5deg);
          box-shadow: 0 25px 55px rgba(30,17,10,0.3) !important;
          border-color: rgba(201,148,58,0.3) !important;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr !important;
            gap: 30px !important;
          }
          .card-vip-container {
            aspect-ratio: auto !important;
            height: 180px !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  )
}

function FieldGroup({ label, icon, required, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <label style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '11px', 
        fontWeight: 800, 
        color: '#1E110A', 
        marginBottom: '6px', 
        textTransform: 'uppercase', 
        letterSpacing: '0.5px' 
      }}>
        <span style={{ display: 'flex', alignItems: 'center', color: '#7B4A2E' }}>{icon}</span>
        {label}
        {required && <span style={{ color: '#EF5350', fontSize: '13px', marginLeft: '2px' }}>*</span>}
        {hint && <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: '#7B6E66', fontSize: '10px', marginLeft: '4px' }}>— {hint}</span>}
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
        border: `2px solid ${focused ? '#C9943A' : '#E8DCD3'}`,
        borderRadius: '12px',
        fontSize: '14px',
        boxSizing: 'border-box',
        background: '#FFFFFF',
        color: '#1E110A',
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
        boxShadow: focused ? '0 0 0 4px rgba(201,148,58,0.12)' : 'none',
        outline: 'none'
      }}
    />
  )
}

function CuteCheckbox({ checked, onChange, label }) {
  return (
    <label style={{ 
      display: 'flex', 
      gap: '12px', 
      alignItems: 'flex-start', 
      cursor: 'pointer', 
      padding: '12px 14px', 
      background: checked ? 'rgba(201,148,58,0.03)' : '#FFFFFF', 
      borderRadius: '12px', 
      border: `1.5px solid ${checked ? '#C9943A' : '#E8DCD3'}`, 
      transition: 'all 0.2s ease', 
      userSelect: 'none' 
    }}>
      <div style={{ 
        width: '18px', 
        height: '18px', 
        borderRadius: '5px', 
        border: `2px solid ${checked ? '#C9943A' : '#BDB2AA'}`, 
        background: checked ? '#C9943A' : '#FFFFFF', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        transition: 'all 0.2s ease', 
        flexShrink: 0, 
        marginTop: '1.5px',
        position: 'relative' 
      }}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" style={{ position: 'absolute' }}>
            <path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        <input type="checkbox" checked={checked} onChange={onChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      </div>
      <span style={{ 
        fontSize: '12.5px', 
        color: checked ? '#1E110A' : '#5C524C', 
        fontWeight: checked ? 600 : 400, 
        lineHeight: '1.45', 
        transition: 'all 0.2s ease' 
      }}>{label}</span>
    </label>
  )
}
