// AIDEV-NOTE: Enhanced code block component with copy functionality and syntax highlighting
import { useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
  showLineNumbers?: boolean
}

export function CodeBlock({ code, language = 'plaintext', className = '', showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Code copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy code')
      console.error('Failed to copy:', err)
    }
  }, [code])

  // Extract language from className if provided (for markdown code blocks)
  const lang = language || className?.replace(/language-/, '') || 'plaintext'

  return (
    <div className="relative group">
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 p-2 rounded-lg 
                   bg-surface/80 backdrop-blur-sm border border-border-subtle
                   opacity-0 group-hover:opacity-100 transition-opacity
                   hover:bg-surface hover:border-accent-primary/50"
        title="Copy code"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-text-secondary" />
        )}
      </button>

      {/* Code content */}
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          borderRadius: '0.75rem',
          background: 'rgba(17, 24, 39, 0.5)',
          border: '1px solid rgba(75, 85, 99, 0.3)',
          fontSize: '0.875rem',
          padding: '1rem',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
          }
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

// Simple inline code component
export function InlineCode({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const code = String(children)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Copied!')
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [code])

  return (
    <code 
      onClick={handleCopy}
      className="px-1.5 py-0.5 mx-0.5 bg-surface/50 border border-border-subtle 
                 rounded text-sm font-mono text-accent-primary cursor-pointer
                 hover:bg-surface/80 transition-colors"
      title="Click to copy"
    >
      {children}
    </code>
  )
}