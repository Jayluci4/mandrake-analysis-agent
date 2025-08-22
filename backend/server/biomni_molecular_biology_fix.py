"""
Fixed molecular biology tools for CRISPR cloning
"""
from Bio import Restriction
from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord
from Bio.SeqFeature import SeqFeature, FeatureLocation
import json
from typing import Dict, Any, List, Optional


def find_restriction_sites_fixed(dna_sequence: str, enzymes: list[str], is_circular: bool = True) -> dict:
    """Find restriction sites in a DNA sequence - FIXED VERSION"""
    from Bio.Restriction import RestrictionBatch, Analysis
    
    # Clean sequence
    dna_sequence = dna_sequence.strip().upper()
    
    # Create Seq object
    seq = Seq(dna_sequence)
    
    # Get restriction enzymes
    rb = RestrictionBatch(enzymes)
    
    # Analyze
    analysis = Analysis(rb, seq, linear=not is_circular)
    
    results = {
        'sequence_info': {
            'length': len(dna_sequence),
            'is_circular': is_circular
        },
        'restriction_sites': {}
    }
    
    for enzyme in rb:
        sites = analysis.full()[enzyme]
        enzyme_name = str(enzyme)
        
        results['restriction_sites'][enzyme_name] = {
            'recognition_sequence': str(enzyme.site),
            'cut_positions': {
                '5_prime': enzyme.fst5,
                '3_prime': enzyme.fst3,
                'overhang': enzyme.ovhg,
                'overhang_type': 'sticky' if enzyme.ovhg != 0 else 'blunt'
            },
            'sites': [s - 1 for s in sites]  # Convert to 0-based
        }
    
    return results


def golden_gate_assembly_fixed(
    backbone_sequence: str = None,
    insert_sequence: str = None,
    enzyme_name: str = "BsmBI",
    is_circular: bool = True,
    fragments: list = None  # Support legacy parameter
) -> dict[str, Any]:
    """
    Simplified Golden Gate assembly for CRISPR sgRNA cloning
    """
    # Handle legacy 'fragments' parameter
    if fragments and not insert_sequence:
        # Extract insert sequence from fragments list
        if isinstance(fragments, list) and len(fragments) > 0:
            if isinstance(fragments[0], dict):
                # Fragment is a dict with 'sequence' key
                insert_sequence = fragments[0].get('sequence', '')
            elif isinstance(fragments[0], str):
                # Fragment is directly a string
                insert_sequence = fragments[0]
    
    # Validate required parameters
    if not backbone_sequence or not insert_sequence:
        return {
            'success': False,
            'message': 'Missing required parameters: backbone_sequence and insert_sequence',
            'assembled_sequence': None
        }
    
    # Clean sequences
    backbone_sequence = backbone_sequence.strip().upper()
    insert_sequence = insert_sequence.strip().upper()
    
    # Enzyme recognition sites
    enzymes_info = {
        "BsmBI": {"site": "CGTCTC", "cut_after": 1, "overhang_len": 4},
        "BsaI": {"site": "GGTCTC", "cut_after": 1, "overhang_len": 4},
        "Esp3I": {"site": "CGTCTC", "cut_after": 1, "overhang_len": 4}  # Same as BsmBI
    }
    
    if enzyme_name not in enzymes_info:
        return {
            'success': False,
            'message': f'Unsupported enzyme: {enzyme_name}',
            'assembled_sequence': None
        }
    
    enzyme = enzymes_info[enzyme_name]
    site = enzyme['site']
    
    # Find enzyme sites in backbone
    sites = []
    for i in range(len(backbone_sequence) - len(site) + 1):
        if backbone_sequence[i:i+len(site)] == site:
            sites.append(i)
    
    # Special handling for plentiCRISPR v2 with single BsmBI site
    if len(sites) == 1 and enzyme_name in ["BsmBI", "Esp3I"]:
        # plentiCRISPR v2 often has a single BsmBI site for sgRNA insertion
        # The sgRNA replaces the spacer sequence downstream of the site
        site_pos = sites[0]
        cut_pos = site_pos + len(site) + enzyme['cut_after']
        
        # Look for sgRNA scaffold sequence that marks end of spacer region
        scaffold = "GTTTTAGAGCTAGAAATAGCAAGTTAAAATAAGGCTAGTCCGTTATCAACTTGAAAAAGTGGCACCGAGTCGGTGC"
        scaffold_pos = backbone_sequence.find(scaffold)
        
        if scaffold_pos > cut_pos and scaffold_pos - cut_pos < 100:  # Spacer typically 20-30bp
            # Replace spacer region with new sgRNA
            assembled = backbone_sequence[:cut_pos] + insert_sequence + backbone_sequence[scaffold_pos:]
        else:
            # Fallback: insert sgRNA and remove 20bp downstream (typical spacer length)
            assembled = backbone_sequence[:cut_pos] + insert_sequence + backbone_sequence[cut_pos + 20:]
        
        return {
            'success': True,
            'assembled_sequence': assembled,
            'assembly_info': {
                'backbone_length': len(backbone_sequence),
                'insert_length': len(insert_sequence),
                'final_length': len(assembled),
                'enzyme_sites_used': [site_pos],
                'cut_position': cut_pos,
                'method': 'single_site_replacement'
            }
        }
    
    elif len(sites) < 2:
        # Try BbsI as alternative
        bbsi_site = "GAAGAC"
        bbsi_sites = []
        for i in range(len(backbone_sequence) - len(bbsi_site) + 1):
            if backbone_sequence[i:i+len(bbsi_site)] == bbsi_site:
                bbsi_sites.append(i)
        
        if len(bbsi_sites) >= 2:
            return {
                'success': False,
                'message': f'Only {len(sites)} {enzyme_name} site(s) found, but {len(bbsi_sites)} BbsI sites available. Consider using BbsI instead.',
                'assembled_sequence': None
            }
        else:
            return {
                'success': False,
                'message': f'Need at least 2 {enzyme_name} sites in backbone, found {len(sites)}',
                'assembled_sequence': None
            }
    
    # Standard two-site assembly
    site1 = sites[0]
    site2 = sites[1]
    
    # Calculate cut positions (enzyme cuts after recognition site + offset)
    cut1 = site1 + len(site) + enzyme['cut_after']
    cut2 = site2
    
    # Assemble the new sequence
    if cut1 < cut2:
        # Normal case: insert between two sites
        assembled = backbone_sequence[:cut1] + insert_sequence + backbone_sequence[cut2:]
    else:
        # Circular permutation needed
        assembled = insert_sequence + backbone_sequence[cut2:cut1]
    
    return {
        'success': True,
        'assembled_sequence': assembled,
        'assembly_info': {
            'backbone_length': len(backbone_sequence),
            'insert_length': len(insert_sequence),
            'final_length': len(assembled),
            'enzyme_sites_used': [site1, site2],
            'cut_positions': [cut1, cut2]
        }
    }


