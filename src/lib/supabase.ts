// AIDEV-NOTE: Supabase client configuration for authentication and database
import { createClient } from '@supabase/supabase-js'

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// AIDEV-NOTE: Handle missing Supabase credentials gracefully for development
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    console.warn('⚠️ Supabase credentials not configured - using mock client for development')
    
    // Create mock Supabase client for development
    return {
      auth: {
        signInWithOAuth: async () => ({ data: null, error: new Error('Mock auth') }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: (callback: any) => {
          // Mock session change
          setTimeout(() => callback('SIGNED_OUT', null), 100)
          return { data: { subscription: { unsubscribe: () => {} } } }
        }
      },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: new Error('Mock database') })
          })
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: new Error('Mock database') })
          })
        })
      })
    }
  } else {
    // Create real Supabase client with default settings
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
        // Let Supabase use its default storage configuration
      }
    })
  }
}

export const supabase = createSupabaseClient()

// AIDEV-NOTE: Supabase client initialized with default auth settings for proper session persistence

// Database types
export interface User {
  id: string
  email: string
  name: string
  picture?: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  agent_type: 'analysis' | 'research'
  title: string
  messages: Message[]
  model?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  files?: any[]
  images?: string[]
  metadata?: any
}

export interface UserPreferences {
  user_id: string
  theme: 'dark' | 'light'
  default_model: 'GPT4.1' | 'Sonnet-4'
  default_agent: 'analysis' | 'research'
  settings: Record<string, any>
  created_at: string
  updated_at: string
}