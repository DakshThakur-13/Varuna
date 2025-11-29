"""
Varuna AI Agent - LangGraph Workflow
Stateful agent using LangGraph for emergency response orchestration
"""

from typing import Annotated, Literal, TypedDict, List, Optional
from datetime import datetime
import operator
import uuid

from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate

from config import get_settings


# ============================================
# Pydantic Models for Agent State
# ============================================

class IncidentData(BaseModel):
    """Detected incident data"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    incident_type: str
    severity: Literal["critical", "high", "medium", "low"]
    location: str
    distance_km: float
    estimated_casualties: int
    injury_types: List[str]
    eta_minutes: int
    confidence: float = Field(ge=0, le=1)
    detected_at: datetime = Field(default_factory=datetime.now)
    source: str = "scanner"


class ResourceStatus(BaseModel):
    """Hospital resource status"""
    resource_type: str
    current_level: float
    max_capacity: float
    status: Literal["adequate", "low", "critical"]
    hours_remaining: Optional[float] = None


class ResourceRequest(BaseModel):
    """Request for resources from vendors"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    resource_type: str
    quantity: int
    urgency: Literal["critical", "high", "medium", "low"]
    vendor_name: str
    eta_minutes: int
    status: str = "pending"


class HospitalAlert(BaseModel):
    """Alert to nearby hospital"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hospital_name: str
    alert_type: Literal["awareness", "standby", "divert", "accept_overflow"]
    message: str
    patients_to_route: int = 0


class AgentDecision(BaseModel):
    """Decision made by the agent"""
    action: str
    reasoning: str
    priority: Literal["critical", "high", "medium", "low"]
    timestamp: datetime = Field(default_factory=datetime.now)


# ============================================
# LangGraph State Definition
# ============================================

class VarunaState(TypedDict):
    """Complete state for the Varuna agent workflow"""
    # Input
    query: str
    scan_requested: bool
    
    # Conversation
    messages: Annotated[List[BaseMessage], operator.add]
    
    # Detected data
    incidents: List[IncidentData]
    resources: List[ResourceStatus]
    
    # Actions taken
    resource_requests: List[ResourceRequest]
    hospital_alerts: List[HospitalAlert]
    decisions: List[AgentDecision]
    
    # Workflow control
    current_node: str
    should_orchestrate: bool
    should_alert: bool
    capacity_score: float
    
    # Output
    response: str
    status: Literal["idle", "scanning", "analyzing", "orchestrating", "complete", "error"]


# ============================================
# LangGraph Nodes (Agent Functions)
# ============================================

def get_llm():
    """Get LLM instance (Groq for fast inference)"""
    settings = get_settings()
    return ChatGroq(
        api_key=settings.groq_api_key,
        model_name="llama-3.3-70b-versatile",
        temperature=0.1
    )


def scanner_node(state: VarunaState) -> VarunaState:
    """
    SCANNER NODE: Detects and analyzes emergency incidents
    Uses AI to classify and assess severity
    """
    llm = get_llm()
    
    # System prompt for incident analysis
    system = """You are an Emergency Intelligence Scanner for a hospital system.
Your job is to analyze potential emergency incidents and determine:
1. Incident type (fire, accident, collapse, chemical, medical_emergency, natural_disaster)
2. Severity level (critical, high, medium, low)
3. Estimated casualties
4. Expected injury types
5. ETA for patient arrivals

