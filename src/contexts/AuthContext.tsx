// AIDEV-NOTE: AuthContext integrated with Supabase for authentication
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

interface User {
  email: string
  name: string
  picture: string
  id: string
  google_id?: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  session: Session | null
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  session: null,
  loading: true,
  login: async () => {},
  logout: async () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(true)
  
  // AIDEV-NOTE: Development mode bypass for local testing
  const isDevelopment = import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.MODE === 'development'

  // Auto-authenticate in development mode - BYPASS ALL AUTH
  useEffect(() => {
    if (isDevelopment) {
      console.log('🧪 Development mode: Auto-authenticating (bypassing Google + Supabase)...')
      
      // Set mock user immediately
      const devUser = {
        id: 'dev-user-123',
        email: 'dev@biomni.test', 
        name: 'Developer',
        picture: ''
      }
      
      setUser(devUser)
      setSession({ user: devUser })
      setLoading(false)
      loadingRef.current = false
      
      console.log('✅ Development authentication complete - ready for Biomni!')
      return
    }
  }, [isDevelopment])

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data as User
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // If profile doesn't exist, create one from session data
      return null
    }
  }

  useEffect(() => {
    // Absolute failsafe - set loading to false after 6 seconds no matter what
    const failsafeTimeout = setTimeout(() => {
      if (loadingRef.current) {
        setLoading(false)
        loadingRef.current = false
      }
    }, 6000)
    
    // Skip Supabase session check in development mode
    if (isDevelopment) {
      clearTimeout(failsafeTimeout)
      setLoading(false)
      loadingRef.current = false
      return
    }
    
    // Get the session from Supabase with a race condition against timeout (production only)
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve({ data: { session: null }, error: new Error('Timeout') }), 5000)
    )
    
    Promise.race([sessionPromise, timeoutPromise])
      .then((result: any) => {
        clearTimeout(failsafeTimeout)
        const { data, error } = result
        
        if (data?.session) {
          const session = data.session
          setSession(session)
          const userData: User = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.full_name || session.user.email!,
            picture: session.user.user_metadata.avatar_url || session.user.user_metadata.picture,
            google_id: session.user.user_metadata.provider_id
          }
          setUser(userData)
        }
        
        // ALWAYS set loading to false after checking session
        setLoading(false)
        loadingRef.current = false
      })
      .catch((error) => {
        clearTimeout(failsafeTimeout)
        console.error('Session check failed:', error)
        setLoading(false)
        loadingRef.current = false
      })

    // Listen for auth changes (skip in development mode)
    if (isDevelopment) {
      return // Skip auth state listener in development
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      
      if (event === 'SIGNED_IN' && session) {
        setSession(session)
        const userData: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.full_name || session.user.email!,
          picture: session.user.user_metadata.avatar_url || session.user.user_metadata.picture,
          google_id: session.user.user_metadata.provider_id
        }
        setUser(userData)
        toast.success(`Welcome, ${userData.name}!`)
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        toast.success('Signed out successfully')
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session)
      }
    })

    return () => {
      clearTimeout(failsafeTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const login = async () => {
    // AIDEV-NOTE: Bypass Google login in development mode
    if (isDevelopment) {
      console.log('🧪 Development mode: Google login bypassed')
      // User is already set in useEffect above
      return
    }
    
    try {
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
      console.error('Error signing in:', error)
      toast.error(error.message || 'Failed to sign in')
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setSession(null)
      
      // Clear legacy localStorage
      localStorage.removeItem('bioagent_authenticated')
      localStorage.removeItem('bioagent_user')
      sessionStorage.clear()
      
      // Force reload to clear any cached state
      window.location.href = '/'
    } catch (error: any) {
      console.error('Error signing out:', error)
      toast.error(error.message || 'Failed to sign out')
    }
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!session,
      user, 
      session,
      loading,
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}