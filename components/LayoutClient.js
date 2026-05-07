'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'

export default function LayoutClient({ children }) {
  const pathname = usePathname()
  const [role, setRole] = useState(null)
  const [staffName, setStaffName] = useState('')

  useEffect(() => {
    const savedRole = localStorage.getItem('cc_role')
    const savedStaffName = localStorage.getItem('cc_staff_name') || localStorage.getItem('cc_username')
    setRole(savedRole)
    setStaffName(savedStaffName)
  }, [pathname])

  // Don't show sidebar on login pages or public pages
  const isLoginPage = pathname === '/' || 
                     pathname.includes('/login') || 
                     pathname.startsWith('/membership') ||
                     pathname === '/portal'

  if (isLoginPage || !role) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role={role} currentPage={pathname} staffName={staffName} />
      <main style={{ 
        marginLeft: '240px', 
        flex: 1, 
        minHeight: '100vh',
        background: '#FAF7F2',
        transition: 'margin-left 0.3s ease'
      }}>
        {children}
      </main>

      <style jsx global>{`
        @media (max-width: 768px) {
          main {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
