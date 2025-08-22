/**
 * Biomni Templates Component
 * Pre-configured templates for common molecular biology workflows
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna,
  FlaskConical,
  Scissors,
  Target,
  Microscope,
  TestTube,
  FileText,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  GitBranch,
  Zap,
  Shield,
  Activity,
  BookOpen
} from 'lucide-react';

export interface BiomniTemplate {
  id: string;
  category: 'cloning' | 'crispr' | 'pcr' | 'sequencing' | 'protein' | 'analysis';
  title: string;
  description: string;
  icon: React.ElementType;
  query: string;
  tags: string[];
  requiresFile?: boolean;
  fileType?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const biomniTemplates: BiomniTemplate[] = [
  // CRISPR Templates
  {
    id: 'crispr-sgrna-design',
    category: 'crispr',
    title: 'CRISPR sgRNA Design',
    description: 'Design optimal sgRNA sequences for gene knockout',
    icon: Target,
    query: `I need to design CRISPR sgRNAs for knocking out the human B2M gene. Please:
1. Find the best target sites in the early exons
2. Design 3 sgRNA sequences with minimal off-targets
3. Add appropriate PAM sequences (NGG for Cas9)
4. Include cloning overhangs for lentiCRISPRv2
5. Predict on-target and off-target scores
6. Generate the oligo ordering sequences`,
    tags: ['CRISPR', 'sgRNA', 'Gene Knockout', 'Cas9'],
    difficulty: 'intermediate'
  },
  {
    id: 'crispr-plasmid-cloning',
    category: 'crispr',
    title: 'CRISPR Plasmid Assembly',
    description: 'Clone sgRNA into CRISPR plasmid backbone',
    icon: Dna,
    query: `I have a plasmid backbone (file uploaded) and want to clone a CRISPR sgRNA targeting [GENE_NAME]. Please:
1. Design the sgRNA sequence with overhangs
2. Show the digestion and ligation protocol
3. Calculate insert:vector ratios
4. Generate the final plasmid map
5. Provide step-by-step cloning instructions
6. Include verification strategies`,
    tags: ['CRISPR', 'Cloning', 'Plasmid', 'sgRNA'],
    requiresFile: true,
    fileType: ['.txt', '.fasta', '.gb'],
    difficulty: 'intermediate'
  },

  // Cloning Templates
  {
    id: 'gibson-assembly',
    category: 'cloning',
    title: 'Gibson Assembly Design',
    description: 'Design multi-fragment Gibson assembly',
    icon: GitBranch,
    query: `I need to assemble [NUMBER] DNA fragments using Gibson Assembly. Please:
1. Design primers with 20-40bp overlaps
2. Calculate optimal fragment ratios
3. Optimize overlap Tm for 50°C assembly
4. Generate the complete assembly protocol
5. Predict assembly efficiency
6. Provide troubleshooting guide`,
    tags: ['Gibson', 'Assembly', 'Cloning', 'Multi-fragment'],
    difficulty: 'advanced'
  },
  {
    id: 'restriction-cloning',
    category: 'cloning',
    title: 'Restriction Enzyme Cloning',
    description: 'Traditional restriction-ligation cloning',
    icon: Scissors,
    query: `I want to clone my gene of interest into a plasmid using restriction enzymes. The insert is [SIZE]bp. Please:
1. Identify compatible restriction sites
2. Check for internal restriction sites
3. Design the digestion protocol
4. Calculate ligation ratios
5. Generate transformation protocol
6. Design colony PCR primers for screening`,
    tags: ['Restriction', 'Ligation', 'Cloning', 'Traditional'],
    requiresFile: true,
    fileType: ['.txt', '.fasta', '.gb'],
    difficulty: 'beginner'
  },
  {
    id: 'golden-gate',
    category: 'cloning',
    title: 'Golden Gate Assembly',
    description: 'Type IIS restriction enzyme assembly',
    icon: Zap,
    query: `Design a Golden Gate assembly strategy for [NUMBER] parts. Please:
1. Design BsaI/BsmBI fusion sites
2. Ensure proper overhang compatibility
3. Order parts for scarless assembly
4. Generate one-pot reaction protocol
5. Calculate part concentrations
6. Predict assembly fidelity`,
    tags: ['Golden Gate', 'Type IIS', 'Modular', 'Assembly'],
    difficulty: 'advanced'
  },

  // PCR Templates
  {
    id: 'pcr-primer-design',
    category: 'pcr',
    title: 'PCR Primer Design',
    description: 'Design primers for gene amplification',
    icon: Activity,
    query: `Design PCR primers to amplify [GENE_NAME] from [ORGANISM]. Requirements:
1. Primer length 18-25bp
2. Tm between 58-62°C
3. GC content 40-60%
4. Avoid secondary structures
5. Add restriction sites if needed
6. Calculate annealing temperature
7. Predict amplicon size`,
    tags: ['PCR', 'Primers', 'Amplification', 'Design'],
    difficulty: 'beginner'
  },
  {
    id: 'site-directed-mutagenesis',
    category: 'pcr',
    title: 'Site-Directed Mutagenesis',
    description: 'Introduce specific mutations via PCR',
    icon: Shield,
    query: `I need to introduce a [MUTATION_TYPE] mutation at position [POSITION] in my gene. Please:
1. Design mutagenic primers
2. Calculate primer Tm with mismatches
3. Generate QuikChange protocol
4. Design sequencing primers
5. Predict mutation efficiency
6. Suggest verification methods`,
    tags: ['Mutagenesis', 'PCR', 'Point Mutation', 'QuikChange'],
    requiresFile: true,
    fileType: ['.txt', '.fasta'],
    difficulty: 'intermediate'
  },

  // Sequencing Templates
  {
    id: 'ngs-library-prep',
    category: 'sequencing',
    title: 'NGS Library Preparation',
    description: 'Design Illumina sequencing library',
    icon: BookOpen,
    query: `Prepare samples for Illumina sequencing. Sample type: [TYPE]. Please:
1. Design adapter sequences
2. Add unique barcodes/indexes
3. Calculate input requirements
4. Generate fragmentation protocol
5. Design QC strategies
6. Estimate sequencing depth needed`,
    tags: ['NGS', 'Illumina', 'Library Prep', 'Sequencing'],
    difficulty: 'advanced'
  },
  {
    id: 'sanger-sequencing',
    category: 'sequencing',
    title: 'Sanger Sequencing Design',
    description: 'Design primers for Sanger sequencing',
    icon: Microscope,
    query: `Design Sanger sequencing strategy for a [SIZE]bp construct. Please:
1. Design sequencing primers every 500-700bp
2. Ensure primer specificity
3. Create primer walking strategy
4. Calculate primer concentrations
5. Generate sample prep instructions
6. Provide expected chromatogram quality metrics`,
    tags: ['Sanger', 'Sequencing', 'Primers', 'Verification'],
    requiresFile: true,
    fileType: ['.txt', '.fasta', '.gb'],
    difficulty: 'beginner'
  },

  // Protein Templates
  {
    id: 'protein-expression',
    category: 'protein',
    title: 'Protein Expression Optimization',
    description: 'Optimize gene for protein expression',
    icon: FlaskConical,
    query: `Optimize [GENE_NAME] for expression in [HOST_ORGANISM]. Please:
1. Perform codon optimization
2. Remove rare codons
3. Optimize GC content
4. Add expression tags (His, GST, etc.)
5. Design purification strategy
6. Predict protein yield
7. Suggest induction conditions`,
    tags: ['Protein', 'Expression', 'Codon Optimization', 'Purification'],
    difficulty: 'intermediate'
  },
  {
    id: 'antibody-design',
    category: 'protein',
    title: 'Antibody Engineering',
    description: 'Design or modify antibody sequences',
    icon: TestTube,
    query: `Engineer an antibody for [TARGET_ANTIGEN]. Tasks:
1. Design CDR regions
2. Humanize if needed
3. Predict binding affinity
4. Check for immunogenicity
5. Optimize stability
6. Generate expression construct
7. Design purification protocol`,
    tags: ['Antibody', 'Engineering', 'CDR', 'Humanization'],
    difficulty: 'advanced'
  },

  // Analysis Templates
  {
    id: 'sequence-analysis',
    category: 'analysis',
    title: 'Comprehensive Sequence Analysis',
    description: 'Analyze DNA/protein sequences',
    icon: FileText,
    query: `Perform comprehensive analysis of the uploaded sequence. Include:
1. Basic statistics (length, GC content)
2. ORF prediction and annotation
3. Restriction site mapping
4. Repeat identification
5. Secondary structure prediction
6. Homology search
7. Functional domain identification`,
    tags: ['Analysis', 'Annotation', 'Bioinformatics'],
    requiresFile: true,
    fileType: ['.txt', '.fasta', '.gb'],
    difficulty: 'beginner'
  },
  {
    id: 'plasmid-validation',
    category: 'analysis',
    title: 'Plasmid Map Validation',
    description: 'Verify plasmid construct integrity',
    icon: Sparkles,
    query: `Validate my plasmid construct. Please check:
1. Verify all features are in-frame
2. Check for unwanted stop codons
3. Confirm promoter/terminator pairs
4. Identify potential recombination sites
5. Check antibiotic resistance markers
6. Verify origin of replication compatibility
7. Generate annotated plasmid map`,
    tags: ['Plasmid', 'Validation', 'QC', 'Annotation'],
    requiresFile: true,
    fileType: ['.gb', '.dna', '.fasta'],
    difficulty: 'intermediate'
  }
];

interface BiomniTemplatesProps {
  onSelectTemplate: (template: BiomniTemplate) => void;
  selectedCategory?: string;
  showDescription?: boolean;
  className?: string;
}

export const BiomniTemplates: React.FC<BiomniTemplatesProps> = ({
  onSelectTemplate,
  selectedCategory = 'all',
  showDescription = true,
  className = ''
}) => {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Templates', icon: Sparkles },
    { id: 'crispr', label: 'CRISPR', icon: Target },
    { id: 'cloning', label: 'Cloning', icon: Dna },
    { id: 'pcr', label: 'PCR', icon: Activity },
    { id: 'sequencing', label: 'Sequencing', icon: Microscope },
    { id: 'protein', label: 'Protein', icon: FlaskConical },
    { id: 'analysis', label: 'Analysis', icon: FileText }
  ];

  const filteredTemplates = biomniTemplates.filter(template => {
    const categoryMatch = selectedCategory === 'all' || template.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const handleCopyQuery = (template: BiomniTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(template.query);
    setCopiedTemplate(template.id);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-400/10';
      case 'intermediate': return 'text-yellow-400 bg-yellow-400/10';
      case 'advanced': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(category => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {category.label}
            </button>
          );
        })}
      </div>

      {/* Difficulty Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Difficulty:</span>
        {['all', 'beginner', 'intermediate', 'advanced'].map(level => (
          <button
            key={level}
            onClick={() => setSelectedDifficulty(level)}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              selectedDifficulty === level
                ? getDifficultyColor(level === 'all' ? 'all' : level)
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredTemplates.map(template => {
            const Icon = template.icon;
            return (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="relative"
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
              >
                <button
                  onClick={() => onSelectTemplate(template)}
                  className="w-full text-left p-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-green-600/50 rounded-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-green-400" />
                      <h3 className="font-semibold text-sm">{template.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.requiresFile && (
                        <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">
                          Requires File
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(template.difficulty)}`}>
                        {template.difficulty}
                      </span>
                    </div>
                  </div>
                  
                  {showDescription && (
                    <p className="text-xs text-gray-400 mb-2">{template.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-gray-700/50 px-2 py-0.5 rounded text-gray-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleCopyQuery(template, e)}
                        className="p-1 hover:bg-gray-600/50 rounded transition-all"
                      >
                        {copiedTemplate === template.id ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400" />
                        )}
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                </button>

                {/* Hover Preview */}
                {hoveredTemplate === template.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-10 top-full mt-2 left-0 right-0 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl"
                  >
                    <div className="text-xs text-gray-400 mb-2">Query Preview:</div>
                    <div className="text-xs text-gray-300 font-mono bg-gray-800 p-2 rounded max-h-32 overflow-y-auto">
                      {template.query.substring(0, 200)}...
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No templates found for selected filters</p>
        </div>
      )}
    </div>
  );
};

export default BiomniTemplates;