def annotate_plasmid_fixed(sequence: str, sgRNA_sequence: str = None, is_circular: bool = True) -> dict:
    """
    Annotate a CRISPR plasmid with common features - FIXED VERSION
    """
    sequence = sequence.strip().upper()
    
    features = []
    
    # Common CRISPR plasmid features to search for
    feature_patterns = {
        'U6_promoter': 'GAGGGCCTATTTCCCATGATTCC',
        'H1_promoter': 'GAACGCTGACGTCATCAACCCGCTCCAAGGAATCGCGGGCCCAGTGTCACTAGGCGGGAACACCCAGCGCGCGTGCGCCCTGGCAGGAAGATGGCTGTGAGGGACAGGGGAGTGGCGCCCTGCAATATTTGCATGTCGCTATGTGTTCTGGGAAATCACCATAAACGTGAAATGTCTTTGGATTTGGGAATCTTATAAGTTCTGTATGAGACCAC',
        'EF1a_promoter': 'GGATCTGCGATCGCTCCGGTGCCCGTCAGTGGGCAGAGCGCACATCGCCCACAGTCCCCGAGAAGTTGGGGGGAGGGGTCGGCAATTGAACCGGTGCCTAGAGAAGGTGGCGCGGGGTAAACTGGGAAAGTGATGTCGTGTACTGGCTCCGCCTTTTTCCCGAGGGTGGGGGAGAACCGTATATAAGTGCAGTAGTCGCCGTGAACGTTCTTTTTCGCAACGGGTTTGCCGCCAGAACACAGGTAAGTGCCGTGTGTGGTTCCCGCGGGCCTGGCCTCTTTACGGGTTATGGCCCTTGCGTGCCTTGAATTACTTCCACGCCCCTGGCTGCAGTACGTGATTCTTGATCCCGAGCTTCGGGTTGGAAGTGGGTGGGAGAGTTCGAGGCCTTGCGCTTAAGGAGCCCCTTCGCCTCGTGCTTGAGTTGAGGCCTGGCCTGGGCGCTGGGGCCGCCGCGTGCGAATCTGGTGGCACCTTCGCGCCTGTCTCGCTGCTTTCGATAAGTCTCTAGCCATTTAAAATTTTTGATGACCTGCTGCGACGCTTTTTTTCTGGCAAGATAGTCTTGTAAATGCGGGCCAAGATCTGCACACTGGTATTTCGGTTTTTGGGGCCGCGGGCGGCGACGGGGCCCGTGCGTCCCAGCGCACATGTTCGGCGAGGCGGGGCCTGCGAGCGCGGCCACCGAGAATCGGACGGGGGTAGTCTCAAGCTGGCCGGCCTGCTCTGGTGCCTGGCCTCGCGCCGCCGTGTATCGCCCCGCCCTGGGCGGCAAGGCTGGCCCGGTCGGCACCAGTTGCGTGAGCGGAAAGATGGCCGCTTCCCGGCCCTGCTGCAGGGAGCTCAAAATGGAGGACGCGGCGCTCGGGAGAGCGGGCGGGTGAGTCACCCACACAAAGGAAAAGGGCCTTTCCGTCCTCAGCCGTCGCTTCATGTGACTCCACGGAGTACCGGGCGCCGTCCAGGCACCTCGATTAGTTCTCGAGCTTTTGGAGTACGTCGTCTTTAGGTTGGGGGGAGGGGTTTTATGCGATGGAGTTTCCCCACACTGAGTGGGTGGAGACTGAAGTTAGGCCAGCTTGGCACTTGATGTAATTCTCCTTGGAATTTGCCCTTTTTGAGTTTGGATCTTGGTTCATTCTCAAGCCTCAGACAGTGGTTCAAAGTTTTTTTCTTCCATTTCAGGTGTCGTGA',
        'CMV_promoter': 'GACATTGATTATTGACTAGTTATTAATAGTAATCAATTACGGGGTCATTAGTTCATAGCCCATATATGGAGTTCCGCGTTACATAACTTACGGTAAATGGCCCGCCTGGCTGACCGCCCAACGACCCCCGCCCATTGACGTCAATAATGACGTATGTTCCCATAGTAACGCCAATAGGGACTTTCCATTGACGTCAATGGGTGGAGTATTTACGGTAAACTGCCCACTTGGCAGTACATCAAGTGTATCATATGCCAAGTACGCCCCCTATTGACGTCAATGACGGTAAATGGCCCGCCTGGCATTATGCCCAGTACATGACCTTATGGGACTTTCCTACTTGGCAGTACATCTACGTATTAGTCATCGCTATTACCATGGTGATGCGGTTTTGGCAGTACATCAATGGGCGTGGATAGCGGTTTGACTCACGGGGATTTCCAAGTCTCCACCCCATTGACGTCAATGGGAGTTTGTTTTGGCACCAAAATCAACGGGACTTTCCAAAATGTCGTAACAACTCCGCCCCATTGACGCAAATGGGCGGTAGGCGTGTACGGTGGGAGGTCTATATAAGCAGAGCTC',
        'sgRNA_scaffold': 'GTTTTAGAGCTAGAAATAGCAAGTTAAAATAAGGCTAGTCCGTTATCAACTTGAAAAAGTGGCACCGAGTCGGTGC',
        'Cas9_start': 'ATGGACAAGAAGTAC',
        'puromycin': 'ATGACCGAGTACAAGCCCACGGTGCGCCTCGCCACCCGCGACGACGTCCCCAGGGCCGTACGCACCCTCGCCGCCGCGTTCGCCGACTACCCCGCCACGCGCCACACCGTCGATCCGGACCGCCACATCGAGCGGGTCACCGAGCTGCAAGAACTCTTCCTCACGCGCGTCGGGCTCGACATCGGCAAGGTGTGGGTCGCGGACGACGGCGCCGCGGTGGCGGTCTGGACCACGCCGGAGAGCGTCGAAGCGGGGGCGGTGTTCGCCGAGATCGGCCCGCGCATGGCCGAGTTGAGCGGTTCCCGGCTGGCCGCGCAGCAACAGATGGAAGGCCTCCTGGCGCCGCACCGGCCCAAGGAGCCCGCGTGGTTCCTGGCCACCGTCGGCGTCTCGCCCGACCACCAGGGCAAGGGTCTGGGCAGCGCCGTCGTGCTCCCCGGAGTGGAGGCGGCCGAGCGCGCCGGGGTGCCCGCCTTCCTGGAGACCTCCGCGCCCCGCAACCTCCCCTTCTACGAGCGGCTCGGCTTCACCGTCACCGCCGACGTCGAGGTGCCCGAAGGACCGCGCACCTGGTGCATGACCCGCAAGCCCGGTGCC'
    }
    
    # Search for features
    for feature_name, pattern in feature_patterns.items():
        pos = sequence.find(pattern)
        if pos != -1:
            features.append({
                'name': feature_name,
                'type': 'promoter' if 'promoter' in feature_name else 'misc_feature',
                'start': pos,
                'end': pos + len(pattern),
                'strand': 1
            })
    
    # If sgRNA sequence provided, find it
    if sgRNA_sequence:
        sgRNA_sequence = sgRNA_sequence.strip().upper()
        pos = sequence.find(sgRNA_sequence)
        if pos != -1:
            features.append({
                'name': 'sgRNA_target',
                'type': 'guide_RNA',
                'start': pos,
                'end': pos + len(sgRNA_sequence),
                'strand': 1,
                'note': 'User-specified sgRNA targeting sequence'
            })
    
    # Find BsmBI sites
    bsmbi_site = 'CGTCTC'
    for i in range(len(sequence) - len(bsmbi_site) + 1):
        if sequence[i:i+len(bsmbi_site)] == bsmbi_site:
            features.append({
                'name': 'BsmBI',
                'type': 'restriction_site',
                'start': i,
                'end': i + len(bsmbi_site),
                'strand': 1
            })
    
    return {
        'success': True,
        'sequence_length': len(sequence),
        'is_circular': is_circular,
        'features': sorted(features, key=lambda x: x['start']),
        'feature_count': len(features)
    }


