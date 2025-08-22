/**
 * File Upload Hook
 * Handles file uploads to S3 with progress tracking and validation
 */

import { useState, useCallback, useRef } from 'react';
import { apiClient } from '../services/api/client';
import { useChatStore } from '../stores/chatStore';
import { useNotificationActions } from '../stores/uiStore';
import type { FileMetadata } from '../types/api';
import { ALLOWED_FILE_EXTENSIONS } from '../types/api';

interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  size?: number;
}

interface UseFileUploadOptions {
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  allowedExtensions?: string[];
  onUploadComplete?: (file: FileMetadata) => void;
  onUploadError?: (error: Error, fileName: string) => void;
  onProgress?: (progress: UploadProgress) => void;
}

interface UseFileUploadReturn {
  uploadFile: (file: File, description?: string) => Promise<FileMetadata>;
  uploadFiles: (files: File[], description?: string) => Promise<FileMetadata[]>;
  uploading: boolean;
  uploadProgress: Record<string, UploadProgress>;
  cancelUpload: (fileId: string) => void;
  clearProgress: () => void;
  validateFile: (file: File) => { valid: boolean; error?: string };
}

const DEFAULT_MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const DEFAULT_MAX_FILES = 10;

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    maxFiles = DEFAULT_MAX_FILES,
    allowedExtensions = ALLOWED_FILE_EXTENSIONS,
    onUploadComplete,
    onUploadError,
    onProgress,
  } = options;

  // State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});

  // Refs for cancellation
  const uploadControllers = useRef<Map<string, AbortController>>(new Map());

  // Store actions
  const { addUploadedFile, setUploadProgress: setChatUploadProgress } = useChatStore();
  const notifications = useNotificationActions();

  // Generate unique file ID
  const generateFileId = useCallback(() => {
    return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize) {
      const sizeMB = Math.round(maxFileSize / (1024 * 1024));
      return {
        valid: false,
        error: `File size exceeds ${sizeMB}MB limit`
      };
    }

    // Check file extension
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(extension as any)) {
      return {
        valid: false,
        error: `File type "${extension}" is not allowed`
      };
    }

    // Check for empty files
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty'
      };
    }

    return { valid: true };
  }, [maxFileSize, allowedExtensions]);

  // Update progress
  const updateProgress = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
    setUploadProgress(prev => {
      const updated = {
        ...prev,
        [fileId]: {
          ...prev[fileId],
          ...updates,
        }
      };

      // Update chat store progress
      if (updates.progress !== undefined) {
        setChatUploadProgress(fileId, updates.progress);
      }

      // Call custom progress handler
      if (onProgress && updated[fileId]) {
        onProgress(updated[fileId]);
      }

      return updated;
    });
  }, [setChatUploadProgress, onProgress]);

  // Upload single file
  const uploadFile = useCallback(async (file: File, description?: string): Promise<FileMetadata> => {
    const fileId = generateFileId();
    
    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Create abort controller for cancellation
      const controller = new AbortController();
      uploadControllers.current.set(fileId, controller);

      // Initialize progress
      const initialProgress: UploadProgress = {
        fileId,
        fileName: file.name,
        progress: 0,
        status: 'uploading',
        size: file.size,
      };

      updateProgress(fileId, initialProgress);
      setUploading(true);

      // Create FormData with XMLHttpRequest for progress tracking
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      // Use XMLHttpRequest for upload progress
      const result = await new Promise<FileMetadata>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Progress handler
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateProgress(fileId, { progress });
          }
        };

        // Success handler
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };

        // Error handler
        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };

        // Abort handler
        xhr.onabort = () => {
          reject(new Error('Upload cancelled'));
        };

        // Listen for abort signal
        controller.signal.addEventListener('abort', () => {
          xhr.abort();
        });

        // Send request
        xhr.open('POST', `${apiClient.getConfig().baseUrl}/api/upload`);
        xhr.send(formData);
      });

      // Update progress to processing
      updateProgress(fileId, { 
        progress: 100, 
        status: 'processing' 
      });

      // Simulate processing delay (real backend might do this)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mark as complete
      updateProgress(fileId, { 
        status: 'complete' 
      });

      // Add to store
      addUploadedFile(result.metadata);

      // Show success notification
      notifications.success(
        'File uploaded successfully',
        `${file.name} is ready for analysis`
      );

      // Call completion callback
      onUploadComplete?.(result.metadata);

      return result.metadata;

    } catch (error) {
      console.error('Upload error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      // Update progress with error
      updateProgress(fileId, {
        status: 'error',
        error: errorMessage,
      });

      // Show error notification
      notifications.error(
        'Upload failed',
        `Failed to upload ${file.name}: ${errorMessage}`
      );

      // Call error callback
      onUploadError?.(error instanceof Error ? error : new Error(errorMessage), file.name);

      throw error;

    } finally {
      // Cleanup
      uploadControllers.current.delete(fileId);
      
      // Check if any uploads are still in progress
      const stillUploading = Object.values(uploadProgress).some(
        p => p.status === 'uploading' || p.status === 'processing'
      );
      
      if (!stillUploading) {
        setUploading(false);
      }
    }
  }, [
    generateFileId,
    validateFile,
    updateProgress,
    addUploadedFile,
    notifications,
    onUploadComplete,
    onUploadError,
    uploadProgress
  ]);

  // Upload multiple files
  const uploadFiles = useCallback(async (files: File[], description?: string): Promise<FileMetadata[]> => {
    // Check file count limit
    if (files.length > maxFiles) {
      throw new Error(`Cannot upload more than ${maxFiles} files at once`);
    }

    try {
      setUploading(true);
      
      // Upload files concurrently
      const uploadPromises = files.map(file => uploadFile(file, description));
      const results = await Promise.allSettled(uploadPromises);
      
      // Separate successful and failed uploads
      const successful: FileMetadata[] = [];
      const failed: Error[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push(new Error(`${files[index].name}: ${result.reason.message}`));
        }
      });

      // Show summary notification
      if (successful.length > 0) {
        notifications.success(
          `${successful.length} file(s) uploaded`,
          failed.length > 0 ? `${failed.length} file(s) failed` : undefined
        );
      }

      if (failed.length > 0 && successful.length === 0) {
        notifications.error(
          'All uploads failed',
          `${failed.length} file(s) could not be uploaded`
        );
      }

      return successful;

    } finally {
      setUploading(false);
    }
  }, [maxFiles, uploadFile, notifications]);

  // Cancel upload
  const cancelUpload = useCallback((fileId: string) => {
    const controller = uploadControllers.current.get(fileId);
    if (controller) {
      controller.abort();
      uploadControllers.current.delete(fileId);
      
      updateProgress(fileId, {
        status: 'error',
        error: 'Cancelled by user',
      });
    }
  }, [updateProgress]);

  // Clear progress
  const clearProgress = useCallback(() => {
    setUploadProgress({});
  }, []);

  return {
    uploadFile,
    uploadFiles,
    uploading,
    uploadProgress,
    cancelUpload,
    clearProgress,
    validateFile,
  };
}

export default useFileUpload;