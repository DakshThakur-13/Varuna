"""
Varuna AI Agent - Configuration
Centralized configuration management
"""

import os
from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Keys
    groq_api_key: str = ""
    tavily_api_key: str = ""
    google_api_key: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    
    # Hospital Configuration
    hospital_name: str = "Central Delhi ERU"
    hospital_lat: float = 28.6139
    hospital_lng: float = 77.2090
    scan_radius_km: float = 15.0
    
    # Agent Configuration
    agent_scan_interval_seconds: int = 60
    enable_auto_scan: bool = True
    
    # Redis Configuration
    redis_url: str = "redis://localhost:6379"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8001
    debug: bool = True
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Incident type configurations for casualty estimation
INCIDENT_CONFIGS = {
    "fire": {
        "base_casualties": {"min": 5, "max": 50, "likely": 15},
        "injury_types": ["Burns", "Smoke Inhalation", "Trauma", "Cardiac Events"],
        "departments": ["Burn Unit", "Emergency", "ICU", "Pulmonology"],
        "severity_multiplier": 1.2
    },
    "road_accident": {
        "base_casualties": {"min": 2, "max": 20, "likely": 6},
        "injury_types": ["Fractures", "Head Trauma", "Internal Bleeding", "Lacerations"],
        "departments": ["Trauma", "Orthopedics", "Neurology", "Surgery"],
        "severity_multiplier": 1.0
    },
    "building_collapse": {
        "base_casualties": {"min": 10, "max": 100, "likely": 35},
        "injury_types": ["Crush Injuries", "Fractures", "Internal Bleeding", "Asphyxiation"],
        "departments": ["Trauma", "Orthopedics", "Surgery", "ICU"],
        "severity_multiplier": 1.5
    },
    "chemical_spill": {
        "base_casualties": {"min": 5, "max": 200, "likely": 30},
        "injury_types": ["Chemical Burns", "Respiratory Distress", "Poisoning", "Eye Injuries"],
        "departments": ["Toxicology", "Pulmonology", "Burns", "Ophthalmology"],
        "severity_multiplier": 1.3
    },
    "gas_leak": {
        "base_casualties": {"min": 10, "max": 500, "likely": 50},
        "injury_types": ["Asphyxiation", "Respiratory Failure", "Burns", "Cardiac Events"],
        "departments": ["Pulmonology", "Emergency", "ICU", "Cardiology"],
        "severity_multiplier": 1.4
    },
    "stampede": {
        "base_casualties": {"min": 20, "max": 300, "likely": 60},
        "injury_types": ["Crush Injuries", "Fractures", "Asphyxiation", "Cardiac Events"],
        "departments": ["Trauma", "Orthopedics", "Emergency", "Cardiology"],
        "severity_multiplier": 1.6
    },
    "terror_attack": {
        "base_casualties": {"min": 10, "max": 500, "likely": 50},
        "injury_types": ["Blast Injuries", "Shrapnel Wounds", "Burns", "Trauma"],
        "departments": ["Trauma", "Surgery", "Burns", "ICU"],
        "severity_multiplier": 2.0
    },
    "train_accident": {
        "base_casualties": {"min": 20, "max": 300, "likely": 80},
        "injury_types": ["Fractures", "Head Trauma", "Internal Bleeding", "Burns"],
        "departments": ["Trauma", "Orthopedics", "Neurology", "Surgery"],
        "severity_multiplier": 1.8
    },
    "flood": {
        "base_casualties": {"min": 5, "max": 100, "likely": 25},
        "injury_types": ["Drowning", "Hypothermia", "Infections", "Trauma"],
        "departments": ["Emergency", "Pulmonology", "Infectious Disease", "ICU"],
        "severity_multiplier": 1.1
    },
    "epidemic_outbreak": {
        "base_casualties": {"min": 50, "max": 5000, "likely": 500},
        "injury_types": ["Fever", "Respiratory Distress", "Organ Failure", "Dehydration"],
        "departments": ["Infectious Disease", "ICU", "Pulmonology", "Emergency"],
        "severity_multiplier": 1.0
    },
    "unknown": {
        "base_casualties": {"min": 1, "max": 50, "likely": 10},
        "injury_types": ["Various", "Trauma", "Medical Emergency"],
        "departments": ["Emergency", "Trauma", "ICU"],
        "severity_multiplier": 1.0
    }
}


# Nearby hospitals for mesh network
NEARBY_HOSPITALS = [
    {
        "id": "safdarjung",
        "name": "Safdarjung Hospital",
        "lat": 28.5679,
        "lng": 77.2069,
        "distance_km": 5.2,
        "capacity": {"beds": 1500, "icu": 100, "available_beds": 45},
        "specialties": ["Trauma", "Burns", "Cardiology"]
    },
    {
        "id": "aiims",
        "name": "AIIMS Delhi",
        "lat": 28.5672,
        "lng": 77.2100,
        "distance_km": 5.5,
        "capacity": {"beds": 2500, "icu": 200, "available_beds": 80},
        "specialties": ["Neurology", "Cardiology", "Oncology", "Trauma"]
    },
    {
        "id": "rml",
        "name": "RML Hospital",
        "lat": 28.6269,
        "lng": 77.2050,
        "distance_km": 2.1,
        "capacity": {"beds": 800, "icu": 60, "available_beds": 25},
        "specialties": ["General Surgery", "Orthopedics", "Emergency"]
    },
    {
        "id": "gtb",
        "name": "GTB Hospital",
        "lat": 28.6866,
        "lng": 77.3109,
        "distance_km": 12.5,
        "capacity": {"beds": 1800, "icu": 120, "available_beds": 60},
        "specialties": ["Trauma", "Burns", "Pediatrics"]
    },
    {
        "id": "lnjp",
        "name": "LNJP Hospital",
        "lat": 28.6369,
        "lng": 77.2393,
        "distance_km": 3.8,
        "capacity": {"beds": 2000, "icu": 150, "available_beds": 55},
        "specialties": ["Infectious Disease", "Pulmonology", "Emergency"]
    }
]


# Vendor configurations
VENDORS = [
    {
        "id": "vendor_oxygen_1",
        "name": "Delhi Oxygen Supplies",
        "resource_type": "oxygen",
        "response_time_minutes": 30,
        "reliability_score": 0.95,
        "contact": "+91-11-2345-6789",
        "capacity": "Unlimited"
    },
    {
        "id": "vendor_blood_1",
        "name": "Central Blood Bank",
        "resource_type": "blood",
        "response_time_minutes": 45,
        "reliability_score": 0.92,
        "contact": "+91-11-3456-7890",
        "capacity": "500 units/day"
    },
    {
        "id": "vendor_meds_1",
        "name": "PharmaCare Express",
        "resource_type": "medications",
        "response_time_minutes": 60,
        "reliability_score": 0.88,
        "contact": "+91-11-4567-8901",
        "capacity": "Full formulary"
    },
    {
        "id": "vendor_equipment_1",
        "name": "MedEquip Rentals",
        "resource_type": "equipment",
        "response_time_minutes": 120,
        "reliability_score": 0.85,
        "contact": "+91-11-5678-9012",
        "capacity": "Ventilators, Monitors, Beds"
    },
    {
        "id": "vendor_ambulance_1",
        "name": "Delhi EMS Network",
        "resource_type": "ambulance",
        "response_time_minutes": 15,
        "reliability_score": 0.97,
        "contact": "102",
        "capacity": "50 ambulances"
    }
]
