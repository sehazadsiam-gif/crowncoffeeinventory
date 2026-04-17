'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Coffee, Menu as MenuIcon, X, Calculator as CalcIcon } from 'lucide-react'
import { useState } from 'react'
import Calculator from './Calculator'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/menu', label: 'Menu' },
  { href: '/bazar', label: 'Bazar' },
  { href: '/sales', label: 'Sales' },
  { href: '/stock', label: 'Stock' },
  { href: '/login', label: 'Admin' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCalcOpen, setIsCalcOpen] = useState(false)

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
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <div style={{ background: 'var(--primary-light)', padding: '6px', borderRadius: '6px' }}>
                <Coffee size={20} style={{ color: 'var(--primary)' }} strokeWidth={2} />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Crown Coffee
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {navItems.map(({ href, label }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      background: isActive ? 'var(--primary-light)' : 'transparent',
                      transition: 'all 0.15s ease',
                      textDecoration: 'none',
                    }}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>

            {/* Right Side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setIsCalcOpen(!isCalcOpen)}
                className="hide-mobile btn-secondary"
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                <CalcIcon size={16} /> Calculator
              </button>

              {/* Mobile hamburger */}
              <button
                className="show-mobile"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div style={{
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-light)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {navItems.map(({ href, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    fontSize: '15px',
                    fontWeight: 500,
                    padding: '12px 16px',
                    borderRadius: '6px',
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--primary-light)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  {label}
                </Link>
              )
            })}
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
