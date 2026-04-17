'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Delete, Percent, Divide, Minus, Plus, Equal, Hash } from 'lucide-react'

export default function Calculator({ isOpen, onClose }) {
  const [display, setDisplay] = useState('0')
  const [equation, setEquation] = useState('')
  const [isReset, setIsReset] = useState(true)
  const calcRef = useRef(null)

  const [position, setPosition] = useState({ x: 20, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true)
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      }
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      })
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const appendNumber = (num) => {
    if (isReset) {
      setDisplay(num)
      setIsReset(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }
  }

  const appendOperator = (op) => {
    setEquation(display + ' ' + op + ' ')
    setIsReset(true)
  }

  const calculate = () => {
    try {
      const result = eval(equation + display)
      setDisplay(String(Number(result.toFixed(4))))
      setEquation('')
      setIsReset(true)
    } catch (e) {
      setDisplay('Error')
      setEquation('')
      setIsReset(true)
    }
  }

  const clear = () => {
    setDisplay('0')
    setEquation('')
    setIsReset(true)
  }

  const del = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1))
    } else {
      setDisplay('0')
      setIsReset(true)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      ref={calcRef}
      className="animate-in"
      style={{
        position: 'fixed',
        zIndex: 999,
        background: 'rgba(250, 247, 242, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-lg)',
        borderRadius: '16px',
        overflow: 'hidden',
        width: '280px',
        userSelect: 'none',
        left: position.x,
        top: position.y
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header / Drag Handle */}
      <div className="drag-handle" style={{
        background: 'var(--primary)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'move', color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Hash size={14} style={{ color: 'var(--warning)' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Pricing Calculator</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', opacity: 0.8, padding: '4px' }}>
          <X size={16} />
        </button>
      </div>

      {/* Display */}
      <div style={{ padding: '24px 20px', background: 'var(--bg-surface)', textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ height: '16px', fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{equation}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '32px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {display}
        </div>
      </div>

      {/* Keys */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', background: 'var(--bg-subtle)' }}>
        <CalcButton label="C" onClick={clear} style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }} />
        <CalcButton label={<Delete size={16} />} onClick={del} style={{ color: 'var(--text-muted)' }} />
        <CalcButton label="%" onClick={() => setDisplay(String(parseFloat(display) / 100))} style={{ color: 'var(--success)' }} />
        <CalcButton label={<Divide size={16} />} onClick={() => appendOperator('/')} style={{ color: 'var(--primary)', background: 'var(--bg-surface)' }} />

        <CalcButton label="7" onClick={() => appendNumber('7')} />
        <CalcButton label="8" onClick={() => appendNumber('8')} />
        <CalcButton label="9" onClick={() => appendNumber('9')} />
        <CalcButton label={<X size={14} />} onClick={() => appendOperator('*')} style={{ color: 'var(--primary)', background: 'var(--bg-surface)' }} />

        <CalcButton label="4" onClick={() => appendNumber('4')} />
        <CalcButton label="5" onClick={() => appendNumber('5')} />
        <CalcButton label="6" onClick={() => appendNumber('6')} />
        <CalcButton label={<Minus size={16} />} onClick={() => appendOperator('-')} style={{ color: 'var(--primary)', background: 'var(--bg-surface)' }} />

        <CalcButton label="1" onClick={() => appendNumber('1')} />
        <CalcButton label="2" onClick={() => appendNumber('2')} />
        <CalcButton label="3" onClick={() => appendNumber('3')} />
        <CalcButton label={<Plus size={16} />} onClick={() => appendOperator('+')} style={{ color: 'var(--primary)', background: 'var(--bg-surface)' }} />

        <CalcButton label="0" onClick={() => appendNumber('0')} colSpan={2} />
        <CalcButton label="." onClick={() => appendNumber('.')} />
        <CalcButton label={<Equal size={16} />} onClick={calculate} style={{ background: 'var(--warning)', color: '#fff' }} />
      </div>

      <div style={{ padding: '12px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-light)', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Tip: Use this to split bulk prices
      </div>
    </div>
  )
}

function CalcButton({ label, onClick, style = {}, colSpan = 1 }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: '44px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '8px', border: '1px solid var(--border-light)',
        fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600,
        background: 'var(--bg-surface)', color: 'var(--text-secondary)',
        cursor: 'pointer', transition: 'all 0.1s ease',
        gridColumn: `span ${colSpan}`,
        ...style
      }}
      onMouseEnter={e => {
        if (!style.background) e.currentTarget.style.background = 'var(--bg-hover)'
      }}
      onMouseLeave={e => {
        if (!style.background) e.currentTarget.style.background = 'var(--bg-surface)'
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {label}
    </button>
  )
}
