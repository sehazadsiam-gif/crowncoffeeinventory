'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import DailySalesAudit from '../../../components/DailySalesAudit'

export default function SalesAuditAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true'
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')

    if (!isAdmin && (!token || (role !== 'admin' && role !== 'super_admin' && role !== 'sub_admin'))) {
      router.replace('/login')
      return
    }
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div className="loader"></div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }}>
        <DailySalesAudit />
      </div>
    </div>
  )
}
