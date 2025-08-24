// AIDEV-NOTE: Updated AuthContext with Google OAuth user data support
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  email: string
  name: string
  picture: string
  id: string
  token?: string
  loginTime?: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (userData: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check if user is already authenticated
    const authenticated = localStorage.getItem('bioagent_authenticated') === 'true'
    const userData = localStorage.getItem('bioagent_user')
    
    if (authenticated && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setIsAuthenticated(true)
        
        // Check session expiry (24 hours)
        if (parsedUser.loginTime) {
          const loginTime = new Date(parsedUser.loginTime)
          const now = new Date()
          const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)
          
          if (hoursSinceLogin > 24) {
            // Session expired
            logout()
          }
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
        logout()
      }
    } else {
      setIsAuthenticated(authenticated)
    }
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('bioagent_authenticated', 'true')
    localStorage.setItem('bioagent_user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('bioagent_authenticated')
    localStorage.removeItem('bioagent_user')
    
    // Clear any other session data
    sessionStorage.clear()
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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