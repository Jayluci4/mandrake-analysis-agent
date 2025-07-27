import React, { useState, useRef, KeyboardEvent } from 'react'
import { Send, Paperclip, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputComposerProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function InputComposer({ onSend, disabled }: InputComposerProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // AIDEV-NOTE: Handle attachment button click - currently shows alert, can be extended for file upload
  const handleAttachment = () => {
    alert('File attachment feature coming soon! You will be able to attach PDFs, images, and data files.')
  }

  // AIDEV-NOTE: Handle voice input button click - currently shows alert, can be extended for voice recording
  const handleVoiceInput = () => {
    alert('Voice input feature coming soon! You will be able to dictate your research queries.')
  }

  return (
    <div className="p-4">
      <div className="glass rounded-xl border border-border-subtle">
        <div className="flex items-end gap-2 p-3">
          {/* Attachment Button */}
          <button
            onClick={handleAttachment}
            className="p-2 rounded-lg hover:bg-white/[0.02] transition-colors text-text-tertiary hover:text-text-secondary"
            title="Attach files"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about any biological or medical research topic..."
              disabled={disabled}
              className={cn(
                "w-full bg-transparent text-text-primary placeholder:text-text-muted",
                "resize-none outline-none",
                "min-h-[24px] max-h-[200px]",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              rows={1}
            />
          </div>

          {/* Voice Button */}
          <button
            onClick={handleVoiceInput}
            className="p-2 rounded-lg hover:bg-white/[0.02] transition-colors text-text-tertiary hover:text-text-secondary"
            title="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className={cn(
              "p-2 rounded-lg transition-all",
              input.trim() && !disabled
                ? "bg-brand-500 hover:bg-brand-600 text-white"
                : "bg-surface-elevated text-text-muted cursor-not-allowed"
            )}
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Tips */}
        <div className="px-3 pb-2 flex items-center gap-4 text-xs text-text-muted">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>•</span>
          <span>Try: "latest CRISPR developments" or "COVID-19 vaccines"</span>
        </div>
      </div>
    </div>
  )
}