import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoginScreenProps {
  onSuccess: () => void
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [pin, setPin] = useState(['', '', '', ''])
  const [error, setError] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // The PIN code from environment variable (defaults to '1234' if not set)
  const CORRECT_PIN = import.meta.env.VITE_ACCESS_PIN || '1234'

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent multiple digits

    const newPin = [...pin]
    newPin[index] = value

    setPin(newPin)
    setError(false)

    // Move to next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Check if PIN is complete
    if (index === 3 && value) {
      const enteredPin = newPin.join('')
      if (enteredPin === CORRECT_PIN) {
        // Store authentication in localStorage
        localStorage.setItem('bioagent_authenticated', 'true')
        onSuccess()
      } else {
        setError(true)
        // Clear PIN after error
        setTimeout(() => {
          setPin(['', '', '', ''])
          inputRefs.current[0]?.focus()
        }, 1000)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-surface/50 backdrop-blur-xl rounded-2xl p-12 shadow-2xl border border-border-subtle min-h-[600px] relative">
          {/* Logo - Centered in upper portion */}
          <img
            src="/Mandrake Bioworks Logo.png"
            alt="Mandrake Bioworks"
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-80 h-80 object-contain"
          />
          
          {/* All content centered */}
          <div className="flex flex-col items-center justify-center h-full">
            {/* Spacer for logo - reduced to move content up */}
            <div className="h-52"></div>
            
            {/* Text content */}
            <div className="flex flex-col items-center">
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                BioAgent
              </h1>
              <p className="text-text-secondary text-center text-lg mb-8">
                AI Agent for Biomedical Research
              </p>
            </div>

            {/* PIN Input */}
            <div className="w-full max-w-sm">
            <p className="text-text-secondary text-center mb-6">
              Enter your secret code to access
            </p>
            
            <div className="flex justify-center gap-3">
              {pin.map((digit, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="relative"
                >
                  <input
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`
                      w-14 h-14 text-center text-2xl font-bold
                      bg-surface/50 border-2 rounded-lg
                      transition-all duration-200
                      ${error 
                        ? 'border-red-500 text-red-500' 
                        : 'border-border text-text-primary focus:border-accent-primary'
                      }
                      focus:outline-none focus:ring-2 focus:ring-accent-primary/20
                    `}
                  />
                  {digit && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <div className="w-3 h-3 bg-accent-primary rounded-full" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-red-500 text-sm text-center mt-4"
                >
                  Incorrect code. Please try again.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

            {/* Footer */}
            <div className="text-center mt-8">
              <p className="text-xs text-text-tertiary">
                Powered by Mandrake Bioworks
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}