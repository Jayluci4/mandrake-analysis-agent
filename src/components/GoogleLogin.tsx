// AIDEV-NOTE: Google Login Component - Displays sign in/out button with user profile
// Handles profile photo rendering with error fallback to user initials
// Enhanced with CORS attributes for proper Google profile image loading
import React from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { LogIn, LogOut, User } from 'lucide-react';

export const GoogleLogin: React.FC = () => {
  const { user, login, logout, isAuthenticated, isLoading } = useGoogleAuth();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-3 bg-gray-800/50 backdrop-blur-md rounded-lg px-3 py-2 border border-gray-700/50">
          {user.picture ? (
            <div className="relative">
              <img
                src={user.picture}
                alt={user.name || 'User'}
                className="w-9 h-9 rounded-full border-2 border-gray-600/50 object-cover"
                onError={(e) => {
                  // AIDEV-NOTE: Image fallback mechanism for profile photos
                  // If Google profile photo fails to load, show user initial
                  console.warn('Profile image failed to load:', user.picture);
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
                referrerPolicy="no-referrer"  // AIDEV-NOTE: Prevents referrer header to bypass some CORS issues
                crossOrigin="anonymous"  // AIDEV-NOTE: Required for cross-origin Google profile images
              />
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center hidden"
                style={{ display: 'none' }}
              >
                <span className="text-white font-semibold text-sm">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user.name ? user.name[0].toUpperCase() : <User className="w-5 h-5 text-white" />}
              </span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-200">{user.name || 'User'}</span>
            <span className="text-xs text-gray-400">{user.email}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all duration-200 hover:shadow-lg"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span className="font-medium">Sign in with Google</span>
    </button>
  );
};