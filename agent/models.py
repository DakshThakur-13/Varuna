"""
Varuna AI Agent - Data Models
Pydantic models for type safety and validation
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class SeverityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IncidentType(str, Enum):
    FIRE = "fire"
    ROAD_ACCIDENT = "road_accident"
    BUILDING_COLLAPSE = "building_collapse"
    CHEMICAL_SPILL = "chemical_spill"
    GAS_LEAK = "gas_leak"
    STAMPEDE = "stampede"
    TERROR_ATTACK = "terror_attack"
    TRAIN_ACCIDENT = "train_accident"
    FLOOD = "flood"
    EPIDEMIC_OUTBREAK = "epidemic_outbreak"
    UNKNOWN = "unknown"


class Location(BaseModel):
    """Geographic location model"""
    lat: float
    lng: float
    address: str = ""
    distance_from_hospital: Optional[float] = None


class CasualtyEstimate(BaseModel):
    """Casualty estimation model"""
    min: int
    max: int
    likely: int
    confidence: float = Field(ge=0, le=1)


class IncidentReport(BaseModel):
    """Incident report from scanner agent"""
    id: str
    title: str
    description: str
    type: IncidentType
    severity: SeverityLevel
    location: Location
    estimated_casualties: CasualtyEstimate
    injury_types: List[str]
    recommended_departments: List[str]
    eta_minutes: int
    source: str
    source_url: Optional[str] = None
    detected_at: datetime
    confidence_score: float = Field(ge=0, le=1)
    raw_data: Optional[Dict[str, Any]] = None
    ai_analysis: Optional[str] = None


class ResourceStatus(BaseModel):
    """Current resource status"""
    resource_type: str
    current_level: float
    capacity: float
    status: str  # adequate, low, critical
    hours_remaining: Optional[float] = None


class ResourceRequest(BaseModel):
    """Resource request for vendors"""
    id: str
    resource_type: str
    quantity: int
    urgency: SeverityLevel
    vendor_id: str
    vendor_name: str
    estimated_arrival_minutes: int
    status: str = "pending"
    requested_at: datetime


class HospitalAlert(BaseModel):
    """Alert for nearby hospitals"""
    id: str
    hospital_id: str
    hospital_name: str
    alert_type: str  # awareness, standby, divert_patients, accept_overflow
    incident_id: str
    message: str
    expected_patients: int
    sent_at: datetime
    acknowledged: bool = False


class OrchestrationResult(BaseModel):
    """Result from orchestration agent"""
    incident_id: str
    resource_status: List[ResourceStatus]
    resource_requests: List[ResourceRequest]
    hospital_alerts: List[HospitalAlert]
    recommendations: List[str]
    capacity_score: float = Field(ge=0, le=1)
    prepared: bool


class LearningInsight(BaseModel):
    """Post-incident learning insight"""
    id: str
    incident_id: str
    category: str
    insight: str
    recommendation: str
    priority: SeverityLevel
    created_at: datetime


class PostIncidentReport(BaseModel):
    """Post-incident analysis report"""
    incident_id: str
    predicted_casualties: int
    actual_casualties: int
    accuracy_score: float
    predicted_eta: int
    actual_arrival_time: int
    response_rating: str  # A, B, C, D, F
    insights: List[LearningInsight]
    improvements: List[str]
    created_at: datetime


# Request/Response Models for API

class ScanRequest(BaseModel):
    """Request to scan for incidents"""
    location: Optional[Location] = None
    radius_km: Optional[float] = 15.0
    include_sources: List[str] = ["news", "social", "emergency"]


class ScanResponse(BaseModel):
    """Response from scan endpoint"""
    success: bool
    incidents: List[IncidentReport]
    scan_time: datetime
    sources_checked: List[str]
    message: Optional[str] = None


class OrchestrationRequest(BaseModel):
    """Request to orchestrate resources"""
    incident: IncidentReport
    auto_request_resources: bool = False
    auto_alert_hospitals: bool = True


class OrchestrationResponse(BaseModel):
    """Response from orchestration endpoint"""
    success: bool
    result: OrchestrationResult
    message: Optional[str] = None


class LearningRequest(BaseModel):
    """Request for post-incident learning"""
    incident_id: str
    actual_casualties: int
    actual_arrival_time: int
    notes: Optional[str] = None


class LearningResponse(BaseModel):
    """Response from learning endpoint"""
    success: bool
    report: PostIncidentReport
    message: Optional[str] = None


class ChatRequest(BaseModel):
    """Request for AI chat"""
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    """Response from AI chat"""
    success: bool
    response: str
    source: str  # "gemini", "fallback"
    tools_used: List[str] = []
