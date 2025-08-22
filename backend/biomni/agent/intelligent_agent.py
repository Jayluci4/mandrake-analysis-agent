"""
Intelligent Biomni Agent with ReAct, Meta-Cognition, and Self-Reflection
A truly intelligent system where todos, reasoning, and output work synergistically
"""

import os
import json
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import dspy
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# Core Data Structures
# ============================================================================

class TodoStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ADAPTED = "adapted"  # New: todo was modified based on reasoning

@dataclass
class DynamicTodo:
    """Enhanced todo that can adapt based on observations"""
    id: str
    content: str
    status: TodoStatus
    dependencies: List[str] = field(default_factory=list)
    confidence: float = 1.0
    reasoning: str = ""
    subtasks: List['DynamicTodo'] = field(default_factory=list)
    error_count: int = 0
    adaptations: List[str] = field(default_factory=list)
    
    def can_start(self, completed_ids: List[str]) -> bool:
        """Check if all dependencies are met"""
        return all(dep in completed_ids for dep in self.dependencies)
    
    def adapt(self, observation: str, new_content: str = None):
        """Adapt todo based on observation"""
        self.adaptations.append(f"Adapted due to: {observation}")
        if new_content:
            self.content = new_content
        self.status = TodoStatus.ADAPTED

@dataclass
class Thought:
    """Represents a reasoning step"""
    content: str
    confidence: float
    timestamp: datetime
    meta_cognition: Optional[str] = None  # Reasoning about the reasoning
    corrections: List[str] = field(default_factory=list)

@dataclass
class Observation:
    """Result of an action"""
    content: Any
    success: bool
    error: Optional[str] = None
    suggestions: List[str] = field(default_factory=list)
    new_todos: List[DynamicTodo] = field(default_factory=list)

@dataclass
class Reflection:
    """Self-assessment of output quality"""
    quality_score: float
    completeness_score: float
    accuracy_confidence: float
    improvements: List[str]
    should_retry: bool

# ============================================================================
# State Management
# ============================================================================

@dataclass
class IntelligentAgentState:
    """Complete state of the intelligent agent"""
    query: str
    todos: List[DynamicTodo] = field(default_factory=list)
    completed_todos: List[str] = field(default_factory=list)
    thoughts: List[Thought] = field(default_factory=list)
    observations: List[Observation] = field(default_factory=list)
    reflections: List[Reflection] = field(default_factory=list)
    current_confidence: float = 1.0
    iteration_count: int = 0
    max_iterations: int = 10
    final_answer: Optional[str] = None
    knowledge_graph: Dict[str, Any] = field(default_factory=dict)
    performance_history: List[float] = field(default_factory=list)

# ============================================================================
# Meta-Cognitive Components
# ============================================================================

class MetaCognitiveLayer:
    """Thinks about thinking - monitors and improves reasoning quality"""
    
    def assess_thought_quality(self, thought: Thought) -> Tuple[float, List[str]]:
        """Evaluate the quality of a reasoning step"""
        issues = []
        quality = thought.confidence
        
        # Check for logical inconsistencies
        if "however" in thought.content and "therefore" in thought.content:
            issues.append("Potential logical inconsistency detected")
            quality *= 0.8
            
        # Check for uncertainty markers
        uncertainty_markers = ["might", "possibly", "maybe", "could be", "not sure"]
        uncertainty_count = sum(1 for marker in uncertainty_markers if marker in thought.content.lower())
        if uncertainty_count > 2:
            issues.append("High uncertainty in reasoning")
            quality *= 0.7
            
        # Check for completeness
        if len(thought.content) < 50:
            issues.append("Reasoning may be too brief")
            quality *= 0.9
            
        return quality, issues
    
    def suggest_alternative_strategy(self, failed_approach: str) -> str:
        """Suggest a different reasoning strategy"""
        strategies = {
            "direct": "Try breaking down the problem into smaller steps",
            "analytical": "Consider a more holistic, synthesis-based approach",
            "deductive": "Try inductive reasoning from specific examples",
            "sequential": "Consider parallel processing of independent subtasks"
        }
        
        # Simple strategy selection (can be made more sophisticated)
        for key, suggestion in strategies.items():
            if key not in failed_approach.lower():
                return suggestion
        return "Try a completely different perspective on the problem"

# ============================================================================
# Self-Reflection Module
# ============================================================================

