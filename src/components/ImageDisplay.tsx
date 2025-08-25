// AIDEV-NOTE: Image display component with download and enlarge features for displaying matplotlib plots from backend
import React, { useState } from 'react'
import { X, Download, Maximize2, Minimize2 } from 'lucide-react'

interface ImageDisplayProps {
  images: string[] // Array of base64 image strings or URLs
  title?: string
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ images, title }) => {
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleDownload = (image: string, index: number) => {
    // Create a download link
    const link = document.createElement('a')
    
    // Check if it's a base64 image or URL
    if (image.startsWith('data:image')) {
      link.href = image
    } else if (image.startsWith('http')) {
      // For URLs, fetch and convert to blob
      fetch(image)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob)
          link.href = url
          link.download = `analysis-plot-${index + 1}.png`
          link.click()
          URL.revokeObjectURL(url)
        })
      return
    } else {
      // Assume it's base64 without prefix
      link.href = `data:image/png;base64,${image}`
    }
    
    link.download = `analysis-plot-${index + 1}.png`
    link.click()
  }

  const handleEnlarge = (image: string, index: number) => {
    setEnlargedImage(image)
    setCurrentIndex(index)
  }

  const handleClose = () => {
    setEnlargedImage(null)
  }

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setEnlargedImage(images[currentIndex + 1])
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setEnlargedImage(images[currentIndex - 1])
    }
  }

  if (!images || images.length === 0) return null

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
          📊 {title}
        </h3>
      )}
      
      {/* Image grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.map((image, index) => (
          <div 
            key={index}
            className="relative group bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 hover:border-cyan-500/30 transition-all"
          >
            <img
              src={image.startsWith('data:image') ? image : 
                   image.startsWith('http') ? image : 
                   `data:image/png;base64,${image}`}
              alt={`Plot ${index + 1}`}
              className="w-full h-auto object-contain"
            />
            
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-between items-center">
                <span className="text-white/80 text-sm font-medium">
                  Plot {index + 1}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(image, index)}
                    className="p-2 bg-gray-800/80 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEnlarge(image, index)}
                    className="p-2 bg-gray-800/80 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                    title="Enlarge"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enlarged view modal */}
      {enlargedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-7xl max-h-[90vh] w-full">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 bg-gray-800/80 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800/80 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors z-10 ${
                    currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  ←
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === images.length - 1}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800/80 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors z-10 ${
                    currentIndex === images.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  →
                </button>
              </>
            )}

            {/* Image container */}
            <div className="bg-gray-900/95 rounded-lg p-4 border border-gray-700/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-cyan-400 font-semibold">
                  Plot {currentIndex + 1} of {images.length}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(enlargedImage, currentIndex)}
                    className="px-4 py-2 bg-gray-800 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-gray-800 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Minimize2 className="w-4 h-4" />
                    Minimize
                  </button>
                </div>
              </div>
              
              <img
                src={enlargedImage.startsWith('data:image') ? enlargedImage : 
                     enlargedImage.startsWith('http') ? enlargedImage : 
                     `data:image/png;base64,${enlargedImage}`}
                alt={`Enlarged Plot ${currentIndex + 1}`}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}