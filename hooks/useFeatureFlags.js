'use client'

import { useState, useEffect } from 'react'

export const DEFAULT_FEATURE_FLAGS = {
  inventory_manager: true,
  stock_import: true,
  stock_audit: true,
  menu_list: true,
  menu_import: true,
  menu_engineering: true,
  recipebook: true,
  bazar: true,
  balance_sheet: true,
  waste: true,
  sales_audit: true,
  feedbacks: true,
  checklist: true,
  staff_directory: true,
  attendance_live: true,
  attendance_public: true,
  attendance_reports: true,
  leave_requests: true,
  payroll: true,
  advances: true,
  service_charge: true,
  tasks: true,
  overtime: true,
  members: true,
  pos: true
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cc_feature_flags')
      if (cached) {
        try {
          return { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(cached) }
        } catch (e) {}
      }
    }
    return DEFAULT_FEATURE_FLAGS
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadFlags() {
      try {
        const res = await fetch('/api/admin/feature-flags')
        const json = await res.json()
        if (isMounted && json.success && json.data) {
          const merged = { ...DEFAULT_FEATURE_FLAGS, ...json.data }
          setFlags(merged)
          localStorage.setItem('cc_feature_flags', JSON.stringify(merged))
        }
      } catch (err) {
        console.warn('Using local cached feature flags:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadFlags()

    // Event listener for live updates across tabs/components
    const handleUpdate = () => {
      if (typeof window !== 'undefined') {
        const updatedCache = localStorage.getItem('cc_feature_flags')
        if (updatedCache) {
          try {
            setFlags({ ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(updatedCache) })
          } catch (e) {}
        }
      }
    }

    window.addEventListener('feature-flags-updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      isMounted = false
      window.removeEventListener('feature-flags-updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  // Helper check function
  const isEnabled = (flagKey) => {
    if (!flagKey) return true
    return flags[flagKey] !== false
  }

  return { flags, loading, isEnabled }
}
