'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Coffee, BookOpen, ShoppingCart, ClipboardList, Package, Home, Menu, X, ScanLine, Calculator as CalcIcon } from 'lucide-react'
import { useState } from 'react'
import Calculator from './Calculator'

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/menu', icon: BookOpen, label: 'Menu & Recipes' },
  { href: '/bazar', icon: ShoppingCart, label: 'Bazar' },
  { href: '/sales', icon: ClipboardList, label: 'Sales' },
  { href: '/stock', icon: Package, label: 'Stock' },
  { href: '/transcribe', icon: ScanLine, label: 'Scan Document' },
  { href: '/login', icon: Coffee, label: 'Admin' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCalcOpen, setIsCalcOpen] = useState(false)

  return (
    <nav className="bg-[var(--cafe-brown)] text-white shadow-xl sticky top-0 z-[100] border-b border-[var(--cafe-brown-light)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105 active:scale-95">
            <div className="bg-[var(--cafe-gold)] p-2 rounded-xl shadow-inner group-hover:bg-[var(--cafe-gold-light)] transition-colors">
              <Coffee size={24} className="text-[var(--cafe-brown)]" />
            </div>
            <span className="font-display font-bold text-lg md:text-xl tracking-wide uppercase">
              Crown <span className="text-[var(--cafe-gold)]">Coffee</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all duration-200 border-2 border-transparent ${
                  pathname === href
                    ? 'bg-white text-[var(--cafe-brown)] shadow-md'
                    : 'text-amber-100/80 hover:bg-[var(--cafe-brown-light)] hover:text-white'
                }`}
              >
                <Icon size={18} /> {label}
              </Link>
            ))}
          </div>

          {/* Desktop Nav Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={() => setIsCalcOpen(!isCalcOpen)}
              className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${isCalcOpen ? 'bg-[var(--cafe-gold)] border-[var(--cafe-gold)] text-[var(--cafe-brown)] shadow-lg' : 'border-white/10 text-white hover:bg-white/10'}`}
            >
              <CalcIcon size={18} /> Calculator
            </button>
            <div className="w-px h-6 bg-white/10 mx-2" />
            
            {/* Mobile Menu Toggle (re-using for layout alignment) */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-[var(--cafe-brown-light)] transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <button 
            className="md:hidden p-2 rounded-lg hover:bg-[var(--cafe-brown-light)] transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`md:hidden absolute top-full left-0 w-full bg-[var(--cafe-brown)] border-t border-[var(--cafe-brown-light)] shadow-2xl transition-all duration-300 transform ${isMobileMenuOpen ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'}`}>
        <div className="p-4 space-y-2">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-4 p-4 rounded-2xl text-base font-bold transition-all ${
                pathname === href
                  ? 'bg-white text-[var(--cafe-brown)] shadow-lg'
                  : 'text-amber-100/80 active:bg-[var(--cafe-brown-light)]'
              }`}
            >
              <Icon size={20} /> {label}
            </Link>
          ))}
        </div>
      </div>
      {/* Calculator instance */}
      <Calculator isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
    </nav>
  )
}