class SelfReflectionModule:
    """Enables the agent to critique and improve its own outputs"""
    
    def reflect_on_output(self, output: str, reasoning_trace: List[Thought]) -> Reflection:
        """Critically evaluate the generated output"""
        quality_score = self._assess_quality(output)
        completeness = self._check_completeness(output, reasoning_trace)
        accuracy_conf = self._estimate_accuracy(output, reasoning_trace)
        improvements = self._suggest_improvements(output, reasoning_trace)
        
        should_retry = quality_score < 0.7 or completeness < 0.8
        
        return Reflection(
            quality_score=quality_score,
            completeness_score=completeness,
            accuracy_confidence=accuracy_conf,
            improvements=improvements,
            should_retry=should_retry
        )
    
    def _assess_quality(self, output: str) -> float:
        """Assess output quality based on multiple factors"""
        score = 1.0
        
        # Check length (not too short, not too long)
        word_count = len(output.split())
        if word_count < 20:
            score *= 0.7
        elif word_count > 500:
            score *= 0.9
            
        # Check for structure (paragraphs, sentences)
        if "\n" not in output and word_count > 100:
            score *= 0.85  # Lacks structure
            
        # Check for biomedical terminology accuracy
        bio_terms = ["DNA", "RNA", "protein", "cell", "gene", "molecule"]
        has_bio_context = any(term in output for term in bio_terms)
        if not has_bio_context and "biomed" in output.lower():
            score *= 0.8  # Claims biomedical but lacks terminology
            
        return min(score, 1.0)
    
    def _check_completeness(self, output: str, trace: List[Thought]) -> float:
        """Check if output addresses all aspects of reasoning"""
        # Extract key concepts from reasoning trace
        key_concepts = set()
        for thought in trace:
            # Simple extraction (can be enhanced with NLP)
            words = thought.content.lower().split()
            key_concepts.update(w for w in words if len(w) > 5)
        
        # Check how many concepts are addressed in output
        output_lower = output.lower()
        addressed = sum(1 for concept in key_concepts if concept in output_lower)
        
        return min(addressed / max(len(key_concepts), 1), 1.0)
    
    def _estimate_accuracy(self, output: str, trace: List[Thought]) -> float:
        """Estimate accuracy confidence based on reasoning consistency"""
        # Average confidence from all thoughts
        if not trace:
            return 0.5
        
        avg_confidence = sum(t.confidence for t in trace) / len(trace)
        
        # Check for corrections (indicates uncertainty)
        correction_penalty = sum(len(t.corrections) for t in trace) * 0.05
        
        return max(avg_confidence - correction_penalty, 0.1)
    
    def _suggest_improvements(self, output: str, trace: List[Thought]) -> List[str]:
        """Suggest specific improvements"""
        improvements = []
        
        if len(output.split()) < 50:
            improvements.append("Expand the explanation with more detail")
        
        if "\n" not in output:
            improvements.append("Structure the response with clear paragraphs")
        
        # Check if examples are provided
        if "example" not in output.lower() and "for instance" not in output.lower():
            improvements.append("Add concrete examples to illustrate concepts")
        
        # Check for citations or sources
        if "study" not in output.lower() and "research" not in output.lower():
            improvements.append("Reference relevant studies or research")
        
        return improvements

# ============================================================================
# Dynamic Planning Module
# ============================================================================

