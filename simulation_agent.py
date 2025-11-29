"""
Varuna AI - Autonomous Simulation Agent
"The Ghost in the Machine"

This script simulates real-world environmental conditions and generates
synthetic patient data to demonstrate the Varuna system's capabilities.
It acts as the unpredictable external world, simulating pollution spikes,
patient surges, and emergency scenarios.

Requirements:
    pip install supabase faker python-dotenv
    
Usage:
    python simulation_agent.py
    
    Or with flags:
    python simulation_agent.py --crisis      # Start in crisis mode
    python simulation_agent.py --normal      # Stay in normal mode
"""

import os
import sys
import time
import random
import argparse
from datetime import datetime, timedelta
from typing import Optional
import uuid

try:
    from supabase import create_client, Client
    from faker import Faker
    from dotenv import load_dotenv
except ImportError:
    print("Missing required packages. Install with:")
    print("  pip install supabase faker python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️  Warning: Supabase credentials not found in environment.")
    print("   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")
    print("   Running in simulation-only mode (no database writes)")
    DEMO_MODE = True
else:
    DEMO_MODE = False

if not DEMO_MODE:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

fake = Faker('en_IN')  # Indian locale for realistic names

# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Simulation configuration parameters"""
    
    # AQI thresholds
    AQI_NORMAL_MIN = 50
    AQI_NORMAL_MAX = 100
    AQI_MODERATE_MAX = 150
    AQI_UNHEALTHY_MAX = 200
    AQI_VERY_UNHEALTHY_MAX = 300
    AQI_HAZARDOUS_MAX = 500
    
    # Crisis triggers
    CRISIS_AQI_THRESHOLD = 300
    CRISIS_PATIENT_MULTIPLIER = 3.0
    
    # Timing (in seconds)
    NORMAL_PATIENT_INTERVAL = 120      # 2 minutes in normal
    CRISIS_PATIENT_INTERVAL = 20       # 20 seconds in crisis
    ENVIRONMENTAL_UPDATE_INTERVAL = 30  # Update AQI every 30 seconds
    
    # Patient generation weights
    RESPIRATORY_PROBABILITY_NORMAL = 0.15
    RESPIRATORY_PROBABILITY_CRISIS = 0.85


# ============================================================================
# PATIENT PROFILES
# ============================================================================

# Normal/Random complaints (baseline noise)
NORMAL_COMPLAINTS = [
    ("Minor laceration on hand", 2, "stable"),
    ("Mild fever and body ache", 3, "stable"),
    ("Twisted ankle while walking", 4, "stable"),
    ("Headache for 2 days", 3, "stable"),
    ("Minor burn on forearm", 3, "stable"),
    ("Nausea and vomiting", 4, "stable"),
    ("Back pain", 4, "stable"),
    ("Allergic reaction - mild rash", 3, "stable"),
    ("Cut finger while cooking", 2, "stable"),
    ("Ear pain", 3, "stable"),
    ("Sore throat", 2, "stable"),
    ("Minor fall, bruising", 3, "stable"),
    ("Stomach pain", 4, "stable"),
    ("Dizziness", 4, "stable"),
    ("Dental pain", 3, "stable"),
]

# Respiratory distress complaints (crisis mode)
RESPIRATORY_COMPLAINTS = [
    ("Severe shortness of breath, unable to speak full sentences", 8, "respiratory"),
    ("Acute asthma exacerbation, using accessory muscles", 7, "respiratory"),
    ("Wheezing, difficulty breathing, productive cough", 7, "respiratory"),
    ("SOB at rest, history of COPD, SpO2 dropping", 8, "respiratory"),
    ("Chest tightness, cannot catch breath, anxious", 7, "respiratory"),
    ("Severe wheezing, tripod position, diaphoretic", 8, "respiratory"),
    ("Acute respiratory distress, cyanotic lips", 9, "respiratory"),
    ("Worsening breathlessness, 3 days of cough", 6, "respiratory"),
    ("Cannot breathe, history of asthma, no relief from inhaler", 8, "respiratory"),
    ("Rapid breathing, confused, elderly patient", 9, "respiratory"),
    ("Suffocating feeling, pollution exposure", 7, "respiratory"),
    ("Bronchospasm, audible wheeze, tachypneic", 7, "respiratory"),
]

