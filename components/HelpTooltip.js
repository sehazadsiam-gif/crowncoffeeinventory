'use client'
import { useState } from 'react'
import { HelpCircle, X, ChevronRight } from 'lucide-react'

export default function HelpTooltip() {
  const [isOpen, setIsOpen] = useState(false)

  const steps = [
    { title: 'Add Ingredients', desc: 'Go to Menu and add raw items like milk or beans.' },
    { title: 'Define Recipes', desc: 'Add menu items and link them to ingredients.' },
    { title: 'Log Bazar', desc: 'Record daily purchases to update stock levels.' },
    { title: 'Record Sales', desc: 'Enter daily sales to automatically deduct stock.' },
  ]

  return (
    <div className="help-tooltip">
      {isOpen ? (
        <div className="bg-white rounded-2xl shadow-2xl border border-[var(--cafe-cream-dark)] w-72 mb-4 overflow-hidden fade-in">
          <div className="bg-[var(--cafe-brown)] text-white px-4 py-3 flex items-center justify-between">
            <span className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
              <HelpCircle size={14} /> Quick Guide
            </span>
            <button onClick={() => setIsOpen(false)} className="hover:text-amber-200">
              <X size={16} />
            </button>
          </div>
          <div className="p-4 space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="bg-[var(--cafe-cream-dark)] text-[var(--cafe-brown)] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--cafe-brown)] uppercase tracking-tight">{step.title}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 italic text-[10px] text-gray-400 text-center">
              Need more help? Ask the manager.
            </div>
          </div>
        </div>
      ) : null}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[var(--cafe-brown)] text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 group relative"
      >
        <HelpCircle size={28} className={isOpen ? 'hidden' : 'block'} />
        <X size={28} className={isOpen ? 'block' : 'hidden'} />
        <span className="absolute right-full mr-3 bg-white text-[var(--cafe-brown)] px-3 py-1.5 rounded-lg text-xs font-bold shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Need help?
        </span>
      </button>
    </div>
  )
}
