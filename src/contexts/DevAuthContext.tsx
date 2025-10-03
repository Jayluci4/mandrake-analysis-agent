// AIDEV-NOTE: Development Auth Context - bypasses Supabase for local testing
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
  session: any | null
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const DevAuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  session: null,
  loading: true,
  login: async () => {},
  logout: async () => {}
})

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // AIDEV-NOTE: Auto-authenticate for development
    setTimeout(() => {
      setUser({
        id: 'dev-user-123',
        email: 'dev@biomni.test',
        name: 'Development User',
        picture: '',
        google_id: 'dev-google-123'
      })
      setLoading(false)
    }, 100)
  }, [])

  const login = async () => {
    // Already authenticated in dev mode
  }

  const logout = async () => {
    setUser(null)
  }

  return (
    <DevAuthContext.Provider value={{
      isAuthenticated: !!user,
      user,
      session: user ? { user } : null,
      loading,
      login,
      logout
    }}>
      {children}
    </DevAuthContext.Provider>
  )
}

export const useAuth = () => useContext(DevAuthContext)