# Cardiac complaints (occasional high-acuity)
CARDIAC_COMPLAINTS = [
    ("Crushing chest pain radiating to left arm, diaphoretic", 9, "cardiac"),
    ("CP with SOB, nausea, history of MI", 9, "cardiac"),
    ("Chest pressure for 30 minutes, feels like elephant on chest", 8, "cardiac"),
    ("Palpitations, feels like heart racing, dizzy", 6, "cardiac"),
    ("Sudden onset chest pain, worse with exertion", 7, "cardiac"),
]


# ============================================================================
# VITAL SIGNS GENERATORS
# ============================================================================

def generate_stable_vitals() -> dict:
    """Generate normal/stable vital signs"""
    return {
        "bp_systolic": random.randint(110, 135),
        "bp_diastolic": random.randint(70, 85),
        "heart_rate": random.randint(65, 90),
        "respiratory_rate": random.randint(12, 18),
        "spo2": random.randint(96, 100),
        "temperature": round(random.uniform(36.4, 37.2), 1),
    }

def generate_respiratory_distress_vitals() -> dict:
    """Generate vital signs consistent with respiratory distress"""
    return {
        "bp_systolic": random.randint(130, 160),  # Elevated from stress
        "bp_diastolic": random.randint(80, 100),
        "heart_rate": random.randint(100, 130),   # Tachycardia
        "respiratory_rate": random.randint(24, 35), # Tachypnea
        "spo2": random.randint(84, 92),           # Hypoxia
        "temperature": round(random.uniform(36.8, 38.0), 1),
    }

def generate_cardiac_vitals() -> dict:
    """Generate vital signs consistent with cardiac emergency"""
    return {
        "bp_systolic": random.choice([random.randint(80, 100), random.randint(160, 190)]),
        "bp_diastolic": random.randint(60, 110),
        "heart_rate": random.choice([random.randint(40, 55), random.randint(110, 150)]),
        "respiratory_rate": random.randint(18, 26),
        "spo2": random.randint(90, 96),
        "temperature": round(random.uniform(36.2, 37.0), 1),
    }


# ============================================================================
# PATIENT GENERATOR
# ============================================================================

def generate_mrn() -> str:
    """Generate a human-readable Medical Record Number"""
    timestamp = hex(int(time.time()))[2:].upper()
    random_part = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=4))
    return f"MRN-{timestamp}-{random_part}"

def generate_patient(crisis_mode: bool, aqi: float) -> dict:
    """
    Generate a synthetic patient based on current environmental conditions.
    
    Args:
        crisis_mode: Whether the system is in crisis mode
        aqi: Current Air Quality Index value
        
    Returns:
        Patient dictionary ready for database insertion
    """
    # Determine patient type based on mode and AQI
    if crisis_mode:
        # In crisis: heavily skew towards respiratory
        roll = random.random()
        if roll < Config.RESPIRATORY_PROBABILITY_CRISIS:
            complaint_data = random.choice(RESPIRATORY_COMPLAINTS)
            vitals = generate_respiratory_distress_vitals()
            # Skew age towards vulnerable populations (children and elderly)
            age = random.choice([
                random.randint(2, 12),   # Children
                random.randint(55, 85),  # Elderly
                random.randint(20, 45),  # Some adults
            ])
        elif roll < 0.92:
            complaint_data = random.choice(NORMAL_COMPLAINTS)
            vitals = generate_stable_vitals()
            age = random.randint(18, 70)
        else:
            complaint_data = random.choice(CARDIAC_COMPLAINTS)
            vitals = generate_cardiac_vitals()
            age = random.randint(45, 75)
    else:
        # Normal mode: mostly random complaints
        roll = random.random()
        if roll < Config.RESPIRATORY_PROBABILITY_NORMAL:
            complaint_data = random.choice(RESPIRATORY_COMPLAINTS[:4])  # Milder respiratory
            vitals = generate_respiratory_distress_vitals()
            vitals["spo2"] = random.randint(91, 95)  # Less severe
            vitals["respiratory_rate"] = random.randint(20, 26)
            age = random.randint(25, 70)
        elif roll < 0.95:
            complaint_data = random.choice(NORMAL_COMPLAINTS)
            vitals = generate_stable_vitals()
            age = random.randint(5, 80)
        else:
            complaint_data = random.choice(CARDIAC_COMPLAINTS)
            vitals = generate_cardiac_vitals()
            age = random.randint(50, 80)
    
    chief_complaint, severity, condition_type = complaint_data
    
    # Generate patient demographics
    gender = random.choice(["male", "female"])
    if gender == "male":
        name = fake.name_male()
    else:
        name = fake.name_female()
    
    # Determine symptom duration
    if severity >= 7:
        duration = random.choice(["30 minutes", "1 hour", "2 hours", "few hours"])
    else:
        duration = random.choice(["6 hours", "1 day", "2 days", "3 days", "1 week"])
    
    # Build patient record
    patient = {
        "id": str(uuid.uuid4()),
        "mrn": generate_mrn(),
        "full_name": name,
        "age": age,
        "gender": gender,
        "chief_complaint": chief_complaint,
        "symptom_duration": duration,
        "severity": severity,
        "temperature_unit": "C",
        "status": "waiting",
        **vitals
    }
    
    return patient


