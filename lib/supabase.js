import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('SUPABASE CONFIGURATION ERROR: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.')
  console.warn('The app is currently using PLACEHOLDER values. All database calls will fail with "Failed to fetch".')
  console.warn('ACTION REQUIRED: Check your .env.local file and RESTART your "npm run dev" command.')
} else {
  console.log('Supabase client initialized successfully with URL:', supabaseUrl)
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
