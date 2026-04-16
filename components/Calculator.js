'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Delete, Percent, Divide, Minus, Plus, Equal, Hash } from 'lucide-react'

export default function Calculator({ isOpen, onClose }) {
  const [display, setDisplay] = useState('0')
  const [equation, setEquation] = useState('')
  const [isReset, setIsReset] = useState(true)
  const calcRef = useRef(null)

  // Dragging logic
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
      className="fixed z-[999] bg-[rgba(255,255,255,0.8)] backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl overflow-hidden w-72 select-none animate-in zoom-in duration-200"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      {/* Header / Drag Handle */}
      <div className="drag-handle bg-[var(--cafe-brown)] p-4 flex items-center justify-between cursor-move text-white">
        <div className="flex items-center gap-2">
          <Hash size={14} className="text-[var(--cafe-gold)]" />
          <span className="text-[10px] font-black uppercase tracking-widest">Pricing Calculator</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Display */}
      <div className="p-6 bg-white/40 text-right">
        <div className="h-4 text-[10px] font-bold text-gray-400 mb-1">{equation}</div>
        <div className="text-3xl font-black text-[var(--cafe-brown)] tracking-tighter truncate">
          {display}
        </div>
      </div>

      {/* Keys */}
      <div className="p-4 grid grid-cols-4 gap-2">
        <CalcButton label="C" onClick={clear} className="text-rose-500 bg-rose-50 hover:bg-rose-100" />
        <CalcButton label={<Delete size={18} />} onClick={del} className="text-gray-500" />
        <CalcButton label="%" onClick={() => setDisplay(String(parseFloat(display) / 100))} className="text-emerald-500" />
        <CalcButton label={<Divide size={18} />} onClick={() => appendOperator('/')} className="text-amber-600 bg-amber-50" />

        <CalcButton label="7" onClick={() => appendNumber('7')} />
        <CalcButton label="8" onClick={() => appendNumber('8')} />
        <CalcButton label="9" onClick={() => appendNumber('9')} />
        <CalcButton label={<X size={16} />} onClick={() => appendOperator('*')} className="text-amber-600 bg-amber-50" />

        <CalcButton label="4" onClick={() => appendNumber('4')} />
        <CalcButton label="5" onClick={() => appendNumber('5')} />
        <CalcButton label="6" onClick={() => appendNumber('6')} />
        <CalcButton label={<Minus size={18} />} onClick={() => appendOperator('-')} className="text-amber-600 bg-amber-50" />

        <CalcButton label="1" onClick={() => appendNumber('1')} />
        <CalcButton label="2" onClick={() => appendNumber('2')} />
        <CalcButton label="3" onClick={() => appendNumber('3')} />
        <CalcButton label={<Plus size={18} />} onClick={() => appendOperator('+')} className="text-amber-600 bg-amber-50" />

        <CalcButton label="0" onClick={() => appendNumber('0')} className="col-span-2" />
        <CalcButton label="." onClick={() => appendNumber('.')} />
        <CalcButton label={<Equal size={18} />} onClick={calculate} className="bg-[var(--cafe-gold)] text-[var(--cafe-brown)]" />
      </div>

      <div className="p-3 bg-amber-50/50 border-t border-amber-100/50 text-[9px] text-center font-bold text-amber-800 uppercase tracking-tighter opacity-70">
        Tip: Use this to split bulk prices
      </div>
    </div>
  )
}

function CalcButton({ label, onClick, className = "", colSpan = 1 }) {
  return (
    <button
      onClick={onClick}
      className={`
        h-12 flex items-center justify-center rounded-xl font-black text-sm transition-all active:scale-90
        ${className.includes('bg-') ? className : 'bg-white hover:bg-gray-50 text-[var(--cafe-brown)]'}
        ${className}
      `}
      style={{ gridColumn: `span ${colSpan}` }}
    >
      {label}
    </button>
  )
}