# ============================================================================
# ALERT GENERATOR
# ============================================================================

def generate_environmental_alert(aqi: float, pm25: float) -> Optional[dict]:
    """Generate an environmental alert if AQI is dangerous"""
    if aqi < Config.AQI_UNHEALTHY_MAX:
        return None
    
    if aqi >= Config.AQI_HAZARDOUS_MAX - 50:
        severity = "critical"
        title = "HAZARDOUS AIR QUALITY EMERGENCY"
        message = f"PM2.5 sensors reading {int(pm25)} µg/m³. AQI at {int(aqi)}. Immediate respiratory surge expected. Activate all emergency protocols."
    elif aqi >= Config.AQI_VERY_UNHEALTHY_MAX:
        severity = "critical"
        title = "Very Unhealthy Air Quality Alert"
        message = f"AQI has reached {int(aqi)}. Expecting 40% increase in respiratory presentations. Pre-position nebulizer equipment."
    else:
        severity = "warning"
        title = "Elevated Air Quality Warning"
        message = f"AQI at {int(aqi)}. Monitoring for potential respiratory surge. Sensitive populations at risk."
    
    return {
        "type": "environmental",
        "severity": severity,
        "title": title,
        "message": message,
        "source": "Environmental Sensor Network",
        "acknowledged": False,
    }


def generate_pattern_alert(respiratory_count: int, time_window: int) -> Optional[dict]:
    """Generate AI pattern detection alert"""
    if respiratory_count < 3:
        return None
    
    return {
        "type": "system",
        "severity": "warning" if respiratory_count < 5 else "critical",
        "title": "AI Pattern Detection Alert",
        "message": f"Detected {respiratory_count} respiratory distress cases in last {time_window} minutes. Pattern match found. Potential environmental surge in progress.",
        "source": "Varuna AI",
        "acknowledged": False,
    }


# ============================================================================
# ENVIRONMENTAL MODEL
# ============================================================================

