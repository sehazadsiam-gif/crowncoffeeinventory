'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import DashboardClient from '../components/DashboardClient'

export default function DashboardPage() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true'
    const staffId = localStorage.getItem('staffPortalId')

    if (isAdmin) {
      setIsAuthorized(true)
    } else if (staffId) {
      router.push('/portal/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  if (!isAuthorized) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div className="loader" style={{ marginBottom: '16px' }} />
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
        Verifying Session...
      </p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <DashboardClient />
    </div>
  )
}
