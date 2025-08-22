/**
 * File Upload Zone Component
 * Drag-and-drop file upload with preview and progress tracking
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Image, 
  FileCode, 
  File,
  X,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useUploadedFiles } from '../../stores/chatStore';
import useFileUpload from '../../hooks/useFileUpload';
import type { FileUploadZoneProps } from '../../types/components';

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesUploaded,
  onFilesSelected,
  maxFiles = 5,
  maxFileSize = 500 * 1024 * 1024, // 500MB
  accept = "*/*",
  multiple = true,
  className,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadedFiles = useUploadedFiles();
  const { uploadFiles, uploading, uploadProgress, error } = useFileUpload();

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setDragCounter(0);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    await handleFileUpload(files);
  }, [disabled]);

  // Handle file selection
  const handleFileSelect = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await handleFileUpload(files);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file upload logic
  const handleFileUpload = async (files: File[]) => {
    // Check file count limit
    if (uploadedFiles.length + files.length > maxFiles) {
      console.error(`Cannot upload more than ${maxFiles} files`);
      return;
    }

    // Check file size limit
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      console.error(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Call onFilesSelected callback if provided
    onFilesSelected?.(files);

    try {
      const uploadedFileMetadata = await uploadFiles(files);
      onFilesUploaded?.(uploadedFileMetadata);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/')) {
      return <Image className="w-6 h-6 text-blue-500" />;
    } else if (type.includes('text/') || type.includes('json') || type.includes('csv')) {
      return <FileText className="w-6 h-6 text-green-500" />;
    } else if (type.includes('code') || file.name.match(/\.(js|ts|py|java|cpp|html|css)$/)) {
      return <FileCode className="w-6 h-6 text-purple-500" />;
    } else {
      return <File className="w-6 h-6 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get upload progress for a specific file
  const getFileProgress = (fileName: string) => {
    return uploadProgress[fileName]?.progress || 0;
  };

  // Check if upload zone should be shown
  const showUploadZone = uploadedFiles.length < maxFiles;

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Uploaded Files Display */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Uploaded Files ({uploadedFiles.length}/{maxFiles})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {uploadedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.original_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Uploading...
          </h4>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {fileName}
                </span>
                <span className="text-xs text-gray-500">{Math.round(progress.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-biomni-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
        </motion.div>
      )}

      {/* Upload Zone */}
      {showUploadZone && (
        <div
          className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
            isDragOver
              ? 'border-biomni-500 bg-biomni-50 dark:bg-biomni-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleFileSelect}
        >
          <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
            <motion.div
              animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {uploading ? (
                <Loader2 className="w-12 h-12 text-biomni-500 animate-spin mb-4" />
              ) : (
                <Upload className={`w-12 h-12 mb-4 ${
                  isDragOver ? 'text-biomni-500' : 'text-gray-400'
                }`} />
              )}
            </motion.div>

            <h3 className={`text-lg font-medium mb-2 ${
              isDragOver ? 'text-biomni-700 dark:text-biomni-300' : 'text-gray-900 dark:text-gray-100'
            }`}>
              {isDragOver ? 'Drop files here' : 'Upload your files'}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Drag and drop files here, or click to browse
            </p>

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>Supported: FASTA, FASTQ, VCF, CSV, JSON, PDF, and more</p>
              <p>Max file size: {formatFileSize(maxFileSize)} • Max {maxFiles} files</p>
              <p>{maxFiles - uploadedFiles.length} slots remaining</p>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}

      {/* File Limit Reached */}
      {!showUploadZone && (
        <div className="text-center py-4 px-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            All files uploaded
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Maximum of {maxFiles} files reached
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;