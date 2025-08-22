"""
Register Biomni tools directly with the A1 agent
This ensures molecular biology and literature tools are available
"""

def register_all_biomni_tools(agent):
    """
    Register all biomni tools with the agent
    """
    try:
        # Import the persistent namespace
        from biomni.tool.support_tools import _persistent_namespace
        
        # Register molecular biology tools
        exec("""
# Import all molecular biology tools
from biomni.tool.molecular_biology import (
    design_knockout_sgrna,
    design_golden_gate_oligos,
    golden_gate_assembly,
    find_restriction_enzymes,
    find_restriction_sites,
    annotate_plasmid,
    get_gene_coding_sequence,
    simulate_pcr,
    digest_sequence
)

# Import literature tools
try:
    from biomni.tool.literature import (
        query_pubmed,
        search_google,
        extract_url_content
    )
    print("Literature tools imported successfully")
except ImportError as e:
    print(f"Warning: Could not import literature tools: {e}")

# Import database tools
try:
    from biomni.tool.database import (
        query_gene_database,
        search_protein_database
    )
    print("Database tools imported successfully")
except ImportError as e:
    print(f"Warning: Could not import database tools: {e}")

print("Molecular biology tools registered in agent namespace")
""", _persistent_namespace)
        
        # Also make tools available in the agent's tool registry
        if hasattr(agent, 'tools'):
            # Direct tool registration
            try:
                from biomni.tool import molecular_biology, literature
                
                # Register molecular biology tools
                mb_tools = [
                    'design_knockout_sgrna',
                    'design_golden_gate_oligos', 
                    'golden_gate_assembly',
                    'find_restriction_enzymes',
                    'find_restriction_sites',
                    'annotate_plasmid'
                ]
                
                for tool_name in mb_tools:
                    if hasattr(molecular_biology, tool_name):
                        tool_func = getattr(molecular_biology, tool_name)
                        agent.tools[f"molecular_biology.{tool_name}"] = tool_func
                        agent.tools[tool_name] = tool_func  # Also register without prefix
                
                # Register literature tools
                lit_tools = ['query_pubmed', 'search_google']
                for tool_name in lit_tools:
                    if hasattr(literature, tool_name):
                        tool_func = getattr(literature, tool_name)
                        agent.tools[f"literature.{tool_name}"] = tool_func
                        agent.tools[tool_name] = tool_func  # Also register without prefix
                        
                print(f"[TOOLS] Registered {len(mb_tools) + len(lit_tools)} tools in agent.tools")
                print(f"[TOOLS] Available tools: {list(agent.tools.keys())[:5]}...")  # Show first 5 tools
            except ImportError as e:
                print(f"[TOOLS] Could not import tools for registration: {e}")
        
        return True
        
    except Exception as e:
        print(f"[TOOLS] Error registering tools: {e}")
        return False


def ensure_solution_generation(agent):
    """
    Modify agent prompt to ensure it generates solution tags
    """
    try:
        # Method 1: Try to modify system prompt
        if hasattr(agent, 'system_prompt'):
            additional_prompt = """

CRITICAL REQUIREMENT: After completing all technical analysis and calculations, you MUST synthesize your findings into a comprehensive final answer. This should be wrapped in <solution> tags and include:
1. A complete step-by-step experimental protocol
2. All materials and reagents needed
3. Detailed procedures with temperatures, times, and concentrations
4. Expected outcomes and validation steps
5. Troubleshooting tips if applicable

Format your final answer as:
<solution>
[Your complete, detailed protocol based on your analysis]
</solution>

This final protocol is essential for the user to actually perform the experiment.
"""
            agent.system_prompt += additional_prompt
            print("[PROMPT] Added solution generation reminder to agent.system_prompt")
        
        # Method 2: Enhance the query wrapper to remind about solution
        original_go = None
        original_go_stream = None
        
        if hasattr(agent, 'go'):
            original_go = agent.go
            
            def go_with_solution_reminder(query, *args, **kwargs):
                # Add a stronger reminder about providing the final protocol
                enhanced_query = query + """

CRITICAL: After completing all calculations and analysis, you MUST provide a comprehensive step-by-step experimental protocol. This is essential for the experiment to be performed. The protocol should be wrapped in <solution> tags and include:
1. Complete list of materials and reagents
2. Detailed step-by-step procedures with exact conditions
3. Expected results and validation steps

End your response with:
<solution>
[Your complete experimental protocol here based on your analysis]
</solution>"""
                return original_go(enhanced_query, *args, **kwargs)
            
            agent.go = go_with_solution_reminder
            print("[PROMPT] Wrapped agent.go to remind about solution generation")
        
        if hasattr(agent, 'go_stream'):
            original_go_stream = agent.go_stream
            
            def go_stream_with_solution_reminder(query, *args, **kwargs):
                # Add a stronger reminder about providing the final protocol
                enhanced_query = query + """

CRITICAL: After completing all calculations and analysis, you MUST provide a comprehensive step-by-step experimental protocol. This is essential for the experiment to be performed. The protocol should be wrapped in <solution> tags and include:
1. Complete list of materials and reagents
2. Detailed step-by-step procedures with exact conditions
3. Expected results and validation steps

End your response with:
<solution>
[Your complete experimental protocol here based on your analysis]
</solution>"""
                return original_go_stream(enhanced_query, *args, **kwargs)
            
            agent.go_stream = go_stream_with_solution_reminder
            print("[PROMPT] Wrapped agent.go_stream to remind about solution generation")
        
        # Method 3: Try to add to agent's configuration
        if hasattr(agent, 'config'):
            agent.config['require_solution'] = True
            agent.config['solution_format'] = 'xml_tags'
            print("[PROMPT] Updated agent config to require solution")
        
        return True
    except Exception as e:
        print(f"[PROMPT] Error in ensure_solution_generation: {e}")
        import traceback
        traceback.print_exc()
        return False