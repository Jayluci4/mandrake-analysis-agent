import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Loader2 } from 'lucide-react';

interface GoogleLoginButtonProps {
  className?: string;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ className }) => {
  const { login, error, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setLocalError('No credential received from Google');
      return;
    }

    setIsLoading(true);
    setLocalError(null);
    clearError();

    try {
      const validation = await login(credentialResponse.credential);
      
      if (!validation.isValid) {
        setLocalError(validation.reason || 'Login failed');
        
        // Log security events
        if (validation.riskScore >= 90) {
          console.error('High-risk login attempt blocked:', validation.reason);
          // In production, send this to your security monitoring service
        }
      } else if (validation.riskScore > 50) {
        // Optional: Show warning for moderate risk scores
        console.warn('Moderate risk login:', validation.riskScore);
      }
    } catch (error) {
      setLocalError('Authentication failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    setLocalError('Google login failed. Please try again.');
    console.error('Google OAuth error');
  };

  // Clear error after 5 seconds
  React.useEffect(() => {
    if (localError || error) {
      const timer = setTimeout(() => {
        setLocalError(null);
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [localError, error, clearError]);

  return (
    <div className="relative">
      {isLoading ? (
        <button 
          disabled
          className={className || "flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm cursor-not-allowed"}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Authenticating...</span>
        </button>
      ) : (
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
          auto_select={false}
          theme={document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline'}
          size="medium"
          text="signin_with"
          shape="rectangular"
          logo_alignment="left"
          width="200"
        />
      )}
      
      {/* Error display */}
      {(localError || error) && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {localError || error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};