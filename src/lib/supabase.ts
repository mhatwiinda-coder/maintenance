import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in your credentials.'
  )
}

/**
 * Single Supabase client instance.
 * To migrate away from Supabase: replace this file with a client
 * that talks to your new backend, and update VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 * The Database generic is intentionally omitted here; query results are cast
 * explicitly in each hook/page using the types from database.types.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)
