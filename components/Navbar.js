'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  Coffee, Menu as MenuIcon, X, Calculator as CalcIcon, 
  Users, ChevronDown, Trash2, BookOpen, LogOut, LayoutDashboard,
  Upload, FileSpreadsheet, UserCheck
} from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [username, setUsername] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    const user = localStorage.getItem('cc_username') || localStorage.getItem('cc_staff_name')
    
    if (!token && !['/', '/admin/login', '/staff/login'].includes(pathname) && !pathname.startsWith('/membership')) {
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
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/sales', label: 'Sales', icon: <CalcIcon size={18} /> },
    { href: '/bazar', label: 'Bazar', icon: <CalcIcon size={18} /> },
    { href: '/stock', label: 'Stock', icon: <Users size={18} /> },
    { 
      label: 'Menu', 
      icon: <BookOpen size={18} />,
      children: [
        { href: '/menu', label: 'Menu List' },
        { href: '/menu-import', label: 'Menu Import', icon: <FileSpreadsheet size={14} /> },
      ]
    },
    { 
      label: 'Staff Management', 
      icon: <Users size={18} />,
      children: [
        { href: '/staff', label: 'Directory' },
        { href: '/staff/attendance', label: 'Attendance' },
        { href: '/attendance-import', label: 'Attendance Import', icon: <Upload size={14} /> },
        { href: '/staff/payroll', label: 'Payroll' },
        { href: '/staff/advances', label: 'Advances' },
        { href: '/staff/service-charge', label: 'Service Charge' },
        { href: '/staff/history', label: 'Payment History' },
      ]
    },
    { href: '/admin/members', label: 'Members', icon: <Users size={18} /> },
    { href: '/waste', label: 'Waste', icon: <Trash2 size={18} /> },
    { href: '/balance-sheet', label: 'Balance Sheet', icon: <Calculator size={18} /> },
  ]

  const navItems = userRole === 'admin' ? adminItems : []

  if (!userRole && !['/', '/admin/login', '/staff/login'].includes(pathname) && !pathname.startsWith('/membership')) return null

  return (
    <nav style={{ background: 'white', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 0, zIndex: 1000 }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand */}
        <Link href={userRole === 'admin' ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ background: 'var(--accent-blue)', padding: '8px', borderRadius: '10px', color: 'white', display: 'flex' }}>
            <Coffee size={20} />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>CROWN COFFEE</span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'none', alignItems: 'center', gap: '4px' }} className="desktop-nav">
          {navItems.map((item, idx) => {
            const hasChildren = item.children && item.children.length > 0
            const isActive = activeDropdown === idx

            return (
              <div 
                key={idx} 
                style={{ position: 'relative' }} 
                onMouseEnter={() => hasChildren && setActiveDropdown(idx)} 
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {item.href ? (
                  <Link href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px',
                    textDecoration: 'none', color: pathname === item.href ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontWeight: pathname === item.href ? 700 : 600, fontSize: '14px', transition: 'all 0.2s ease',
                    background: pathname === item.href ? 'var(--bg-subtle)' : 'transparent'
                  }}>
                    {item.icon} {item.label}
                  </Link>
                ) : (
                  <button 
                    onClick={() => setActiveDropdown(isActive ? null : idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px',
                      border: 'none', background: isActive ? 'var(--bg-subtle)' : 'transparent',
                      color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                  >
                    {item.icon} {item.label} <ChevronDown size={14} style={{ transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                )}

                {hasChildren && isActive && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, width: '220px', background: 'white',
                    borderRadius: '12px', border: '1px solid var(--border-light)', padding: '8px',
                    boxShadow: '0 10px 30px rgba(15,23,42,0.12)', marginTop: '2px',
                    zIndex: 1001, pointerEvents: 'auto',
                    animation: 'dropdownFadeIn 0.2s ease-out forwards'
                  }}>
                    {/* Hover Bridge to prevent closing on gap */}
                    <div style={{ position: 'absolute', top: '-10px', left: 0, right: 0, height: '10px' }} />
                    
                    {item.children.map((child, cIdx) => (
                      <Link 
                        key={cIdx} 
                        href={child.href} 
                        onClick={() => setActiveDropdown(null)}
                        style={{
                          display: 'block', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none',
                          color: pathname === child.href ? 'var(--accent-blue)' : 'var(--text-secondary)',
                          fontSize: '13px', fontWeight: pathname === child.href ? 700 : 500,
                          background: pathname === child.href ? 'var(--bg-subtle)' : 'transparent',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.background = pathname === child.href ? 'var(--bg-subtle)' : 'transparent'}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {userRole && (
            <div style={{ marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{username}</p>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>{userRole}</p>
              </div>
              <button onClick={handleLogout} style={{
                padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--danger-bg)',
                color: 'var(--danger)', cursor: 'pointer', display: 'flex', transition: 'all 0.2s ease'
              }} onMouseEnter={e => e.currentTarget.style.background = '#fce8e6'} onMouseLeave={e => e.currentTarget.style.background = 'var(--danger-bg)'}>
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} className="mobile-toggle">
          {isMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div style={{ display: 'none', background: 'white', borderTop: '1px solid var(--border-light)', padding: '16px' }} className="mobile-menu">
          {navItems.map((item, idx) => (
            <div key={idx}>
              {item.href ? (
                <Link href={item.href} onClick={() => setIsMenuOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', textDecoration: 'none',
                  color: pathname === item.href ? 'var(--accent-blue)' : 'var(--text-primary)', fontWeight: 600
                }}>
                  {item.icon} {item.label}
                </Link>
              ) : (
                <div style={{ padding: '12px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>{item.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '12px' }}>
                    {item.children.map((child, cIdx) => (
                      <Link key={cIdx} href={child.href} onClick={() => setIsMenuOpen(false)} style={{
                        textDecoration: 'none', color: pathname === child.href ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        fontSize: '14px', fontWeight: 500
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
            <button onClick={handleLogout} style={{
              width: '100%', marginTop: '16px', padding: '12px', borderRadius: '8px', border: 'none',
              background: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              <LogOut size={18} /> Logout
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 1024px) {
          .desktop-nav { display: flex !important; }
        }
        @media (max-width: 1023px) {
          .mobile-toggle { display: block !important; }
          .mobile-menu { display: block !important; }
        }
      `}</style>
    </nav>
  )
}

function Calculator(props) {
  return <CalcIcon {...props} />
}