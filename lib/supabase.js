import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE CONFIGURATION ERROR')
  if (isVercel) {
    console.error('CRITICAL: This website is missing Environment Variables in Vercel.')
    console.error('Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel Project Settings.')
  } else {
    console.error('The .env.local file is missing or not being read correctly.')
  }
} else {
  // Only log success in development
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Supabase initialized successfully')
  }
}

/**
 * Diagnostic helper for 'Failed to fetch' errors
 */
export const handleSupabaseError = (error, source) => {
  console.error(`Supabase error [${source}]:`, error)
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Network Error: Cannot reach Supabase. Check your internet or if your local server is offline.'
  }
  return error.message || 'Something went wrong while connecting to the database.'
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
)
