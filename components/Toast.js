'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 3000)
  }

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
        maxWidth: '340px',
        width: '100%',
      }}>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

const borderColors = {
  success: 'var(--success)',
  error: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--primary)',
}

const icons = {
  success: <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />,
  error: <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />,
  warning: <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />,
  info: <AlertCircle size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />,
}

function ToastItem({ message, type, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        background: 'var(--bg-surface)',
        borderRadius: '10px',
        boxShadow: 'var(--shadow-md)',
        borderLeft: `3px solid ${borderColors[type] || borderColors.info}`,
        border: `1px solid var(--border-light)`,
        borderLeftWidth: '3px',
        borderLeftColor: borderColors[type] || borderColors.info,
        fontFamily: 'var(--font-sans)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      {icons[type] || icons.info}
      <p style={{
        flex: 1,
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        fontWeight: 400,
      }}>{message}</p>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          padding: '2px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
