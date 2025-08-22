/**
 * Biomni File Integration Component
 * Seamlessly integrates file uploads with A1 agent queries
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload,
  FileText,
  Dna,
  FileCode,
  X,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  Eye,
  Download,
  Copy,
  Trash2,
  Plus,
  Database,
  Info
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  preview?: string;
  uploadedAt: Date;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error?: string;
  metadata?: {
    sequenceType?: 'dna' | 'rna' | 'protein';
    length?: number;
    features?: number;
    organism?: string;
    circular?: boolean;
  };
}

interface BiomniFileIntegrationProps {
  onFilesReady: (files: UploadedFile[]) => void;
  onQueryGenerated?: (query: string) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFormats?: string[];
  className?: string;
}

export const BiomniFileIntegration: React.FC<BiomniFileIntegrationProps> = ({
  onFilesReady,
  onQueryGenerated,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedFormats = ['.txt', '.fasta', '.fa', '.fastq', '.fq', '.gb', '.gbk', '.gff', '.gff3', '.vcf', '.csv', '.tsv'],
  className = ''
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queryMode, setQueryMode] = useState<'auto' | 'manual'>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // File type detection and icons
  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['fasta', 'fa', 'fna', 'ffn', 'faa', 'frn'].includes(ext || '')) {
      return <Dna className="w-5 h-5 text-green-400" />;
    }
    if (['gb', 'gbk', 'genbank'].includes(ext || '')) {
      return <Database className="w-5 h-5 text-blue-400" />;
    }
    if (['gff', 'gff3', 'gtf'].includes(ext || '')) {
      return <FileCode className="w-5 h-5 text-purple-400" />;
    }
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  // Parse sequence files for metadata
  const parseSequenceFile = async (file: File): Promise<Partial<UploadedFile['metadata']>> => {
    const content = await file.text();
    const metadata: Partial<UploadedFile['metadata']> = {};

    // FASTA format detection
    if (content.startsWith('>')) {
      const sequences = content.split('>').filter(s => s.trim());
      const firstSeq = sequences[0];
      const lines = firstSeq.split('\n');
      const header = lines[0];
      const sequence = lines.slice(1).join('').replace(/\s/g, '');

      // Detect sequence type
      if (/^[ATGCUN\-]+$/i.test(sequence)) {
        metadata.sequenceType = sequence.includes('U') ? 'rna' : 'dna';
      } else if (/^[ARNDCQEGHILKMFPSTWYV\-\*]+$/i.test(sequence)) {
        metadata.sequenceType = 'protein';
      }

      metadata.length = sequence.length;
      metadata.features = sequences.length;

      // Try to extract organism from header
      const organismMatch = header.match(/\[([^\]]+)\]/);
      if (organismMatch) {
        metadata.organism = organismMatch[1];
      }
    }

    // GenBank format detection
    if (content.includes('LOCUS')) {
      const locusMatch = content.match(/LOCUS\s+(\S+)\s+(\d+)\s+bp\s+(\S+)\s+(circular|linear)/i);
      if (locusMatch) {
        metadata.length = parseInt(locusMatch[2]);
        metadata.circular = locusMatch[4].toLowerCase() === 'circular';
        metadata.sequenceType = 'dna';
      }

      const organismMatch = content.match(/ORGANISM\s+(.+)/);
      if (organismMatch) {
        metadata.organism = organismMatch[1].trim();
      }

      const features = content.match(/^\s{5}(\w+)/gm);
      if (features) {
        metadata.features = features.length;
      }
    }

    return metadata;
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validate file count
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Process each file
    for (const file of fileArray) {
      // Validate file size
      if (file.size > maxFileSize) {
        alert(`File ${file.name} exceeds maximum size of ${maxFileSize / 1024 / 1024}MB`);
        continue;
      }

      // Validate file format
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFormats.includes(ext)) {
        alert(`File format ${ext} not supported`);
        continue;
      }

      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add file with uploading status
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || 'text/plain',
        uploadedAt: new Date(),
        status: 'uploading'
      };

      setUploadedFiles(prev => [...prev, newFile]);

      try {
        // Read file content
        const content = await file.text();
        const preview = content.substring(0, 500);

        // Parse metadata
        const metadata = await parseSequenceFile(file);

        // Update file with content and metadata
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, content, preview, metadata, status: 'ready' as const }
            : f
        ));
      } catch (error) {
        // Handle error
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        ));
      }
    }
  }, [uploadedFiles.length, maxFiles, maxFileSize, acceptedFormats]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile === fileId) {
      setSelectedFile(null);
    }
  }, [selectedFile]);

  // Generate smart query based on files
  const generateSmartQuery = useCallback(() => {
    if (uploadedFiles.length === 0) return '';

    const file = uploadedFiles[0];
    const metadata = file.metadata || {};
    
    let query = `I have uploaded ${uploadedFiles.length === 1 ? 'a' : uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}:\n\n`;
    
    uploadedFiles.forEach((f, index) => {
      query += `${index + 1}. ${f.name}`;
      if (f.metadata) {
        const details = [];
        if (f.metadata.sequenceType) details.push(`${f.metadata.sequenceType.toUpperCase()} sequence`);
        if (f.metadata.length) details.push(`${f.metadata.length.toLocaleString()} bp/aa`);
        if (f.metadata.circular !== undefined) details.push(f.metadata.circular ? 'circular' : 'linear');
        if (f.metadata.organism) details.push(`from ${f.metadata.organism}`);
        if (details.length > 0) {
          query += ` (${details.join(', ')})`;
        }
      }
      query += '\n';
    });

    query += '\nPlease analyze these sequences and:\n';
    
    // Add context-specific suggestions
    if (metadata.sequenceType === 'dna' && metadata.circular) {
      query += '1. Identify all features and annotations\n';
      query += '2. Check for restriction sites\n';
      query += '3. Verify the integrity of regulatory elements\n';
      query += '4. Generate a plasmid map\n';
    } else if (metadata.sequenceType === 'protein') {
      query += '1. Predict functional domains\n';
      query += '2. Analyze secondary structure\n';
      query += '3. Check for signal peptides\n';
      query += '4. Compare with known homologs\n';
    } else {
      query += '1. Provide comprehensive sequence analysis\n';
      query += '2. Identify key features\n';
      query += '3. Suggest potential applications\n';
      query += '4. Check for quality issues\n';
    }

    return query;
  }, [uploadedFiles]);

  // Notify parent when files are ready
  useEffect(() => {
    const readyFiles = uploadedFiles.filter(f => f.status === 'ready');
    if (readyFiles.length > 0) {
      onFilesReady(readyFiles);
      
      if (queryMode === 'auto' && onQueryGenerated) {
        const query = generateSmartQuery();
        if (query) {
          onQueryGenerated(query);
        }
      }
    }
  }, [uploadedFiles, onFilesReady, onQueryGenerated, queryMode, generateSmartQuery]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
          isDragOver
            ? 'border-green-500 bg-green-500/10'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-8 text-center hover:bg-gray-700/20 transition-all"
          disabled={uploadedFiles.length >= maxFiles}
        >
          <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragOver ? 'text-green-400' : 'text-gray-500'}`} />
          <h3 className="text-lg font-semibold mb-2">
            {isDragOver ? 'Drop your files here' : 'Upload Sequence Files'}
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            Drag & drop or click to browse
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Supported: FASTA, GenBank, GFF, VCF, and more</p>
            <p>Max {maxFiles} files • {formatFileSize(maxFileSize)} per file</p>
          </div>
        </button>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">
              Uploaded Files ({uploadedFiles.length}/{maxFiles})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQueryMode(queryMode === 'auto' ? 'manual' : 'auto')}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-all"
              >
                Query: {queryMode === 'auto' ? 'Auto' : 'Manual'}
              </button>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {uploadedFiles.map(file => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3 bg-gray-800 border rounded-lg transition-all ${
                  selectedFile === file.id 
                    ? 'border-green-500' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => setSelectedFile(selectedFile === file.id ? null : file.id)}
                    className="flex-1 flex items-start gap-3 text-left"
                  >
                    {getFileIcon(file.name)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{file.name}</span>
                        {file.status === 'uploading' && (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                        )}
                        {file.status === 'ready' && (
                          <Check className="w-3 h-3 text-green-400" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                        {file.metadata && (
                          <>
                            {file.metadata.sequenceType && (
                              <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">
                                {file.metadata.sequenceType.toUpperCase()}
                              </span>
                            )}
                            {file.metadata.length && (
                              <span className="text-xs text-gray-500">
                                {file.metadata.length.toLocaleString()} {file.metadata.sequenceType === 'protein' ? 'aa' : 'bp'}
                              </span>
                            )}
                            {file.metadata.circular !== undefined && (
                              <span className="text-xs text-gray-500">
                                {file.metadata.circular ? 'Circular' : 'Linear'}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {file.error && (
                        <p className="text-xs text-red-400 mt-1">{file.error}</p>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigator.clipboard.writeText(file.content || '')}
                      className="p-1.5 hover:bg-gray-700 rounded transition-all"
                      title="Copy content"
                    >
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1.5 hover:bg-gray-700 rounded transition-all"
                      title="Remove file"
                    >
                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* File Preview */}
                {selectedFile === file.id && file.preview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 pt-3 border-t border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-400">Preview</span>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <pre className="text-xs font-mono bg-gray-900 p-2 rounded overflow-x-auto max-h-32">
                      {file.preview}
                      {file.content && file.content.length > 500 && (
                        <span className="text-gray-500">... ({file.content.length - 500} more characters)</span>
                      )}
                    </pre>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Smart Query Generation (if in auto mode) */}
      {queryMode === 'auto' && uploadedFiles.some(f => f.status === 'ready') && (
        <div className="p-3 bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-600/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-green-400 font-medium mb-1">Auto-generated Query</p>
              <p className="text-xs text-gray-300">
                A smart query has been generated based on your uploaded files. 
                It will be automatically used when you send your message.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiomniFileIntegration;