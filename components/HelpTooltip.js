'use client'
import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

export default function HelpTooltip() {
  const [isOpen, setIsOpen] = useState(false)

  const steps = [
    { title: 'Add Ingredients', desc: 'Go to Menu and add raw items like milk or beans.' },
    { title: 'Define Recipes', desc: 'Add menu items and link them to ingredients.' },
    { title: 'Log Bazar', desc: 'Record daily purchases to update stock levels.' },
    { title: 'Record Sales', desc: 'Enter daily sales to automatically deduct stock.' },
  ]

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50 }}>
      {isOpen && (
        <div className="fade-in" style={{
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-light)',
          width: '280px',
          marginBottom: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-light)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={14} style={{ color: 'var(--warning)' }} /> Quick Guide
            </span>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  background: 'var(--bg-subtle)', border: '1px solid var(--border-medium)',
                  color: 'var(--primary)', width: '24px', height: '24px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, flexShrink: 0
                }}>
                  {i + 1}
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{step.title}</p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: '2px' }}>{step.desc}</p>
                </div>
              </div>
            ))}
            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-light)', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Need more help? Ask the manager.
            </div>
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--primary)', color: '#fff',
          width: '56px', height: '56px', borderRadius: '50%',
          boxShadow: 'var(--shadow-md)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease', transform: isOpen ? 'scale(0.95)' : 'scale(1)',
          position: 'relative'
        }}
      >
        {isOpen ? <X size={24} /> : <HelpCircle size={24} />}
      </button>
    </div>
  )
}
