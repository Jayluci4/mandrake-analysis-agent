// AIDEV-NOTE: Google OAuth Context - Handles authentication with Google OAuth 2.0
// Uses @react-oauth/google library with implicit flow for frontend-only auth
// Client ID: 998207005259-5bthp799gd6mcsbumuf0v9jjt5j8h0nk.apps.googleusercontent.com
import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

interface GoogleAuthContextType {
  user: GoogleUser | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within GoogleAuthProvider');
  }
  return context;
};

interface GoogleAuthProviderInnerProps {
  children: React.ReactNode;
}

const GoogleAuthProviderInner: React.FC<GoogleAuthProviderInnerProps> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('google_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('google_user');
      }
    }
    setIsLoading(false);
  }, []);

  // AIDEV-NOTE: Google OAuth login configuration
  // Using implicit flow for direct token retrieval without backend
  // Scope includes openid, email, and profile for complete user info
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        console.log('✅ Google OAuth Success - Token received:', tokenResponse);

        // Fetch user info using the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch user info');
        }

        const userInfo = await userInfoResponse.json();

        const userData: GoogleUser = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          given_name: userInfo.given_name,
          family_name: userInfo.family_name,
        };

        setUser(userData);
        localStorage.setItem('google_user', JSON.stringify(userData));
        localStorage.setItem('google_access_token', tokenResponse.access_token);

        // Store auth for backend
        const authString = btoa(`${userInfo.email}:google_oauth`);
        localStorage.setItem('auth', authString);

        console.log('✅ Google login completed successfully:', userData);
        console.log('Profile picture URL:', userData.picture);
      } catch (error) {
        console.error('Error processing Google login:', error);
        alert('Login failed. Please check console for details.');
      }
    },
    onError: (error) => {
      console.error('❌ Google OAuth Error:', error);
      // AIDEV-NOTE: Common 403 error - requires adding authorized JavaScript origins in Google Cloud Console
      // Add http://localhost:3000, http://localhost:3001, http://localhost:3002 to authorized origins
      if (error.error === 'popup_closed_by_user') {
        console.log('User closed the login popup');
      } else if (error.error === 'access_denied') {
        alert('Access denied. Please check Google Cloud Console OAuth settings.');
      } else {
        alert(`Login error: ${error.error_description || error.error || 'Unknown error'}\n\nIf you see a 403 error, add your domain to authorized JavaScript origins in Google Cloud Console.`);
      }
    },
    flow: 'implicit',
    scope: 'openid email profile',
  });

  const login = () => {
    googleLogin();
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('google_user');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('auth');
    console.log('Logged out successfully');
  };

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.error('Google Client ID not configured');
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleAuthProviderInner>{children}</GoogleAuthProviderInner>
    </GoogleOAuthProvider>
  );
};