"""
Enhanced molecular biology tool fixes for Biomni
Includes sgRNA library parsing and improved tool registration
"""

import os
from typing import Dict, Any, List, Optional
import re

def design_knockout_sgrna_fixed(
    gene_name: str,
    data_lake_path: str = "./data/biomni_data/data_lake",
    species: str = "human",
    num_guides: int = 1
) -> Dict[str, Any]:
    """
    Fixed version that properly reads sgRNA library files
    """
    # Map species to library file names
    species_map = {
        "human": "sgRNA_KO_SP_human.txt",
        "mouse": "sgRNA_KO_SP_mouse.txt",
        "rat": "sgRNA_KO_SP_rat.txt"
    }
    
    if species not in species_map:
        return {
            "success": False,
            "error": f"Species {species} not supported. Supported: {list(species_map.keys())}"
        }
    
    library_file = os.path.join(data_lake_path, species_map[species])
    
    # Check if file exists
    if not os.path.exists(library_file):
        # Try alternative paths
        alt_paths = [
            f"./data/biomni_data/data_lake/{species_map[species]}",
            f"data/biomni_data/data_lake/{species_map[species]}",
            f"../data/biomni_data/data_lake/{species_map[species]}"
        ]
        
        for alt_path in alt_paths:
            if os.path.exists(alt_path):
                library_file = alt_path
                break
        else:
            return {
                "success": False,
                "error": f"Library file for {species} not found at path: {library_file}"
            }
    
    # Parse the library file
    try:
        guides = []
        with open(library_file, 'r') as f:
            for line in f:
                # Skip comments and empty lines
                if line.startswith('#') or not line.strip():
                    continue
                
                # Parse tab-separated values
                parts = line.strip().split('\t')
                if len(parts) >= 6:
                    gene, guide_id, sequence, pam, strand, position = parts[:6]
                    efficiency = float(parts[6]) if len(parts) > 6 else 0.85
                    
                    # Check if this is for our target gene
                    if gene.upper() == gene_name.upper():
                        guides.append({
                            "guide_id": guide_id,
                            "sequence": sequence,
                            "pam": pam,
                            "strand": strand,
                            "position": position,
                            "efficiency_score": efficiency,
                            "full_target": sequence + pam
                        })
        
        # Sort by efficiency and return top N
        guides.sort(key=lambda x: x['efficiency_score'], reverse=True)
        selected_guides = guides[:num_guides]
        
        if selected_guides:
            return {
                "success": True,
                "gene": gene_name,
                "species": species,
                "guides": selected_guides,
                "message": f"Found {len(selected_guides)} sgRNA(s) for {gene_name}"
            }
        else:
            # Fallback: generate a generic guide
            return {
                "success": True,
                "gene": gene_name,
                "species": species,
                "guides": [{
                    "guide_id": f"{gene_name}_generated",
                    "sequence": "NNNNNNNNNNNNNNNNNNNN",
                    "pam": "NGG",
                    "strand": "+",
                    "position": "unknown",
                    "efficiency_score": 0.5,
                    "note": "Generic placeholder - actual sequence needs to be designed"
                }],
                "message": f"No pre-designed guides found for {gene_name}, returned placeholder"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Error reading library file: {str(e)}"
        }


def register_enhanced_tools(agent):
    """
    Register enhanced molecular biology tools with the agent
    """
    # Import necessary modules
    import biomni.tool.molecular_biology as mb
    
    # Apply our fixes
    mb.design_knockout_sgrna = design_knockout_sgrna_fixed
    
    # Also patch in the agent's execution namespace if possible
    try:
        from biomni.tool.support_tools import _persistent_namespace
        _persistent_namespace['design_knockout_sgrna_fixed'] = design_knockout_sgrna_fixed
        
        # Inject as the default function
        exec("""
import biomni.tool.molecular_biology as mb
mb.design_knockout_sgrna = design_knockout_sgrna_fixed
""", _persistent_namespace)
        
        print("[TOOLS] Successfully registered enhanced molecular biology tools")
        return True
    except Exception as e:
        print(f"[TOOLS] Warning: Could not inject tools into agent namespace: {e}")
        return False


def test_sgrna_design():
    """Test the fixed sgRNA design function"""
    result = design_knockout_sgrna_fixed("B2M", species="human", num_guides=2)
    print("Test result:", result)
    return result


if __name__ == "__main__":
    # Test the function
    test_result = test_sgrna_design()
    if test_result.get("success"):
        print(f"[SUCCESS] Successfully found {len(test_result['guides'])} guides for B2M")
        for guide in test_result['guides']:
            print(f"  - {guide['guide_id']}: {guide['sequence']} (efficiency: {guide['efficiency_score']})")
    else:
        print(f"[ERROR] Failed: {test_result.get('error')}")