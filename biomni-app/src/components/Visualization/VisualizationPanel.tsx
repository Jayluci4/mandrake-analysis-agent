/**
 * Visualization Panel Component
 * Displays various types of scientific visualizations and charts
 */

import React, { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Table, 
  Image as ImageIcon, 
  Download, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { VisualizationPanelProps, VisualizationData } from '../../types/components';

// Lazy load Plotly to reduce bundle size
const Plot = lazy(() => import('react-plotly.js'));

// Data Table Component
const DataTable: React.FC<{ data: any; config?: any }> = ({ data, config }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = config?.pageSize || 10;
  
  // Handle different data formats
  const processTableData = () => {
    if (Array.isArray(data)) {
      if (data.length === 0) return { headers: [], rows: [] };
      
      // Array of objects
      if (typeof data[0] === 'object' && data[0] !== null) {
        const headers = Object.keys(data[0]);
        const rows = data.map(item => headers.map(header => item[header]));
        return { headers, rows };
      }
      
      // Array of arrays
      if (Array.isArray(data[0])) {
        const headers = data[0].map((_: any, index: number) => `Column ${index + 1}`);
        const rows = data.slice(1);
        return { headers, rows };
      }
    }
    
    // Single object
    if (typeof data === 'object' && data !== null) {
      const headers = Object.keys(data);
      const rows = [headers.map(header => data[header])];
      return { headers, rows };
    }
    
    return { headers: ['Value'], rows: [[String(data)]] };
  };

  const { headers, rows } = processTableData();
  const totalPages = Math.ceil(rows.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRows = rows.slice(startIndex, endIndex);

  if (headers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {String(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100"
                  >
                    {cell !== null && cell !== undefined ? String(cell) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>
            Showing {startIndex + 1} to {Math.min(endIndex, rows.length)} of {rows.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Visualization Component
const VisualizationItem: React.FC<{
  visualization: VisualizationData;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}> = ({ visualization, isExpanded = false, onToggleExpanded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle download
  const handleDownload = () => {
    const filename = `${visualization.title || 'visualization'}.json`;
    const blob = new Blob([JSON.stringify(visualization, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get icon for visualization type
  const getVisualizationIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <Table className="w-5 h-5" />;
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      default:
        return <BarChart3 className="w-5 h-5" />;
    }
  };

  // Render visualization content
  const renderVisualization = () => {
    try {
      switch (visualization.type) {
        case 'table':
          return <DataTable data={visualization.data} config={visualization.config} />;
        
        case 'image':
          if (typeof visualization.data === 'string') {
            return (
              <div className="text-center">
                <img
                  src={visualization.data}
                  alt={visualization.title || 'Visualization'}
                  className="max-w-full h-auto rounded-lg"
                  onLoad={() => setLoading(false)}
                  onError={() => setError('Failed to load image')}
                />
              </div>
            );
          }
          return <div className="text-center text-gray-500">Invalid image data</div>;
        
        case 'plot':
        case 'scatter':
        case 'bar':
        case 'line':
        case 'heatmap':
        case '3d':
        default:
          // Handle Plotly visualizations
          if (!visualization.data) {
            return <div className="text-center text-gray-500">No chart data available</div>;
          }

          return (
            <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
              <Plot
                data={visualization.data.data || visualization.data}
                layout={{
                  autosize: true,
                  margin: { l: 50, r: 50, t: 50, b: 50 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { family: 'ui-sans-serif, system-ui, sans-serif' },
                  ...visualization.data.layout,
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                  responsive: true,
                  ...visualization.config,
                }}
                style={{ width: '100%', height: '400px' }}
                onInitialized={() => setLoading(false)}
                onError={(err) => setError('Failed to render chart')}
              />
            </Suspense>
          );
      }
    } catch (err) {
      console.error('Visualization error:', err);
      return (
        <div className="flex items-center justify-center py-8 text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          Failed to render visualization
        </div>
      );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center space-x-3">
          <div className="text-gray-600 dark:text-gray-400">
            {getVisualizationIcon(visualization.type)}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {visualization.title || `${visualization.type} visualization`}
            </h3>
            {visualization.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {visualization.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Download visualization data"
          >
            <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Expand/Collapse Button */}
          <button
            onClick={onToggleExpanded}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`p-4 ${isExpanded ? 'min-h-96' : ''}`}>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-biomni-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading visualization...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {!loading && !error && renderVisualization()}
      </div>
    </div>
  );
};

// Main VisualizationPanel Component
export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({
  visualizations,
  activeTab = 0,
  onTabChange,
  className,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const handleToggleExpanded = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedItems(newSet);
  };

  if (visualizations.length === 0) {
    return (
      <div className={`text-center py-8 ${className || ''}`}>
        <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No visualizations available
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Tabs (if multiple visualizations) */}
      {visualizations.length > 1 && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {visualizations.map((viz, index) => (
              <button
                key={viz.id}
                onClick={() => onTabChange?.(index)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  index === activeTab
                    ? 'border-biomni-500 text-biomni-600 dark:text-biomni-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {viz.title || `Visualization ${index + 1}`}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Visualization Content */}
      <AnimatePresence mode="wait">
        {visualizations.length === 1 ? (
          // Single visualization
          <motion.div
            key={visualizations[0].id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <VisualizationItem
              visualization={visualizations[0]}
              isExpanded={expandedItems.has(visualizations[0].id)}
              onToggleExpanded={() => handleToggleExpanded(visualizations[0].id)}
            />
          </motion.div>
        ) : (
          // Multiple visualizations with tabs
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <VisualizationItem
              visualization={visualizations[activeTab]}
              isExpanded={expandedItems.has(visualizations[activeTab].id)}
              onToggleExpanded={() => handleToggleExpanded(visualizations[activeTab].id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VisualizationPanel;