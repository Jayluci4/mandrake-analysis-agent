"""
Enhanced tool tracking for better visibility into which tools are being used
"""

import re
from typing import Dict, Any, List

def enhance_tool_tracking(chunk: str) -> Dict[str, Any]:
    """
    Analyze code chunks to identify which specific tools are being used
    """
    tool_info = {
        "type": "execute_python",  # Default
        "specific_tools": [],
        "imports": [],
        "functions_called": []
    }
    
    # Check for imports
    import_pattern = r'from\s+(biomni\.tool\.\w+)\s+import\s+(\w+)'
    imports = re.findall(import_pattern, chunk)
    for module, func in imports:
        tool_info["imports"].append(f"{module}.{func}")
        
        # Categorize the tool
        if "molecular_biology" in module:
            tool_info["specific_tools"].append("molecular_biology")
        elif "literature" in module:
            tool_info["specific_tools"].append("literature")
        elif "database" in module:
            tool_info["specific_tools"].append("database")
    
    # Check for specific function calls
    function_patterns = {
        "molecular_biology": [
            r'design_knockout_sgrna\(',
            r'annotate_plasmid\(',
            r'golden_gate_assembly\(',
            r'find_restriction_sites\(',
            r'digest_sequence\('
        ],
        "literature": [
            r'query_pubmed\(',
            r'search_google\(',
            r'extract_url_content\('
        ],
        "file_operations": [
            r'open\(',
            r'\.write\(',
            r'\.read\('
        ]
    }
    
    for tool_type, patterns in function_patterns.items():
        for pattern in patterns:
            if re.search(pattern, chunk):
                tool_info["specific_tools"].append(tool_type)
                func_name = pattern.replace(r'\(', '').replace('\\', '')
                tool_info["functions_called"].append(func_name)
    
    # Deduplicate
    tool_info["specific_tools"] = list(set(tool_info["specific_tools"]))
    
    # Set more specific type if we identified tools
    if tool_info["specific_tools"]:
        tool_info["type"] = "_".join(tool_info["specific_tools"][:2])  # Use first 2 tools
    
    return tool_info


def inject_tool_tracking_into_orchestrator():
    """
    Inject enhanced tool tracking into the orchestrator
    """
    global enhance_tool_tracking
    
    # This would be imported and used in the orchestrator
    return enhance_tool_tracking


# Test the function
if __name__ == "__main__":
    test_code = """
from biomni.tool.molecular_biology import design_knockout_sgrna, annotate_plasmid

result = design_knockout_sgrna(gene_name="B2M", species="human")
annotation = annotate_plasmid(sequence=assembled_seq)
    """
    
    result = enhance_tool_tracking(test_code)
    print("Tool tracking result:")
    print(f"  Type: {result['type']}")
    print(f"  Specific tools: {result['specific_tools']}")
    print(f"  Functions called: {result['functions_called']}")
    print(f"  Imports: {result['imports']}")