// AIDEV-NOTE: File Manager Modal Component
// Full-screen modal with advanced file management capabilities

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Upload, Download, Search,
  FileText, Image, Table, Code, File, Trash2,
  Check, CheckSquare, Square, Copy, RefreshCw,
  FolderOpen, AlertCircle
} from 'lucide-react'
import Fuse from 'fuse.js'

interface GeneratedFile {
  name: string
  type: 'csv' | 'json' | 'txt' | 'fasta' | 'md' | 'image' | 'unknown'
  size: number
  content?: string
  path: string
  created_at: string
  metadata?: any
}

interface FileManagerModalProps {
  isOpen: boolean
  onClose: () => void
  files: GeneratedFile[]
  onRefresh: () => void
  onFileUpload?: (files: FileList) => void
  onDeleteFile?: (file: GeneratedFile) => void
  backendUrl: string
}

const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
  files,
  onRefresh,
  onFileUpload,
  onDeleteFile,
  backendUrl
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<GeneratedFile | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Fuzzy search with Fuse.js
  const fuse = new Fuse(files, {
    keys: ['name', 'type'],
    threshold: 0.3,
    includeScore: true
  })

  const filteredFiles = searchQuery
    ? fuse.search(searchQuery).map(result => result.item)
    : files

  // File type icons and colors
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'csv': return { icon: Table, color: 'text-green-400' }
      case 'json': return { icon: Code, color: 'text-yellow-400' }
      case 'txt': return { icon: FileText, color: 'text-blue-400' }
      case 'fasta': return { icon: FileText, color: 'text-purple-400' }
      case 'md': return { icon: FileText, color: 'text-pink-400' }
      case 'image': return { icon: Image, color: 'text-cyan-400' }
      default: return { icon: File, color: 'text-gray-400' }
    }
  }

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Toggle file selection
  const toggleFileSelection = (fileName: string) => {
    const newSelection = new Set(selectedFiles)
    if (newSelection.has(fileName)) {
      newSelection.delete(fileName)
    } else {
      newSelection.add(fileName)
    }
    setSelectedFiles(newSelection)
  }

  // Select all/none
  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.name)))
    }
  }

  // Download selected files
  const downloadSelected = () => {
    selectedFiles.forEach(fileName => {
      const file = files.find(f => f.name === fileName)
      if (file) {
        const link = document.createElement('a')
        link.href = file.type === 'image'
          ? `${backendUrl}/images/${encodeURIComponent(file.name)}`
          : `${backendUrl}/files/${encodeURIComponent(file.name)}`
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    })
  }

  // Delete selected files
  const deleteSelected = async () => {
    if (onDeleteFile) {
      for (const fileName of selectedFiles) {
        const file = files.find(f => f.name === fileName)
        if (file) {
          await onDeleteFile(file)
        }
      }
      setSelectedFiles(new Set())
      setShowDeleteConfirm(false)
    }
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.target === dropZoneRef.current) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (onFileUpload && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        if (previewFile) {
          setPreviewFile(null)
        } else {
          onClose()
        }
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a') {
          e.preventDefault()
          toggleSelectAll()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, previewFile, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <FolderOpen className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-white">File Manager</h2>
                <span className="text-[15.5px] text-gray-400">
                  {files.length} files • {selectedFiles.size} selected
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-[15.5px]">Upload</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && onFileUpload?.(e.target.files)}
                />

                {/* Bulk Actions */}
                {selectedFiles.size > 0 && (
                  <>
                    <button
                      onClick={downloadSelected}
                      className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-[15.5px]">Download ({selectedFiles.size})</span>
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-[15.5px]">Delete ({selectedFiles.size})</span>
                    </button>
                  </>
                )}

                {/* Select All */}
                <button
                  onClick={toggleSelectAll}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title={selectedFiles.size === filteredFiles.length ? "Deselect all" : "Select all"}
                >
                  {selectedFiles.size === filteredFiles.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>

                {/* Refresh */}
                <button
                  onClick={async () => {
                    setIsRefreshing(true)
                    await onRefresh()
                    setTimeout(() => setIsRefreshing(false), 500)
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[15.5px] text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

              </div>
            </div>
          </div>

          {/* File Display Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {isDragging && (
              <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                  <p className="text-lg text-blue-400">Drop files here to upload</p>
                </div>
              </div>
            )}

            {filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText className="w-12 h-12 mb-3" />
                <p className="text-[15.5px]">No files found</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {filteredFiles.map(file => {
                  const FileIcon = getFileIcon(file.type)
                  return (
                    <motion.div
                      key={file.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`bg-white/5 border ${selectedFiles.has(file.name) ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10'} rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer group`}
                      onClick={() => setPreviewFile(file)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <FileIcon.icon className={`w-8 h-8 ${FileIcon.color}`} />
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.name)}
                          onChange={() => toggleFileSelection(file.name)}
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <p className="text-[13.5px] text-white truncate mb-1" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[11.5px] text-gray-400">
                        {formatSize(file.size)}
                      </p>
                      <div className="flex items-center space-x-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const link = document.createElement('a')
                            link.href = file.type === 'image'
                              ? `${backendUrl}/images/${encodeURIComponent(file.name)}`
                              : `${backendUrl}/files/${encodeURIComponent(file.name)}`
                            link.download = file.name
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        {onDeleteFile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteFile(file)
                            }}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* File Preview Modal */}
          <AnimatePresence>
            {previewFile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20"
                onClick={() => setPreviewFile(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-gray-900 border border-white/10 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Preview Header */}
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const FileIcon = getFileIcon(previewFile.type)
                        return <FileIcon.icon className={`w-5 h-5 ${FileIcon.color}`} />
                      })()}
                      <h3 className="text-lg font-semibold text-white truncate">{previewFile.name}</h3>
                      <span className="text-sm text-gray-400">{formatSize(previewFile.size)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const link = document.createElement('a')
                          link.href = previewFile.type === 'image'
                            ? `${backendUrl}/images/${encodeURIComponent(previewFile.name)}`
                            : `${backendUrl}/files/${encodeURIComponent(previewFile.name)}`
                          link.download = previewFile.name
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => setPreviewFile(null)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Preview Content */}
                  <div className="flex-1 overflow-auto p-6">
                    {previewFile.type === 'image' ? (
                      <div className="flex items-center justify-center">
                        <img
                          src={`${backendUrl}/images/${encodeURIComponent(previewFile.name)}`}
                          alt={previewFile.name}
                          className="max-w-full max-h-full object-contain rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KICA8L3N2Zz4K'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full">
                        {previewFile.content ? (
                          <div className="bg-gray-800 rounded-lg p-4">
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-96">
                              {previewFile.content.length > 10000
                                ? previewFile.content.substring(0, 10000) + '\n\n... (content truncated)'
                                : previewFile.content
                              }
                            </pre>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400 py-12">
                            <FileText className="w-12 h-12 mb-3" />
                            <p className="text-lg mb-2">Preview only available for images</p>
                            <p className="text-sm">Content preview is not supported for this file type yet</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const link = document.createElement('a')
                                link.href = `${backendUrl}/files/${encodeURIComponent(previewFile.name)}`
                                link.download = previewFile.name
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              }}
                              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download to view</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete Confirmation Dialog */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-gray-900 border border-white/10 rounded-lg p-6 max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start space-x-4">
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Confirm Delete</h3>
                      <p className="text-[15.5px] text-gray-300 mb-4">
                        Are you sure you want to delete {selectedFiles.size} selected file{selectedFiles.size > 1 ? 's' : ''}?
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={deleteSelected}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default FileManagerModal