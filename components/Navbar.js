'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Crown, BookOpen, ShoppingCart, ClipboardList, Package, Home, Menu, X, Zap, Calculator as CalcIcon } from 'lucide-react'
import { useState } from 'react'
import Calculator from './Calculator'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/menu', label: 'Menu' },
  { href: '/bazar', label: 'Bazar' },
  { href: '/sales', label: 'Sales' },
  { href: '/stock', label: 'Stock' },
  { href: '/transcribe', label: 'Transcribe' },
  { href: '/login', label: 'Admin' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCalcOpen, setIsCalcOpen] = useState(false)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <>
      <nav style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <Crown size={20} style={{ color: 'var(--accent-gold)' }} strokeWidth={1.5} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}>Crown</span>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '9px',
                  fontWeight: 500,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginTop: '1px',
                }}>Coffee</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {navItems.map(({ href, label }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '6px 14px',
                      color: isActive ? 'var(--accent-brown)' : 'var(--text-muted)',
                      borderBottom: isActive ? '2px solid var(--accent-brown)' : '2px solid transparent',
                      transition: 'color 0.2s ease, border-color 0.2s ease',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>

            {/* Right Side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="hide-mobile" style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
              }}>{today}</span>

              <button
                onClick={() => setIsCalcOpen(!isCalcOpen)}
                className="hide-mobile"
                style={{
                  background: isCalcOpen ? 'var(--accent-gold-dim)' : 'transparent',
                  border: `1px solid ${isCalcOpen ? 'var(--accent-gold)' : 'var(--border-light)'}`,
                  borderRadius: '8px',
                  padding: '7px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: isCalcOpen ? '#9A7020' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <CalcIcon size={14} /> Calc
              </button>

              {/* Mobile hamburger */}
              <button
                className="show-mobile"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  color: 'var(--text-secondary)',
                }}
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div style={{
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-light)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            {navItems.map(({ href, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    color: isActive ? 'var(--accent-brown)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--bg-subtle)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--accent-brown)' : '2px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </Link>
              )
            })}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}>{today}</span>
            </div>
          </div>
        )}
      </nav>

      <Calculator isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hide-mobile { display: none !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </>
  )
}
