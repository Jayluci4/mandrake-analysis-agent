// AIDEV-NOTE: File Manager Component for Biomni Integration
// Handles file preview, download, upload for generated files
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Upload, FileText, Image, Table, Code,
  Eye, X, Maximize2, Minimize2, Copy, Check,
  File, Folder, Search, Filter, RefreshCw, Trash2, AlertCircle
} from 'lucide-react'

interface GeneratedFile {
  name: string
  type: 'csv' | 'json' | 'txt' | 'fasta' | 'md' | 'image' | 'unknown'
  size: number
  content?: string
  path: string
  created_at: string
  metadata?: {
    step_number?: number
    operation?: string
    source?: string
  }
}

interface FileManagerProps {
  generatedFiles: GeneratedFile[]
  onFileUpload?: (files: FileList) => void
  onRefresh?: () => void
  className?: string
  backendUrl?: string
}

const FileManager: React.FC<FileManagerProps> = ({
  generatedFiles,
  onFileUpload,
  onRefresh,
  className = "",
  backendUrl = "http://localhost:8000"
}) => {
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null)
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false)
  const [filter, setFilter] = useState<string>('')
  const [copiedFile, setCopiedFile] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<GeneratedFile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File type detection and icons
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'csv': return <Table className="w-4 h-4 text-green-400" />
      case 'json': return <Code className="w-4 h-4 text-blue-400" />
      case 'txt': return <FileText className="w-4 h-4 text-gray-400" />
      case 'fasta': return <FileText className="w-4 h-4 text-purple-400" />
      case 'md': return <FileText className="w-4 h-4 text-cyan-400" />
      case 'image': return <Image className="w-4 h-4 text-pink-400" />
      default: return <File className="w-4 h-4 text-gray-400" />
    }
  }

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'csv': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'json': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'txt': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'fasta': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'md': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      case 'image': return 'bg-pink-500/20 text-pink-400 border-pink-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  // Download file functionality
  const downloadFile = async (file: GeneratedFile) => {
    try {
      // AIDEV-NOTE: For generated files, fetch from backend - use correct endpoint for images
      const endpoint = file.type === 'image' ? 'images' : 'files'
      const response = await fetch(`${backendUrl}/${endpoint}/${encodeURIComponent(file.name)}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        console.log(`✅ Downloaded: ${file.name}`)
      } else {
        // Fallback: create download from content if available
        if (file.content) {
          const blob = new Blob([file.content], { type: 'text/plain' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      }
    } catch (error) {
      console.error('Download failed:', error)
      
      // Fallback: try to download from content
      if (file.content) {
        const blob = new Blob([file.content], { type: 'text/plain' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    }
  }

  // Preview file content
  const openFilePreview = async (file: GeneratedFile) => {
    try {
      // For images, we don't need to fetch content, just set the file
      if (file.type === 'image') {
        setSelectedFile({ ...file })
        return
      }

      if (file.content) {
        setSelectedFile({ ...file })
        return
      }

      // Fetch file content from backend for preview (non-image files)
      const response = await fetch(`${backendUrl}/files/${encodeURIComponent(file.name)}`)

      if (response.ok) {
        const content = await response.text()
        setSelectedFile({ ...file, content })
      } else {
        setSelectedFile({ ...file, content: 'Preview only available for image' })
      }
    } catch (error) {
      console.error('Preview failed:', error)
      setSelectedFile({ ...file, content: 'Preview failed to load' })
    }
  }

  // Delete file handler with confirmation
  const handleDeleteFile = async (file: GeneratedFile) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`${backendUrl}/files/${encodeURIComponent(file.name)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh file list after successful deletion
        if (onRefresh) {
          await onRefresh()
        }
        // Close preview if deleted file was being previewed
        if (selectedFile?.name === file.name) {
          setSelectedFile(null)
        }
      } else {
        console.error('Failed to delete file')
      }
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
      setDeleteConfirmFile(null)
    }
  }

  // Copy file content to clipboard
  const copyFileContent = async (file: GeneratedFile) => {
    try {
      // Images can't be copied as text
      if (file.type === 'image') {
        await navigator.clipboard.writeText(`Image: ${file.name}\nURL: ${backendUrl}/images/${encodeURIComponent(file.name)}`)
        setCopiedFile(file.name)
        setTimeout(() => setCopiedFile(null), 2000)
        return
      }

      const content = file.content || await (await fetch(`${backendUrl}/files/${encodeURIComponent(file.name)}`)).text()
      await navigator.clipboard.writeText(content)
      setCopiedFile(file.name)
      setTimeout(() => setCopiedFile(null), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && onFileUpload) {
      onFileUpload(files)
    }
  }

  // Filter files
  const filteredFiles = generatedFiles.filter(file => 
    filter === '' || 
    file.name.toLowerCase().includes(filter.toLowerCase()) ||
    file.type.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className={`${className}`}>
      {/* File Manager Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Folder className="w-5 h-5 text-cyan-400" />
          <h3 className="font-medium text-gray-300 text-sm">Generated Files ({filteredFiles.length})</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Filter */}
          <div className="relative">
            <Search className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter files..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded focus:outline-none focus:border-cyan-500/50 text-white"
            />
          </div>
          
          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={async () => {
                setIsRefreshing(true)
                await onRefresh()
                setTimeout(() => setIsRefreshing(false), 500)
              }}
              className="p-1.5 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors disabled:opacity-50"
              title="Refresh file list"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            title="Upload files"
          >
            <Upload className="w-3 h-3" />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.json,.txt,.fasta,.md,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* File List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        <AnimatePresence>
          {filteredFiles.map((file, index) => (
            <motion.div
              key={file.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(file.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[15.5px] font-medium text-gray-200 truncate">
                        {file.name}
                      </span>
                      <span className={`text-[13.5px] px-1.5 py-0.5 rounded border ${getFileTypeColor(file.type)}`}>
                        {file.type.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-[13.5px] text-gray-500">
                        {file.size > 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} B`}
                      </span>
                      <span className="text-[13.5px] text-gray-500">
                        {new Date(file.created_at).toLocaleTimeString()}
                      </span>
                      {file.metadata?.step_number && (
                        <span className="text-[13.5px] text-cyan-400">
                          Step {file.metadata.step_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* File Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openFilePreview(file)}
                    className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-white/10 rounded transition-colors"
                    title="Preview file"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  
                  <button
                    onClick={() => copyFileContent(file)}
                    className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-white/10 rounded transition-colors"
                    title="Copy content"
                  >
                    {copiedFile === file.name ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => downloadFile(file)}
                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-white/10 rounded transition-colors"
                    title="Download file"
                  >
                    <Download className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmFile(file)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                    title="Delete file"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredFiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Folder className="w-12 h-12 mx-auto mb-2 text-gray-600" />
            <p className="text-[15.5px]">No files generated yet</p>
            <p className="text-[13.5px]">Files will appear here when created by Mandrake agent</p>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`bg-gray-900 border border-gray-700 rounded-xl overflow-hidden ${
                isPreviewMaximized ? 'w-full h-full' : 'max-w-4xl max-h-[80vh] w-full'
              }`}
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  {getFileIcon(selectedFile.type)}
                  <div>
                    <h3 className="font-medium text-white">{selectedFile.name}</h3>
                    <p className="text-[13.5px] text-gray-400">
                      {selectedFile.type.toUpperCase()} • {selectedFile.size > 1024 ? `${(selectedFile.size / 1024).toFixed(1)} KB` : `${selectedFile.size} B`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyFileContent(selectedFile)}
                    className="p-2 text-gray-400 hover:text-green-400 hover:bg-white/10 rounded transition-colors"
                    title="Copy content"
                  >
                    {copiedFile === selectedFile.name ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => downloadFile(selectedFile)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-white/10 rounded transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => setIsPreviewMaximized(!isPreviewMaximized)}
                    className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-white/10 rounded transition-colors"
                    title={isPreviewMaximized ? "Minimize" : "Maximize"}
                  >
                    {isPreviewMaximized ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                    title="Close preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Preview Content */}
              <div className="p-4 overflow-auto" style={{ maxHeight: isPreviewMaximized ? 'calc(100vh - 80px)' : '60vh' }}>
                {selectedFile.type === 'image' ? (
                  <div className="text-center">
                    <img
                      src={`${backendUrl}/images/${encodeURIComponent(selectedFile.name)}`}
                      alt={selectedFile.name}
                      className="max-w-full max-h-full object-contain rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling!.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden text-gray-500 text-sm mt-4">
                      Image preview not available
                    </div>
                  </div>
                ) : selectedFile.type === 'csv' ? (
                  <div>
                    <div className="text-[13.5px] text-green-400 mb-2">CSV Data Preview:</div>
                    <div className="bg-black/50 rounded overflow-x-auto">
                      <pre className="text-[13.5px] text-gray-300 p-3 whitespace-pre-wrap">
                        {selectedFile.content || 'Loading CSV content...'}
                      </pre>
                    </div>
                  </div>
                ) : selectedFile.type === 'json' ? (
                  <div>
                    <div className="text-[13.5px] text-blue-400 mb-2">JSON Data Preview:</div>
                    <div className="bg-black/50 rounded overflow-x-auto">
                      <pre className="text-[13.5px] text-blue-300 p-3">
                        {selectedFile.content ? 
                          JSON.stringify(JSON.parse(selectedFile.content), null, 2) : 
                          'Loading JSON content...'
                        }
                      </pre>
                    </div>
                  </div>
                ) : selectedFile.type === 'fasta' ? (
                  <div>
                    <div className="text-[13.5px] text-purple-400 mb-2">FASTA Sequence Preview:</div>
                    <div className="bg-black/50 rounded overflow-x-auto">
                      <pre className="text-[13.5px] text-purple-300 p-3 font-mono">
                        {selectedFile.content || 'Loading FASTA content...'}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[13.5px] text-gray-400 mb-2">Text Content Preview:</div>
                    <div className="bg-black/50 rounded overflow-x-auto">
                      <pre className="text-[13.5px] text-gray-300 p-3 whitespace-pre-wrap">
                        {selectedFile.content || 'Loading content...'}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* File Metadata */}
                {selectedFile.metadata && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-[13.5px] text-gray-400 mb-2">File Metadata:</div>
                    <div className="bg-gray-800/50 rounded p-3">
                      <pre className="text-[13.5px] text-gray-300">
                        {JSON.stringify(selectedFile.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setDeleteConfirmFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-lg p-6 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[17px] font-semibold text-white mb-2">
                    Confirm Delete
                  </h3>
                  <p className="text-[15.5px] text-gray-300 mb-1">
                    Are you sure you want to delete this file?
                  </p>
                  <p className="text-[13.5px] text-gray-400 mb-4">
                    <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">
                      {deleteConfirmFile.name}
                    </span>
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleDeleteFile(deleteConfirmFile)}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded transition-colors text-[15.5px]"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmFile(null)}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-gray-300 rounded transition-colors text-[15.5px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Hook for managing generated files from Biomni events
export const useBiomniFileManager = () => {
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([])

  // Add file from file_operation event
  const addFileFromEvent = (fileEvent: any) => {
    const file: GeneratedFile = {
      name: fileEvent.filename || fileEvent.file_name || 'unknown_file',
      type: detectFileType(fileEvent.filename || fileEvent.file_name || ''),
      size: fileEvent.file_size || 0,
      path: fileEvent.file_path || fileEvent.filename || '',
      created_at: fileEvent.timestamp || new Date().toISOString(),
      metadata: {
        step_number: fileEvent.metadata?.step_number,
        operation: fileEvent.operation,
        source: fileEvent.metadata?.source || 'biomni'
      }
    }
    
    setGeneratedFiles(prev => {
      // Avoid duplicates
      const exists = prev.some(f => f.name === file.name)
      if (exists) {
        return prev.map(f => f.name === file.name ? { ...f, ...file } : f)
      }
      return [...prev, file]
    })
    
    console.log(`📁 Added file: ${file.name} (${file.type})`)
  }

  // Detect file operations from various event types
  const processEventForFiles = (event: any) => {
    // Direct file_operation events
    if (event.type === 'file_operation') {
      addFileFromEvent(event)
    }
    
    // File operations detected in tool_call code
    if (event.type === 'tool_call') {
      const code = event.code || ''
      
      // Look for file creation patterns in code
      const filePatterns = [
        /open\(['"](.*?\.(?:csv|json|txt|fasta|md))['"].*w/g,
        /\.to_csv\(['"](.*?)['"].*\)/g,
        /\.to_json\(['"](.*?)['"].*\)/g
      ]
      
      filePatterns.forEach(pattern => {
        const matches = [...code.matchAll(pattern)]
        matches.forEach(match => {
          const filename = match[1]
          if (filename) {
            addFileFromEvent({
              filename,
              operation: 'detected_in_code',
              timestamp: event.timestamp,
              metadata: {
                step_number: event.metadata?.step_number,
                source: 'code_analysis'
              }
            })
          }
        })
      })
    }
    
    // File operations confirmed in observations
    if (event.type === 'observation') {
      const content = event.content || ''
      
      // Look for file save confirmations
      const savePatterns = [
        /saved to ([a-zA-Z0-9_-]+\.(?:csv|json|txt|fasta|md))/gi,
        /created ([a-zA-Z0-9_-]+\.(?:csv|json|txt|fasta|md))/gi,
        /written to ([a-zA-Z0-9_-]+\.(?:csv|json|txt|fasta|md))/gi
      ]
      
      savePatterns.forEach(pattern => {
        const matches = [...content.matchAll(pattern)]
        matches.forEach(match => {
          const filename = match[1]
          if (filename) {
            addFileFromEvent({
              filename,
              operation: 'confirmed_created',
              timestamp: event.timestamp,
              metadata: {
                step_number: event.metadata?.step_number,
                source: 'observation_confirmation'
              }
            })
          }
        })
      })
    }
  }

  // Clear all files
  const clearFiles = () => {
    setGeneratedFiles([])
  }

  // Get file by name
  const getFile = (filename: string) => {
    return generatedFiles.find(f => f.name === filename)
  }

  return {
    generatedFiles,
    addFileFromEvent,
    processEventForFiles,
    clearFiles,
    getFile,
    setGeneratedFiles
  }
}

// Utility function to detect file type
const detectFileType = (filename: string): GeneratedFile['type'] => {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  switch (ext) {
    case 'csv': return 'csv'
    case 'json': return 'json'
    case 'txt': return 'txt'
    case 'fasta': case 'fa': return 'fasta'
    case 'md': return 'md'
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return 'image'
    default: return 'unknown'
  }
}

export default FileManager