class DynamicPlanningModule:
    """Creates and adapts execution plans based on observations"""
    
    def create_initial_plan(self, query: str) -> List[DynamicTodo]:
        """Generate initial todo list based on query analysis"""
        todos = []
        
        # Analyze query complexity
        is_complex = any(word in query.lower() for word in ["analyze", "compare", "explain", "mechanism"])
        
        # Base todos that always apply
        todos.append(DynamicTodo(
            id="understand",
            content="Understand the query and identify key concepts",
            status=TodoStatus.PENDING,
            confidence=1.0
        ))
        
        if is_complex:
            todos.append(DynamicTodo(
                id="decompose",
                content="Break down into sub-questions",
                status=TodoStatus.PENDING,
                dependencies=["understand"],
                confidence=0.9
            ))
            
        todos.append(DynamicTodo(
            id="research",
            content="Gather relevant biomedical information",
            status=TodoStatus.PENDING,
            dependencies=["understand"],
            confidence=0.95
        ))
        
        if "compare" in query.lower():
            todos.append(DynamicTodo(
                id="comparison",
                content="Create comparison framework",
                status=TodoStatus.PENDING,
                dependencies=["research"],
                confidence=0.9
            ))
            
        todos.append(DynamicTodo(
            id="synthesize",
            content="Synthesize findings into coherent answer",
            status=TodoStatus.PENDING,
            dependencies=["research"],
            confidence=0.95
        ))
        
        todos.append(DynamicTodo(
            id="validate",
            content="Validate answer accuracy and completeness",
            status=TodoStatus.PENDING,
            dependencies=["synthesize"],
            confidence=0.9
        ))
        
        return todos
    
    def adapt_plan(self, todos: List[DynamicTodo], observation: Observation) -> List[DynamicTodo]:
        """Dynamically adjust plan based on new observations"""
        adapted_todos = todos.copy()
        
        # Add new todos suggested by observation
        if observation.new_todos:
            for new_todo in observation.new_todos:
                # Check if similar todo already exists
                exists = any(t.content.lower() in new_todo.content.lower() for t in adapted_todos)
                if not exists:
                    adapted_todos.append(new_todo)
        
        # Mark failed todos and create recovery tasks
        if not observation.success and observation.error:
            # Find the current todo that failed
            current_todo = next((t for t in adapted_todos if t.status == TodoStatus.IN_PROGRESS), None)
            if current_todo:
                current_todo.status = TodoStatus.FAILED
                current_todo.error_count += 1
                
                # Create recovery todo
                recovery_todo = DynamicTodo(
                    id=f"recover_{current_todo.id}",
                    content=f"Recover from error: {observation.error}",
                    status=TodoStatus.PENDING,
                    reasoning=f"Recovery needed due to: {observation.error}"
                )
                
                # Insert recovery todo
                idx = adapted_todos.index(current_todo)
                adapted_todos.insert(idx + 1, recovery_todo)
        
        # Simplify remaining todos if observation suggests simpler approach
        if observation.suggestions:
            for suggestion in observation.suggestions:
                if "simplify" in suggestion.lower():
                    # Mark complex todos as skippable
                    for todo in adapted_todos:
                        if todo.status == TodoStatus.PENDING and todo.confidence < 0.8:
                            todo.status = TodoStatus.SKIPPED
                            todo.reasoning = "Skipped due to simpler approach available"
        
        return adapted_todos

# ============================================================================
# Main Intelligent Agent
# ============================================================================

