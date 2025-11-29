"""
Varuna AI Agent - Learning Agent
Post-incident analysis and continuous improvement
"""

import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from supabase import create_client, Client

from config import get_settings
from models import (
    IncidentReport, PostIncidentReport, LearningInsight,
    SeverityLevel, LearningRequest, LearningResponse
)


class LearningAgent:
    """
    AI Agent for post-incident learning and improvement
    - Analyzes prediction accuracy
    - Generates improvement insights
    - Tracks performance over time
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.llm = ChatGroq(
            api_key=self.settings.groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.3
        )
        
        # Initialize Supabase if configured
        self.supabase: Optional[Client] = None
        if self.settings.supabase_url and self.settings.supabase_key:
            try:
                self.supabase = create_client(
                    self.settings.supabase_url,
                    self.settings.supabase_key
                )
            except:
                pass
        
        # Incident cache (in production, this would be in database)
        self.incident_cache: Dict[str, IncidentReport] = {}
        
        # Learning prompt
        self.learning_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Hospital Performance Analyst AI.
Your role is to analyze the gap between predicted and actual incident outcomes to improve future emergency response.

Focus on:
1. Prediction accuracy - what did we get right/wrong?
2. Response effectiveness - did resources meet needs?
3. Systemic improvements - what processes can be improved?
4. Training needs - what skills gaps were exposed?

Be constructive and specific in recommendations."""),
            ("human", """Analyze this post-incident report:

INCIDENT: {incident_type} at {location}
Severity: {severity}

PREDICTIONS vs ACTUALS:
- Predicted Casualties: {predicted_casualties}
- Actual Casualties: {actual_casualties}
- Casualty Accuracy: {casualty_accuracy}%

- Predicted ETA: {predicted_eta} minutes
- Actual First Arrival: {actual_arrival} minutes
- ETA Accuracy: {eta_accuracy}%

INJURY TYPES PREDICTED: {predicted_injuries}

NOTES: {notes}

Provide your analysis in JSON format:
{{
    "performance_rating": "A|B|C|D|F",
    "rating_justification": "explanation",
    "insights": [
        {{
            "category": "prediction|response|process|training",
            "insight": "what we learned",
            "recommendation": "specific action to take",
            "priority": "critical|high|medium|low"
        }}
    ],
    "model_adjustments": [
        "suggestions for improving prediction models"
    ],
    "process_improvements": [
        "suggestions for improving workflows"
    ],
    "commendations": [
        "what went well"
    ]
}}""")
        ])
    
    def cache_incident(self, incident: IncidentReport):
        """Cache an incident for later learning"""
        self.incident_cache[incident.id] = incident
    
    async def analyze(self, request: LearningRequest) -> LearningResponse:
        """
        Analyze post-incident performance
        """
        # Get cached incident or create placeholder
        incident = self.incident_cache.get(request.incident_id)
        
        if not incident:
            # Create placeholder for demo
            incident = IncidentReport(
                id=request.incident_id,
                title="Unknown Incident",
                description="Incident details not cached",
                type="unknown",
                severity=SeverityLevel.MEDIUM,
                location={"lat": 0, "lng": 0, "address": "Unknown"},
                estimated_casualties={"min": 5, "max": 20, "likely": 10, "confidence": 0.5},
                injury_types=["Various"],
                recommended_departments=["Emergency"],
                eta_minutes=20,
                source="manual",
                detected_at=datetime.now(),
                confidence_score=0.5
            )
        
        # Calculate accuracy metrics
        predicted_casualties = incident.estimated_casualties.likely if hasattr(incident.estimated_casualties, 'likely') else 10
        casualty_accuracy = self._calculate_accuracy(predicted_casualties, request.actual_casualties)
        
        predicted_eta = incident.eta_minutes if hasattr(incident, 'eta_minutes') else 20
        eta_accuracy = self._calculate_accuracy(predicted_eta, request.actual_arrival_time)
        
        # Get AI analysis
        analysis = await self._get_ai_analysis(
            incident, request, casualty_accuracy, eta_accuracy
        )
        
        # Generate insights
        insights = self._generate_insights(analysis)
        
        # Create report
        report = PostIncidentReport(
            incident_id=request.incident_id,
            predicted_casualties=predicted_casualties,
            actual_casualties=request.actual_casualties,
            accuracy_score=casualty_accuracy / 100,
            predicted_eta=predicted_eta,
            actual_arrival_time=request.actual_arrival_time,
            response_rating=analysis.get("performance_rating", "C"),
            insights=insights,
            improvements=analysis.get("process_improvements", []),
            created_at=datetime.now()
        )
        
        # Store report in database
        await self._store_report(report)
        
        return LearningResponse(
            success=True,
            report=report,
            message=f"Analysis complete. Performance rating: {report.response_rating}"
        )
    
    def _calculate_accuracy(self, predicted: int, actual: int) -> float:
        """Calculate prediction accuracy as percentage"""
        if actual == 0:
            return 100 if predicted == 0 else 0
        
        error = abs(predicted - actual) / actual
        accuracy = max(0, (1 - error)) * 100
        return round(accuracy, 1)
    
    async def _get_ai_analysis(
        self,
        incident: IncidentReport,
        request: LearningRequest,
        casualty_accuracy: float,
        eta_accuracy: float
    ) -> Dict[str, Any]:
        """Get AI analysis of performance"""
        try:
            # Handle both Pydantic models and dicts
            incident_type = incident.type.value if hasattr(incident.type, 'value') else incident.type
            severity = incident.severity.value if hasattr(incident.severity, 'value') else incident.severity
            location = incident.location.address if hasattr(incident.location, 'address') else incident.location.get('address', 'Unknown')
            
            if hasattr(incident.estimated_casualties, 'likely'):
                predicted_casualties = incident.estimated_casualties.likely
            else:
                predicted_casualties = incident.estimated_casualties.get('likely', 10)
            
            if hasattr(incident, 'injury_types'):
                injury_types = incident.injury_types
            else:
                injury_types = ['Various']
            
            formatted = self.learning_prompt.format_messages(
                incident_type=incident_type,
                location=location,
                severity=severity,
                predicted_casualties=predicted_casualties,
                actual_casualties=request.actual_casualties,
                casualty_accuracy=casualty_accuracy,
                predicted_eta=incident.eta_minutes if hasattr(incident, 'eta_minutes') else 20,
                actual_arrival=request.actual_arrival_time,
                eta_accuracy=eta_accuracy,
                predicted_injuries=", ".join(injury_types) if isinstance(injury_types, list) else injury_types,
                notes=request.notes or "No additional notes"
            )
            
            response = await self.llm.ainvoke(formatted)
            return self._parse_analysis(response.content)
            
        except Exception as e:
            print(f"Error getting AI analysis: {e}")
            return self._get_fallback_analysis(casualty_accuracy, eta_accuracy)
    
    def _parse_analysis(self, content: str) -> Dict[str, Any]:
        """Parse AI analysis response"""
        import json
        try:
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except:
            pass
        return {"performance_rating": "C", "insights": [], "process_improvements": []}
    
    def _get_fallback_analysis(self, casualty_accuracy: float, eta_accuracy: float) -> Dict[str, Any]:
        """Generate fallback analysis without AI"""
        avg_accuracy = (casualty_accuracy + eta_accuracy) / 2
        
        if avg_accuracy >= 90:
            rating = "A"
        elif avg_accuracy >= 75:
            rating = "B"
        elif avg_accuracy >= 60:
            rating = "C"
        elif avg_accuracy >= 40:
            rating = "D"
        else:
            rating = "F"
        
        return {
            "performance_rating": rating,
            "rating_justification": f"Based on {avg_accuracy:.1f}% average prediction accuracy",
            "insights": [
                {
                    "category": "prediction",
                    "insight": f"Casualty prediction was {casualty_accuracy:.1f}% accurate",
                    "recommendation": "Continue refining prediction models",
                    "priority": "medium"
                }
            ],
            "process_improvements": [
                "Regular model calibration based on outcomes",
                "Cross-reference with historical similar incidents"
            ],
            "commendations": ["Response protocols were executed"]
        }
    
    def _generate_insights(self, analysis: Dict[str, Any]) -> List[LearningInsight]:
        """Convert analysis to LearningInsight objects"""
        insights = []
        
        for item in analysis.get("insights", []):
            insights.append(LearningInsight(
                id=str(uuid.uuid4()),
                incident_id="",  # Will be filled by caller
                category=item.get("category", "general"),
                insight=item.get("insight", ""),
                recommendation=item.get("recommendation", ""),
                priority=SeverityLevel(item.get("priority", "medium")),
                created_at=datetime.now()
            ))
        
        return insights
    
    async def _store_report(self, report: PostIncidentReport):
        """Store report in database"""
        if self.supabase:
            try:
                # Would store in a learning_reports table
                pass
            except Exception as e:
                print(f"Error storing report: {e}")
    
    async def get_performance_trends(self, days: int = 30) -> Dict[str, Any]:
        """Get performance trends over time"""
        # In production, this would query historical data
        return {
            "period_days": days,
            "avg_casualty_accuracy": 78.5,
            "avg_eta_accuracy": 82.3,
            "incidents_analyzed": 45,
            "rating_distribution": {"A": 5, "B": 15, "C": 18, "D": 5, "F": 2},
            "top_improvement_areas": [
                "Multi-vehicle accident casualty estimation",
                "Chemical incident ETA prediction",
                "Resource pre-positioning for fires"
            ],
            "trend": "improving"
        }


# Singleton instance
learning_agent = LearningAgent()
