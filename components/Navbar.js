'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Coffee, Menu as MenuIcon, X, Calculator as CalcIcon, Users, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import Calculator from './Calculator'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/menu', label: 'Menu' },
  { href: '/bazar', label: 'Bazar' },
  { href: '/sales', label: 'Sales' },
  { href: '/stock', label: 'Stock' },
  { 
    label: 'Staff', 
    icon: Users,
    subItems: [
      { href: '/staff', label: 'Directory' },
      { href: '/staff/attendance', label: 'Attendance' },
      { href: '/staff/payroll', label: 'Payroll' },
      { href: '/staff/advances', label: 'Advances' },
      { href: '/staff/service-charge', label: 'Service Charge' },
      { href: '/staff/history', label: 'History' }
    ]
  },
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
              {navItems.map((item) => {
                const isActive = item.href ? pathname === item.href : item.subItems?.some(sub => pathname === sub.href) || pathname.startsWith('/staff')
                
                if (item.subItems) {
                  return (
                    <div key={item.label} className="nav-dropdown" style={{ position: 'relative' }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          color: (isActive && item.label === 'Staff') ? 'var(--primary)' : 'var(--text-secondary)',
                          background: (isActive && item.label === 'Staff') ? 'var(--primary-light)' : 'transparent',
                          transition: 'all 0.15s ease',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {item.icon && <item.icon size={16} />}
                        {item.label}
                        <ChevronDown size={14} />
                      </div>
                      <div className="nav-dropdown-content" style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-md)',
                        minWidth: '200px',
                        display: 'none',
                        flexDirection: 'column',
                        padding: '8px 0',
                        zIndex: 1000
                      }}>
                        {item.subItems.map(sub => (
                          <Link key={sub.href} href={sub.href} style={{
                            padding: '10px 16px',
                            fontSize: '14px',
                            color: pathname === sub.href ? 'var(--primary)' : 'var(--text-primary)',
                            background: pathname === sub.href ? 'var(--bg-subtle)' : 'transparent',
                            textDecoration: 'none',
                            transition: 'background 0.15s ease'
                          }} className="dropdown-item">
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      color: pathname === item.href ? 'var(--primary)' : 'var(--text-secondary)',
                      background: pathname === item.href ? 'var(--primary-light)' : 'transparent',
                      transition: 'all 0.15s ease',
                      textDecoration: 'none',
                    }}
                  >
                    {item.label}
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
            {navItems.map((item) => {
              if (item.subItems) {
                return (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.icon && <item.icon size={14} />} {item.label}
                    </div>
                    {item.subItems.map(sub => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{
                          fontSize: '15px',
                          fontWeight: 500,
                          padding: '12px 16px 12px 32px',
                          borderRadius: '6px',
                          color: pathname === sub.href ? 'var(--primary)' : 'var(--text-secondary)',
                          background: pathname === sub.href ? 'var(--primary-light)' : 'transparent',
                          textDecoration: 'none',
                        }}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )
              }
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
                  {item.label}
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
        .nav-dropdown:hover .nav-dropdown-content {
          display: flex !important;
        }
        .dropdown-item:hover {
          background: var(--bg-subtle) !important;
        }
      `}</style>
    </>
  )
}
