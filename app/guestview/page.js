'use client'

import { useState, useEffect, useRef } from 'react'

export default function GuestViewPage() {
  const [memberData, setMemberData] = useState(null)
  const [tapInfo, setTapInfo] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [scanInput, setScanInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStandby, setIsStandby] = useState(true)
  const timerRef = useRef(null)

  // Auto-focus barcode/RFID keyboard listener
  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    const handleKeyDown = (e) => {
      const currentTime = Date.now()
      if (currentTime - lastKeyTime > 100) {
        buffer = ''
      }
      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        if (buffer.trim()) {
          processTap(buffer.trim())
          buffer = ''
        }
      } else if (e.key.length === 1) {
        buffer += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const processTap = async (code) => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/members/rfid/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid_code: code, location: 'Guest Counter' })
      })

      const data = await res.json()

      if (data.success) {
        setMemberData(data.member)
        setTapInfo(data.visit_recorded)
        setIsStandby(false)

        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          setIsStandby(true)
          setMemberData(null)
          setTapInfo(null)
        }, 9000)
      } else {
        setErrorMsg(data.error || 'Card Scan Failed')
        setIsStandby(false)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          setIsStandby(true)
          setErrorMsg('')
        }, 5000)
      }
    } catch (err) {
      setErrorMsg('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualTestSubmit = (e) => {
    e.preventDefault()
    if (scanInput.trim()) {
      processTap(scanInput.trim())
      setScanInput('')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0D0805',
      color: '#F5EBE6',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Subtle Gradient Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 50% 30%, #2E1A0F 0%, #0D0805 70%)',
        zIndex: 0
      }} />

      {/* Main Content Container */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '800px',
        textAlign: 'center'
      }}>

        {/* Brand Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: '20px',
            backgroundColor: '#28170D',
            border: '1px solid #4A2D1B',
            color: '#D4AF37',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '12px'
          }}>
            Crown Coffee Member Club
          </div>
          <h1 style={{
            fontSize: '38px',
            fontWeight: 900,
            letterSpacing: '-1px',
            margin: '0 0 6px 0',
            color: '#FFFFFF'
          }}>
            CROWN COFFEE
          </h1>
          <p style={{ color: '#A38B7E', fontSize: '15px', margin: 0 }}>
            Member Loyalty & Reward Display
          </p>
        </div>

        {/* STANDBY MODE */}
        {isStandby && (
          <div style={{
            backgroundColor: 'rgba(30, 17, 10, 0.75)',
            border: '1px solid #3D2415',
            borderRadius: '24px',
            padding: '60px 30px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.5s ease-in-out'
          }}>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              backgroundColor: '#26150B',
              border: '2px solid #D4AF37',
              margin: '0 auto 24px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D4AF37',
              fontSize: '28px',
              fontWeight: 800,
              boxShadow: '0 0 25px rgba(212, 175, 55, 0.2)'
            }}>
              RFID
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px 0' }}>
              Tap Your RFID Card Below
            </h2>
            <p style={{ color: '#B89F91', fontSize: '15px', maxWidth: '460px', margin: '0 auto 30px auto', lineHeight: 1.6 }}>
              Scan your physical member card to check in, view visit progress, and unlock rewards.
            </p>

            {/* Hidden / Manual Input Form for Testing */}
            <form onSubmit={handleManualTestSubmit} style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan code or enter manual card RFID..."
                style={{
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: '1px solid #4A2D1B',
                  backgroundColor: '#170E08',
                  color: '#FFF',
                  fontSize: '14px',
                  width: '300px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#D4AF37',
                  color: '#100803',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {isLoading ? 'Scanning...' : 'Tap Card'}
              </button>
            </form>
          </div>
        )}

        {/* ERROR DISPLAY */}
        {!isStandby && errorMsg && (
          <div style={{
            backgroundColor: 'rgba(60, 15, 15, 0.9)',
            border: '1px solid #8B2525',
            borderRadius: '24px',
            padding: '50px 30px',
            color: '#FFCCCC'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#FF6666', margin: '0 0 12px 0' }}>
              Scan Notice
            </h2>
            <p style={{ fontSize: '18px', margin: 0 }}>{errorMsg}</p>
          </div>
        )}

        {/* ACTIVE MEMBER DISPLAY ON TAP */}
        {!isStandby && memberData && tapInfo && (
          <div style={{
            backgroundColor: 'rgba(28, 16, 9, 0.9)',
            border: '1px solid #D4AF37',
            borderRadius: '24px',
            padding: '40px 32px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            animation: 'slideUp 0.4s ease-out'
          }}>
            {/* Member Greeting */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ color: '#D4AF37', fontSize: '14px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Welcome Back
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF', margin: '6px 0' }}>
                {memberData.full_name}
              </h2>
              <div style={{ fontSize: '14px', color: '#B89F91', fontFamily: 'monospace' }}>
                Card #{memberData.card_number || 'CC-MEM-ONLINE'}
              </div>
            </div>

            {/* Total Visits & Lifetime Discount Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '32px'
            }}>
              <div style={{
                backgroundColor: '#170E08',
                border: '1px solid #3D2415',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#A38B7E', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Total Visits
                </div>
                <div style={{ color: '#FFFFFF', fontSize: '36px', fontWeight: 900 }}>
                  {tapInfo.total_visits}
                </div>
              </div>

              <div style={{
                backgroundColor: '#170E08',
                border: '1px solid #3D2415',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#A38B7E', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Lifetime Perks
                </div>
                <div style={{ color: '#2E7D32', fontSize: '20px', fontWeight: 900, marginTop: '8px' }}>
                  10% Discount Active
                </div>
              </div>
            </div>

            {/* 5-Visit Punch Progress Bar */}
            <div style={{
              backgroundColor: '#170E08',
              border: '1px solid #3D2415',
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <span style={{ color: '#D4AF37', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  5-Visit Reward Punch Bar
                </span>
                <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 800 }}>
                  {tapInfo.punch_count} of 5 Punches
                </span>
              </div>

              {/* Punch Card Visual Blocks */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '12px'
              }}>
                {[1, 2, 3, 4, 5].map((step) => {
                  const isPunched = step <= tapInfo.punch_count
                  const isRewardStep = step === 5
                  return (
                    <div
                      key={step}
                      style={{
                        padding: '16px 8px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: '14px',
                        backgroundColor: isPunched
                          ? '#2E7D32'
                          : isRewardStep
                          ? '#3D2A00'
                          : '#26170F',
                        color: isPunched ? '#FFFFFF' : isRewardStep ? '#D4AF37' : '#705647',
                        border: isPunched
                          ? '1px solid #4CAF50'
                          : isRewardStep
                          ? '1px dashed #D4AF37'
                          : '1px solid #362114'
                      }}
                    >
                      {isRewardStep ? (isPunched ? 'REWARD' : 'FREE COFFEE') : `PUNCH ${step}`}
                    </div>
                  )
                })}
              </div>

              {/* Status Note */}
              <div style={{ marginTop: '16px', color: '#B89F91', fontSize: '14px' }}>
                {tapInfo.reward_unlocked
                  ? 'Congratulations! You unlocked 1 Free Coffee Reward on this visit.'
                  : `${5 - tapInfo.punch_count} more visit(s) needed to earn your next Free Coffee.`
                }
              </div>
            </div>

            {/* Special Date Discount Notice if Active */}
            {tapInfo.special_date_notice && (
              <div style={{
                backgroundColor: '#382500',
                border: '1px solid #D4AF37',
                borderRadius: '12px',
                padding: '14px',
                color: '#FFECB3',
                fontSize: '14px',
                fontWeight: 700
              }}>
                Special Occasion Alert: {tapInfo.special_date_notice} Discount Available Today!
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
