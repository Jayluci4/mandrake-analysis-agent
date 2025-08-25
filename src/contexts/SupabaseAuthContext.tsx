// AIDEV-NOTE: Supabase Auth Context - replacing the old localStorage-based auth
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  email: string
  name: string
  picture?: string
  google_id?: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: UserProfile | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {}
})

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data as UserProfile
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  // Set up auth state listener
  useEffect(() => {
    // Clean up URL after OAuth redirect
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // Remove tokens from URL for security and cleanliness
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          if (profile) {
            setUser(profile)
          } else {
            // Create profile from session data if it doesn't exist
            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata.full_name || session.user.email!,
              picture: session.user.user_metadata.avatar_url,
              google_id: session.user.user_metadata.provider_id
            })
          }
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)
      setSession(session)
      
      if (event === 'SIGNED_IN' && session) {
        const profile = await fetchUserProfile(session.user.id)
        if (profile) {
          setUser(profile)
          toast.success(`Welcome back, ${profile.name}!`)
        } else {
          // First time user - profile will be created by database trigger
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.full_name || session.user.email!,
            picture: session.user.user_metadata.avatar_url,
            google_id: session.user.user_metadata.provider_id
          })
          toast.success('Welcome to BioAgent!')
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        toast.success('Signed out successfully')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) throw error
    } catch (error: any) {
      console.error('Error signing in with Google:', error)
      toast.error(error.message || 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setSession(null)
      
      // Clear any legacy localStorage items
      localStorage.removeItem('bioagent_authenticated')
      localStorage.removeItem('bioagent_user')
      sessionStorage.clear()
      
      // Redirect to home
      window.location.href = '/'
    } catch (error: any) {
      console.error('Error signing out:', error)
      toast.error(error.message || 'Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  const value = {
    isAuthenticated: !!session,
    user,
    session,
    loading,
    signInWithGoogle,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider')
  }
  return context
}