Respond in JSON format only:
{
    "incidents": [
        {
            "title": "brief title",
            "description": "what happened",
            "incident_type": "type",
            "severity": "level",
            "location": "location name",
            "distance_km": number,
            "estimated_casualties": number,
            "injury_types": ["type1", "type2"],
            "eta_minutes": number,
            "confidence": 0.0-1.0
        }
    ],
    "analysis": "brief summary"
}"""
    
    messages = [
        SystemMessage(content=system),
        HumanMessage(content=f"Analyze this situation for potential emergencies: {state['query']}")
    ]
    
    try:
        response = llm.invoke(messages)
        content = response.content
        
        # Parse JSON from response
        import json
        # Extract JSON from markdown code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        data = json.loads(content.strip())
        
        incidents = []
        for inc in data.get("incidents", []):
            incidents.append(IncidentData(
                title=inc.get("title", "Unknown"),
                description=inc.get("description", ""),
                incident_type=inc.get("incident_type", "unknown"),
                severity=inc.get("severity", "medium"),
                location=inc.get("location", "Unknown"),
                distance_km=inc.get("distance_km", 10),
                estimated_casualties=inc.get("estimated_casualties", 0),
                injury_types=inc.get("injury_types", []),
                eta_minutes=inc.get("eta_minutes", 30),
                confidence=inc.get("confidence", 0.5)
            ))
        
        # Determine if orchestration is needed
        should_orchestrate = any(i.severity in ["critical", "high"] for i in incidents)
        
        return {
            **state,
            "incidents": incidents,
            "should_orchestrate": should_orchestrate,
            "status": "analyzing",
            "current_node": "scanner",
            "messages": state["messages"] + [AIMessage(content=f"Detected {len(incidents)} incidents")]
        }
        
    except Exception as e:
        return {
            **state,
            "incidents": [],
            "status": "error",
            "response": f"Scanner error: {str(e)}",
            "messages": state["messages"] + [AIMessage(content=f"Error: {str(e)}")]
        }


def analyzer_node(state: VarunaState) -> VarunaState:
    """
    ANALYZER NODE: Assesses hospital capacity and resources
    """
    # Mock resource data (in production, fetch from Supabase)
    resources = [
        ResourceStatus(resource_type="beds", current_level=30, max_capacity=100, status="adequate"),
        ResourceStatus(resource_type="icu_beds", current_level=5, max_capacity=20, status="low"),
        ResourceStatus(resource_type="oxygen", current_level=65, max_capacity=100, status="adequate", hours_remaining=15.6),
        ResourceStatus(resource_type="ventilators", current_level=8, max_capacity=15, status="adequate"),
        ResourceStatus(resource_type="blood_units", current_level=40, max_capacity=200, status="low"),
        ResourceStatus(resource_type="staff", current_level=45, max_capacity=80, status="adequate"),
    ]
    
    # Calculate capacity score
    total_capacity = sum(r.current_level / r.max_capacity for r in resources) / len(resources)
    
    # Check for critical resources
    critical_resources = [r for r in resources if r.status == "critical"]
    low_resources = [r for r in resources if r.status == "low"]
    
    # Adjust for incidents
    total_casualties = sum(i.estimated_casualties for i in state["incidents"])
    if total_casualties > 20:
        total_capacity *= 0.7
    elif total_casualties > 10:
        total_capacity *= 0.85
    
    should_alert = total_capacity < 0.5 or len(critical_resources) > 0
    
    return {
        **state,
        "resources": resources,
        "capacity_score": total_capacity,
        "should_alert": should_alert,
        "status": "orchestrating" if state["should_orchestrate"] else "complete",
        "current_node": "analyzer"
    }


def orchestrator_node(state: VarunaState) -> VarunaState:
    """
    ORCHESTRATOR NODE: Coordinates resources and generates response plan
    Uses AI to make strategic decisions
    """
    llm = get_llm()
    
    # Build context for AI
    incidents_text = "\n".join([
        f"- {i.title}: {i.severity} severity, {i.estimated_casualties} casualties, ETA {i.eta_minutes}min"
        for i in state["incidents"]
    ])
    
    resources_text = "\n".join([
        f"- {r.resource_type}: {r.current_level}/{r.max_capacity} ({r.status})"
        for r in state["resources"]
    ])
    
    system = """You are a Hospital Resource Orchestrator AI.
Coordinate emergency response by:
1. Prioritizing resource allocation
2. Deciding vendor orders
3. Coordinating with nearby hospitals
4. Providing actionable recommendations

Respond in JSON:
{
    "decisions": [
        {"action": "what to do", "reasoning": "why", "priority": "critical|high|medium|low"}
    ],
    "resource_requests": [
        {"resource_type": "type", "quantity": number, "urgency": "level", "vendor": "name"}
    ],
    "hospital_alerts": [
        {"hospital": "name", "alert_type": "standby|divert|accept_overflow", "patients": number}
    ],
    "summary": "executive summary of response plan"
}"""
    
    prompt = f"""INCIDENTS:
{incidents_text}

CURRENT RESOURCES:
{resources_text}

CAPACITY SCORE: {state['capacity_score']:.1%}

Generate an optimal response plan."""
    
    try:
        response = llm.invoke([
            SystemMessage(content=system),
            HumanMessage(content=prompt)
        ])
        
        import json
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        data = json.loads(content.strip())
        
        # Parse decisions
        decisions = [
            AgentDecision(
                action=d.get("action", ""),
                reasoning=d.get("reasoning", ""),
                priority=d.get("priority", "medium")
            )
            for d in data.get("decisions", [])
        ]
        
        # Parse resource requests
        resource_requests = [
            ResourceRequest(
                resource_type=r.get("resource_type", "supplies"),
                quantity=r.get("quantity", 10),
                urgency=r.get("urgency", "medium"),
                vendor_name=r.get("vendor", "Default Vendor"),
                eta_minutes=30
            )
            for r in data.get("resource_requests", [])
        ]
        
        # Parse hospital alerts
        hospital_alerts = [
            HospitalAlert(
                hospital_name=h.get("hospital", "Unknown"),
                alert_type=h.get("alert_type", "awareness"),
                message=f"Emergency alert: {state['incidents'][0].title if state['incidents'] else 'Incident'}",
                patients_to_route=h.get("patients", 0)
            )
            for h in data.get("hospital_alerts", [])
        ]
        
        summary = data.get("summary", "Response plan generated.")
        
        return {
            **state,
            "decisions": decisions,
            "resource_requests": resource_requests,
            "hospital_alerts": hospital_alerts,
            "response": summary,
            "status": "complete",
            "current_node": "orchestrator"
        }
        
    except Exception as e:
        return {
            **state,
            "response": f"Orchestration completed with limited AI analysis: {str(e)}",
            "status": "complete",
            "current_node": "orchestrator"
        }


def responder_node(state: VarunaState) -> VarunaState:
    """
    RESPONDER NODE: Generates final response for the user
    """
    llm = get_llm()
    
    # Build summary
    incidents_count = len(state["incidents"])
    decisions_count = len(state["decisions"])
    alerts_count = len(state["hospital_alerts"])
    requests_count = len(state["resource_requests"])
    
    if incidents_count == 0:
        response = "No emergency incidents detected. Systems normal."
    else:
        response = f"""Emergency Response Summary:
        
