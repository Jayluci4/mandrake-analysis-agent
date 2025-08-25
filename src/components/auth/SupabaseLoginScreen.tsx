// AIDEV-NOTE: Supabase-based login screen with Google OAuth
import { motion } from 'framer-motion'
import { CheckCircle, Loader2 } from 'lucide-react'
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext'

export function SupabaseLoginScreen() {
  const { signInWithGoogle, loading } = useSupabaseAuth()

  return (
    <div className="min-h-screen bg-[#0f0e1d] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-blue-600/5" />
      
      {/* Animated particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{ 
              y: -100,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-12 shadow-2xl border border-white/10 min-h-[650px] relative">
          {/* Logo */}
          <img
            src="/Mandrake Bioworks Logo.png"
            alt="Mandrake Bioworks"
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-80 h-80 object-contain"
          />
          
          {/* Content */}
          <div className="flex flex-col items-center justify-center h-full">
            {/* Spacer for logo */}
            <div className="h-52"></div>
            
            {/* Text content */}
            <div className="flex flex-col items-center">
              <h1 className="text-3xl font-light text-white mb-2">
                MandrakeBio Research Platform
              </h1>
              <p className="text-gray-400 text-center text-lg mb-2">
                Your AI Co-Scientist for Biological Discoveries
              </p>
              <p className="text-gray-500 text-center text-sm mb-8">
                Analysis Agent • Research Agent
              </p>
            </div>

            {/* Login Section */}
            <div className="w-full max-w-sm">
              <div className="flex flex-col items-center">
                {loading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 text-cyan-400"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Authenticating...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4 w-full"
                  >
                    <p className="text-gray-400 text-center mb-6">
                      Sign in with your Google account to continue
                    </p>
                    
                    <div className="flex justify-center">
                      <button
                        onClick={signInWithGoogle}
                        className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span className="text-white font-medium">Sign in with Google</span>
                      </button>
                    </div>

                    {/* Security Notice */}
                    <div className="flex items-start gap-2 bg-white/5 rounded-lg p-3 mt-6 border border-white/10">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-gray-400">
                        <p className="font-medium mb-1 text-gray-300">Secure Authentication</p>
                        <p>• Powered by Supabase Auth</p>
                        <p>• Your data is encrypted and secure</p>
                        <p>• Cross-device session sync</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8">
              <p className="text-xs text-gray-500">
                © 2024 Mandrake Bioworks. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}