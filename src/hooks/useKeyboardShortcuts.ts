// AIDEV-NOTE: Custom hook for global keyboard shortcuts throughout the app
import { useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

interface ShortcutHandlers {
  onNewChat?: () => void
  onFocusInput?: () => void
  onToggleTheme?: () => void
  onSaveConversation?: () => void
  onSubmit?: () => void
  onClearChat?: () => void
  onToggleSidebar?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const isModKey = event.ctrlKey || event.metaKey // Support both Ctrl and Cmd

    // Cmd/Ctrl + K - Focus input
    if (isModKey && event.key === 'k') {
      event.preventDefault()
      handlers.onFocusInput?.()
      toast.success('Focus on input', { duration: 1500 })
    }

    // Cmd/Ctrl + Enter - Submit
    if (isModKey && event.key === 'Enter') {
      event.preventDefault()
      handlers.onSubmit?.()
    }

    // Cmd/Ctrl + N - New chat
    if (isModKey && event.key === 'n') {
      event.preventDefault()
      handlers.onNewChat?.()
      toast.success('Starting new chat', { duration: 1500 })
    }

    // Cmd/Ctrl + S - Save conversation
    if (isModKey && event.key === 's') {
      event.preventDefault()
      handlers.onSaveConversation?.()
      toast.success('Conversation saved', { duration: 1500 })
    }

    // Cmd/Ctrl + Shift + L - Clear chat
    if (isModKey && event.shiftKey && event.key === 'L') {
      event.preventDefault()
      handlers.onClearChat?.()
      toast.success('Chat cleared', { duration: 1500 })
    }

    // Cmd/Ctrl + B - Toggle sidebar
    if (isModKey && event.key === 'b') {
      event.preventDefault()
      handlers.onToggleSidebar?.()
    }

    // Cmd/Ctrl + Shift + D - Toggle dark mode
    if (isModKey && event.shiftKey && event.key === 'D') {
      event.preventDefault()
      handlers.onToggleTheme?.()
      toast.success('Theme toggled', { duration: 1500 })
    }

    // Escape - Clear focus from input
    if (event.key === 'Escape') {
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
        activeElement.blur()
      }
    }
  }, [handlers])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])
}

// Export shortcuts list for use in components
export const keyboardShortcuts = [
  { keys: ['⌘/Ctrl', 'K'], description: 'Focus input' },
  { keys: ['⌘/Ctrl', 'Enter'], description: 'Submit message' },
  { keys: ['⌘/Ctrl', 'N'], description: 'New chat' },
  { keys: ['⌘/Ctrl', 'S'], description: 'Save conversation' },
  { keys: ['⌘/Ctrl', 'Shift', 'L'], description: 'Clear chat' },
  { keys: ['⌘/Ctrl', 'B'], description: 'Toggle sidebar' },
  { keys: ['⌘/Ctrl', 'Shift', 'D'], description: 'Toggle dark mode' },
  { keys: ['Esc'], description: 'Clear focus' },
]