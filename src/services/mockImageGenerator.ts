// AIDEV-NOTE: Mock image generator for testing visualization display
// This simulates backend matplotlib plot generation

export function generateMockPlotImage(): string {
  // Create a simple SVG plot as base64
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#1a1a2e"/>
      <text x="200" y="30" text-anchor="middle" fill="#00d4ff" font-size="16" font-weight="bold">
        Kaplan-Meier Survival Curve
      </text>
      
      <!-- Grid lines -->
      <g stroke="#333" stroke-width="0.5">
        <line x1="50" y1="250" x2="350" y2="250"/>
        <line x1="50" y1="200" x2="350" y2="200"/>
        <line x1="50" y1="150" x2="350" y2="150"/>
        <line x1="50" y1="100" x2="350" y2="100"/>
        <line x1="50" y1="50" x2="350" y2="50"/>
        
        <line x1="50" y1="50" x2="50" y2="250"/>
        <line x1="150" y1="50" x2="150" y2="250"/>
        <line x1="250" y1="50" x2="250" y2="250"/>
        <line x1="350" y1="50" x2="350" y2="250"/>
      </g>
      
      <!-- Survival curves -->
      <polyline points="50,50 100,60 150,85 200,120 250,160 300,190 350,210"
                fill="none" stroke="#00ff00" stroke-width="2"/>
      <polyline points="50,50 100,70 150,105 200,145 250,185 300,215 350,235"
                fill="none" stroke="#ff6b6b" stroke-width="2"/>
      
      <!-- Legend -->
      <rect x="260" y="60" width="80" height="50" fill="#1a1a2e" stroke="#555"/>
      <line x1="270" y1="75" x2="290" y2="75" stroke="#00ff00" stroke-width="2"/>
      <text x="295" y="78" fill="#ccc" font-size="12">Treatment</text>
      <line x1="270" y1="95" x2="290" y2="95" stroke="#ff6b6b" stroke-width="2"/>
      <text x="295" y="98" fill="#ccc" font-size="12">Control</text>
      
      <!-- Axes labels -->
      <text x="200" y="280" text-anchor="middle" fill="#999" font-size="12">Time (days)</text>
      <text x="20" y="150" text-anchor="middle" fill="#999" font-size="12" transform="rotate(-90 20 150)">
        Survival Probability
      </text>
    </svg>
  `
  
  // Convert SVG to base64
  const base64 = btoa(svg)
  return `data:image/svg+xml;base64,${base64}`
}

export function generateMultiplePlots(count: number = 2): string[] {
  const plots: string[] = []
  
  for (let i = 0; i < count; i++) {
    const svg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#1a1a2e"/>
        <text x="200" y="30" text-anchor="middle" fill="#00d4ff" font-size="16" font-weight="bold">
          ${i === 0 ? 'Survival Analysis' : 'Hazard Ratio Plot'}
        </text>
        
        <!-- Different plot for each -->
        ${i === 0 ? `
          <!-- KM Curve -->
          <polyline points="50,50 100,60 150,85 200,120 250,160 300,190 350,210"
                    fill="none" stroke="#00ff00" stroke-width="2"/>
          <polyline points="50,50 100,70 150,105 200,145 250,185 300,215 350,235"
                    fill="none" stroke="#ff6b6b" stroke-width="2"/>
        ` : `
          <!-- Bar chart -->
          <rect x="80" y="150" width="40" height="100" fill="#00ff00" opacity="0.7"/>
          <rect x="140" y="120" width="40" height="130" fill="#ff6b6b" opacity="0.7"/>
          <rect x="200" y="100" width="40" height="150" fill="#00d4ff" opacity="0.7"/>
          <rect x="260" y="130" width="40" height="120" fill="#ffaa00" opacity="0.7"/>
        `}
        
        <!-- Grid -->
        <g stroke="#333" stroke-width="0.5" opacity="0.5">
          ${[...Array(5)].map((_, j) => `
            <line x1="50" y1="${50 + j * 40}" x2="350" y2="${50 + j * 40}"/>
          `).join('')}
          ${[...Array(4)].map((_, j) => `
            <line x1="${50 + j * 100}" y1="50" x2="${50 + j * 100}" y2="250"/>
          `).join('')}
        </g>
        
        <!-- Axes -->
        <line x1="50" y1="250" x2="350" y2="250" stroke="#666" stroke-width="2"/>
        <line x1="50" y1="50" x2="50" y2="250" stroke="#666" stroke-width="2"/>
      </svg>
    `
    
    const base64 = btoa(svg)
    plots.push(`data:image/svg+xml;base64,${base64}`)
  }
  
  return plots
}