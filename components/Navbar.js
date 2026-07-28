'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  Coffee, Menu as MenuIcon, X, 
  Users, ChevronDown, Trash2, BookOpen, LogOut, LayoutDashboard,
  Upload, FileSpreadsheet, UserCheck, Sun, Moon, Receipt, Package,
  TrendingUp, Calculator as CalcIcon, ShoppingBag, MessageSquare,
  BellRing, ShieldAlert, AlertTriangle, Calendar, Mail, ClipboardList
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSessionTimeout } from '../hooks/useSessionTimeout'

import { useFeatureFlags } from '../hooks/useFeatureFlags'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [username, setUsername] = useState('')
  const [theme, setTheme] = useState('light')
  const [scrolled, setScrolled] = useState(false)
  const [isBellOpen, setIsBellOpen] = useState(false)
  const [bellAlerts, setBellAlerts] = useState({ lowStockCount: 0, pendingLeavesCount: 0, pendingQueriesCount: 0 })
  const { isEnabled } = useFeatureFlags()

  // 10-minute inactivity auto-logout for admin and sub_admin
  useSessionTimeout(userRole === 'admin' || userRole === 'sub_admin')

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
    if (!userRole || (userRole !== 'admin' && userRole !== 'sub_admin')) return

    async function fetchNavbarAlerts() {
      try {
        const [ingRes, leaveRes, queryRes] = await Promise.all([
          supabase.from('ingredients').select('current_stock, min_stock'),
          supabase.from('leave_requests').select('id').eq('status', 'pending'),
          supabase.from('staff_queries').select('id').eq('status', 'Pending')
        ])

        const lowStockCount = ingRes.data?.filter(i => Number(i.current_stock) <= Number(i.min_stock)).length || 0
        const pendingLeavesCount = leaveRes.data?.length || 0
        const pendingQueriesCount = queryRes.data?.length || 0

        setBellAlerts({
          lowStockCount,
          pendingLeavesCount,
          pendingQueriesCount
        })
      } catch (e) {
        console.error('Navbar alerts fetch error:', e)
      }
    }

    fetchNavbarAlerts()
    const interval = setInterval(fetchNavbarAlerts, 60000)
    return () => clearInterval(interval)
  }, [userRole])

  useEffect(() => {
    if (!isBellOpen) return
    const handleOutsideClick = () => setIsBellOpen(false)
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [isBellOpen])

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    const user = localStorage.getItem('cc_username') || localStorage.getItem('cc_staff_name')

    if (!token && !['/', '/admin/login', '/staff/login', '/sub-admin/login'].includes(pathname) && !pathname.startsWith('/membership') && !pathname.startsWith('/checklist')) {
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
    { href: '/recipebook', label: 'Recipe Book', icon: <BookOpen size={16} />, flag: 'recipebook' },
    { href: '/sales-reconciliation', label: 'Sales Audit', icon: <ShieldAlert size={16} />, flag: 'sales_audit' },
    { href: '/admin?tab=feedbacks', label: 'Feedbacks', icon: <MessageSquare size={16} />, flag: 'feedbacks' },
    {
      label: 'Check-List',
      icon: <ClipboardList size={16} />,
      children: [
        { href: '/checklist/equipment', label: '1. Equipments Check-List', flag: 'checklist' },
      ]
    },

    { href: '/bazar', label: 'Bazar', icon: <TrendingUp size={16} />, flag: 'bazar' },
    {
      label: 'Stock',
      icon: <Package size={16} />,
      children: [
        { href: '/stock', label: 'Stock Manager', flag: 'inventory_manager' },
        { href: '/stock-import', label: 'Stock Import', flag: 'stock_import' },
        { href: '/stock-audit', label: 'Stock Audit & Costing', flag: 'stock_audit' },
      ]
    },
    {
      label: 'Menu',
      icon: <BookOpen size={16} />,
      children: [
        { href: '/menu', label: 'Menu List', flag: 'menu_list' },
        { href: '/menu-import', label: 'Menu Import', flag: 'menu_import' },
        { href: '/admin/menu-engineering', label: 'Menu Costing & Engineering', flag: 'menu_engineering' },
      ]
    },
    {
      label: 'Staff',
      icon: <Users size={16} />,
      children: [
        { href: '/admin/staff', label: 'Staff Directory & ID Cards', flag: 'staff_directory' },
        { href: '/attendance', label: 'Live Attendance & RFID Kiosk', flag: 'attendance_live' },
        { href: '/public-attendance', label: 'Public Attendance Kiosk', flag: 'attendance_public' },
        { href: '/attendance/requests', label: 'Duty & Leave Requests', flag: 'leave_requests' },
        { href: '/attendance/reports', label: 'Attendance Reports', flag: 'attendance_reports' },
        { href: '/admin/tasks', label: 'Assign Tasks', flag: 'tasks' },
        { href: '/admin/overtime', label: 'Overtime Management', flag: 'overtime' },
        { href: '/staff/payroll', label: 'Payroll Ledger', flag: 'payroll' },
        { href: '/staff/advances', label: 'Staff Advances', flag: 'advances' },
        { href: '/staff/service-charge', label: 'Service Charge', flag: 'service_charge' },
        { href: '/staff/history', label: 'Payment History', flag: 'payroll' },
      ]
    },
    { href: '/admin/members', label: 'Members', icon: <Users size={16} />, flag: 'members' },
    { href: '/waste', label: 'Waste', icon: <Trash2 size={16} />, flag: 'waste' },
    { href: '/balance-sheet', label: 'Balance', icon: <CalcIcon size={16} />, flag: 'balance_sheet' },
  ]

  const rawNavItems = (userRole === 'admin' || userRole === 'sub_admin') ? adminItems : []
  
  // Filter nav items and sub-children based on active feature flags
  const navItems = rawNavItems
    .map(item => {
      if (item.flag && !isEnabled(item.flag)) return null
      if (item.children) {
        const filteredChildren = item.children.filter(child => !child.flag || isEnabled(child.flag))
        if (filteredChildren.length === 0) return null
        return { ...item, children: filteredChildren }
      }
      return item
    })
    .filter(Boolean)

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

            {/* Notification Bell */}
            {userRole && (userRole === 'admin' || userRole === 'sub_admin') && (
              <div style={{ position: 'relative', marginLeft: '6px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsBellOpen(!isBellOpen); }}
                  title="Notifications & Alerts"
                  style={{
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', borderRadius: '10px', border: '1.5px solid var(--border-light)',
                    background: isBellOpen ? 'var(--accent-blue-dim)' : 'var(--bg-subtle)', 
                    color: isBellOpen ? 'var(--accent-blue)' : 'var(--text-muted)', cursor: 'pointer',
                    transition: 'all 0.2s', position: 'relative', outline: 'none'
                  }}
                  onMouseEnter={e => { if(!isBellOpen) { e.currentTarget.style.background = 'var(--accent-blue-dim)'; e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.borderColor = 'var(--border-accent)' }}}
                  onMouseLeave={e => { if(!isBellOpen) { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}}
                >
                  <BellRing size={16} />
                  {(bellAlerts.lowStockCount + bellAlerts.pendingLeavesCount + bellAlerts.pendingQueriesCount) > 0 && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      background: 'var(--danger)', color: 'white',
                      fontSize: '9px', fontWeight: 800, padding: '2px 5px',
                      borderRadius: '10px', boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                      lineHeight: 1
                    }}>
                      {bellAlerts.lowStockCount + bellAlerts.pendingLeavesCount + bellAlerts.pendingQueriesCount}
                    </span>
                  )}
                </button>
                {isBellOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    width: '280px', background: 'var(--bg-surface)',
                    borderRadius: '12px', border: '1px solid var(--border-light)',
                    padding: '8px 0', boxShadow: 'var(--shadow-lg)', zIndex: 1001,
                    animation: 'dropdownFadeIn 0.18s ease forwards'
                  }} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Alerts Center</span>
                      {(bellAlerts.lowStockCount + bellAlerts.pendingLeavesCount + bellAlerts.pendingQueriesCount) > 0 && (
                        <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 800 }}>
                          {bellAlerts.lowStockCount + bellAlerts.pendingLeavesCount + bellAlerts.pendingQueriesCount} Pending
                        </span>
                      )}
                    </div>
                    {/* Items */}
                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      {bellAlerts.lowStockCount > 0 && (
                        <Link href="/stock" onClick={() => setIsBellOpen(false)} style={{ display: 'flex', gap: '10px', padding: '10px 14px', textDecoration: 'none', borderBottom: '1px solid var(--border-light)' }}>
                          <AlertTriangle size={16} style={{ color: 'var(--danger)', marginTop: '2px' }} />
                          <div>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left' }}>Low Stock Alert</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left' }}>{bellAlerts.lowStockCount} items are running low.</p>
                          </div>
                        </Link>
                      )}
                      {bellAlerts.pendingLeavesCount > 0 && (
                        <Link href="/staff/leave-requests" onClick={() => setIsBellOpen(false)} style={{ display: 'flex', gap: '10px', padding: '10px 14px', textDecoration: 'none', borderBottom: '1px solid var(--border-light)' }}>
                          <Calendar size={16} style={{ color: 'var(--warning)', marginTop: '2px' }} />
                          <div>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left' }}>Pending Leaves</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left' }}>{bellAlerts.pendingLeavesCount} requests require review.</p>
                          </div>
                        </Link>
                      )}
                      {bellAlerts.pendingQueriesCount > 0 && (
                        <Link href="/admin/queries" onClick={() => setIsBellOpen(false)} style={{ display: 'flex', gap: '10px', padding: '10px 14px', textDecoration: 'none', borderBottom: '1px solid var(--border-light)' }}>
                          <Mail size={16} style={{ color: 'var(--accent-blue)', marginTop: '2px' }} />
                          <div>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left' }}>Staff Request</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left' }}>{bellAlerts.pendingQueriesCount} new staff queries in inbox.</p>
                          </div>
                        </Link>
                      )}
                      {(bellAlerts.lowStockCount + bellAlerts.pendingLeavesCount + bellAlerts.pendingQueriesCount) === 0 && (
                        <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>All Clear! ✅</p>
                          <p style={{ margin: '3px 0 0', fontSize: '11px' }}>No active inventory warnings.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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