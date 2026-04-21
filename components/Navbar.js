'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Coffee, Menu as MenuIcon, X, Calculator as CalcIcon, Users, ChevronDown, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Calculator from './Calculator'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/menu', label: 'Menu' },
  { href: '/bazar', label: 'Bazar' },
  { href: '/sales', label: 'Sales' },
  { href: '/stock', label: 'Stock' },
  { href: '/waste', label: 'Wastage' },
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

            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <div style={{ background: 'var(--accent-gold-dim)', padding: '6px', borderRadius: '6px' }}>
                <Coffee size={20} style={{ color: 'var(--accent-brown)' }} strokeWidth={2} />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                Crown Coffee
              </span>
            </Link>

            <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {navItems.map((item) => {
                const isActive = item.href
                  ? pathname === item.href
                  : item.subItems?.some(sub => pathname === sub.href) || pathname.startsWith('/staff')

                if (item.subItems) {
                  return (
                    <div key={item.label} className="nav-dropdown" style={{ position: 'relative' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        color: isActive ? 'var(--accent-brown)' : 'var(--text-secondary)',
                        background: isActive ? 'rgba(139,94,60,0.08)' : 'transparent',
                        transition: 'all 0.15s ease',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: 'var(--font-body)'
                      }}>
                        {item.icon && <item.icon size={15} />}
                        {item.label}
                        <ChevronDown size={13} />
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
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className="dropdown-item"
                            style={{
                              padding: '10px 16px',
                              fontSize: '14px',
                              color: pathname === sub.href ? 'var(--accent-brown)' : 'var(--text-primary)',
                              background: pathname === sub.href ? 'var(--bg-subtle)' : 'transparent',
                              textDecoration: 'none',
                              transition: 'background 0.15s ease',
                              fontFamily: 'var(--font-body)'
                            }}
                          >
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
                      color: pathname === item.href ? 'var(--accent-brown)' : 'var(--text-secondary)',
                      background: pathname === item.href ? 'rgba(139,94,60,0.08)' : 'transparent',
                      transition: 'all 0.15s ease',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-body)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {item.label === 'Wastage' && <Trash2 size={14} />}
                    {item.label}
                  </Link>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setIsCalcOpen(!isCalcOpen)}
                className="btn-secondary hide-mobile"
                style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CalcIcon size={15} /> Calculator
              </button>

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

        {isMobileMenuOpen && (
          <div style={{
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-light)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            {navItems.map((item) => {
              if (item.subItems) {
                return (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 0' }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontFamily: 'var(--font-body)'
                    }}>
                      {item.icon && <item.icon size={13} />} {item.label}
                    </div>
                    {item.subItems.map(sub => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          padding: '10px 16px 10px 32px',
                          borderRadius: '6px',
                          color: pathname === sub.href ? 'var(--accent-brown)' : 'var(--text-secondary)',
                          background: pathname === sub.href ? 'rgba(139,94,60,0.08)' : 'transparent',
                          textDecoration: 'none',
                          fontFamily: 'var(--font-body)'
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
                    fontSize: '14px',
                    fontWeight: 500,
                    padding: '10px 16px',
                    borderRadius: '6px',
                    color: isActive ? 'var(--accent-brown)' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(139,94,60,0.08)' : 'transparent',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-body)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {item.label === 'Wastage' && <Trash2 size={14} />}
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
          color: var(--accent-brown) !important;
        }
      `}</style>
    </>
  )
}