📊 **Detected Incidents**: {incidents_count}
{chr(10).join([f"  • {i.title} ({i.severity})" for i in state['incidents'][:3]])}

💪 **Capacity Score**: {state['capacity_score']:.0%}

🎯 **Actions Taken**: {decisions_count} decisions
{chr(10).join([f"  • {d.action}" for d in state['decisions'][:3]])}

🏥 **Hospital Alerts**: {alerts_count} sent
📦 **Resource Requests**: {requests_count} pending

Status: {"⚠️ ALERT" if state['should_alert'] else "✅ Manageable"}"""
    
    return {
        **state,
        "response": response,
        "status": "complete",
        "current_node": "responder"
    }


# ============================================
# LangGraph Routing Functions
# ============================================

def should_orchestrate(state: VarunaState) -> Literal["orchestrator", "responder"]:
    """Route to orchestrator if needed, otherwise respond"""
    if state.get("should_orchestrate", False):
        return "orchestrator"
    return "responder"


def check_scan_needed(state: VarunaState) -> Literal["scanner", "responder"]:
    """Check if scanning is requested"""
    if state.get("scan_requested", False) or state.get("query", ""):
        return "scanner"
    return "responder"


# ============================================
# Build the LangGraph Workflow
# ============================================

def build_varuna_graph() -> StateGraph:
    """
    Build the Varuna agent workflow graph
    
    Flow:
    START -> scanner -> analyzer -> [orchestrator | responder] -> END
    """
    
    # Create the graph
    workflow = StateGraph(VarunaState)
    
    # Add nodes
    workflow.add_node("scanner", scanner_node)
    workflow.add_node("analyzer", analyzer_node)
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("responder", responder_node)
    
    # Set entry point
    workflow.set_entry_point("scanner")
    
    # Add edges
    workflow.add_edge("scanner", "analyzer")
    workflow.add_conditional_edges(
        "analyzer",
        should_orchestrate,
        {
            "orchestrator": "orchestrator",
            "responder": "responder"
        }
    )
    workflow.add_edge("orchestrator", "responder")
    workflow.add_edge("responder", END)
    
    return workflow.compile()


# ============================================
# Agent Interface
# ============================================

class VarunaAgent:
    """
    Main interface for the Varuna LangGraph Agent
    """
    
    def __init__(self):
        self.graph = build_varuna_graph()
    
    async def run(self, query: str, scan: bool = True) -> dict:
        """
        Run the agent workflow
        
        Args:
            query: User query or situation description
            scan: Whether to scan for incidents
            
        Returns:
            Final state with response
        """
        initial_state: VarunaState = {
            "query": query,
            "scan_requested": scan,
            "messages": [HumanMessage(content=query)],
            "incidents": [],
            "resources": [],
            "resource_requests": [],
            "hospital_alerts": [],
            "decisions": [],
            "current_node": "start",
            "should_orchestrate": False,
            "should_alert": False,
            "capacity_score": 1.0,
            "response": "",
            "status": "scanning"
        }
        
        # Run the graph
        final_state = await self.graph.ainvoke(initial_state)
        
        return {
            "success": True,
            "response": final_state["response"],
            "incidents": [i.model_dump() for i in final_state["incidents"]],
            "resources": [r.model_dump() for r in final_state["resources"]],
            "decisions": [d.model_dump() for d in final_state["decisions"]],
            "resource_requests": [r.model_dump() for r in final_state["resource_requests"]],
            "hospital_alerts": [a.model_dump() for a in final_state["hospital_alerts"]],
            "capacity_score": final_state["capacity_score"],
            "status": final_state["status"]
        }
    
    def run_sync(self, query: str, scan: bool = True) -> dict:
        """Synchronous version of run"""
        import asyncio
        return asyncio.run(self.run(query, scan))


# Singleton instance
varuna_agent = VarunaAgent()
