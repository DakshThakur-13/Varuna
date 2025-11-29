# Varuna AI Agent

🤖 **Emergency Intelligence Agent** powered by **LangGraph** + **Pydantic** + **Groq AI**

## Architecture

This agent uses **LangGraph** for stateful workflow orchestration with **Pydantic** models for type-safe state management.

```
┌─────────────────────────────────────────────────────────────┐
│                     LangGraph Workflow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   START ──► SCANNER ──► ANALYZER ──┬──► ORCHESTRATOR ──┐   │
│                                    │                    │   │
│                                    └──► RESPONDER ◄────┘   │
│                                              │              │
│                                              ▼              │
│                                             END             │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. 🔍 Scanner Node
- **Real-time incident detection** using Tavily API for web/news search
- **AI-powered analysis** with Groq (Llama 3.3 70B)
- Scans for: fires, accidents, chemical spills, stampedes, terror attacks, etc.
- **Pydantic models** for type-safe incident data

### 2. 📊 Analyzer Node
- **Capacity analysis** against incoming incident needs
- **Resource status assessment** with Pydantic models
- Determines if orchestration is needed

### 3. 🎯 Orchestrator Node
- **AI strategic decisions** for resource allocation
- **Vendor priority queue** for supply requests
- **Hospital mesh network** coordination

### 4. 💬 Responder Node
- **Generates final response** summary
- Compiles all decisions and alerts

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Workflow** | **LangGraph** (stateful agent) |
| **Models** | **Pydantic** (type validation) |
| **LLM** | **Groq (Llama 3.3 70B)** |
| **Web Search** | **Tavily API** |
| **Backend** | **FastAPI** (Python) |
| **Database** | **Supabase** |
| **Frontend** | **Next.js 16** (integrated) |

## Quick Start

### 1. Get API Keys

- **Groq**: Get free key at [console.groq.com](https://console.groq.com) (REQUIRED)
- **Tavily**: Get free key at [tavily.com](https://tavily.com) (for real-time scanning)

### 2. Configure Environment

```bash
cd agent
cp .env.example .env
# Edit .env with your API keys (especially GROQ_API_KEY)
```

### 3. Install & Run

**Windows:**
```cmd
cd agent
start.bat
```

**Mac/Linux:**
```bash
cd agent
chmod +x start.sh
./start.sh
```

**Manual:**
```bash
cd agent
pip install -r requirements.txt
python main.py
```

### 4. Access

- **Agent API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/status

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/run` | POST | **Run LangGraph workflow** |
| `/api/agent/graph` | GET | Get workflow info |
| `/api/scan` | POST | Scan for emergency incidents |
| `/api/incidents` | GET | Get active incidents |
| `/api/orchestrate` | POST | Orchestrate response to incident |
| `/api/resources` | GET | Get resource status |
| `/api/learn` | POST | Post-incident analysis |
| `/api/chat` | POST | Chat with AI agent |
| `/api/control/start-scan` | POST | Start background scanning |
| `/api/control/stop-scan` | POST | Stop background scanning |

## Pydantic State Models

```python
class VarunaState(TypedDict):
    query: str
    scan_requested: bool
    messages: List[BaseMessage]
    incidents: List[IncidentData]
    resources: List[ResourceStatus]
    resource_requests: List[ResourceRequest]
    hospital_alerts: List[HospitalAlert]
    decisions: List[AgentDecision]
    capacity_score: float
    status: Literal["idle", "scanning", "analyzing", "orchestrating", "complete"]
```

## Detailed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│                   (localhost:3000/agent)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI Backend                             │
│                 (localhost:8000)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Scanner    │  │ Orchestrator │  │   Learning   │       │
│  │    Agent     │  │    Agent     │  │    Agent     │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌──────────────────────────────────────────────────┐       │
│  │              LangChain + Gemini AI               │       │
│  └──────────────────────────────────────────────────┘       │
│         │                 │                                  │
│         ▼                 ▼                                  │
│  ┌─────────────┐   ┌─────────────┐                          │
│  │ Tavily API  │   │  Supabase   │                          │
│  │ (Web Search)│   │  (Database) │                          │
│  └─────────────┘   └─────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Demo Mode

If Tavily API key is not configured, the system runs in **demo mode** with simulated incidents. This is perfect for testing and development.

## Production Deployment

1. Set `ENABLE_AUTO_SCAN=true` for continuous monitoring
2. Configure real hospital coordinates
3. Set up Supabase with actual data
4. Add real vendor contacts
5. Deploy behind reverse proxy (nginx)

## Contributing

Built for Mumbai Hacks 2025 🏆
