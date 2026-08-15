'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  DollarSign,
  Users,
  Hand,
  Upload,
  Settings,
  UserCheck,
  TrendingUp,
  BookOpen,
  Sliders,
  Home,
  Calendar,
  MessageSquare,
  User,
  Search,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Trophy,
  ArrowLeftRight
} from 'lucide-react'
import { useFeatureFlags } from '../hooks/useFeatureFlags'

export default function Sidebar({ role, currentPage, staffName }) {
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { isEnabled } = useFeatureFlags()

  const handleLogout = () => {
    localStorage.removeItem('cc_token')
    localStorage.removeItem('cc_role')
    localStorage.removeItem('cc_staff_id')
    localStorage.removeItem('cc_staff_name')
    localStorage.removeItem('cc_username')
    router.replace('/')
  }

  const navItems = {
    admin: [
      { label: 'Dashboard', icon: BarChart3, path: '/admin/dashboard' },
      { label: 'Feature Manager', icon: Sliders, path: '/admin/features' },
      { label: 'Performance 🏆', icon: Trophy, path: '/admin/staff-performance' },
      { label: 'Shift Swaps', icon: ArrowLeftRight, path: '/admin/shift-swaps' },
      { label: 'Recipe Book', icon: BookOpen, path: '/recipebook', flag: 'recipebook' },
      { label: 'Payroll', icon: DollarSign, path: '/admin/payroll', flag: 'payroll' },
      { label: 'Directory', icon: Users, path: '/admin/staff', flag: 'staff_directory' },
      { label: 'Service Penalties', icon: AlertTriangle, path: '/staff/penalties', flag: 'payroll' },
      { label: 'Advances', icon: Hand, path: '/admin/advances', flag: 'advances' },
      { label: 'Attendance Import', icon: Upload, path: '/attendance-import', flag: 'attendance_reports' },
      { label: 'Service Charge', icon: Settings, path: '/admin/service-charge', flag: 'service_charge' },
      { label: 'Members', icon: UserCheck, path: '/admin/members', flag: 'members' },
      { label: 'Pending Approvals', icon: UserCheck, path: '/admin/members/pending', flag: 'members' },
      { label: 'Balance Sheet', icon: TrendingUp, path: '/balance-sheet', flag: 'balance_sheet' },
    ],
    staff: [
      { label: 'Dashboard', icon: Home, path: '/staff-portal' },
      { label: 'Payroll', icon: DollarSign, path: '/staff/payroll', flag: 'payroll' },
      { label: 'Attendance', icon: Calendar, path: '/staff/attendance', flag: 'attendance_live' },
      { label: 'Remarks', icon: MessageSquare, path: '/staff/remarks' },
      { label: 'Profile', icon: User, path: '/staff/profile' },
    ],
    manager: [
      { label: 'Member Lookup', icon: Search, path: '/manager', flag: 'members' },
      { label: 'Analytics', icon: BarChart3, path: '/manager/analytics' },
      { label: 'Profile', icon: User, path: '/manager/profile' },
    ]
  }

  const rawItems = navItems[role] || []
  const items = rawItems.filter(item => !item.flag || isEnabled(item.flag))

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen)

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={toggleMobile}
        className="mobile-only"
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1100,
          background: '#6B3A2A',
          color: 'white',
          border: 'none',
          padding: '8px',
          borderRadius: '8px',
          display: 'none' // Controlled by CSS
        }}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside 
        className={isMobileOpen ? 'sidebar open' : 'sidebar'}
        style={{
          width: '240px',
          background: '#6B3A2A',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          transition: 'transform 0.3s ease',
          boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
        }}
      >
        {/* TOP SECTION */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: '#C9943A', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '20px',
              color: '#1C1410'
            }}>CC</div>
            <span style={{ 
              color: 'white', 
              fontSize: '14px', 
              fontWeight: '700', 
              letterSpacing: '0.1em' 
            }}>CROWN COFFEE</span>
          </div>
          <div style={{ height: '1px', background: 'rgba(201, 148, 58, 0.3)' }}></div>
        </div>

        {/* NAVIGATION ITEMS */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {items.map((item) => {
            const isActive = currentPage === item.path || (currentPage === 'staff' && item.path === '/admin/staff')
            return (
              <Link key={item.path} href={item.path} style={{ textDecoration: 'none' }}>
                <div 
                  className="nav-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: isActive ? '#1C1410' : 'rgba(255,255,255,0.7)',
                    background: isActive ? '#C9943A' : 'transparent',
                    fontWeight: isActive ? '700' : '500',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* BOTTOM SECTION */}
        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '20px' }}></div>
          
          <div style={{ marginBottom: '16px', padding: '0 8px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Logged in as
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: '#C9943A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
                color: '#1C1410'
              }}>
                {staffName ? staffName.substring(0, 2).toUpperCase() : role.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ color: 'white', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {staffName || 'Administrator'}
                </div>
                <div style={{ 
                  color: '#C9943A', 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  textTransform: 'uppercase',
                  background: 'rgba(201, 148, 58, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginTop: '2px'
                }}>
                  {role}
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px',
              background: '#d93025',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

        <style jsx>{`
          .nav-item:hover {
            background: \${currentPage === items.find(i => i.label === items.label)?.path ? '#C9943A' : 'rgba(255,255,255,0.1)'};
            color: \${currentPage === items.find(i => i.label === items.label)?.path ? '#1C1410' : 'white'};
          }
          @media (max-width: 768px) {
            .sidebar {
              transform: translateX(-100%);
            }
            .sidebar.open {
              transform: translateX(0);
            }
            .mobile-only {
              display: block !important;
            }
          }
        `}</style>
      </aside>
    </>
  )
}