def design_crispr_cloning_strategy(
    backbone_sequence: str,
    target_gene: str,
    sgRNA_sequence: str = None
) -> dict:
    """
    Design a complete CRISPR cloning strategy
    """
    # If no sgRNA provided, use common validated sequences
    validated_sgRNAs = {
        'B2M': 'GAGTAGCGCGAGCACAGCTA',  # Validated B2M sgRNA from literature
        'AAVS1': 'GGGGCCACTAGGGACAGGAT',  # Safe harbor locus
        'CD33': 'GAAGAAGAGGAGGATGATTA'
    }
    
    if not sgRNA_sequence and target_gene.upper() in validated_sgRNAs:
        sgRNA_sequence = validated_sgRNAs[target_gene.upper()]
    elif not sgRNA_sequence:
        # Generic sgRNA for testing
        sgRNA_sequence = 'NNNNNNNNNNNNNNNNNNNN'
    
    # Design oligos with overhangs for BsmBI cloning
    forward_oligo = f"CACCG{sgRNA_sequence}"
    reverse_oligo = f"AAAC{sgRNA_sequence[::-1].translate(str.maketrans('ATGC', 'TACG'))}C"
    
    # Find BsmBI sites in backbone
    bsmbi_sites = []
    bsmbi_site = 'CGTCTC'
    for i in range(len(backbone_sequence) - len(bsmbi_site) + 1):
        if backbone_sequence[i:i+len(bsmbi_site)] == bsmbi_site:
            bsmbi_sites.append(i)
    
    return {
        'success': True,
        'target_gene': target_gene,
        'sgRNA_sequence': sgRNA_sequence,
        'oligos': {
            'forward': forward_oligo,
            'reverse': reverse_oligo,
            'annealing_protocol': {
                'steps': [
                    'Mix 1 μl of each oligo (100 μM stock)',
                    'Add 8 μl of annealing buffer (10 mM Tris pH 8.0, 50 mM NaCl, 1 mM EDTA)',
                    'Heat to 95°C for 5 minutes',
                    'Cool slowly to room temperature (1°C/min)'
                ]
            }
        },
        'cloning_sites': {
            'enzyme': 'BsmBI (Esp3I)',
            'sites_in_backbone': bsmbi_sites,
            'number_of_sites': len(bsmbi_sites)
        },
        'protocol': {
            'digestion': {
                'enzyme': 'BsmBI',
                'temperature': '37°C',
                'time': '1 hour',
                'buffer': 'NEB Buffer 3.1'
            },
            'ligation': {
                'ratio': '1:3 (vector:insert)',
                'temperature': '16°C',
                'time': '30 min to overnight',
                'enzyme': 'T4 DNA Ligase'
            },
            'golden_gate': {
                'description': 'One-pot digestion-ligation',
                'reaction_setup': [
                    '50 ng backbone plasmid',
                    '1 μl annealed oligos',
                    '1 μl BsmBI enzyme',
                    '1 μl T4 DNA ligase',
                    '2 μl 10x T4 ligase buffer',
                    'Water to 20 μl'
                ],
                'thermocycling': [
                    '(37°C for 5 min, 16°C for 5 min) x 25 cycles',
                    '50°C for 5 min',
                    '80°C for 10 min'
                ]
            }
        }
    }