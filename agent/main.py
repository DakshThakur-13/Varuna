"""
Varuna AI Agent - FastAPI Server
Main entry point for the AI Agent backend with LangGraph workflow
"""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional
import uvicorn

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import get_settings
from models import (
    ScanRequest, ScanResponse,
    OrchestrationRequest, OrchestrationResponse,
    LearningRequest, LearningResponse,
    ChatRequest, ChatResponse,
    IncidentReport
)
from agents.scanner import scanner_agent
from agents.orchestrator import orchestrator
from agents.learning import learning_agent
from agents.graph import varuna_agent, VarunaAgent


# Background scanning state
class AgentState:
    def __init__(self):
        self.is_scanning = False
        self.last_scan: Optional[datetime] = None
        self.active_incidents: list[IncidentReport] = []
        self.scan_task: Optional[asyncio.Task] = None
        self.langgraph_agent: VarunaAgent = varuna_agent


state = AgentState()


async def background_scanner():
    """Continuous background scanning for incidents"""
    settings = get_settings()
    while state.is_scanning:
        try:
            # Use demo scan for testing, real scan in production
            if settings.tavily_api_key and settings.tavily_api_key not in ["", "demo", "tvly-your-key-here", "tvly-dev-your-key-here"]:
                result = await scanner_agent.scan(ScanRequest())
            else:
                result = await scanner_agent.scan_demo()
            
            state.active_incidents = result.incidents
            state.last_scan = datetime.now()
            
            # Auto-orchestrate for critical incidents
            for incident in result.incidents:
                if incident.severity.value in ["critical", "high"]:
                    learning_agent.cache_incident(incident)
                    # Could auto-trigger orchestration here
            
        except Exception as e:
            print(f"Background scan error: {e}")
        
        await asyncio.sleep(settings.agent_scan_interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    settings = get_settings()
    
    # Start background scanning if enabled
    if settings.enable_auto_scan:
        state.is_scanning = True
        state.scan_task = asyncio.create_task(background_scanner())
        print("🔍 Background incident scanner started")
    
    yield
    
    # Cleanup
    state.is_scanning = False
    if state.scan_task:
        state.scan_task.cancel()
        try:
            await state.scan_task
        except asyncio.CancelledError:
            pass
    print("👋 Agent shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Varuna AI Agent",
    description="Emergency Intelligence Agent for Hospital Crisis Management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Health & Status ==============

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Varuna AI Agent",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/status")
async def get_status():
    """Get agent status"""
    return {
        "scanning": state.is_scanning,
        "last_scan": state.last_scan.isoformat() if state.last_scan else None,
        "active_incidents": len(state.active_incidents),
        "uptime": "operational"
    }


# ============== Incident Scanning ==============

@app.post("/api/scan", response_model=ScanResponse)
async def scan_for_incidents(request: ScanRequest = ScanRequest()):
    """
    Scan for emergency incidents using Tavily API
    Returns analyzed incidents with casualty estimates
    """
    try:
        settings = get_settings()
        
        # Use real Tavily if API key is configured
        if settings.tavily_api_key and settings.tavily_api_key not in ["", "demo", "tvly-your-key-here", "tvly-dev-your-key-here"]:
            result = await scanner_agent.scan(request)
        else:
            # Use demo mode for testing
            result = await scanner_agent.scan_demo()
        
        # Cache incidents for learning
        for incident in result.incidents:
            learning_agent.cache_incident(incident)
        
        state.active_incidents = result.incidents
        state.last_scan = datetime.now()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/incidents")
async def get_active_incidents():
    """Get currently active incidents from last scan"""
    return {
        "incidents": [inc.model_dump() for inc in state.active_incidents],
        "last_scan": state.last_scan.isoformat() if state.last_scan else None,
        "count": len(state.active_incidents)
    }


# ============== Resource Orchestration ==============

@app.post("/api/orchestrate", response_model=OrchestrationResponse)
async def orchestrate_resources(request: OrchestrationRequest):
    """
    Orchestrate resources for an incident
    - Checks current resource levels
    - Generates vendor requests
    - Alerts nearby hospitals
    """
    try:
        result = await orchestrator.orchestrate(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/resources")
async def get_resource_status():
    """Get current hospital resource status"""
    try:
        resources = await orchestrator._get_resource_status()
        return {
            "resources": [r.model_dump() for r in resources],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Post-Incident Learning ==============

@app.post("/api/learn", response_model=LearningResponse)
async def analyze_incident(request: LearningRequest):
    """
    Analyze post-incident performance
    Compares predictions vs actual outcomes
    """
    try:
        result = await learning_agent.analyze(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/learn/trends")
async def get_learning_trends(days: int = 30):
    """Get performance trends over time"""
    try:
        trends = await learning_agent.get_performance_trends(days)
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== AI Chat ==============

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """
    Chat with the AI agent for operational queries
    Uses LangGraph workflow for intelligent responses
    """
    try:
        from langchain_groq import ChatGroq
        from langchain_core.prompts import ChatPromptTemplate
        
        settings = get_settings()
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.7
        )
        
        # Build context
        context = request.context or {}
        context["active_incidents"] = len(state.active_incidents)
        context["last_scan"] = state.last_scan.isoformat() if state.last_scan else "Never"
        
        # System prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are Varuna AI, an advanced emergency operations assistant.
You help hospital administrators manage crisis situations.

Current Status:
- Active Incidents: {active_incidents}
- Last Scan: {last_scan}

Be concise, professional, and prioritize patient safety in all recommendations."""),
            ("human", "{message}")
        ])
        
        formatted = prompt.format_messages(
            active_incidents=context["active_incidents"],
            last_scan=context["last_scan"],
            message=request.message
        )
        
        response = await llm.ainvoke(formatted)
        
        return ChatResponse(
            success=True,
            response=response.content,
            source="groq-llama-3.3-70b",
            tools_used=[]
        )
        
    except Exception as e:
        return ChatResponse(
            success=True,
            response=f"I'm experiencing connectivity issues. Current status: {len(state.active_incidents)} active incidents. {str(e)}",
            source="fallback",
            tools_used=[]
        )


# ============== LangGraph Agent Endpoint ==============

class LangGraphRequest(BaseModel):
    """Request for LangGraph agent"""
    query: str
    scan: bool = True


@app.post("/api/agent/run")
async def run_langgraph_agent(request: LangGraphRequest):
    """
    Run the LangGraph-based emergency response agent
    
    This endpoint triggers the full agent workflow:
    1. Scanner Node - Detects and analyzes incidents
    2. Analyzer Node - Assesses hospital capacity
    3. Orchestrator Node - Coordinates resources (if needed)
    4. Responder Node - Generates final response
    """
    try:
        result = await state.langgraph_agent.run(
            query=request.query,
            scan=request.scan
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/agent/graph")
async def get_graph_info():
    """Get information about the LangGraph workflow"""
    return {
        "name": "Varuna LangGraph Agent",
        "version": "1.0.0",
        "nodes": ["scanner", "analyzer", "orchestrator", "responder"],
        "description": "Stateful emergency response workflow using LangGraph",
        "framework": "LangGraph + Pydantic",
        "llm": "Groq (Llama 3.3 70B)"
    }


# ============== Control Endpoints ==============

@app.post("/api/control/start-scan")
async def start_scanning():
    """Start background incident scanning"""
    if not state.is_scanning:
        state.is_scanning = True
        state.scan_task = asyncio.create_task(background_scanner())
        return {"message": "Scanning started", "status": "active"}
    return {"message": "Already scanning", "status": "active"}


@app.post("/api/control/stop-scan")
async def stop_scanning():
    """Stop background incident scanning"""
    state.is_scanning = False
    if state.scan_task:
        state.scan_task.cancel()
    return {"message": "Scanning stopped", "status": "inactive"}


# ============== Main Entry Point ==============

if __name__ == "__main__":
    settings = get_settings()
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║           🏥 Varuna AI Agent Server                          ║
╠══════════════════════════════════════════════════════════════╣
║  Hospital: {settings.hospital_name:<45} ║
║  Location: ({settings.hospital_lat}, {settings.hospital_lng}){' ' * 26} ║
║  Scan Radius: {settings.scan_radius_km} km{' ' * 40} ║
║  Auto-Scan: {'Enabled' if settings.enable_auto_scan else 'Disabled'}{' ' * 43} ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False  # Disable reload for Windows compatibility
    )
