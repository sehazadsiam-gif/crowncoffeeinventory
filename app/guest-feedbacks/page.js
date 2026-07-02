'use client'

import { useState } from 'react'
import { Star, Coffee, Phone, MessageSquare, Sparkles, Check, Frown, ArrowRight } from 'lucide-react'
import { useToast } from '../../components/Toast'

export default function GuestFeedbackPage() {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [highlights, setHighlights] = useState([])
  const [suggestion, setSuggestion] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  const { addToast } = useToast()

  const highlightOptions = [
    { id: 'food', label: 'Delicious Food 🍔' },
    { id: 'service', label: 'Friendly Service 🤝' },
    { id: 'value_for_money', label: 'Value for Money 💰' }
  ]

  const toggleHighlight = (id) => {
    if (highlights.includes(id)) {
      setHighlights(highlights.filter(item => item !== id))
    } else {
      setHighlights([...highlights, id])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (rating === 0) {
      addToast('Please select a rating to continue.', 'error')
      return
    }

    if (!phone.trim()) {
      addToast('Please provide a valid phone number.', 'error')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/guest-feedbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating,
          highlights,
          suggestion,
          phone,
          submitted_at: new Date().toISOString()
        })
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSubmitted(true)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const getRatingMessage = () => {
    switch (hoverRating || rating) {
      case 1: return 'Disappointing 😞'
      case 2: return 'Below Expectations 🙁'
      case 3: return 'Average / Okay 😐'
      case 4: return 'Great Experience! 🙂'
      case 5: return 'Absolutely Spectacular! 🌟'
      default: return 'Select your rating'
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#120703',
      backgroundImage: 'radial-gradient(circle at 10% 20%, #4A1D0F 0%, #2C1109 45%, #120703 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '28px 16px',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dynamic drifting background glow */}
      <div style={{
        position: 'absolute',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'rgba(212, 147, 58, 0.08)',
        filter: 'blur(80px)',
        top: '15%',
        left: '20%',
        animation: 'floatGlow 8s ease-in-out infinite',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'rgba(124, 58, 30, 0.12)',
        filter: 'blur(90px)',
        bottom: '10%',
        right: '15%',
        animation: 'floatGlow2 12s ease-in-out infinite',
        pointerEvents: 'none'
      }} />

      <style>{`
        @keyframes floatGlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.1); }
        }
        @keyframes floatGlow2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.05); }
        }
        @keyframes sparkle-float {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-120px) rotate(360deg) scale(0.6); opacity: 0; }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes checkmark-slide {
          from { width: 0; opacity: 0; margin-right: 0; }
          to { width: 14px; opacity: 1; margin-right: 6px; }
        }
        .feedback-card {
          background: rgba(30, 15, 10, 0.65);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(212, 147, 58, 0.18);
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          animation: card-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .star-item {
          transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .star-item:hover {
          transform: scale(1.22);
        }
        .star-item:active {
          transform: scale(0.9);
        }
        .pill-btn {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pill-btn.selected {
          background: linear-gradient(135deg, #7C3A1E 0%, #5E2A14 100%);
          border-color: #D4933A !important;
          box-shadow: 0 4px 12px rgba(124, 58, 30, 0.35);
        }
        .pill-checkmark {
          animation: checkmark-slide 0.2s ease forwards;
          display: inline-flex;
          align-items: center;
        }
        .sparkle-particle {
          position: absolute;
          color: #D4933A;
          pointer-events: none;
          animation: sparkle-float 2.5s ease-in-out infinite;
        }
        .input-glass {
          background: rgba(18, 9, 6, 0.5) !important;
          border: 1.5px solid rgba(212, 147, 58, 0.15) !important;
          color: #FFF !important;
          transition: all 0.25s ease !important;
        }
        .input-glass:focus {
          border-color: #D4933A !important;
          box-shadow: 0 0 0 3px rgba(212, 147, 58, 0.12) !important;
          background: rgba(18, 9, 6, 0.8) !important;
        }
        .btn-submit-premium {
          background: linear-gradient(135deg, #D4933A 0%, #B27727 100%);
          color: #120703;
          font-weight: 800;
          letter-spacing: 0.02em;
          border: none;
          box-shadow: 0 6px 20px rgba(212, 147, 58, 0.25);
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .btn-submit-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(212, 147, 58, 0.35);
        }
        .btn-submit-premium:active {
          transform: translateY(0);
        }
      `}</style>

      {submitted ? (
        <div className="feedback-card" style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          padding: '48px 36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {rating === 5 ? (
            <>
              {/* Particle Sparkles */}
              <div className="sparkle-particle" style={{ top: '20%', left: '15%', animationDelay: '0s' }}><Sparkles size={16} /></div>
              <div className="sparkle-particle" style={{ top: '15%', left: '80%', animationDelay: '0.4s' }}><Sparkles size={20} /></div>
              <div className="sparkle-particle" style={{ top: '65%', left: '10%', animationDelay: '0.8s' }}><Sparkles size={18} /></div>
              <div className="sparkle-particle" style={{ top: '70%', left: '85%', animationDelay: '1.2s' }}><Sparkles size={14} /></div>
              <div className="sparkle-particle" style={{ top: '30%', left: '50%', animationDelay: '1.6s' }}><Sparkles size={12} /></div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981',
                padding: '24px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.15)'
              }}>
                <Sparkles size={48} />
              </div>
              <h2 style={{ fontSize: '30px', fontWeight: 900, color: '#FFF', margin: 0, letterSpacing: '-0.02em' }}>
                Awesome! Thank You 🌟
              </h2>
              <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6, margin: 0 }}>
                We are absolutely thrilled that you had a wonderful 5-star experience! Your kind words mean the world to our team at Crown Coffee. We look forward to welcoming you back soon!
              </p>
            </>
          ) : (
            <>
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#F59E0B',
                padding: '24px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.15)'
              }}>
                <Frown size={48} />
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#FFF', margin: 0, letterSpacing: '-0.02em' }}>
                Thank You for the Feedback
              </h2>
              <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6, margin: 0 }}>
                We are truly sorry that your experience wasn't perfect today. We are fully committed to making things right and will actively work to improve our food, service, and value based on your response.
              </p>
            </>
          )}

          <button 
            onClick={() => {
              setRating(0)
              setHighlights([])
              setSuggestion('')
              setPhone('')
              setSubmitted(false)
            }}
            className="btn-submit-premium"
            style={{ marginTop: '12px', padding: '12px 32px', borderRadius: '12px', fontSize: '14px' }}
          >
            Submit Another Feedback
          </button>
        </div>
      ) : (
        <div className="feedback-card" style={{
          maxWidth: '500px',
          width: '100%',
          padding: '40px 32px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle brand graphic watermark */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            opacity: 0.015,
            transform: 'rotate(-15deg)',
            pointerEvents: 'none',
            color: '#FFF'
          }}>
            <Coffee size={220} />
          </div>

          {/* Brand header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'rgba(212, 147, 58, 0.1)',
              color: '#D4933A',
              marginBottom: '16px',
              boxShadow: 'inset 0 0 10px rgba(212, 147, 58, 0.15)'
            }}>
              <Coffee size={26} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Crown Coffee
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.55)', margin: 0 }}>
              Your valued feedback helps us refine our guest experience
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '26px' }}>
            
            {/* Question 1: Rating */}
            <div style={{ display: 'grid', gap: '12px', textAlign: 'center' }}>
              <label style={{ fontSize: '14.5px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '0.01em' }}>
                How was your experience today?
              </label>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', margin: '4px 0' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isGold = star <= (hoverRating || rating)
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      className="star-item"
                    >
                      <Star
                        size={36}
                        fill={isGold ? '#D4933A' : 'none'}
                        stroke={isGold ? '#D4933A' : 'rgba(255, 255, 255, 0.25)'}
                        style={{
                          transition: 'all 0.2s ease',
                          filter: isGold ? 'drop-shadow(0 0 6px rgba(212, 147, 58, 0.4))' : 'none'
                        }}
                      />
                    </button>
                  )
                })}
              </div>
              <span style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: rating > 0 ? '#D4933A' : 'rgba(255, 255, 255, 0.4)',
                minHeight: '18px',
                transition: 'color 0.2s'
              }}>
                {getRatingMessage()}
              </span>
            </div>

            {/* Question 2: Highlights */}
            <div style={{ display: 'grid', gap: '10px' }}>
              <label style={{ fontSize: '14.5px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.9)' }}>
                What stood out the most?
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {highlightOptions.map((opt) => {
                  const isSelected = highlights.includes(opt.id)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleHighlight(opt.id)}
                      className={`pill-btn ${isSelected ? 'selected' : ''}`}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '20px',
                        border: '1.5px solid rgba(255, 255, 255, 0.15)',
                        background: 'transparent',
                        color: isSelected ? '#FFF' : 'rgba(255, 255, 255, 0.65)',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      {isSelected && (
                        <span className="pill-checkmark">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Question 3: Phone Number */}
            <div style={{ display: 'grid', gap: '8px' }}>
              <label style={{ fontSize: '14.5px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={15} style={{ color: 'rgba(255, 255, 255, 0.5)' }} /> Phone Number <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#D4933A',
                  pointerEvents: 'none'
                }}>
                  BD (+880)
                </div>
                <input
                  type="tel"
                  required
                  placeholder="1XXXXXXXXX"
                  value={phone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '')
                    setPhone(cleaned)
                  }}
                  className="input input-glass"
                  style={{
                    fontSize: '14px',
                    padding: '12px 14px 12px 90px',
                    borderRadius: '12px',
                    width: '100%',
                    outline: 'none',
                    fontWeight: 600,
                    letterSpacing: '0.04em'
                  }}
                />
              </div>
            </div>

            {/* Question 4: Comments (Optional) */}
            <div style={{ display: 'grid', gap: '8px' }}>
              <label style={{ fontSize: '14.5px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={15} style={{ color: 'rgba(255, 255, 255, 0.5)' }} /> Suggestions <span style={{ fontSize: '11.5px', fontWeight: 400, color: 'rgba(255, 255, 255, 0.4)' }}>(Optional)</span>
              </label>
              <textarea
                placeholder="Let us know what we did well, or where we can improve..."
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                className="input input-glass"
                rows={3}
                style={{
                  fontSize: '13.5px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  width: '100%',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.5
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-submit-premium"
              style={{
                padding: '14px',
                borderRadius: '12px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '10px'
              }}
            >
              {loading ? (
                <div style={{ width: '18px', height: '18px', border: '2px solid #120703', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <>
                  Submit Feedback <ArrowRight size={15} strokeWidth={2.5} />
                </>
              )}
            </button>

          </form>
        </div>
      )}
    </div>
  )
}
