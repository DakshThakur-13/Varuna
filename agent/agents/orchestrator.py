"""
Varuna AI Agent - Resource Orchestrator
Coordinates resources, vendors, and nearby hospitals
"""

import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from supabase import create_client, Client

from config import get_settings, NEARBY_HOSPITALS, VENDORS
from redis_client import redis_client
from models import (
    IncidentReport, OrchestrationResult, ResourceStatus,
    ResourceRequest, HospitalAlert, SeverityLevel,
    OrchestrationRequest, OrchestrationResponse
)


class ResourceOrchestrator:
    """
    AI Agent for orchestrating hospital resources during emergencies
    - Checks current resource levels
    - Generates vendor requests
    - Coordinates with nearby hospitals
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.llm = ChatGroq(
            api_key=self.settings.groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.2
        )
        
        # Initialize Supabase if configured
        self.supabase: Optional[Client] = None
        if self.settings.supabase_url and self.settings.supabase_key:
            try:
                self.supabase = create_client(
                    self.settings.supabase_url,
                    self.settings.supabase_key
                )
            except Exception as e:
                print(f"Supabase connection error: {e}")
        
        # Strategy prompt
        self.strategy_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Hospital Resource Strategist AI.
Your role is to analyze incoming emergency incidents and recommend optimal resource allocation.

You have access to:
- Current hospital resource levels
- Nearby hospital network with their capacities
- Vendor network for emergency supplies

Provide strategic recommendations that prioritize:
1. Patient safety and care quality
2. Resource efficiency
3. System-wide coordination
4. Surge capacity management"""),
            ("human", """Analyze this emergency situation:

INCIDENT:
- Type: {incident_type}
- Severity: {severity}
- Location: {location} ({distance} km away)
- Estimated Casualties: {casualties} (range: {min_casualties}-{max_casualties})
- Expected Injuries: {injury_types}
- ETA: {eta} minutes

CURRENT RESOURCES:
{resource_status}

NEARBY HOSPITALS:
{hospital_status}

Provide your strategic recommendations in this JSON format:
{{
    "overall_assessment": "brief situation assessment",
    "capacity_score": <0-1 score of current capacity to handle>,
    "resource_priorities": [
        {{"resource": "name", "action": "order/conserve/redistribute", "urgency": "critical/high/medium/low", "reason": "why"}}
    ],
    "hospital_coordination": [
        {{"hospital": "name", "action": "alert/request_beds/divert_to", "patients_to_send": <number>, "reason": "why"}}
    ],
    "vendor_orders": [
        {{"vendor_type": "oxygen/blood/medications/equipment", "quantity": "amount", "urgency": "critical/high/medium"}}
    ],
    "staffing_recommendations": ["list of staffing actions"],
    "contingency_plans": ["backup plans if situation worsens"]
}}""")
        ])
    
    async def orchestrate(self, request: OrchestrationRequest) -> OrchestrationResponse:
        """
        Main orchestration function
        """
        incident = request.incident
        
        # 1. Get current resource status
        resources = await self._get_resource_status()
        
        # 2. Get hospital network status
        hospitals = self._get_hospital_status()
        
        # 3. Get AI strategy recommendations
        strategy = await self._get_ai_strategy(incident, resources, hospitals)
        
        # 4. Generate resource requests
        resource_requests = self._generate_resource_requests(incident, strategy)
        
        # 5. Generate hospital alerts
        hospital_alerts = self._generate_hospital_alerts(incident, strategy)
        
        # 6. Compile recommendations
        recommendations = self._compile_recommendations(strategy)
        
        # WAR ROOM LOGIC: If Critical, require approval
        requires_approval = incident.severity == SeverityLevel.CRITICAL
        alert_id = None
        
        if requires_approval and self.supabase:
            try:
                # Create pending alert
                alert_data = {
                    "incident_type": incident.type,
                    "severity": incident.severity,
                    "location": incident.location.address,
                    "description": incident.description,
                    "recommended_actions": {
                        "resource_requests": [r.model_dump() for r in resource_requests],
                        "hospital_alerts": [h.model_dump() for h in hospital_alerts],
                        "strategy": strategy
                    },
                    "status": "pending"
                }
                
                response = self.supabase.table("incident_alerts").insert(alert_data).execute()
                if response.data:
                    alert_id = response.data[0]['id']
                    print(f"⚠️ CRITICAL INCIDENT: Paused for War Room approval. Alert ID: {alert_id}")
            except Exception as e:
                print(f"Error creating war room alert: {e}")

        # If approval required, do NOT execute auto-requests yet
        final_resource_requests = [] if requires_approval else (resource_requests if request.auto_request_resources else [])
        final_hospital_alerts = [] if requires_approval else (hospital_alerts if request.auto_alert_hospitals else [])

        result = OrchestrationResult(
            incident_id=incident.id,
            resource_status=resources,
            resource_requests=final_resource_requests,
            hospital_alerts=final_hospital_alerts,
            recommendations=recommendations,
            capacity_score=strategy.get("capacity_score", 0.5),
            prepared=strategy.get("capacity_score", 0.5) >= 0.6
        )
        
        message = f"Orchestration complete. Capacity score: {result.capacity_score:.0%}"
        if requires_approval:
            message += " [PAUSED: Awaiting War Room Approval]"
        
        return OrchestrationResponse(
            success=True,
            result=result,
            message=message
        )
    
    async def _get_resource_status(self) -> List[ResourceStatus]:
        """Get current resource levels from Supabase or mock data"""
        resources = []
        
        if self.supabase:
            try:
                # Fetch from resource_status table
                response = self.supabase.table("resource_status").select("*").limit(1).execute()
                if response.data:
                    data = response.data[0]
                    resources = [
                        ResourceStatus(
                            resource_type="beds",
                            current_level=data.get("beds_total", 100) - data.get("beds_occupied", 70),
                            capacity=data.get("beds_total", 100),
                            status=self._calculate_status(data.get("beds_total", 100) - data.get("beds_occupied", 70), data.get("beds_total", 100)),
                            hours_remaining=None
                        ),
                        ResourceStatus(
                            resource_type="icu_beds",
                            current_level=data.get("icu_beds_total", 20) - data.get("icu_beds_occupied", 15),
                            capacity=data.get("icu_beds_total", 20),
                            status=self._calculate_status(data.get("icu_beds_total", 20) - data.get("icu_beds_occupied", 15), data.get("icu_beds_total", 20)),
                            hours_remaining=None
                        ),
                        ResourceStatus(
                            resource_type="oxygen",
                            current_level=data.get("oxygen_supply", 75),
                            capacity=100,
                            status=self._calculate_status(data.get("oxygen_supply", 75), 100),
                            hours_remaining=data.get("oxygen_supply", 75) * 0.24
                        ),
                        ResourceStatus(
                            resource_type="ventilators",
                            current_level=data.get("ventilators_available", 8),
                            capacity=data.get("ventilators_total", 15),
                            status=self._calculate_status(data.get("ventilators_available", 8), data.get("ventilators_total", 15)),
                            hours_remaining=None
                        ),
                        ResourceStatus(
                            resource_type="blood_units",
                            current_level=data.get("blood_units", 120),
                            capacity=200,
                            status=self._calculate_status(data.get("blood_units", 120), 200),
                            hours_remaining=None
                        ),
                    ]
                    return resources
            except Exception as e:
                print(f"Error fetching resources: {e}")
        
        # Mock data fallback
        return [
            ResourceStatus(resource_type="beds", current_level=30, capacity=100, status="adequate"),
            ResourceStatus(resource_type="icu_beds", current_level=5, capacity=20, status="low"),
            ResourceStatus(resource_type="oxygen", current_level=65, capacity=100, status="adequate", hours_remaining=15.6),
            ResourceStatus(resource_type="ventilators", current_level=8, capacity=15, status="adequate"),
            ResourceStatus(resource_type="blood_units", current_level=80, capacity=200, status="low"),
            ResourceStatus(resource_type="staff_on_duty", current_level=45, capacity=80, status="adequate"),
        ]
    
    def _calculate_status(self, current: float, capacity: float) -> str:
        """Calculate resource status"""
        if capacity == 0:
            return "critical"
        ratio = current / capacity
        if ratio <= 0.2:
            return "critical"
        elif ratio <= 0.4:
            return "low"
        return "adequate"
    
    def _get_hospital_status(self) -> List[Dict[str, Any]]:
        """Get nearby hospital status"""
        # In production, this would query each hospital's system
        return NEARBY_HOSPITALS
    
    async def _get_ai_strategy(
        self, 
        incident: IncidentReport, 
        resources: List[ResourceStatus],
        hospitals: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Get AI strategic recommendations"""
        try:
            # Format resource status
            resource_str = "\n".join([
                f"- {r.resource_type}: {r.current_level}/{r.capacity} ({r.status})"
                + (f" - {r.hours_remaining:.1f}h remaining" if r.hours_remaining else "")
                for r in resources
            ])
            
            # Format hospital status
            hospital_str = "\n".join([
                f"- {h['name']}: {h['capacity']['available_beds']} beds available, "
                f"{h['distance_km']}km away, specialties: {', '.join(h['specialties'])}"
                for h in hospitals
            ])
            
            formatted = self.strategy_prompt.format_messages(
                incident_type=incident.type.value,
                severity=incident.severity.value,
                location=incident.location.address,
                distance=incident.location.distance_from_hospital,
                casualties=incident.estimated_casualties.likely,
                min_casualties=incident.estimated_casualties.min,
                max_casualties=incident.estimated_casualties.max,
                injury_types=", ".join(incident.injury_types),
                eta=incident.eta_minutes,
                resource_status=resource_str,
                hospital_status=hospital_str
            )
            
            response = await self.llm.ainvoke(formatted)
            return self._parse_strategy(response.content)
            
        except Exception as e:
            print(f"Error getting AI strategy: {e}")
            return self._get_fallback_strategy(incident, resources)
    
    def _parse_strategy(self, content: str) -> Dict[str, Any]:
        """Parse AI strategy response"""
        import json
        try:
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except:
            pass
        return {"capacity_score": 0.5, "resource_priorities": [], "hospital_coordination": [], "vendor_orders": []}
    
    def _get_fallback_strategy(self, incident: IncidentReport, resources: List[ResourceStatus]) -> Dict[str, Any]:
        """Generate fallback strategy without AI"""
        capacity_score = 0.7
        
        # Reduce score based on severity
        if incident.severity == SeverityLevel.CRITICAL:
            capacity_score -= 0.3
        elif incident.severity == SeverityLevel.HIGH:
            capacity_score -= 0.2
        
        # Reduce score based on resource status
        for r in resources:
            if r.status == "critical":
                capacity_score -= 0.15
            elif r.status == "low":
                capacity_score -= 0.08
        
        return {
            "overall_assessment": f"Incoming {incident.severity.value} {incident.type.value} incident",
            "capacity_score": max(0.1, min(1.0, capacity_score)),
            "resource_priorities": [],
            "hospital_coordination": [],
            "vendor_orders": [],
            "staffing_recommendations": ["Call in on-call staff", "Prepare surge protocols"],
            "contingency_plans": ["Activate mutual aid agreements", "Prepare for ambulance diversion"]
        }
    
    def _generate_resource_requests(self, incident: IncidentReport, strategy: Dict) -> List[ResourceRequest]:
        """Generate resource requests for vendors"""
        requests = []
        
        for order in strategy.get("vendor_orders", []):
            vendor_type = order.get("vendor_type", "").lower()
            matching_vendors = [v for v in VENDORS if vendor_type in v["resource_type"]]
            
            if matching_vendors:
                vendor = matching_vendors[0]
                requests.append(ResourceRequest(
                    id=str(uuid.uuid4()),
                    resource_type=vendor_type,
                    quantity=1,  # Would parse from order["quantity"]
                    urgency=SeverityLevel(order.get("urgency", "high")),
                    vendor_id=vendor["id"],
                    vendor_name=vendor["name"],
                    estimated_arrival_minutes=vendor["response_time_minutes"],
                    status="pending",
                    requested_at=datetime.now()
                ))
        
        return requests
    
    def _generate_hospital_alerts(self, incident: IncidentReport, strategy: Dict) -> List[HospitalAlert]:
        """Generate alerts for nearby hospitals"""
        alerts = []
        
        for coord in strategy.get("hospital_coordination", []):
            hospital_name = coord.get("hospital", "")
            matching = [h for h in NEARBY_HOSPITALS if hospital_name.lower() in h["name"].lower()]
            
            if matching:
                hospital = matching[0]
                action = coord.get("action", "alert")
                
                alerts.append(HospitalAlert(
                    id=str(uuid.uuid4()),
                    hospital_id=hospital["id"],
                    hospital_name=hospital["name"],
                    alert_type=action,
                    incident_id=incident.id,
                    message=f"{incident.type.value.upper()} incident. {coord.get('reason', 'Requesting coordination.')}",
                    expected_patients=coord.get("patients_to_send", 0),
                    sent_at=datetime.now(),
                    acknowledged=False
                ))
        
        # Always alert nearest hospitals for high/critical incidents
        if incident.severity in [SeverityLevel.CRITICAL, SeverityLevel.HIGH]:
            for hospital in NEARBY_HOSPITALS[:3]:  # Top 3 nearest
                if not any(a.hospital_id == hospital["id"] for a in alerts):
                    alerts.append(HospitalAlert(
                        id=str(uuid.uuid4()),
                        hospital_id=hospital["id"],
                        hospital_name=hospital["name"],
                        alert_type="awareness",
                        incident_id=incident.id,
                        message=f"ALERT: {incident.severity.value.upper()} {incident.type.value} incident {incident.location.distance_from_hospital}km away. Est. {incident.estimated_casualties.likely} casualties.",
                        expected_patients=incident.estimated_casualties.likely // 3,
                        sent_at=datetime.now(),
                        acknowledged=False
                    ))
        
        return alerts
    
    def _compile_recommendations(self, strategy: Dict) -> List[str]:
        """Compile human-readable recommendations"""
        recs = []
        
        if strategy.get("overall_assessment"):
            recs.append(f"📋 {strategy['overall_assessment']}")
        
        for staff_rec in strategy.get("staffing_recommendations", []):
            recs.append(f"👥 {staff_rec}")
        
        for contingency in strategy.get("contingency_plans", []):
            recs.append(f"🔄 {contingency}")
        
        return recs


# Singleton instance
orchestrator = ResourceOrchestrator()
