"""
DSPy-Enhanced Chain of Thought Agent for Biomni
Uses DSPy's structured reasoning for better CoT extraction
"""

import os
import dspy
from typing import Dict, Any, List, Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Azure OpenAI with DSPy
class AzureGPT4DSPy:
    def __init__(self):
        # Get Azure OpenAI configuration from environment
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("ENDPOINT_URL")
        deployment = os.getenv("DEPLOYMENT_NAME", "gpt-4.1")
        
        # Configure DSPy with Azure OpenAI
        self.lm = dspy.AzureOpenAI(
            deployment_id=deployment,
            api_key=api_key,
            api_base=endpoint,
            api_version="2024-02-15-preview",
            model_type="chat",
            max_tokens=2000,
            temperature=0.7
        )
        
        # Configure DSPy settings
        dspy.settings.configure(lm=self.lm, trace=[])
        
    def get_lm(self):
        return self.lm


class BiomedicalQA(dspy.Signature):
    """Answer biomedical questions with detailed scientific explanations."""
    
    question = dspy.InputField(desc="a biomedical or scientific question")
    answer = dspy.OutputField(desc="comprehensive scientific answer with details")


class BiomedicalAnalysis(dspy.Signature):
    """Analyze biomedical data or concepts with step-by-step reasoning."""
    
    query = dspy.InputField(desc="biomedical query or data to analyze")
    context = dspy.InputField(desc="relevant context or background information", default="")
    analysis = dspy.OutputField(desc="detailed analysis with scientific reasoning")
    conclusion = dspy.OutputField(desc="concise conclusion or key findings")