class IntelligentBiomniAgent:
    """
    The main intelligent agent that orchestrates all components
    Implements ReAct pattern with meta-cognition and self-reflection
    """
    
    def __init__(self):
        self.meta_cognitive = MetaCognitiveLayer()
        self.reflector = SelfReflectionModule()
        self.planner = DynamicPlanningModule()
        self.state = None
        
        # Initialize knowledge graph (simplified version)
        self.knowledge_graph = {
            "entities": {},
            "relationships": {},
            "confidence_scores": {}
        }
        
        # Performance tracking
        self.performance_history = []
    
    async def process_query(self, query: str) -> Dict[str, Any]:
        """
        Main entry point - process a biomedical query intelligently
        Returns structured response with reasoning trace
        """
        # Initialize state
        self.state = IntelligentAgentState(
            query=query,
            todos=self.planner.create_initial_plan(query)
        )
        
        # Main ReAct loop
        while self.state.iteration_count < self.state.max_iterations:
            self.state.iteration_count += 1
            
            # 1. THINK: Generate thought about current state
            thought = await self._think()
            self.state.thoughts.append(thought)
            
            # 2. META-COGNITION: Evaluate the thought
            quality, issues = self.meta_cognitive.assess_thought_quality(thought)
            if quality < 0.6 and issues:
                # Poor quality thought - try different approach
                thought.meta_cognition = f"Quality issues detected: {', '.join(issues)}"
                alternative = self.meta_cognitive.suggest_alternative_strategy(thought.content)
                thought.corrections.append(alternative)
                continue
            
            # 3. ACT: Execute next todo based on thought
            observation = await self._act()
            self.state.observations.append(observation)
            
            # 4. OBSERVE & ADAPT: Process observation and adapt plan
            if observation.new_todos or not observation.success:
                self.state.todos = self.planner.adapt_plan(self.state.todos, observation)
            
            # 5. CHECK COMPLETION: Determine if we should continue
            if self._should_complete():
                break
        
        # 6. SYNTHESIZE: Generate final answer
        final_answer = await self._synthesize_answer()
        self.state.final_answer = final_answer
        
        # 7. REFLECT: Self-critique the answer
        reflection = self.reflector.reflect_on_output(
            final_answer,
            self.state.thoughts
        )
        self.state.reflections.append(reflection)
        
        # 8. SELF-CORRECT: Improve if needed
        if reflection.should_retry and self.state.iteration_count < self.state.max_iterations:
            improved_answer = await self._self_correct(final_answer, reflection)
            self.state.final_answer = improved_answer
        
        # 9. UPDATE KNOWLEDGE: Store learnings
        self._update_knowledge_graph()
        
        # 10. TRACK PERFORMANCE
        self.performance_history.append(reflection.quality_score)
        
        return self._prepare_response()
    
    async def _think(self) -> Thought:
        """Generate a thought about current state"""
        # Analyze current todos
        pending_todos = [t for t in self.state.todos if t.status == TodoStatus.PENDING]
        in_progress = [t for t in self.state.todos if t.status == TodoStatus.IN_PROGRESS]
        
        # Generate contextual reasoning
        context = f"Query: {self.state.query}\n"
        context += f"Pending tasks: {len(pending_todos)}\n"
        context += f"Completed: {len(self.state.completed_todos)}\n"
        
        if self.state.observations:
            last_obs = self.state.observations[-1]
            context += f"Last observation: {last_obs.content[:100]}...\n"
        
        # Generate thought (simplified - would use LLM in production)
        thought_content = f"Analyzing the query about {self.state.query}. "
        
        if not pending_todos:
            thought_content += "All planned tasks are complete. Ready to synthesize answer."
            confidence = 0.9
        elif not in_progress:
            next_todo = pending_todos[0]
            thought_content += f"Next step is to {next_todo.content}."
            confidence = next_todo.confidence
        else:
            thought_content += f"Currently working on: {in_progress[0].content}"
            confidence = 0.8
        
        return Thought(
            content=thought_content,
            confidence=confidence,
            timestamp=datetime.now()
        )
    
    async def _act(self) -> Observation:
        """Execute the next action based on current state"""
        # Find next actionable todo
        pending_todos = [t for t in self.state.todos if t.status == TodoStatus.PENDING]
        actionable = [t for t in pending_todos if t.can_start(self.state.completed_todos)]
        
        if not actionable:
            return Observation(
                content="No actionable todos available",
                success=False,
                error="Dependency deadlock or all todos complete"
            )
        
        # Execute the todo (simplified - would call actual tools in production)
        todo = actionable[0]
        todo.status = TodoStatus.IN_PROGRESS
        
        # Simulate execution based on todo type
        if "research" in todo.content.lower():
            result = "Found relevant biomedical information from knowledge base"
            success = True
            
            # Suggest new todos based on research
            new_todos = []
            if "protein" in self.state.query.lower():
                new_todos.append(DynamicTodo(
                    id="protein_structure",
                    content="Analyze protein structure implications",
                    status=TodoStatus.PENDING,
                    confidence=0.85
                ))
        else:
            result = f"Completed: {todo.content}"
            success = True
            new_todos = []
        
        # Mark as complete
        todo.status = TodoStatus.COMPLETED
        self.state.completed_todos.append(todo.id)
        
        return Observation(
            content=result,
            success=success,
            new_todos=new_todos
        )
    
    def _should_complete(self) -> bool:
        """Determine if we should stop iterating"""
        # Check if all todos are done
        all_done = all(
            t.status in [TodoStatus.COMPLETED, TodoStatus.SKIPPED, TodoStatus.FAILED]
            for t in self.state.todos
        )
        
        # Check if we have enough confidence
        if self.state.thoughts:
            avg_confidence = sum(t.confidence for t in self.state.thoughts) / len(self.state.thoughts)
            high_confidence = avg_confidence > 0.85
        else:
            high_confidence = False
        
        return all_done or high_confidence
    
    async def _synthesize_answer(self) -> str:
        """Synthesize final answer from observations and thoughts"""
        # Combine all observations
        observations_text = "\n".join(obs.content for obs in self.state.observations if obs.success)
        
        # Generate answer (simplified - would use LLM in production)
        answer = f"Based on the analysis of '{self.state.query}':\n\n"
        answer += observations_text
        answer += "\n\nThis conclusion is drawn from systematic analysis of the biomedical concepts involved."
        
        return answer
    
    async def _self_correct(self, answer: str, reflection: Reflection) -> str:
        """Improve answer based on reflection"""
        improved = answer
        
        for improvement in reflection.improvements:
            if "expand" in improvement.lower():
                improved += "\n\nAdditional details: [Expanded explanation would go here]"
            elif "example" in improvement.lower():
                improved += "\n\nFor example: [Specific example would go here]"
            elif "structure" in improvement.lower():
                # Add structure
                lines = improved.split(". ")
                improved = ".\n\n".join(lines)
        
        return improved
    
    def _update_knowledge_graph(self):
        """Update knowledge graph with learnings from this query"""
        # Extract entities from query and observations
        # Simplified - would use NER in production
        entities = set()
        for obs in self.state.observations:
            words = obs.content.split()
            entities.update(w for w in words if w[0].isupper() and len(w) > 3)
        
        # Store in knowledge graph
        for entity in entities:
            if entity not in self.knowledge_graph["entities"]:
                self.knowledge_graph["entities"][entity] = {
                    "first_seen": datetime.now().isoformat(),
                    "occurrences": 1
                }
            else:
                self.knowledge_graph["entities"][entity]["occurrences"] += 1
    
    def _prepare_response(self) -> Dict[str, Any]:
        """Prepare structured response for frontend"""
        return {
            "query": self.state.query,
            "answer": self.state.final_answer,
            "todos": [
                {
                    "id": t.id,
                    "content": t.content,
                    "status": t.status.value,
                    "confidence": t.confidence,
                    "adaptations": t.adaptations
                }
                for t in self.state.todos
            ],
            "reasoning": [
                {
                    "content": t.content,
                    "confidence": t.confidence,
                    "meta_cognition": t.meta_cognition,
                    "corrections": t.corrections
                }
                for t in self.state.thoughts
            ],
            "reflection": {
                "quality_score": self.state.reflections[-1].quality_score if self.state.reflections else 1.0,
                "improvements": self.state.reflections[-1].improvements if self.state.reflections else []
            },
            "performance": {
                "iterations": self.state.iteration_count,
                "confidence": self.state.current_confidence,
                "knowledge_entities": len(self.knowledge_graph["entities"])
            }
        }

