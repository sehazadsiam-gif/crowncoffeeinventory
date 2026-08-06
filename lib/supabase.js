import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://vozpfsadxnqcsffjojgm.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvenBmc2FkeG5xY3NmZmpvamdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzgyNDQsImV4cCI6MjEwMTMxNDI0NH0.pIKSZ3UlOL0acDu6TTPg6icwznd030IVr4LaRxDKCnY'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
)

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
)
