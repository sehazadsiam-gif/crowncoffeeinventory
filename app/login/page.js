'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '../../components/Toast'
import {
  Lock, Coffee, Users, ShieldCheck,
  Key, Eye, EyeOff, Sparkles,
  Volume2, VolumeX, ArrowLeft, CheckCircle2
} from 'lucide-react'

export default function LampLoginPage() {
  // Lamp state (starts ON by default for instant usability, or user can toggle)
  const [isOn, setIsOn] = useState(true)
  const [isPulling, setIsPulling] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Auth tabs: 'admin' | 'staff'
  const [activeTab, setActiveTab] = useState('admin')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form states
  const [adminPin, setAdminPin] = useState('')
  const [staffPasscode, setStaffPasscode] = useState('')
  const [mounted, setMounted] = useState(false)

  const router = useRouter()
  const { addToast } = useToast()
  const audioCtxRef = useRef(null)

  // Play mechanical pull switch click sound
  const playSwitchSound = () => {
    if (!soundEnabled) return
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        if (AudioContext) audioCtxRef.current = new AudioContext()
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
      if (!audioCtxRef.current) return

      const ctx = audioCtxRef.current
      const t = ctx.currentTime

      // First sharp click transient
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(1200, t)
      osc1.frequency.exponentialRampToValueAtTime(140, t + 0.04)
      gain1.gain.setValueAtTime(0.35, t)
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(t)
      osc1.stop(t + 0.05)

      // Secondary spring metallic resonance
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(420, t + 0.03)
      osc2.frequency.exponentialRampToValueAtTime(180, t + 0.09)
      gain2.gain.setValueAtTime(0.18, t + 0.03)
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(t + 0.03)
      osc2.stop(t + 0.1)
    } catch (err) {
      // Ignore audio context autoplay errors
    }
  }

  // Toggle switch with spring animation
  const handleToggleLamp = () => {
    setIsPulling(true)
    playSwitchSound()
    setTimeout(() => {
      setIsOn(prev => !prev)
    }, 120)
    setTimeout(() => {
      setIsPulling(false)
    }, 450)
  }

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const mode = params.get('mode') || params.get('role') || params.get('type')
      if (mode === 'staff') {
        setActiveTab('staff')
      } else if (mode === 'admin') {
        setActiveTab('admin')
      }
    }
  }, [])

  // Admin login submission
  const handleAdminLogin = (e) => {
    e.preventDefault()
    if (!adminPin.trim()) {
      return addToast('Please enter Admin PIN', 'error')
    }
    setLoading(true)
    if (adminPin.trim() === '1590' || adminPin.trim() === 'admin12345') {
      localStorage.setItem('isAdmin', 'true')
      localStorage.setItem('cc_token', 'admin_pin_session')
      localStorage.setItem('cc_role', 'admin')
      localStorage.setItem('cc_username', 'admin')
      addToast('Welcome back, Admin!', 'success')
      router.push('/dashboard')
    } else {
      addToast('Invalid Admin PIN', 'error')
      setLoading(false)
    }
  }

  // Staff login submission using Passcode
  const handleStaffLogin = async (e) => {
    e.preventDefault()
    if (!staffPasscode.trim()) {
      return addToast('Please enter your passcode', 'error')
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: staffPasscode.trim()
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Invalid passcode')
      }

      localStorage.setItem('cc_token', data.token)
      localStorage.setItem('cc_role', 'staff')
      localStorage.setItem('cc_staff_id', data.staff_id)
      localStorage.setItem('cc_staff_name', data.name)
      if (data.staff_id) localStorage.setItem('staffPortalId', data.staff_id)

      addToast(`Welcome, ${data.name || 'Staff'}!`, 'success')
      router.push('/staff-portal')
    } catch (err) {
      addToast(err.message || 'Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Auto turn on lamp if user focuses on form while off
  const handleCardInteraction = () => {
    if (!isOn) {
      setIsOn(true)
      playSwitchSound()
    }
  }

  return (
    <div
      className={`lamp-scene ${isOn ? 'is-on' : 'is-off'}`}
      style={{
        minHeight: '100dvh',
        width: '100%',
        backgroundColor: isOn ? '#1c1f24' : '#121417',
        color: '#f3f4f6',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background-color 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '24px 16px'
      }}
    >
      {/* ── AMBIENT LIGHTING OVERLAYS ── */}
      {/* Volumetric warm beam from the lamp across the scene */}
      <div
        className="light-beam"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '1200px',
          height: '1000px',
          transform: 'translate(-65%, -55%)',
          background: 'radial-gradient(ellipse 55% 45% at 38% 36%, rgba(255, 225, 175, 0.16) 0%, rgba(212, 147, 58, 0.08) 40%, rgba(28, 31, 36, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: isOn ? 1 : 0,
          transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />

      {/* Subtle floor / table glow beneath the lamp and card */}
      <div
        style={{
          position: 'absolute',
          bottom: '12%',
          left: '50%',
          width: '900px',
          height: '350px',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse 70% 30% at 50% 50%, rgba(255, 215, 150, 0.08) 0%, rgba(0, 0, 0, 0) 75%)',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: isOn ? 1 : 0,
          transition: 'opacity 0.65s ease'
        }}
      />

      {/* Top Controls: Sound Toggle & Back */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 20
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: isOn ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.35)',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            transition: 'all 0.3s ease'
          }}
        >
          <ArrowLeft size={15} /> Crown Coffee
        </Link>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(8px)',
            color: soundEnabled ? '#e5c07b' : 'rgba(255, 255, 255, 0.4)',
            padding: '8px 12px',
            borderRadius: '999px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span>{soundEnabled ? 'SFX On' : 'Muted'}</span>
        </button>
      </div>

      {/* ── MAIN STAGE: LAMP ON LEFT, LOGIN CARD ON RIGHT ── */}
      <div
        className="login-stage"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '50px',
          width: '100%',
          maxWidth: '920px',
          zIndex: 10,
          position: 'relative'
        }}
      >
        {/* ── INTERACTIVE DESK LAMP ── */}
        <div
          className="lamp-wrapper"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          {/* Subtle click prompt above lamp */}
          <div
            className="lamp-hint"
            onClick={handleToggleLamp}
            style={{
              marginBottom: '8px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isOn ? 'rgba(255, 230, 180, 0.75)' : 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'color 0.4s ease'
            }}
          >
            <Sparkles size={12} />
            <span>{isOn ? 'Click cord to turn off' : 'Pull cord to turn on'}</span>
          </div>

          <div
            style={{
              position: 'relative',
              width: '260px',
              height: '350px',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            {/* Lamp Light Bloom Halo behind the shade */}
            <div
              className="lamp-bulb-glow"
              style={{
                position: 'absolute',
                top: '55px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '220px',
                height: '140px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 240, 205, 0.85) 0%, rgba(240, 181, 90, 0.45) 45%, rgba(212, 147, 58, 0) 75%)',
                filter: 'blur(16px)',
                pointerEvents: 'none',
                opacity: isOn ? 1 : 0,
                transition: 'opacity 0.45s ease',
                zIndex: 1
              }}
            />

            {/* SVG Desk Lamp */}
            <svg
              viewBox="0 0 240 340"
              width="240"
              height="340"
              style={{
                filter: isOn
                  ? 'drop-shadow(0 0 24px rgba(255, 225, 175, 0.4))'
                  : 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))',
                transition: 'filter 0.5s ease',
                zIndex: 2,
                overflow: 'visible'
              }}
            >
              <defs>
                {/* Lit Lampshade Gradient */}
                <linearGradient id="shadeLit" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="70%" stopColor="#FFF7E6" />
                  <stop offset="100%" stopColor="#F5E4C8" />
                </linearGradient>

                {/* Off Lampshade Gradient */}
                <linearGradient id="shadeOff" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#D5D9E0" />
                  <stop offset="80%" stopColor="#A4AAB5" />
                  <stop offset="100%" stopColor="#878D98" />
                </linearGradient>

                {/* Metallic Stem Gradient */}
                <linearGradient id="stemMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8C827A" />
                  <stop offset="50%" stopColor="#D9D2CA" />
                  <stop offset="100%" stopColor="#6E655E" />
                </linearGradient>

                {/* Lamp Shade Inner Warm Glow Rim */}
                <linearGradient id="innerRimLit" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFC870" />
                  <stop offset="50%" stopColor="#FFEACC" />
                  <stop offset="100%" stopColor="#FFC870" />
                </linearGradient>

                {/* Golden Pull Chain Bead */}
                <linearGradient id="goldBead" x1="20%" y1="20%" x2="80%" y2="80%">
                  <stop offset="0%" stopColor="#FFE59E" />
                  <stop offset="45%" stopColor="#D4933A" />
                  <stop offset="100%" stopColor="#8C5318" />
                </linearGradient>
              </defs>

              {/* Lamp Stem / Vertical Pole */}
              <rect
                x="114"
                y="105"
                width="12"
                height="195"
                rx="6"
                fill="url(#stemMetal)"
              />

              {/* Lamp Base Stand */}
              <ellipse
                cx="120"
                cy="300"
                rx="62"
                ry="14"
                fill="url(#stemMetal)"
              />
              <ellipse
                cx="120"
                cy="298"
                rx="58"
                ry="10"
                fill={isOn ? '#EDE7E0' : '#A4AAB5'}
                opacity="0.85"
              />

              {/* Inner Under-Shade Socket / Bulb Neck */}
              <rect
                x="110"
                y="92"
                width="20"
                height="22"
                rx="4"
                fill="#4A4540"
              />

              {/* The Lamp Shade Dome */}
              <path
                d="M 28 92 C 28 26, 212 26, 212 92 C 212 100, 28 100, 28 92 Z"
                fill={isOn ? 'url(#shadeLit)' : 'url(#shadeOff)'}
                style={{ transition: 'fill 0.5s ease' }}
              />

              {/* Shade Bottom Inner Lip / Rim */}
              <ellipse
                cx="120"
                cy="92"
                rx="92"
                ry="10"
                fill={isOn ? 'url(#innerRimLit)' : '#6D737E'}
                style={{ transition: 'fill 0.5s ease' }}
              />

              {/* ── INTERACTIVE PULL CORD CHAIN ── */}
              <g
                className={`pull-chain-group ${isPulling ? 'is-pulling' : ''}`}
                onClick={handleToggleLamp}
                style={{ cursor: 'pointer' }}
              >
                {/* Invisible larger click target for pull chain */}
                <rect
                  x="150"
                  y="92"
                  width="40"
                  height="115"
                  fill="transparent"
                />

                {/* Cord line that elongates when pulled */}
                <line
                  x1="168"
                  y1="94"
                  x2="168"
                  y2={isPulling ? '185' : '150'}
                  stroke={isOn ? '#D4933A' : '#717680'}
                  strokeWidth="2.5"
                  strokeDasharray="3 2"
                  strokeLinecap="round"
                  style={{
                    transition: isPulling
                      ? 'all 0.12s ease-out'
                      : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                />

                {/* Pull Bead / Ball */}
                <circle
                  cx="168"
                  cy={isPulling ? '193' : '158'}
                  r="7.5"
                  fill="url(#goldBead)"
                  stroke="#5A3510"
                  strokeWidth="0.8"
                  style={{
                    filter: isOn ? 'drop-shadow(0 0 8px rgba(212,147,58,0.7))' : 'none',
                    transition: isPulling
                      ? 'all 0.12s ease-out'
                      : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                />
              </g>
            </svg>
          </div>
        </div>

        {/* ── FLOATING GLASSMORPHIC LOGIN CARD ── */}
        <div
          className={`login-card-container ${isOn ? 'card-active' : 'card-dormant'}`}
          onClick={handleCardInteraction}
          style={{
            flex: '1 1 380px',
            maxWidth: '410px',
            position: 'relative',
            zIndex: 5,
            borderRadius: '26px',
            background: isOn
              ? 'rgba(32, 35, 41, 0.82)'
              : 'rgba(20, 22, 26, 0.65)',
            border: isOn
              ? '1px solid rgba(255, 255, 255, 0.14)'
              : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: isOn
              ? '0 24px 60px -12px rgba(0, 0, 0, 0.65), 0 0 35px rgba(212, 147, 58, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.16)'
              : '0 12px 30px rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            padding: '36px 32px 32px',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isOn ? 1 : 0.42,
            transform: isOn ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(6px)'
          }}
        >
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #7C3A1E 0%, #D4933A 100%)',
                boxShadow: '0 6px 18px rgba(124, 58, 30, 0.35)',
                marginBottom: '12px'
              }}
            >
              <Coffee size={24} color="#FFFFFF" />
            </div>

            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-0.02em'
              }}
            >
              Welcome
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: isOn ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.35)',
                marginTop: '4px',
                marginBottom: 0
              }}
            >
              Crown Coffee Portal
            </p>
          </div>

          {/* Role Switching Segment Tabs: Admin PIN & Staff Portal */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '26px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            {[
              { id: 'admin', label: 'Admin PIN', icon: ShieldCheck },
              { id: 'staff', label: 'Staff Portal', icon: Users }
            ].map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    handleCardInteraction()
                    setActiveTab(tab.id)
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: active
                      ? 'linear-gradient(135deg, rgba(212, 147, 58, 0.25), rgba(124, 58, 30, 0.35))'
                      : 'transparent',
                    color: active ? '#FFD599' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: '13px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* ── TAB 1: ADMIN PIN LOGIN ── */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.65)',
                    marginBottom: '8px'
                  }}
                >
                  Admin Security PIN
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.35)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    className="lamp-input"
                    placeholder="Enter PIN"
                    value={adminPin}
                    onChange={e => setAdminPin(e.target.value)}
                    onFocus={handleCardInteraction}
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(0, 0, 0, 0.28)',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      letterSpacing: '3px',
                      paddingLeft: '44px',
                      paddingRight: '16px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Gold Shimmering Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="golden-btn"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(180deg, #FDE68A 0%, #D4933A 55%, #A8641C 100%)',
                  color: '#1A1208',
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(212, 147, 58, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  marginTop: '4px'
                }}
              >
                {loading ? 'Verifying...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── TAB 2: STAFF PORTAL (PASSCODE ONLY) ── */}
          {activeTab === 'staff' && (
            <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.65)',
                    marginBottom: '8px'
                  }}
                >
                  Staff Passcode
                </label>
                <div style={{ position: 'relative' }}>
                  <Key
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.35)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="lamp-input"
                    placeholder="Enter Passcode"
                    value={staffPasscode}
                    onChange={e => setStaffPasscode(e.target.value)}
                    onFocus={handleCardInteraction}
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(0, 0, 0, 0.28)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      paddingLeft: '44px',
                      paddingRight: '44px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.45)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="golden-btn"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(180deg, #FDE68A 0%, #D4933A 55%, #A8641C 100%)',
                  color: '#1A1208',
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(212, 147, 58, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  marginTop: '4px'
                }}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Quick Help Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '24px',
              fontSize: '11.5px',
              color: 'rgba(255, 255, 255, 0.35)'
            }}
          >
            <CheckCircle2 size={12} color="#10B981" />
            <span>Crown Coffee Internal Access</span>
          </div>
        </div>
      </div>

      {/* ── CSS STYLES & ANIMATIONS ── */}
      <style jsx>{`
        .lamp-input:focus {
          border-color: rgba(212, 147, 58, 0.6) !important;
          box-shadow: 0 0 0 3px rgba(212, 147, 58, 0.18) !important;
          background: rgba(0, 0, 0, 0.4) !important;
        }

        .golden-btn {
          position: relative;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .golden-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(212, 147, 58, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.8) !important;
        }

        .golden-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .golden-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: -80%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.35),
            transparent
          );
          transform: skewX(-20deg);
          animation: shine 3.5s infinite;
        }

        @keyframes shine {
          0% { left: -80%; }
          30% { left: 140%; }
          100% { left: 140%; }
        }

        /* Lamp hover interaction */
        .pull-chain-group:hover circle {
          filter: drop-shadow(0 0 12px rgba(255, 215, 120, 0.9)) !important;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .login-stage {
            flex-direction: column !important;
            gap: 20px !important;
            margin-top: 40px;
          }

          .lamp-wrapper {
            transform: scale(0.8);
            margin-bottom: -40px;
          }

          .light-beam {
            width: 700px !important;
            height: 700px !important;
            transform: translate(-50%, -45%) !important;
          }

          .login-card-container {
            width: 100% !important;
            max-width: 380px !important;
            padding: 28px 22px 24px !important;
          }
        }
      `}</style>
    </div>
  )
}
