'use client'

import { useEffect, useState } from 'react'

export default function EnvCheck() {
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Check if in development and if variables are missing
    if (process.env.NODE_ENV === 'development') {
      if (!url || !key || url === 'https://placeholder.supabase.co' || key === 'placeholder') {
        setMissing(true)
      }
    }
  }, [])

  if (!missing) return null

  return (
    <div className="bg-rose-600 text-white py-3 px-4 text-center text-sm font-black uppercase tracking-widest sticky top-0 z-[9999] shadow-2xl animate-pulse">
      Environment variables missing. Check your .env.local file.
    </div>
  )
}