# ============================================================================
# Streaming Interface
# ============================================================================

async def stream_intelligent_response(query: str):
    """
    Stream the intelligent agent's response with real-time updates
    Yields events for frontend consumption
    """
    agent = IntelligentBiomniAgent()
    
    # Start processing
    yield {
        "type": "start",
        "content": f"Initiating intelligent analysis for: {query}"
    }
    
    # Process query (would be more granular in production)
    response = await agent.process_query(query)
    
    # Stream todos
    for todo in response["todos"]:
        yield {
            "type": "todo",
            "content": todo
        }
        await asyncio.sleep(0.1)
    
    # Stream reasoning
    for thought in response["reasoning"]:
        yield {
            "type": "reasoning",
            "content": thought
        }
        await asyncio.sleep(0.2)
    
    # Stream reflection
    yield {
        "type": "reflection",
        "content": response["reflection"]
    }
    
    # Final answer
    yield {
        "type": "final_answer",
        "content": response["answer"]
    }
    
    # Performance metrics
    yield {
        "type": "performance",
        "content": response["performance"]
    }

# ============================================================================
# Testing
# ============================================================================

if __name__ == "__main__":
    # Test the intelligent agent
    async def test():
        agent = IntelligentBiomniAgent()
        
        test_queries = [
            "What is the mechanism of CRISPR-Cas9?",
            "Compare DNA and RNA",
            "Explain protein folding"
        ]
        
        for query in test_queries:
            print(f"\n{'='*60}")
            print(f"Query: {query}")
            print('='*60)
            
            response = await agent.process_query(query)
            
            print("\nTodos:")
            for todo in response["todos"]:
                print(f"  [{todo['status']}] {todo['content']}")
            
            print("\nReasoning Quality:")
            print(f"  Quality Score: {response['reflection']['quality_score']:.2f}")
            
            print("\nFinal Answer:")
            print(f"  {response['answer'][:200]}...")
            
            print("\nPerformance:")
            print(f"  Iterations: {response['performance']['iterations']}")
            print(f"  Knowledge Entities: {response['performance']['knowledge_entities']}")
    
    asyncio.run(test())