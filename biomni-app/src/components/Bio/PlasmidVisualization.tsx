/**
 * Plasmid Visualization Component
 * Renders circular and linear plasmid maps with features
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  RotateCw,
  Info,
  Eye,
  EyeOff,
  FileDown,
  Settings,
  Palette,
  Circle,
  Square
} from 'lucide-react';

interface PlasmidFeature {
  id: string;
  name: string;
  type: 'promoter' | 'gene' | 'terminator' | 'origin' | 'marker' | 'misc' | 'primer' | 'restriction';
  start: number;
  end: number;
  strand: '+' | '-';
  color?: string;
  description?: string;
  sequence?: string;
}

interface PlasmidData {
  name: string;
  length: number;
  circular: boolean;
  features: PlasmidFeature[];
  sequence?: string;
  organism?: string;
  description?: string;
}

interface PlasmidVisualizationProps {
  data: PlasmidData;
  width?: number;
  height?: number;
  showSequence?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
  className?: string;
  onFeatureClick?: (feature: PlasmidFeature) => void;
}

export const PlasmidVisualization: React.FC<PlasmidVisualizationProps> = ({
  data,
  width = 600,
  height = 600,
  showSequence = false,
  showLabels = true,
  interactive = true,
  className = '',
  onFeatureClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'circular' | 'linear'>(data.circular ? 'circular' : 'linear');
  const [showFeatureTypes, setShowFeatureTypes] = useState({
    promoter: true,
    gene: true,
    terminator: true,
    origin: true,
    marker: true,
    misc: true,
    primer: true,
    restriction: true
  });

  // Color scheme for features
  const featureColors = {
    promoter: '#10b981', // green
    gene: '#3b82f6', // blue
    terminator: '#ef4444', // red
    origin: '#f59e0b', // amber
    marker: '#8b5cf6', // violet
    misc: '#6b7280', // gray
    primer: '#ec4899', // pink
    restriction: '#14b8a6' // teal
  };

  // Calculate feature angles for circular view
  const calculateFeatureArc = (feature: PlasmidFeature) => {
    const startAngle = (feature.start / data.length) * 360 - 90;
    const endAngle = (feature.end / data.length) * 360 - 90;
    const sweepAngle = endAngle - startAngle;
    
    return { startAngle, endAngle, sweepAngle };
  };

  // Generate SVG path for circular feature
  const generateArcPath = (
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    sweepAngle: number,
    width: number,
    strand: '+' | '-'
  ) => {
    const innerRadius = strand === '+' ? radius : radius - width;
    const outerRadius = strand === '+' ? radius + width : radius;
    
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = ((startAngle + sweepAngle) * Math.PI) / 180;
    
    const x1 = centerX + Math.cos(startAngleRad) * innerRadius;
    const y1 = centerY + Math.sin(startAngleRad) * innerRadius;
    const x2 = centerX + Math.cos(endAngleRad) * innerRadius;
    const y2 = centerY + Math.sin(endAngleRad) * innerRadius;
    const x3 = centerX + Math.cos(endAngleRad) * outerRadius;
    const y3 = centerY + Math.sin(endAngleRad) * outerRadius;
    const x4 = centerX + Math.cos(startAngleRad) * outerRadius;
    const y4 = centerY + Math.sin(startAngleRad) * outerRadius;
    
    const largeArcFlag = sweepAngle > 180 ? 1 : 0;
    
    return `
      M ${x1} ${y1}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;
  };

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // Handle rotation
  const handleRotation = () => {
    setRotation(prev => (prev + 45) % 360);
  };

  // Export as SVG
  const exportSVG = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.name || 'plasmid'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export as FASTA
  const exportFASTA = () => {
    let fastaContent = `>${data.name || 'plasmid'} ${data.length}bp ${data.circular ? 'circular' : 'linear'}\n`;
    
    if (data.sequence) {
      // Format sequence in 60 character lines
      for (let i = 0; i < data.sequence.length; i += 60) {
        fastaContent += data.sequence.substring(i, i + 60) + '\n';
      }
    } else {
      fastaContent += 'Sequence not available\n';
    }
    
    // Add features as comments
    fastaContent += '\n; Features:\n';
    data.features.forEach(feature => {
      fastaContent += `; ${feature.name}: ${feature.start}-${feature.end} (${feature.strand}) [${feature.type}]\n`;
    });
    
    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.name || 'plasmid'}.fasta`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) / 3;

  // Filter features based on visibility settings
  const visibleFeatures = data.features.filter(f => showFeatureTypes[f.type]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(0.1)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {data.circular && (
            <button
              onClick={handleRotation}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-all"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setViewMode(viewMode === 'circular' ? 'linear' : 'circular')}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-all"
            title="Toggle View"
            disabled={!data.circular}
          >
            {viewMode === 'circular' ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-all"
            title="Toggle Labels"
          >
            {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={exportSVG}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-all"
            title="Export SVG"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={exportFASTA}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-all"
            title="Export FASTA"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feature Type Filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(featureColors).map(([type, color]) => (
          <button
            key={type}
            onClick={() => setShowFeatureTypes(prev => ({ ...prev, [type]: !prev[type] }))}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
              showFeatureTypes[type as keyof typeof showFeatureTypes]
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-500'
            }`}
          >
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: showFeatureTypes[type as keyof typeof showFeatureTypes] ? color : '#4b5563' }}
            />
            {type}
          </button>
        ))}
      </div>

      {/* Plasmid Map */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.3s ease'
          }}
        >
          {viewMode === 'circular' ? (
            <g>
              {/* Backbone circle */}
              <circle
                cx={centerX}
                cy={centerY}
                r={baseRadius}
                fill="none"
                stroke="#374151"
                strokeWidth="2"
              />
              
              {/* Features */}
              {visibleFeatures.map(feature => {
                const { startAngle, sweepAngle } = calculateFeatureArc(feature);
                const featureRadius = baseRadius + (feature.strand === '+' ? 0 : -20);
                const path = generateArcPath(
                  centerX,
                  centerY,
                  featureRadius,
                  startAngle + rotation,
                  sweepAngle,
                  15,
                  feature.strand
                );
                
                return (
                  <g key={feature.id}>
                    <path
                      d={path}
                      fill={feature.color || featureColors[feature.type]}
                      fillOpacity={hoveredFeature === feature.id ? 1 : 0.8}
                      stroke={selectedFeature === feature.id ? '#fff' : 'none'}
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredFeature(feature.id)}
                      onMouseLeave={() => setHoveredFeature(null)}
                      onClick={() => {
                        setSelectedFeature(feature.id);
                        onFeatureClick?.(feature);
                      }}
                    />
                    
                    {/* Label */}
                    {showLabels && (
                      <text
                        x={centerX + Math.cos((startAngle + sweepAngle / 2 + rotation - 90) * Math.PI / 180) * (featureRadius + 25)}
                        y={centerY + Math.sin((startAngle + sweepAngle / 2 + rotation - 90) * Math.PI / 180) * (featureRadius + 25)}
                        fill="#9ca3af"
                        fontSize="10"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {feature.name}
                      </text>
                    )}
                  </g>
                );
              })}
              
              {/* Center text */}
              <text
                x={centerX}
                y={centerY}
                fill="#e5e7eb"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {data.name}
              </text>
              <text
                x={centerX}
                y={centerY + 20}
                fill="#9ca3af"
                fontSize="12"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {data.length.toLocaleString()} bp
              </text>
            </g>
          ) : (
            // Linear view
            <g>
              {/* Backbone line */}
              <rect
                x={50}
                y={height / 2 - 2}
                width={width - 100}
                height="4"
                fill="#374151"
              />
              
              {/* Features */}
              {visibleFeatures.map(feature => {
                const featureX = 50 + ((feature.start / data.length) * (width - 100));
                const featureWidth = ((feature.end - feature.start) / data.length) * (width - 100);
                const featureY = height / 2 + (feature.strand === '+' ? -30 : 10);
                
                return (
                  <g key={feature.id}>
                    <rect
                      x={featureX}
                      y={featureY}
                      width={featureWidth}
                      height="20"
                      fill={feature.color || featureColors[feature.type]}
                      fillOpacity={hoveredFeature === feature.id ? 1 : 0.8}
                      stroke={selectedFeature === feature.id ? '#fff' : 'none'}
                      strokeWidth="2"
                      rx="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredFeature(feature.id)}
                      onMouseLeave={() => setHoveredFeature(null)}
                      onClick={() => {
                        setSelectedFeature(feature.id);
                        onFeatureClick?.(feature);
                      }}
                    />
                    
                    {/* Label */}
                    {showLabels && featureWidth > 30 && (
                      <text
                        x={featureX + featureWidth / 2}
                        y={featureY + 13}
                        fill="#fff"
                        fontSize="10"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {feature.name}
                      </text>
                    )}
                  </g>
                );
              })}
              
              {/* Scale */}
              <text
                x={50}
                y={height - 20}
                fill="#9ca3af"
                fontSize="10"
              >
                1 bp
              </text>
              <text
                x={width - 50}
                y={height - 20}
                fill="#9ca3af"
                fontSize="10"
                textAnchor="end"
              >
                {data.length.toLocaleString()} bp
              </text>
            </g>
          )}
        </svg>
        
        {/* Feature Info Tooltip */}
        {hoveredFeature && (
          <div className="absolute top-2 right-2 p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs max-w-xs">
            {(() => {
              const feature = data.features.find(f => f.id === hoveredFeature);
              if (!feature) return null;
              
              return (
                <>
                  <div className="font-semibold text-white mb-1">{feature.name}</div>
                  <div className="text-gray-400 space-y-0.5">
                    <div>Type: {feature.type}</div>
                    <div>Position: {feature.start}-{feature.end} ({feature.end - feature.start} bp)</div>
                    <div>Strand: {feature.strand}</div>
                    {feature.description && <div className="mt-1">{feature.description}</div>}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Selected Feature Details */}
      {selectedFeature && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gray-800 border border-gray-700 rounded-lg"
        >
          {(() => {
            const feature = data.features.find(f => f.id === selectedFeature);
            if (!feature) return null;
            
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: feature.color || featureColors[feature.type] }}
                    />
                    {feature.name}
                  </h3>
                  <button
                    onClick={() => setSelectedFeature(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Type:</span>
                    <span className="ml-2 text-white">{feature.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Strand:</span>
                    <span className="ml-2 text-white">{feature.strand}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Start:</span>
                    <span className="ml-2 text-white">{feature.start} bp</span>
                  </div>
                  <div>
                    <span className="text-gray-400">End:</span>
                    <span className="ml-2 text-white">{feature.end} bp</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Length:</span>
                    <span className="ml-2 text-white">{feature.end - feature.start} bp</span>
                  </div>
                </div>
                
                {feature.description && (
                  <div className="text-sm">
                    <div className="text-gray-400 mb-1">Description:</div>
                    <div className="text-white">{feature.description}</div>
                  </div>
                )}
                
                {feature.sequence && showSequence && (
                  <div className="text-sm">
                    <div className="text-gray-400 mb-1">Sequence:</div>
                    <div className="font-mono text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                      {feature.sequence}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}
    </div>
  );
};

export default PlasmidVisualization;