class DSPyBiomniAgent(dspy.Module):
    """Enhanced Biomni agent using DSPy for structured Chain of Thought"""
    
    def __init__(self):
        super().__init__()
        
        # Initialize Azure GPT-4 with DSPy
        azure_config = AzureGPT4DSPy()
        self.lm = azure_config.get_lm()
        
        # Create DSPy modules with Chain of Thought
        self.basic_qa = dspy.ChainOfThought(BiomedicalQA)
        self.detailed_analysis = dspy.ChainOfThought(BiomedicalAnalysis)
        
        # For complex multi-step reasoning
        self.react = dspy.ReAct(BiomedicalQA, max_iters=3)
        
    def forward(self, query: str, use_detailed: bool = False) -> Dict[str, Any]:
        """
        Process a biomedical query with structured Chain of Thought
        
        Args:
            query: The biomedical question or analysis request
            use_detailed: Whether to use detailed analysis mode
            
        Returns:
            Dictionary with reasoning, answer, and metadata
        """
        
        if use_detailed or self._needs_detailed_analysis(query):
            # Use detailed analysis for complex queries
            result = self.detailed_analysis(query=query)
            
            return {
                "type": "detailed_analysis",
                "query": query,
                "reasoning": result.rationale if hasattr(result, 'rationale') else result.reasoning,
                "analysis": result.analysis,
                "conclusion": result.conclusion,
                "full_trace": dspy.inspect_history(n=1)
            }
        else:
            # Use basic Q&A for straightforward questions
            result = self.basic_qa(question=query)
            
            return {
                "type": "basic_qa",
                "query": query,
                "reasoning": result.rationale if hasattr(result, 'rationale') else result.reasoning,
                "answer": result.answer,
                "full_trace": dspy.inspect_history(n=1)
            }
    
    def _needs_detailed_analysis(self, query: str) -> bool:
        """Determine if query needs detailed analysis"""
        complex_indicators = [
            "analyze", "explain", "compare", "evaluate", 
            "mechanism", "pathway", "interaction", "process",
            "how does", "why does", "what causes"
        ]
        return any(indicator in query.lower() for indicator in complex_indicators)
    
    def extract_chain_of_thought(self, result: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Extract structured Chain of Thought from DSPy result
        
        Returns:
            List of CoT sections with titles and content
        """
        cot_sections = []
        
        # Extract reasoning/rationale
        if 'reasoning' in result and result['reasoning']:
            # Parse reasoning into structured sections
            reasoning = result['reasoning']
            
            # Split by common reasoning patterns
            if "First," in reasoning or "Step 1" in reasoning:
                # Multi-step reasoning
                steps = self._extract_steps(reasoning)
                for i, step in enumerate(steps, 1):
                    cot_sections.append({
                        "title": f"Step {i}",
                        "content": step,
                        "type": "step"
                    })
            else:
                # Single reasoning block
                cot_sections.append({
                    "title": "🧠 Reasoning Process",
                    "content": reasoning,
                    "type": "reasoning"
                })
        
        # Extract analysis (for detailed mode)
        if 'analysis' in result and result['analysis']:
            cot_sections.append({
                "title": "📊 Detailed Analysis",
                "content": result['analysis'],
                "type": "analysis"
            })
        
        # Extract conclusion
        if 'conclusion' in result and result['conclusion']:
            cot_sections.append({
                "title": "📌 Key Findings",
                "content": result['conclusion'],
                "type": "conclusion"
            })
        
        # Extract trace information if available
        if 'full_trace' in result and result['full_trace']:
            trace_content = self._format_trace(result['full_trace'])
            if trace_content:
                cot_sections.append({
                    "title": "🔍 Reasoning Trace",
                    "content": trace_content,
                    "type": "trace"
                })
        
        return cot_sections
    
    def _extract_steps(self, reasoning: str) -> List[str]:
        """Extract individual steps from multi-step reasoning"""
        import re
        
        # Try different step patterns
        patterns = [
            r'(?:Step \d+[:\.]|First,|Second,|Third,|Next,|Then,|Finally,)(.+?)(?=Step \d+[:\.]|First,|Second,|Third,|Next,|Then,|Finally,|$)',
            r'(?:\d+\.|•|\*)\s*(.+?)(?=\d+\.|•|\*|$)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, reasoning, re.DOTALL | re.IGNORECASE)
            if matches:
                return [match.strip() for match in matches if match.strip()]
        
        # Fallback: split by newlines
        return [line.strip() for line in reasoning.split('\n') if line.strip()]
    
    def _format_trace(self, trace) -> str:
        """Format DSPy trace for display"""
        if not trace:
            return ""
        
        # Extract relevant trace information
        formatted = []
        if isinstance(trace, list):
            for item in trace:
                if hasattr(item, '__dict__'):
                    formatted.append(str(item))
        else:
            formatted.append(str(trace))
        
        return "\n".join(formatted) if formatted else ""
    
    def stream_reasoning(self, query: str):
        """
        Stream Chain of Thought reasoning as it's generated
        
        Yields:
            Dictionaries with event type and content for streaming
        """
        # Start processing
        yield {
            "event_type": "start",
            "content": f"Processing query: {query}"
        }
        
        # Determine query type
        is_detailed = self._needs_detailed_analysis(query)
        yield {
            "event_type": "planning",
            "content": f"Query type: {'Detailed Analysis' if is_detailed else 'Basic Q&A'}"
        }
        
        # Process with DSPy
        result = self.forward(query, use_detailed=is_detailed)
        
        # Stream Chain of Thought sections
        cot_sections = self.extract_chain_of_thought(result)
        for section in cot_sections:
            yield {
                "event_type": "reasoning",
                "title": section["title"],
                "content": section["content"],
                "section_type": section["type"]
            }
        
        # Stream final answer
        answer = result.get('answer') or result.get('conclusion', '')
        yield {
            "event_type": "final_answer",
            "content": answer
        }
        
        # Complete
        yield {
            "event_type": "complete",
            "content": "Analysis complete"
        }


# Convenience function for testing
def test_dspy_agent():
    """Test the DSPy-enhanced agent"""
    agent = DSPyBiomniAgent()
    
    test_queries = [
        "What is DNA?",
        "Explain the mechanism of CRISPR-Cas9",
        "How do mRNA vaccines work?"
    ]
    
    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print('='*60)
        
        # Stream reasoning
        for event in agent.stream_reasoning(query):
            if event["event_type"] == "reasoning":
                print(f"\n{event['title']}:")
                print(event['content'][:200] + "..." if len(event['content']) > 200 else event['content'])
            elif event["event_type"] == "final_answer":
                print(f"\nFinal Answer:")
                print(event['content'][:300] + "..." if len(event['content']) > 300 else event['content'])


if __name__ == "__main__":
    test_dspy_agent()