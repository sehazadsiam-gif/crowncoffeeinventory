'use client'

import { useState } from 'react'
import { Star, Coffee, Phone, MessageSquare, Sparkles, CheckCircle2, Frown } from 'lucide-react'
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
    { id: 'food', label: 'Food 🍔' },
    { id: 'service', label: 'Service 🤝' },
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
      addToast('Please select a star rating.', 'error')
      return
    }

    if (!phone.trim()) {
      addToast('Phone number is required.', 'error')
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
          submitted_at: new Date().toISOString()   // device local time in ISO format
        })
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setSubmitted(true)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--bg-subtle) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-sans)'
      }}>
        <div className="card-premium animate-in" style={{
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          padding: '48px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: 'var(--shadow-xl)'
        }}>
          {rating === 5 ? (
            <>
              <div style={{
                background: 'var(--success-bg)',
                color: 'var(--success)',
                padding: '20px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={48} />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Thank You!
              </h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                We are absolutely thrilled that you had a wonderful 5-star experience! Your kind words mean the world to our team at Crown Coffee. We look forward to welcoming you back soon!
              </p>
            </>
          ) : (
            <>
              <div style={{
                background: 'var(--warning-bg)',
                color: 'var(--warning)',
                padding: '20px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Frown size={48} />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Thank You for Your Feedback
              </h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                We are truly sorry that your experience wasn't perfect. We are committed to making things right and will actively work to improve our coffee, food, and service based on your response.
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
            className="btn-primary"
            style={{ marginTop: '12px', padding: '12px 32px' }}
          >
            Submit Another Feedback
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--bg-subtle) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'var(--font-sans)'
    }}>
      <div className="card-premium animate-in" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '40px 32px',
        boxShadow: 'var(--shadow-xl)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background logo */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          opacity: 0.03,
          transform: 'rotate(-15deg)',
          pointerEvents: 'none'
        }}>
          <Coffee size={200} />
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'var(--accent-brown-glow)',
            color: 'var(--accent-brown)',
            marginBottom: '16px'
          }}>
            <Coffee size={28} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            Crown Coffee
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            Share your experience to help us serve you better
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '28px' }}>
          
          {/* Question 1: Rating */}
          <div style={{ display: 'grid', gap: '12px', justifyContent: 'center', textAlign: 'center' }}>
            <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              How would you rate your experience today?
            </label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
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
                    padding: '4px',
                    transition: 'transform 0.15s ease'
                  }}
                  className="star-btn"
                >
                  <Star
                    size={36}
                    fill={star <= (hoverRating || rating) ? 'var(--accent-gold)' : 'none'}
                    stroke={star <= (hoverRating || rating) ? 'var(--accent-gold)' : 'var(--text-faint)'}
                    style={{
                      transition: 'all 0.2s ease',
                      transform: star <= (hoverRating || rating) ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--accent-gold)',
                animation: 'pulse 1.5s infinite'
              }}>
                {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Below Average' : 'Poor'}
              </span>
            )}
          </div>

          {/* Question 2: Highlights */}
          <div style={{ display: 'grid', gap: '12px' }}>
            <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              What did you enjoy most?
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
              {highlightOptions.map((opt) => {
                const isSelected = highlights.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleHighlight(opt.id)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-full)',
                      border: isSelected ? '1px solid var(--accent-brown)' : '1px solid var(--border-medium)',
                      background: isSelected ? 'var(--accent-brown)' : 'transparent',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Question 3: Phone Number */}
          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={16} style={{ color: 'var(--text-muted)' }} /> Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. +8801XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              style={{
                fontSize: '14px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                width: '100%',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          {/* Question 4: Comments (General Suggestions) */}
          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={16} style={{ color: 'var(--text-muted)' }} /> Anything else you would like to share? <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
            </label>
            <textarea
              placeholder="Your comments or suggestions..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              className="input"
              rows={3}
              style={{
                fontSize: '14px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                width: '100%',
                resize: 'none',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              padding: '14px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px'
            }}
          >
            {loading ? (
              <span className="loader" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
            ) : (
              'Submit Feedback'
            )}
          </button>

        </form>
      </div>
    </div>
  )
}
