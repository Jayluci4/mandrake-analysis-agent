// AIDEV-NOTE: Google OAuth login screen with anti-abuse email validation
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { validateEmail, GOOGLE_CLIENT_ID } from '../../config/auth'
import { AlertCircle, CheckCircle, LogIn } from 'lucide-react'

interface LoginScreenProps {
  onSuccess: (userData: any) => void
}

interface GoogleJWTPayload {
  email: string
  name: string
  picture: string
  sub: string
  email_verified: boolean
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    setLoading(true)
    setError(null)

    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google')
      }

      // Decode the JWT token
      const decodedToken = jwtDecode<GoogleJWTPayload>(credentialResponse.credential)
      
      // Validate email
      const emailValidation = validateEmail(decodedToken.email)
      if (!emailValidation.valid) {
        setError(emailValidation.reason || 'Invalid email address')
        setLoading(false)
        return
      }

      // Check if email is verified
      if (!decodedToken.email_verified) {
        setError('Please verify your email address with Google first')
        setLoading(false)
        return
      }

      // Store authentication data
      const userData = {
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        id: decodedToken.sub,
        token: credentialResponse.credential,
        loginTime: new Date().toISOString()
      }

      // Store in localStorage
      localStorage.setItem('bioagent_authenticated', 'true')
      localStorage.setItem('bioagent_user', JSON.stringify(userData))
      
      // Brief success animation before proceeding
      setTimeout(() => {
        onSuccess(userData)
      }, 500)

    } catch (err) {
      console.error('Login error:', err)
      setError('Authentication failed. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-surface/50 backdrop-blur-xl rounded-2xl p-12 shadow-2xl border border-border-subtle min-h-[650px] relative">
          {/* Logo - Centered in upper portion */}
          <img
            src="/Mandrake Bioworks Logo.png"
            alt="Mandrake Bioworks"
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-80 h-80 object-contain"
          />
          
          {/* All content centered */}
          <div className="flex flex-col items-center justify-center h-full">
            {/* Spacer for logo */}
            <div className="h-52"></div>
            
            {/* Text content */}
            <div className="flex flex-col items-center">
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                MandrakeBio Research Platform
              </h1>
              <p className="text-text-secondary text-center text-lg mb-2">
                Unified Biomedical AI Agent System
              </p>
              <p className="text-text-tertiary text-center text-sm mb-8">
                Analysis Agent • Research Agent
              </p>
            </div>

            {/* Google Login */}
            <div className="w-full max-w-sm">
              <div className="flex flex-col items-center">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 text-accent-primary"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full"
                      />
                      <span>Authenticating...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4 w-full"
                    >
                      <p className="text-text-secondary text-center mb-6">
                        Sign in with your Google account to continue
                      </p>
                      
                      <div className="flex justify-center">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={handleGoogleError}
                          theme="outline"
                          size="large"
                          text="signin_with"
                          shape="rectangular"
                          logo_alignment="left"
                          width={280}
                        />
                      </div>

                      {/* Security Notice */}
                      <div className="flex items-start gap-2 bg-surface/30 rounded-lg p-3 mt-6">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-text-tertiary">
                          <p className="font-medium mb-1">Secure Authentication</p>
                          <p>• Uses Google OAuth 2.0</p>
                          <p>• No temporary emails allowed</p>
                          <p>• Your data is encrypted and secure</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-4 w-full"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-red-500 text-sm">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8">
              <p className="text-xs text-text-tertiary">
                © 2024 Mandrake Bioworks. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}