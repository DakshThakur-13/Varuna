"""
Varuna AI Agent - Emergency Scanner
Uses Tavily API for real-time incident detection and LangChain with Groq for analysis
"""

import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid
import math

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from tavily import TavilyClient

from config import get_settings, INCIDENT_CONFIGS
from redis_client import redis_client
from models import (
    IncidentReport, IncidentType, SeverityLevel, 
    Location, CasualtyEstimate, ScanRequest, ScanResponse
)


class EmergencyScannerAgent:
    """
    AI Agent for scanning and detecting emergency incidents
    Uses Tavily for real-time web search and Groq LLM for analysis
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.tavily = TavilyClient(api_key=self.settings.tavily_api_key)
        self.llm = ChatGroq(
            api_key=self.settings.groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.1  # Low temperature for factual analysis
        )
        
        # Analysis prompt
        self.analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an Emergency Intelligence Analyst for a hospital system.
Your job is to analyze incident reports and extract critical information for emergency preparedness.

Hospital Location: {hospital_name} ({hospital_lat}, {hospital_lng})
Scan Radius: {scan_radius} km

Analyze the following incident data and provide:
1. Incident type classification
2. Severity assessment (critical/high/medium/low)
3. Casualty estimation with confidence level
4. Likely injury types
5. Recommended hospital departments to prepare
6. Estimated time of arrival for first patients

Be precise and err on the side of caution for public safety.
If information is unclear, state your assumptions."""),
            ("human", """Analyze this incident:

Title: {title}
Description: {content}
Source: {source}
Location mentioned: {location}
Published: {published}

Provide your analysis in this exact JSON format:
{{
    "incident_type": "fire|road_accident|building_collapse|chemical_spill|gas_leak|stampede|terror_attack|train_accident|flood|epidemic_outbreak|unknown",
    "severity": "critical|high|medium|low",
    "location_extracted": "specific location or area name",
    "estimated_distance_km": <number>,
    "casualty_estimate": {{
        "min": <number>,
        "max": <number>,
        "likely": <number>,
        "confidence": <0-1>
    }},
    "injury_types": ["list", "of", "likely", "injuries"],
    "departments_needed": ["list", "of", "departments"],
    "eta_minutes": <number>,
    "analysis_notes": "brief explanation of your assessment"
}}""")
        ])
    
    async def scan(self, request: ScanRequest) -> ScanResponse:
        """
        Scan for emergency incidents using Tavily API
        """
        incidents: List[IncidentReport] = []
        sources_checked = []
        
        # Build search queries for different incident types
        search_queries = self._build_search_queries(request)
        
        for query_info in search_queries:
            try:
                sources_checked.append(query_info["source"])
                
                # Check Cache
                cache_key = f"scan_query:{query_info['query']}"
                cached_results = redis_client.get_json(cache_key)
                
                if cached_results:
                    results = cached_results
                else:
                    results = await self._search_tavily(query_info["query"])
                    redis_client.cache_json(cache_key, results, ex=300)
                
                for result in results:
                    # Deduplication
                    content_hash = str(hash(result.get('content', '') + result.get('url', '')))
                    dedup_key = f"processed_incident:{content_hash}"
                    
                    if redis_client.exists(dedup_key):
                        continue

                    # Analyze each result with AI
                    incident = await self._analyze_incident(result, query_info["source"])
                    
                    if incident:
                        redis_client.set(dedup_key, "processed", ex=86400)
                    if incident and incident.severity in [SeverityLevel.CRITICAL, SeverityLevel.HIGH, SeverityLevel.MEDIUM]:
                        # Filter by distance
                        if incident.location.distance_from_hospital and incident.location.distance_from_hospital <= (request.radius_km or 15):
                            incidents.append(incident)
                            
            except Exception as e:
                print(f"Error scanning {query_info['source']}: {e}")
                continue
        
        # Deduplicate incidents by similarity
        incidents = self._deduplicate_incidents(incidents)
        
        # Sort by severity and distance
        incidents.sort(key=lambda x: (
            {"critical": 0, "high": 1, "medium": 2, "low": 3}[x.severity.value],
            x.location.distance_from_hospital or 999
        ))
        
        return ScanResponse(
            success=True,
            incidents=incidents[:10],  # Return top 10
            scan_time=datetime.now(),
            sources_checked=list(set(sources_checked)),
            message=f"Found {len(incidents)} potential incidents"
        )
    
    def _build_search_queries(self, request: ScanRequest) -> List[Dict[str, str]]:
        """Build search queries for Tavily"""
        location = f"Delhi NCR" if not request.location else f"near {request.location.address}"
        
        queries = [
            {"query": f"fire accident emergency {location} today", "source": "news"},
            {"query": f"road accident injury {location} breaking", "source": "news"},
            {"query": f"building collapse emergency {location}", "source": "news"},
            {"query": f"chemical leak gas hazmat {location}", "source": "news"},
            {"query": f"stampede crowd crush {location}", "source": "news"},
            {"query": f"explosion blast attack {location}", "source": "news"},
            {"query": f"train metro accident {location} today", "source": "news"},
            {"query": f"hospital emergency mass casualty {location}", "source": "emergency"},
        ]
        
        # Filter by requested sources
        if request.include_sources:
            queries = [q for q in queries if q["source"] in request.include_sources]
        
        return queries
    
    async def _search_tavily(self, query: str) -> List[Dict[str, Any]]:
        """Search using Tavily API"""
        try:
            response = self.tavily.search(
                query=query,
                search_depth="advanced",
                max_results=5,
                include_answer=True,
                include_raw_content=True,
                include_images=False,
                # Focus on recent news
                topic="news"
            )
            return response.get("results", [])
        except Exception as e:
            print(f"Tavily search error: {e}")
            return []
    
    async def _analyze_incident(self, result: Dict[str, Any], source: str) -> Optional[IncidentReport]:
        """Analyze a search result using Gemini AI"""
        try:
            # Format the prompt
            formatted_prompt = self.analysis_prompt.format_messages(
                hospital_name=self.settings.hospital_name,
                hospital_lat=self.settings.hospital_lat,
                hospital_lng=self.settings.hospital_lng,
                scan_radius=self.settings.scan_radius_km,
                title=result.get("title", "Unknown"),
                content=result.get("content", result.get("raw_content", ""))[:2000],
                source=result.get("url", "Unknown"),
                location=self._extract_location_hint(result),
                published=result.get("published_date", "Unknown")
            )
            
            # Get AI analysis
            response = await self.llm.ainvoke(formatted_prompt)
            analysis = self._parse_analysis(response.content)
            
            if not analysis:
                return None
            
            # Calculate distance from hospital (ensure it's a float)
            try:
                distance = float(analysis.get("estimated_distance_km", 10))
            except (ValueError, TypeError):
                distance = 10.0
            
            # Safely extract casualty estimates
            casualty_est = analysis.get("casualty_estimate", {})
            try:
                cas_min = int(casualty_est.get("min", 1))
                cas_max = int(casualty_est.get("max", 10))
                cas_likely = int(casualty_est.get("likely", 5))
                cas_confidence = float(casualty_est.get("confidence", 0.5))
            except (ValueError, TypeError):
                cas_min, cas_max, cas_likely, cas_confidence = 1, 10, 5, 0.5
            
            # Create incident report
            incident = IncidentReport(
                id=str(uuid.uuid4()),
                title=result.get("title", "Unknown Incident"),
                description=result.get("content", "")[:500],
                type=IncidentType(analysis.get("incident_type", "unknown")),
                severity=SeverityLevel(analysis.get("severity", "medium")),
                location=Location(
                    lat=self.settings.hospital_lat + (distance * 0.009),  # Approximate
                    lng=self.settings.hospital_lng + (distance * 0.009),
                    address=analysis.get("location_extracted", "Unknown location"),
                    distance_from_hospital=distance
                ),
                estimated_casualties=CasualtyEstimate(
                    min=cas_min,
                    max=cas_max,
                    likely=cas_likely,
                    confidence=cas_confidence
                ),
                injury_types=analysis.get("injury_types", ["Unknown"]),
                recommended_departments=analysis.get("departments_needed", ["Emergency"]),
                eta_minutes=analysis.get("eta_minutes", 30),
                source=source,
                source_url=result.get("url"),
                detected_at=datetime.now(),
                confidence_score=cas_confidence,
                raw_data=result,
                ai_analysis=analysis.get("analysis_notes", "")
            )
            
            return incident
            
        except Exception as e:
            print(f"Error analyzing incident: {e}")
            return None
    
    def _extract_location_hint(self, result: Dict[str, Any]) -> str:
        """Extract location hints from result"""
        text = result.get("title", "") + " " + result.get("content", "")[:500]
        
        # Common Delhi locations to look for
        locations = [
            "Connaught Place", "Karol Bagh", "Chandni Chowk", "Dwarka",
            "Rohini", "Pitampura", "Janakpuri", "Saket", "Nehru Place",
            "Lajpat Nagar", "Greater Kailash", "Hauz Khas", "Vasant Kunj",
            "Noida", "Gurgaon", "Faridabad", "Ghaziabad"
        ]
        
        for loc in locations:
            if loc.lower() in text.lower():
                return loc
        
        return "Delhi NCR Region"
    
    def _parse_analysis(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse AI analysis response"""
        import json
        try:
            # Extract JSON from response
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = content[start:end]
                return json.loads(json_str)
        except:
            pass
        return None
    
    def _deduplicate_incidents(self, incidents: List[IncidentReport]) -> List[IncidentReport]:
        """Remove duplicate incidents based on similarity"""
        unique = []
        seen_titles = set()
        
        for incident in incidents:
            # Simple title-based dedup
            title_key = incident.title.lower()[:50]
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique.append(incident)
        
        return unique
    
    async def scan_demo(self) -> ScanResponse:
        """
        Demo scan with simulated incidents (for testing without API)
        """
        demo_incidents = [
            IncidentReport(
                id=str(uuid.uuid4()),
                title="Major Fire at Karol Bagh Market",
                description="A massive fire broke out in Karol Bagh's Gaffar Market. Multiple shops affected. Fire brigade on scene. Reports of people trapped.",
                type=IncidentType.FIRE,
                severity=SeverityLevel.CRITICAL,
                location=Location(
                    lat=28.6519,
                    lng=77.1903,
                    address="Gaffar Market, Karol Bagh",
                    distance_from_hospital=4.5
                ),
                estimated_casualties=CasualtyEstimate(min=5, max=25, likely=12, confidence=0.75),
                injury_types=["Burns", "Smoke Inhalation", "Trauma"],
                recommended_departments=["Burn Unit", "Emergency", "ICU", "Pulmonology"],
                eta_minutes=15,
                source="news",
                source_url="https://example.com/news/fire",
                detected_at=datetime.now(),
                confidence_score=0.85,
                ai_analysis="High severity incident. Active fire with reports of trapped individuals. Recommend full burn unit preparation."
            ),
            IncidentReport(
                id=str(uuid.uuid4()),
                title="Multi-vehicle Collision on Ring Road",
                description="Chain collision involving 6 vehicles near AIIMS flyover. Traffic diverted. Ambulances dispatched.",
                type=IncidentType.ROAD_ACCIDENT,
                severity=SeverityLevel.HIGH,
                location=Location(
                    lat=28.5679,
                    lng=77.2069,
                    address="Ring Road near AIIMS Flyover",
                    distance_from_hospital=5.2
                ),
                estimated_casualties=CasualtyEstimate(min=4, max=15, likely=8, confidence=0.8),
                injury_types=["Fractures", "Head Trauma", "Lacerations", "Internal Bleeding"],
                recommended_departments=["Trauma", "Orthopedics", "Neurology", "Surgery"],
                eta_minutes=20,
                source="news",
                source_url="https://example.com/news/accident",
                detected_at=datetime.now(),
                confidence_score=0.8,
                ai_analysis="Multi-vehicle accident with likely serious injuries. Prepare trauma bay and surgical teams."
            ),
            IncidentReport(
                id=str(uuid.uuid4()),
                title="Gas Leak Reported in Dwarka Sector 12",
                description="Residents report strong gas smell. Area being evacuated. Fire services and GAIL team on site.",
                type=IncidentType.GAS_LEAK,
                severity=SeverityLevel.HIGH,
                location=Location(
                    lat=28.5921,
                    lng=77.0460,
                    address="Sector 12, Dwarka",
                    distance_from_hospital=12.3
                ),
                estimated_casualties=CasualtyEstimate(min=10, max=100, likely=30, confidence=0.6),
                injury_types=["Respiratory Distress", "Asphyxiation", "Nausea"],
                recommended_departments=["Pulmonology", "Emergency", "ICU"],
                eta_minutes=35,
                source="emergency",
                source_url="https://example.com/news/gas",
                detected_at=datetime.now(),
                confidence_score=0.7,
                ai_analysis="Potential mass casualty event. Recommend preparing for respiratory emergencies and having antidotes ready."
            )
        ]
        
        return ScanResponse(
            success=True,
            incidents=demo_incidents,
            scan_time=datetime.now(),
            sources_checked=["news", "emergency", "social"],
            message="Demo scan completed - showing simulated incidents"
        )


# Singleton instance
scanner_agent = EmergencyScannerAgent()
