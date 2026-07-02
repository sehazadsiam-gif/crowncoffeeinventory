'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  Coffee, Menu as MenuIcon, X, 
  Users, ChevronDown, Trash2, BookOpen, LogOut, LayoutDashboard,
  Upload, FileSpreadsheet, UserCheck, Sun, Moon, Receipt, Package,
  TrendingUp, Calculator as CalcIcon, ShoppingBag, MessageSquare
} from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [username, setUsername] = useState('')
  const [theme, setTheme] = useState('light')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const savedTheme = localStorage.getItem('cc_theme_mode')
    if (savedTheme) {
      setTheme(savedTheme)
      document.body.classList.toggle('dark-mode', savedTheme === 'dark')
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(systemDark ? 'dark' : 'light')
      document.body.classList.toggle('dark-mode', systemDark)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('cc_theme_mode', next)
    document.body.classList.toggle('dark-mode', next === 'dark')
  }

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    const user = localStorage.getItem('cc_username') || localStorage.getItem('cc_staff_name')

    if (!token && !['/', '/admin/login', '/staff/login', '/sub-admin/login'].includes(pathname) && !pathname.startsWith('/membership')) {
      router.replace('/')
      return
    }

    setUserRole(role)
    setUsername(user)
  }, [pathname, router])

  async function handleLogout() {
    const token = localStorage.getItem('cc_token')
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
    } catch (e) {}

    localStorage.removeItem('cc_token')
    localStorage.removeItem('cc_role')
    localStorage.removeItem('cc_staff_id')
    localStorage.removeItem('cc_staff_name')
    localStorage.removeItem('cc_username')
    router.replace('/')
  }

  const adminItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { href: '/admin?tab=feedbacks', label: 'Feedbacks', icon: <MessageSquare size={16} /> },

    { href: '/bazar', label: 'Bazar', icon: <TrendingUp size={16} /> },
    {
      label: 'Stock',
      icon: <Package size={16} />,
      children: [
        { href: '/stock', label: 'Stock Manager' },
        { href: '/stock-import', label: 'Stock Import' },
      ]
    },
    {
      label: 'Menu',
      icon: <BookOpen size={16} />,
      children: [
        { href: '/menu', label: 'Menu List' },
        { href: '/menu-import', label: 'Menu Import' },
      ]
    },
    {
      label: 'Staff',
      icon: <Users size={16} />,
      children: [
        { href: '/staff', label: 'Directory' },
        { href: '/admin/tasks', label: 'Assign Tasks' },
        { href: '/staff/attendance', label: 'Attendance' },
        { href: '/attendance-import', label: 'Attendance Import' },
        { href: '/admin/overtime', label: 'Overtime' },
        { href: '/staff/payroll', label: 'Payroll' },
        { href: '/staff/advances', label: 'Advances' },
        { href: '/staff/leave-requests', label: 'Leave Requests' },
        { href: '/staff/service-charge', label: 'Service Charge' },
        { href: '/staff/history', label: 'Payment History' },
      ]
    },
    { href: '/admin/members', label: 'Members', icon: <Users size={16} /> },
    { href: '/waste', label: 'Waste', icon: <Trash2 size={16} /> },
    { href: '/balance-sheet', label: 'Balance', icon: <CalcIcon size={16} /> },
  ]

  const navItems = (userRole === 'admin' || userRole === 'sub_admin') ? adminItems : []

  if (!userRole && !['/', '/admin/login', '/staff/login', '/sub-admin/login'].includes(pathname) && !pathname.startsWith('/membership')) return null

  return (
    <>
      <nav style={{
        background: scrolled ? 'var(--glass-bg)' : 'var(--bg-surface)',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: '1px solid var(--border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.07)' : 'none',
      }}>
        <div style={{ maxWidth: '1520px', margin: '0 auto', padding: '0 24px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>

          {/* Brand */}
          <Link href={userRole === 'admin' ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              background: 'linear-gradient(135deg, #7C3A1E 0%, #D4933A 100%)',
              padding: '9px',
              borderRadius: '12px',
              color: 'white',
              display: 'flex',
              boxShadow: '0 4px 14px rgba(124,58,30,0.35), 0 0 0 3px rgba(124,58,30,0.12)'
            }}>
              <Coffee size={20} />
            </div>
            <div>
              <span style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', fontFamily: 'var(--font-sans)', display: 'block', lineHeight: 1.1 }}>
                Crown Coffee
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>Admin Portal</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div style={{ display: 'none', alignItems: 'center', gap: '2px' }} className="desktop-nav">
            {navItems.map((item, idx) => {
              const hasChildren = item.children && item.children.length > 0
              const isActive = activeDropdown === idx
              const isCurrentPage = item.href && pathname === item.href

              return (
                <div
                  key={idx}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => hasChildren && setActiveDropdown(idx)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  {item.href ? (
                    <Link href={item.href} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px',
                      textDecoration: 'none',
                      color: isCurrentPage ? 'var(--accent-blue)' : 'var(--text-muted)',
                      fontWeight: isCurrentPage ? 700 : 600,
                      fontSize: '13px',
                      transition: 'all 0.15s ease',
                      background: isCurrentPage ? 'var(--accent-blue-dim)' : 'transparent',
                      fontFamily: 'var(--font-sans)'
                    }}
                    onMouseEnter={e => { if (!isCurrentPage) { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-primary)' }}}
                    onMouseLeave={e => { if (!isCurrentPage) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}}
                    >
                      {item.icon} {item.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => setActiveDropdown(isActive ? null : idx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: '8px', border: 'none',
                        background: isActive ? 'var(--bg-subtle)' : 'transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        transition: 'all 0.15s ease', fontFamily: 'var(--font-sans)'
                      }}
                    >
                      {item.icon} {item.label}
                      <ChevronDown size={12} style={{ transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                  )}

                  {hasChildren && isActive && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                      minWidth: '210px', background: 'var(--bg-surface)',
                      borderRadius: '12px', border: '1px solid var(--border-light)',
                      padding: '6px', boxShadow: 'var(--shadow-lg)', zIndex: 1001,
                      animation: 'dropdownFadeIn 0.18s ease forwards'
                    }}>
                      <div style={{ position: 'absolute', top: '-10px', left: 0, right: 0, height: '10px' }} />
                      {item.children.map((child, cIdx) => (
                        <Link
                          key={cIdx}
                          href={child.href}
                          onClick={() => setActiveDropdown(null)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '9px 12px', borderRadius: '8px', textDecoration: 'none',
                            color: pathname === child.href ? 'var(--accent-blue)' : 'var(--text-secondary)',
                            fontSize: '13px', fontWeight: pathname === child.href ? 700 : 500,
                            background: pathname === child.href ? 'var(--accent-blue-dim)' : 'transparent',
                            transition: 'all 0.15s ease', fontFamily: 'var(--font-sans)'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = pathname === child.href ? 'var(--accent-blue-dim)' : 'transparent'; e.currentTarget.style.color = pathname === child.href ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              style={{
                width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', borderRadius: '10px', border: '1.5px solid var(--border-light)',
                background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'pointer',
                transition: 'all 0.2s', marginLeft: '6px', flexShrink: 0
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-blue-dim)'; e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.borderColor = 'var(--border-accent)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} style={{ color: '#FBBF24' }} />}
            </button>

            {/* User Chip + Logout */}
            {userRole && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px', paddingLeft: '14px', borderLeft: '1px solid var(--border-light)' }}>
                {/* Avatar Chip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px 5px 6px', background: 'var(--bg-subtle)', borderRadius: '999px', border: '1px solid var(--border-light)' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-blue-hover))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-sans)',
                    flexShrink: 0
                  }}>
                    {(username || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-sans)', lineHeight: 1.2 }}>{username || 'Admin'}</p>
                    <p style={{ fontSize: '9px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-sans)' }}>{userRole}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '7px 13px', borderRadius: '10px',
                    border: '1.5px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.07)', color: 'var(--danger)',
                    cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                    transition: 'all 0.2s', fontFamily: 'var(--font-sans)', flexShrink: 0
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--danger)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                >
                  <LogOut size={13} /> Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="mobile-actions">
            <button
              onClick={toggleTheme}
              className="mobile-theme-btn"
              style={{
                width: '36px', height: '36px', display: 'none', alignItems: 'center',
                justifyContent: 'center', borderRadius: '8px', border: '1.5px solid var(--border-light)',
                background: 'var(--bg-subtle)', color: 'var(--text-primary)', cursor: 'pointer'
              }}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} style={{ color: '#FBBF24' }} />}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="mobile-menu-btn"
              style={{
                width: '36px', height: '36px', display: 'none', alignItems: 'center',
                justifyContent: 'center', borderRadius: '8px', border: '1.5px solid var(--border-light)',
                background: 'var(--bg-subtle)', color: 'var(--text-primary)', cursor: 'pointer'
              }}
            >
              {isMenuOpen ? <X size={18} /> : <MenuIcon size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMenuOpen && (
          <div style={{
            display: 'none', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-light)',
            padding: '12px 16px 20px', maxHeight: '80vh', overflowY: 'auto'
          }} className="mobile-drawer">
            {navItems.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                {item.href ? (
                  <Link href={item.href} onClick={() => setIsMenuOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px', borderRadius: '10px', textDecoration: 'none',
                    color: pathname === item.href ? 'var(--accent-blue)' : 'var(--text-primary)',
                    fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-sans)',
                    background: pathname === item.href ? 'var(--accent-blue-dim)' : 'transparent'
                  }}>
                    {item.icon} {item.label}
                  </Link>
                ) : (
                  <div style={{ padding: '4px 0' }}>
                    <p style={{
                      fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '8px 12px 4px', fontFamily: 'var(--font-sans)'
                    }}>
                      {item.icon && <span style={{ marginRight: '6px', verticalAlign: 'middle' }}>{item.icon}</span>}
                      {item.label}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px' }}>
                      {item.children.map((child, cIdx) => (
                        <Link key={cIdx} href={child.href} onClick={() => setIsMenuOpen(false)} style={{
                          display: 'block', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none',
                          color: pathname === child.href ? 'var(--accent-blue)' : 'var(--text-secondary)',
                          fontSize: '13.5px', fontWeight: pathname === child.href ? 700 : 500,
                          background: pathname === child.href ? 'var(--accent-blue-dim)' : 'transparent',
                          fontFamily: 'var(--font-sans)'
                        }}>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {userRole && (
              <div style={{ marginTop: '12px', padding: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-sans)' }}>{username}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>{userRole}</p>
                </div>
                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 18px', borderRadius: '10px', border: 'none',
                  background: 'var(--danger-bg)', color: 'var(--danger)',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-sans)'
                }}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      <style>{`
        @media (min-width: 1024px) {
          .desktop-nav { display: flex !important; }
        }
        @media (max-width: 1023px) {
          .mobile-menu-btn { display: flex !important; }
          .mobile-theme-btn { display: flex !important; }
          .mobile-drawer { display: block !important; }
        }
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}