class EnvironmentalModel:
    """
    Simulates environmental conditions with realistic fluctuations.
    Uses weighted stochastic logic to mimic actual pollution patterns.
    """
    
    def __init__(self, start_in_crisis: bool = False):
        self.aqi = Config.AQI_NORMAL_MAX if start_in_crisis else random.uniform(
            Config.AQI_NORMAL_MIN, Config.AQI_NORMAL_MAX
        )
        self.pm25 = self.aqi * 0.8
        self.pm10 = self.aqi * 1.2
        self.temperature = random.uniform(18, 32)
        self.humidity = random.uniform(40, 70)
        self.crisis_mode = start_in_crisis
        self.crisis_timer = 0
        self.time_in_crisis = 0
        
        # Crisis cycle configuration
        self.crisis_buildup_rate = 15  # AQI increase per update during buildup
        self.crisis_peak_duration = 300  # 5 minutes at peak
        self.crisis_decay_rate = 8  # AQI decrease per update during recovery
        
    def update(self) -> dict:
        """Update environmental conditions"""
        if self.crisis_mode:
            self._update_crisis()
        else:
            self._update_normal()
        
        # Update related values
        self.pm25 = self.aqi * random.uniform(0.7, 0.9)
        self.pm10 = self.aqi * random.uniform(1.1, 1.4)
        self.temperature += random.uniform(-0.5, 0.5)
        self.humidity += random.uniform(-2, 2)
        
        # Clamp values
        self.temperature = max(15, min(42, self.temperature))
        self.humidity = max(20, min(95, self.humidity))
        
        return self.get_state()
    
    def _update_normal(self):
        """Normal mode: gentle fluctuations"""
        change = random.uniform(-5, 7)  # Slight upward bias
        self.aqi = max(Config.AQI_NORMAL_MIN, min(Config.AQI_MODERATE_MAX, self.aqi + change))
        
        # Random chance to trigger crisis (simulating sudden pollution event)
        if random.random() < 0.02:  # 2% chance per update
            self.crisis_mode = True
            print("\n🔴 CRISIS TRIGGERED: Environmental emergency beginning!")
            
    def _update_crisis(self):
        """Crisis mode: rapid AQI increase then plateau then decrease"""
        self.time_in_crisis += 1
        
        if self.aqi < Config.AQI_HAZARDOUS_MAX - 100:
            # Building up
            self.aqi += self.crisis_buildup_rate + random.uniform(-3, 5)
        elif self.crisis_timer < self.crisis_peak_duration / Config.ENVIRONMENTAL_UPDATE_INTERVAL:
            # At peak
            self.crisis_timer += 1
            self.aqi += random.uniform(-10, 10)
        else:
            # Decay phase
            self.aqi -= self.crisis_decay_rate + random.uniform(-2, 3)
            
            if self.aqi < Config.AQI_MODERATE_MAX:
                self.crisis_mode = False
                self.crisis_timer = 0
                self.time_in_crisis = 0
                print("\n🟢 Crisis resolved. Returning to normal operations.")
        
        self.aqi = max(Config.AQI_NORMAL_MIN, min(500, self.aqi))
    
    def force_crisis(self):
        """Manually trigger crisis mode"""
        self.crisis_mode = True
        self.aqi = Config.AQI_VERY_UNHEALTHY_MAX
        print("\n🔴 MANUAL CRISIS TRIGGER: Environmental emergency activated!")
    
    def get_state(self) -> dict:
        """Get current environmental state"""
        return {
            "aqi": round(self.aqi, 1),
            "pm25": round(self.pm25, 1),
            "pm10": round(self.pm10, 1),
            "temperature": round(self.temperature, 1),
            "humidity": round(self.humidity, 1),
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    def is_crisis(self) -> bool:
        """Check if in crisis mode"""
        return self.crisis_mode or self.aqi >= Config.CRISIS_AQI_THRESHOLD


# ============================================================================
# MAIN SIMULATION LOOP
# ============================================================================

class SimulationAgent:
    """
    The Ghost in the Machine - Autonomous simulation agent that generates
    realistic patient flow and environmental conditions.
    """
    
    def __init__(self, start_in_crisis: bool = False, force_normal: bool = False):
        self.environment = EnvironmentalModel(start_in_crisis)
        self.force_normal = force_normal
        self.patients_generated = 0
        self.alerts_generated = 0
        self.respiratory_count_window = []  # Track respiratory cases
        self.last_env_update = time.time()
        self.last_patient_time = time.time()
        self.last_alert_aqi = 0
        
    def run(self):
        """Main simulation loop"""
        print("=" * 60)
        print("  VARUNA AI - AUTONOMOUS SIMULATION AGENT")
        print("  'The Ghost in the Machine'")
        print("=" * 60)
        print(f"\n🚀 Starting simulation at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Mode: {'DEMO (no database)' if DEMO_MODE else 'LIVE (database connected)'}")
        print(f"   Initial AQI: {self.environment.aqi:.1f}")
        print(f"   Crisis Mode: {'ACTIVE' if self.environment.crisis_mode else 'Standby'}")
        print("\n   Press Ctrl+C to stop\n")
        print("-" * 60)
        
        try:
            while True:
                current_time = time.time()
                
                # Update environment periodically
                if current_time - self.last_env_update >= Config.ENVIRONMENTAL_UPDATE_INTERVAL:
                    self._update_environment()
                    self.last_env_update = current_time
                
                # Determine patient generation interval
                is_crisis = self.environment.is_crisis() and not self.force_normal
                interval = Config.CRISIS_PATIENT_INTERVAL if is_crisis else Config.NORMAL_PATIENT_INTERVAL
                
                # Generate patient
                if current_time - self.last_patient_time >= interval:
                    self._generate_patient(is_crisis)
                    self.last_patient_time = current_time
                
                # Check for pattern alerts
                self._check_patterns()
                
                # Sleep briefly to prevent CPU spinning
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n\n" + "=" * 60)
            print("  SIMULATION TERMINATED")
            print("=" * 60)
            print(f"  Total patients generated: {self.patients_generated}")
            print(f"  Total alerts generated: {self.alerts_generated}")
            print(f"  Final AQI: {self.environment.aqi:.1f}")
            print("=" * 60)
    
    def _update_environment(self):
        """Update and broadcast environmental conditions"""
        state = self.environment.update()
        
        # Print status
        status_icon = "🔴" if self.environment.is_crisis() else "🟢"
        print(f"\n{status_icon} ENV UPDATE | AQI: {state['aqi']:.0f} | PM2.5: {state['pm25']:.0f} | Temp: {state['temperature']:.1f}°C")
        
        # Insert environmental data
        if not DEMO_MODE:
            try:
                supabase.table("environmental_data").insert(state).execute()
            except Exception as e:
                print(f"   ⚠️  DB Error: {e}")
        
        # Generate environmental alert if needed
        if abs(state['aqi'] - self.last_alert_aqi) > 50 or (state['aqi'] > 300 and self.last_alert_aqi <= 300):
            alert = generate_environmental_alert(state['aqi'], state['pm25'])
            if alert:
                self._send_alert(alert)
                self.last_alert_aqi = state['aqi']
    
    def _generate_patient(self, crisis_mode: bool):
        """Generate and insert a patient"""
        patient = generate_patient(crisis_mode, self.environment.aqi)
        
        # Track respiratory cases
        if "breath" in patient["chief_complaint"].lower() or \
           "wheez" in patient["chief_complaint"].lower() or \
           "asthma" in patient["chief_complaint"].lower() or \
           patient["spo2"] < 93:
            self.respiratory_count_window.append(time.time())
        
        # Print patient info
        severity_indicator = "🔴" if patient["severity"] >= 7 else "🟡" if patient["severity"] >= 5 else "🟢"
        print(f"   {severity_indicator} NEW PATIENT | {patient['full_name']} | Age: {patient['age']} | Severity: {patient['severity']}/10")
        print(f"      └─ {patient['chief_complaint'][:60]}{'...' if len(patient['chief_complaint']) > 60 else ''}")
        print(f"      └─ Vitals: HR {patient['heart_rate']} | RR {patient['respiratory_rate']} | SpO2 {patient['spo2']}%")
        
        # Insert patient
        if not DEMO_MODE:
            try:
                supabase.table("patients").insert(patient).execute()
            except Exception as e:
                print(f"      ⚠️  DB Error: {e}")
        
        self.patients_generated += 1
    
    def _check_patterns(self):
        """Check for patterns that should trigger AI alerts"""
        # Clean old entries (keep last 10 minutes)
        cutoff = time.time() - 600
        self.respiratory_count_window = [t for t in self.respiratory_count_window if t > cutoff]
        
        # Check for respiratory cluster
        if len(self.respiratory_count_window) >= 3:
            # Only alert every 5 minutes
            recent_count = len([t for t in self.respiratory_count_window if t > time.time() - 300])
            if recent_count >= 3 and random.random() < 0.3:  # Don't spam alerts
                alert = generate_pattern_alert(recent_count, 5)
                if alert:
                    self._send_alert(alert)
    
    def _send_alert(self, alert: dict):
        """Send an alert to the database"""
        print(f"\n   ⚡ ALERT: [{alert['severity'].upper()}] {alert['title']}")
        
        if not DEMO_MODE:
            try:
                supabase.table("alerts").insert(alert).execute()
            except Exception as e:
                print(f"      ⚠️  DB Error: {e}")
        
        self.alerts_generated += 1


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Varuna AI - Autonomous Simulation Agent"
    )
    parser.add_argument(
        "--crisis",
        action="store_true",
        help="Start immediately in crisis mode"
    )
    parser.add_argument(
        "--normal",
        action="store_true",
        help="Force normal mode (no automatic crisis triggering)"
    )
    
    args = parser.parse_args()
    
    agent = SimulationAgent(
        start_in_crisis=args.crisis,
        force_normal=args.normal
    )
    agent.run()
