/**
 * Enhanced Visualization Panel for Biomni
 * Handles multiple visualization types:
 * - Plasmid maps (circular/linear)
 * - Protein structures
 * - Sequence alignments
 * - Data charts (heatmaps, scatter plots, etc.)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Plot from 'react-plotly.js';
import { 
  Maximize2, 
  Minimize2, 
  Download, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  Layers,
  FileText,
  BarChart3,
  Activity
} from 'lucide-react';

interface VisualizationData {
  type: 'plasmid' | 'protein' | 'heatmap' | 'scatter' | 'bar' | 'line' | 'sequence';
  data: any;
  title?: string;
  description?: string;
}

interface Props {
  visualizations: VisualizationData[];
  className?: string;
}

const EnhancedVisualizationPanel: React.FC<Props> = ({ visualizations, className = '' }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Generate plasmid map visualization
  const generatePlasmidMap = (data: any) => {
    const features = data.features || [];
    const length = data.length || 8000;
    
    // Create circular coordinates for features
    const angles = features.map((f: any, i: number) => {
      const startAngle = (f.start / length) * 360;
      const endAngle = (f.end / length) * 360;
      return { ...f, startAngle, endAngle };
    });

    // Generate arc paths for features
    const shapes = angles.map((f: any) => ({
      type: 'path',
      path: generateArcPath(f.startAngle, f.endAngle, 150, 180),
      fillcolor: getFeatureColor(f.type),
      line: { color: 'white', width: 1 },
      layer: 'below'
    }));

    // Add labels
    const annotations = angles.map((f: any) => {
      const midAngle = (f.startAngle + f.endAngle) / 2;
      const labelRadius = 220;
      const x = labelRadius * Math.cos((midAngle - 90) * Math.PI / 180);
      const y = labelRadius * Math.sin((midAngle - 90) * Math.PI / 180);
      
      return {
        x,
        y,
        text: f.name,
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1,
        arrowwidth: 1,
        arrowcolor: '#666',
        ax: x * 0.7,
        ay: y * 0.7,
        font: { size: 10, color: '#ddd' },
        bgcolor: 'rgba(0,0,0,0.5)',
        bordercolor: getFeatureColor(f.type),
        borderwidth: 1,
        borderpad: 2
      };
    });

    return {
      data: [{
        type: 'scatter',
        mode: 'lines',
        x: Array.from({ length: 361 }, (_, i) => 150 * Math.cos(i * Math.PI / 180)),
        y: Array.from({ length: 361 }, (_, i) => 150 * Math.sin(i * Math.PI / 180)),
        line: { color: '#666', width: 3 },
        hoverinfo: 'skip'
      }],
      layout: {
        title: data.name || 'Plasmid Map',
        showlegend: false,
        xaxis: { visible: false, range: [-300, 300] },
        yaxis: { visible: false, range: [-300, 300] },
        shapes,
        annotations,
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        height: 500,
        width: 500,
        margin: { t: 50, b: 50, l: 50, r: 50 }
      }
    };
  };

  // Generate arc path for circular features
  const generateArcPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const startInner = polarToCartesian(innerRadius, startAngle);
    const endInner = polarToCartesian(innerRadius, endAngle);
    const startOuter = polarToCartesian(outerRadius, startAngle);
    const endOuter = polarToCartesian(outerRadius, endAngle);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${startInner.x} ${startInner.y} 
            A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}
            L ${endOuter.x} ${endOuter.y}
            A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${startOuter.x} ${startOuter.y}
            Z`;
  };

  const polarToCartesian = (radius: number, angle: number) => {
    const angleRad = (angle - 90) * Math.PI / 180;
    return {
      x: radius * Math.cos(angleRad),
      y: radius * Math.sin(angleRad)
    };
  };

  const getFeatureColor = (type: string) => {
    const colors: { [key: string]: string } = {
      promoter: '#10b981',
      gene: '#3b82f6',
      marker: '#f59e0b',
      origin: '#ef4444',
      terminator: '#8b5cf6',
      misc: '#6b7280',
      primer: '#ec4899'
    };
    return colors[type] || '#6b7280';
  };

  // Generate heatmap visualization
  const generateHeatmap = (data: any) => {
    return {
      data: [{
        type: 'heatmap',
        z: data.values || [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        x: data.xLabels || ['A', 'B', 'C'],
        y: data.yLabels || ['X', 'Y', 'Z'],
        colorscale: 'Viridis',
        showscale: true
      }],
      layout: {
        title: data.title || 'Expression Heatmap',
        xaxis: { title: data.xTitle || 'Samples' },
        yaxis: { title: data.yTitle || 'Genes' },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ddd' }
      }
    };
  };

  // Render visualization based on type
  const renderVisualization = (viz: VisualizationData) => {
    switch (viz.type) {
      case 'plasmid':
        const plasmidConfig = generatePlasmidMap(viz.data);
        return (
          <Plot
            data={plasmidConfig.data}
            layout={plasmidConfig.layout}
            config={{ displayModeBar: false }}
            style={{ width: '100%', height: '100%' }}
          />
        );
      
      case 'heatmap':
        const heatmapConfig = generateHeatmap(viz.data);
        return (
          <Plot
            data={heatmapConfig.data}
            layout={heatmapConfig.layout}
            config={{ responsive: true }}
            style={{ width: '100%', height: '100%' }}
          />
        );
      
      case 'scatter':
        return (
          <Plot
            data={[{
              type: 'scatter',
              mode: 'markers',
              x: viz.data.x || [1, 2, 3, 4],
              y: viz.data.y || [10, 15, 13, 17],
              marker: { color: '#10b981', size: 10 }
            }]}
            layout={{
              title: viz.title || 'Scatter Plot',
              xaxis: { title: viz.data.xTitle || 'X Axis' },
              yaxis: { title: viz.data.yTitle || 'Y Axis' },
              plot_bgcolor: 'rgba(0,0,0,0)',
              paper_bgcolor: 'rgba(0,0,0,0)',
              font: { color: '#ddd' }
            }}
            config={{ responsive: true }}
            style={{ width: '100%', height: '100%' }}
          />
        );
      
      case 'sequence':
        return (
          <div className="p-4 bg-gray-800 rounded-lg overflow-auto">
            <pre className="font-mono text-xs">
              {viz.data.sequence || 'ATCGATCGATCG...'}
            </pre>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Visualization type not supported: {viz.type}</p>
            </div>
          </div>
        );
    }
  };

  if (visualizations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden ${className} ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          <span className="font-medium">Visualizations</span>
          {visualizations.length > 1 && (
            <span className="px-2 py-0.5 text-xs bg-gray-700 rounded-full">
              {visualizations.length} views
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(zoom * 1.2)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(zoom * 0.8)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Reset Zoom"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-600" />
          <button
            onClick={() => {/* Implement download */}}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Tabs (if multiple visualizations) */}
      {visualizations.length > 1 && (
        <div className="flex border-b border-gray-700 bg-gray-800/50">
          {visualizations.map((viz, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === idx
                  ? 'bg-gray-700 text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              {viz.title || `View ${idx + 1}`}
            </button>
          ))}
        </div>
      )}
      
      {/* Visualization Content */}
      <div className="relative" style={{ height: isFullscreen ? 'calc(100% - 100px)' : '400px' }}>
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `scale(${zoom})` }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              {renderVisualization(visualizations[activeTab])}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      {/* Description */}
      {visualizations[activeTab]?.description && (
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/50">
          <p className="text-sm text-gray-400">
            {visualizations[activeTab].description}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default EnhancedVisualizationPanel;