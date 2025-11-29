# 🏥 Varuna AI

> **The AI-Native Nervous System for Healthcare Facilities**

Varuna AI is a predictive intelligence platform designed to transform emergency departments from reactive chaos to proactive preparedness. Built for the Mumbai Hacks 2025 hackathon.

![Varuna AI](https://img.shields.io/badge/Varuna-AI-violet?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-green?style=flat-square)

## 🎯 Problem Statement

Emergency Departments in densely populated urban centers face a critical disconnect:
- **Frontline staff** focus on individual patients (micro-clinical view)
- **Administrators** remain blind to aggregate trends until crisis hits
- **External factors** (pollution, festivals, epidemics) cause unpredictable surges

This latency in situational awareness leads to "Code Black" scenarios where patient safety is compromised by **logistical collapse**, not medical incompetence.

## 💡 Solution

Varuna AI establishes a digital nervous system that:

1. **Predicts surges** hours in advance using environmental data correlation
2. **Provides real-time** situational awareness through a command center dashboard
3. **Streamlines triage** with AI-powered clinical assessment
4. **Demonstrates capability** through autonomous simulation

---

## 🏗️ Architecture

### Three-Pillar System

```
┌─────────────────────────────────────────────────────────────────┐
│                         VARUNA AI                               │
├─────────────────┬─────────────────────┬─────────────────────────┤
│   FRONTLINE     │   COMMAND CENTER    │   SIMULATION AGENT      │
│   INTERFACE     │   DASHBOARD         │   (Python)              │
│   (/intake)     │   (/dashboard)      │                         │
├─────────────────┼─────────────────────┼─────────────────────────┤
│ • Patient Entry │ • KPI Monitoring    │ • AQI Modeling          │
│ • Vital Signs   │ • Surge Prediction  │ • Patient Generation    │
│ • AI Triage     │ • Resource Radar    │ • Alert Injection       │
│ • CTAS Scoring  │ • DEFCON Status     │ • Crisis Simulation     │
└─────────────────┴─────────────────────┴─────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  SUPABASE         │
                    │  (PostgreSQL +    │
                    │   Realtime)       │
                    └───────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.8+
- Supabase account (free tier works)

### 1. Clone & Install

```bash
cd varuna
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase_schema.sql`
3. Go to Project Settings > API and copy your keys

### 3. Configure Environment

```bash
# Edit .env.local with your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the Application

```bash
# Start the Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

### 5. Start the Simulation Agent (Optional)

In a separate terminal:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the simulation agent
python simulation_agent.py

# Or start in crisis mode for demo
python simulation_agent.py --crisis
```

### 🧠 AI Agent Backend

The core intelligence runs as a separate service.

```bash
# Navigate to agent directory
cd agent

# Install dependencies
pip install -r requirements.txt

# Start the agent server
python main.py
```

---

## 📱 Interface Guide

### 🏥 Frontline Intake (`/intake`)

**Design Philosophy:** "Clinical Clarity" - high-contrast white background optimized for:
- Harsh fluorescent ER lighting
- Touch interaction with gloves
- Minimal cognitive load

**Features:**
- Patient demographics with auto-generated MRN
- Natural language chief complaint parsing
- Visual severity slider (1-10) with color interpolation
- Vital signs grid with validation
- AI triage assessment with CTAS classification
- Differential diagnosis suggestions
- Automated bed assignment

### 📊 Command Center (`/dashboard`)

**Design Philosophy:** "Operational Intensity" - dark cyberpunk aesthetic for:
- 24/7 control room monitoring
- Wall-mounted displays
- Glanceable situational awareness

**Features:**
- **DEFCON Status**: Dynamic 1-5 scale based on metrics
- **Environmental Banner**: AQI warnings and pollution alerts
- **KPI Cards**: Active patients, occupancy, oxygen autonomy, staffing ratio
- **Surge Predictor**: Area chart showing past actuals and future predictions
- **Resource Radar**: Spider chart showing resource health
- **Sentinel Feed**: Real-time event stream
- **AI Neural Link**: Natural language query interface

### 🤖 Simulation Agent

**Purpose:** Autonomous "Ghost in the Machine" that:
- Simulates environmental conditions (AQI fluctuations)
- Generates clinically accurate synthetic patients
- Triggers pattern-based alerts
- Creates a "living" demo without manual interaction

**Modes:**
```bash
python simulation_agent.py           # Normal mode (random crisis triggers)
python simulation_agent.py --crisis  # Start in crisis mode immediately
python simulation_agent.py --normal  # Force normal mode (no auto-crisis)
```

---

## 🔧 Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 18, TypeScript |
| Styling | Tailwind CSS 3.4 |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime (WebSocket) |
| Simulation | Python 3, Faker, supabase-py |

---

## 📁 Project Structure

```
varuna/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   ├── intake/
│   │   │   └── page.tsx       # Frontline triage interface
│   │   ├── dashboard/
│   │   │   └── page.tsx       # Command center dashboard
│   │   └── api/
│   │       └── triage/
│   │           └── route.ts   # AI triage assessment API
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client
│   │   └── utils.ts           # Utility functions
│   └── types/
│       └── database.ts        # TypeScript types
├── simulation_agent.py         # Python simulation script
├── supabase_schema.sql         # Database schema
├── requirements.txt            # Python dependencies
└── README.md
```

---

## 🎮 Demo Scenarios

### Scenario 1: Pollution Surge (Diwali)

1. Start the simulation agent in crisis mode: `python simulation_agent.py --crisis`
2. Watch the AQI climb in the environmental banner
3. Observe respiratory patients flooding the intake
4. See the Surge Predictor show predicted increase
5. Query the AI: "What protocol should we activate?"

### Scenario 2: Normal Operations

1. Run simulation in normal mode: `python simulation_agent.py --normal`
2. Use the Intake interface to manually add patients
3. Watch real-time updates on the dashboard
4. Observe how DEFCON changes with metrics

---

## 🗄️ Database Schema

### Tables

- **patients**: Patient records with vitals, triage results, bed assignments
- **alerts**: Environmental and system alerts
- **environmental_data**: Time-series AQI and weather data
- **resource_status**: Hospital resource tracking (beds, ventilators, staff)

All tables have Realtime enabled for instant dashboard updates.

---

## 🔮 Future Enhancements

- [ ] Integration with actual AQI APIs (CPCB, OpenWeatherMap)
- [ ] Machine learning model for triage (replace rule-based)
- [ ] Mobile app for field paramedics
- [ ] Inter-hospital network for load balancing
- [ ] Historical analytics and reporting
- [ ] Multi-language support (Hindi, Marathi)

---

## 👥 Team

Built with ❤️ for **Mumbai Hacks 2025**

---

## 📄 License

MIT License - Feel free to use and modify for your hackathon projects!

---

> *"Bridging the gap between chaos and care."*
