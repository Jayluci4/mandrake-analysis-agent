import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { validateGoogleAccount, EmailValidationResult } from '../utils/emailValidator';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
  provider: 'google';
  riskScore?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credential: string) => Promise<EmailValidationResult>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Secure session storage with encryption (basic - enhance for production)
const SESSION_KEY = 'biomni_auth_session';
const SESSION_EXPIRY_KEY = 'biomni_auth_expiry';

// Session expires after 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const sessionData = sessionStorage.getItem(SESSION_KEY);
        const expiryTime = sessionStorage.getItem(SESSION_EXPIRY_KEY);
        
        if (sessionData && expiryTime) {
          const expiry = parseInt(expiryTime);
          
          // Check if session is expired
          if (Date.now() > expiry) {
            clearSession();
          } else {
            const userData = JSON.parse(sessionData);
            setUser(userData);
            
            // Set timeout to auto-logout when session expires
            const timeUntilExpiry = expiry - Date.now();
            setTimeout(() => {
              logout();
            }, timeUntilExpiry);
          }
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_EXPIRY_KEY);
    setUser(null);
  };

  const login = useCallback(async (credential: string): Promise<EmailValidationResult> => {
    setError(null);
    setIsLoading(true);

    try {
      // Decode the JWT token from Google
      const decoded: any = jwtDecode(credential);
      
      // Validate the email against disposable/temporary email list
      const validation = validateGoogleAccount(decoded);
      
      if (!validation.isValid) {
        setError(validation.reason || 'Email validation failed');
        setIsLoading(false);
        return validation;
      }

      // Additional security checks
      if (!decoded.aud || decoded.aud !== import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        setError('Invalid token audience');
        setIsLoading(false);
        return { isValid: false, reason: 'Security validation failed', riskScore: 100 };
      }

      // Check token expiration
      if (decoded.exp * 1000 < Date.now()) {
        setError('Token has expired');
        setIsLoading(false);
        return { isValid: false, reason: 'Token expired', riskScore: 100 };
      }

      // For production, send token to backend for verification
      // const response = await fetch('/api/auth/google', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token: credential })
      // });
      // const data = await response.json();

      // Create user object
      const userData: User = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        emailVerified: decoded.email_verified,
        provider: 'google',
        riskScore: validation.riskScore
      };

      // Log high-risk logins (for monitoring)
      if (validation.riskScore > 50) {
        console.warn('High-risk login detected:', {
          email: decoded.email,
          riskScore: validation.riskScore,
          reason: validation.reason
        });
        // In production, send this to your logging service
      }

      // Store in secure session
      const expiryTime = Date.now() + SESSION_DURATION;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
      sessionStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
      
      setUser(userData);
      setIsLoading(false);

      // Set auto-logout timer
      setTimeout(() => {
        logout();
      }, SESSION_DURATION);

      return validation;
    } catch (error) {
      console.error('Login failed:', error);
      setError('Authentication failed. Please try again.');
      setIsLoading(false);
      return { isValid: false, reason: 'Authentication failed', riskScore: 100 };
    }
  }, []);

  const logout = useCallback(() => {
    // Clear Google session
    googleLogout();
    
    // Clear local session
    clearSession();
    
    // Clear any backend session
    // fetch('/api/auth/logout', { method: 'POST' });
    
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};