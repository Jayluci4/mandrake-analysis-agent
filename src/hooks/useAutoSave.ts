// AIDEV-NOTE: Auto-save hook for saving conversation state periodically
import { useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'

interface AutoSaveOptions {
  data: any
  onSave: (data: any) => void | Promise<void>
  interval?: number // in milliseconds, default 30 seconds
  enabled?: boolean
  debounceDelay?: number // delay before saving after changes, default 2 seconds
  showNotification?: boolean
}

export function useAutoSave({
  data,
  onSave,
  interval = 30000, // 30 seconds
  enabled = true,
  debounceDelay = 2000, // 2 seconds
  showNotification = false
}: AutoSaveOptions) {
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const intervalRef = useRef<NodeJS.Timeout>()
  const lastSavedDataRef = useRef<string>()
  const isSavingRef = useRef(false)

  const performSave = useCallback(async () => {
    if (!enabled || isSavingRef.current) return

    const currentData = JSON.stringify(data)
    
    // Skip if data hasn't changed
    if (currentData === lastSavedDataRef.current) {
      return
    }

    isSavingRef.current = true

    try {
      await onSave(data)
      lastSavedDataRef.current = currentData
      
      if (showNotification) {
        toast.success('Auto-saved', { 
          duration: 1500,
          icon: '💾'
        })
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
      if (showNotification) {
        toast.error('Auto-save failed')
      }
    } finally {
      isSavingRef.current = false
    }
  }, [data, onSave, enabled, showNotification])

  // Debounced save on data change
  useEffect(() => {
    if (!enabled) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      performSave()
    }, debounceDelay)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [data, performSave, debounceDelay, enabled])

  // Periodic auto-save
  useEffect(() => {
    if (!enabled) return

    intervalRef.current = setInterval(() => {
      performSave()
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [performSave, interval, enabled])

  // Save on window unload
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = () => {
      performSave()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [performSave, enabled])

  // Manual save trigger
  const triggerSave = useCallback(() => {
    performSave()
    toast.success('Conversation saved!', { icon: '✅' })
  }, [performSave])

  return {
    triggerSave,
    isSaving: isSavingRef.current
  }
}

// Local storage helper for conversation auto-save
export function useConversationAutoSave(conversationId: string, messages: any[]) {
  const saveToLocalStorage = useCallback((data: any) => {
    const key = `conversation_autosave_${conversationId}`
    const saveData = {
      id: conversationId,
      messages: data,
      timestamp: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(saveData))
  }, [conversationId])

  const loadFromLocalStorage = useCallback(() => {
    const key = `conversation_autosave_${conversationId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const data = JSON.parse(saved)
      // Only load if saved within last 24 hours
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return data.messages
      }
    }
    return null
  }, [conversationId])

  const clearAutoSave = useCallback(() => {
    const key = `conversation_autosave_${conversationId}`
    localStorage.removeItem(key)
  }, [conversationId])

  const { triggerSave, isSaving } = useAutoSave({
    data: messages,
    onSave: saveToLocalStorage,
    enabled: !!conversationId && messages.length > 0,
    showNotification: false // Don't show for auto-saves, only manual
  })

  return {
    loadFromLocalStorage,
    clearAutoSave,
    triggerSave,
    isSaving
  }
}