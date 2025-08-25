// AIDEV-NOTE: Supabase client configuration for authentication and database
import { createClient } from '@supabase/supabase-js'

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Remove console logs for production
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials not found. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file')
  throw new Error('Supabase credentials not found')
}

// Create Supabase client with default settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
    // Let Supabase use its default storage configuration
  }
})

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