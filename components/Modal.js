'use client'
import { X, AlertCircle } from 'lucide-react'

export default function Modal({ isOpen, onClose, onConfirm, title, message, children, confirmLabel = 'Confirm', type = 'danger' }) {
  if (!isOpen) return null

  return (
    <div className="fade-in" style={{
      position: 'fixed', inset: 0, zIndex: 150,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', background: 'rgba(28,20,16,0.6)', backdropFilter: 'blur(4px)'
    }}>
      <div className="animate-in" style={{
        background: 'var(--bg-surface)', width: '100%', maxWidth: '440px',
        borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border-light)'
        }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', transition: 'color 0.15s ease'
          }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '24px' }}>
          {children ? (
            children
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                padding: '10px', borderRadius: '50%', flexShrink: 0,
                background: type === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                color: type === 'danger' ? 'var(--danger)' : 'var(--warning)'
              }}>
                <AlertCircle size={24} strokeWidth={1.5} />
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {message}
              </p>
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px', background: 'var(--bg-subtle)',
          display: 'flex', justifyContent: 'flex-end', gap: '12px',
          borderTop: '1px solid var(--border-light)'
        }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '10px 16px' }}>
            Cancel
          </button>
          <button 
            onClick={() => { onConfirm(); onClose() }} 
            className="btn-primary"
            style={{
              background: type === 'danger' ? 'var(--danger)' : (type === 'warning' ? 'var(--warning)' : 'var(--primary)'),
              boxShadow: 'none'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
