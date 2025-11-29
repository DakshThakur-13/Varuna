import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { IncidentReport } from '@/types/agent';

// Initialize Groq
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Hospital location (Central Mumbai)
const HOSPITAL_LOCATION = {
  latitude: 19.0760,
  longitude: 72.8777,
  name: 'Central Mumbai Medical Center',
  scanRadius: 15, // km
};

// Simulated real-time data sources (in production, these would be real APIs)
function generateRealisticIncidents(): string[] {
  const now = new Date();
  const hour = now.getHours();
  
  // Time-based incident simulation
  const incidents: string[] = [];
  
  // Rush hour = more traffic accidents
  if (hour >= 8 && hour <= 10 || hour >= 17 && hour <= 20) {
    if (Math.random() > 0.6) {
      incidents.push("TRAFFIC ALERT: Multi-vehicle collision reported on Western Express Highway near Andheri. 3-4 vehicles involved, injuries reported. Emergency services en route.");
    }
  }
  
  // Industrial area incidents during work hours
  if (hour >= 9 && hour <= 18) {
    if (Math.random() > 0.8) {
      incidents.push("BREAKING: Fire reported at chemical factory in MIDC Andheri. Workers being evacuated. Potential chemical exposure risk. Multiple ambulances dispatched.");
    }
  }
  
  // Construction site incidents
  if (Math.random() > 0.85) {
    incidents.push("EMERGENCY: Scaffolding collapse at construction site in Goregaon. Multiple workers trapped. Rescue operations initiated. Casualties feared.");
  }
  
  // Festival/crowd incidents (evenings/weekends)
  if (hour >= 18 || now.getDay() === 0 || now.getDay() === 6) {
    if (Math.random() > 0.9) {
      incidents.push("CROWD ALERT: Large gathering at Juhu Beach exceeding safety limits. Police requesting medical standby. Potential stampede risk.");
    }
  }
  
  // Air quality alerts
  if (Math.random() > 0.7) {
    const aqi = Math.floor(Math.random() * 200) + 250;
    incidents.push(`AIR QUALITY ALERT: AQI reaches ${aqi} in Bandra-Kurla Complex. Health advisory issued. Respiratory emergency surge expected.`);
  }
  
  // Random major incidents
  if (Math.random() > 0.95) {
    const majorIncidents = [
      "BREAKING: Gas pipeline leak reported in Chembur residential area. Evacuation underway. Multiple casualties possible.",
      "URGENT: Building fire in Dadar high-rise. Residents trapped on upper floors. Fire brigade on scene.",
      "ALERT: Train derailment near Kurla station. Passenger injuries reported. Major emergency response activated.",
    ];
    incidents.push(majorIncidents[Math.floor(Math.random() * majorIncidents.length)]);
  }
  
  return incidents;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// AI-powered incident analysis with casualty prediction
async function analyzeIncidentWithAI(rawData: string): Promise<Partial<IncidentReport> | null> {
  if (!groq) {
    return analyzeIncidentRuleBased(rawData);
  }

  try {
    const prompt = `You are an advanced emergency incident analyzer for a hospital emergency management system in Mumbai, India.

Analyze this incident report and provide DETAILED casualty predictions based on:
1. Type and scale of incident
2. Time of day and location density
3. Historical patterns for similar incidents
4. Response time factors

RAW REPORT:
"${rawData}"

HOSPITAL LOCATION: Mumbai, India (Lat: 19.0760, Lon: 72.8777)
CURRENT TIME: ${new Date().toLocaleTimeString()}

Respond ONLY with a valid JSON object:
{
  "isRelevant": boolean,
  "type": "accident" | "fire" | "explosion" | "building_collapse" | "chemical_spill" | "mass_gathering" | "violence" | "natural_disaster" | "disease_outbreak",
  "severity": "low" | "medium" | "high" | "critical",
  "title": "Brief title (max 60 chars)",
  "description": "Detailed description",
  "estimatedLocation": {
    "address": "Specific Mumbai location",
    "latitude": number (Mumbai area: 18.9-19.3),
    "longitude": number (Mumbai area: 72.7-73.0)
  },
  "estimatedCasualties": {
    "min": number,
    "max": number,
    "likely": number,
    "breakdown": {
      "critical": number (need ICU/surgery),
      "serious": number (need hospitalization),
      "minor": number (outpatient treatment)
    }
  },
  "expectedInjuryTypes": ["specific injury types based on incident"],
  "recommendedPreparations": ["specific preparation steps for ER"],
  "estimatedArrivalTime": number (minutes until first patients),
  "confidence": number (0-100)
}`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
    });
    
    const text = completion.choices[0]?.message?.content?.trim() || '';
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return analyzeIncidentRuleBased(rawData);
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    if (!analysis.isRelevant) return null;

    const distance = calculateDistance(
      HOSPITAL_LOCATION.latitude,
      HOSPITAL_LOCATION.longitude,
      analysis.estimatedLocation.latitude,
      analysis.estimatedLocation.longitude
    );

    if (distance > HOSPITAL_LOCATION.scanRadius) return null;

    return {
      source: 'news',
      type: analysis.type,
      severity: analysis.severity,
      title: analysis.title,
      description: analysis.description,
      location: {
        address: analysis.estimatedLocation.address,
        latitude: analysis.estimatedLocation.latitude,
        longitude: analysis.estimatedLocation.longitude,
        distanceFromHospital: Math.round(distance * 10) / 10,
      },
      estimatedCasualties: analysis.estimatedCasualties,
      expectedInjuryTypes: analysis.expectedInjuryTypes,
      recommendedPreparations: analysis.recommendedPreparations,
      estimatedArrivalTime: analysis.estimatedArrivalTime,
      confidence: analysis.confidence,
      rawData: rawData,
    };
  } catch (error) {
    console.error('AI analysis failed:', error);
    return analyzeIncidentRuleBased(rawData);
  }
}

// Fallback rule-based analysis with casualty prediction
function analyzeIncidentRuleBased(rawData: string): Partial<IncidentReport> | null {
  const lowerData = rawData.toLowerCase();
  
  // Skip non-emergency content
  if (!lowerData.match(/casualt|injur|fire|accident|collapse|emergency|alert|trapped|evacuat/)) {
    return null;
  }

  // Incident type detection
  const typePatterns: Record<IncidentReport['type'], RegExp> = {
    fire: /fire|blaze|burning|flames|smoke/,
    accident: /accident|crash|collision|pile-?up|hit|vehicle/,
    building_collapse: /collapse|building fell|structure|scaffolding|trapped/,
    explosion: /explosion|blast|exploded|gas leak/,
    chemical_spill: /chemical|toxic|hazmat|spill|leak|exposure/,
    mass_gathering: /crowd|gathering|festival|stampede|crush/,
    violence: /shooting|attack|violence|riot|assault/,
    natural_disaster: /earthquake|flood|storm|cyclone/,
    disease_outbreak: /outbreak|epidemic|infection|virus/,
  };

  let detectedType: IncidentReport['type'] = 'accident';
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(lowerData)) {
      detectedType = type as IncidentReport['type'];
      break;
    }
  }

  // Severity and casualty estimation based on keywords
  let severity: IncidentReport['severity'] = 'medium';
  let casualties = { min: 2, max: 8, likely: 4, breakdown: { critical: 1, serious: 2, minor: 1 } };

  if (lowerData.match(/major|massive|multiple casualties|mass|dozens/)) {
    severity = 'critical';
    casualties = { min: 15, max: 50, likely: 25, breakdown: { critical: 8, serious: 12, minor: 5 } };
  } else if (lowerData.match(/serious|several|multiple|trapped/)) {
    severity = 'high';
    casualties = { min: 5, max: 15, likely: 8, breakdown: { critical: 3, serious: 4, minor: 1 } };
  } else if (lowerData.match(/minor|small|single/)) {
    severity = 'low';
    casualties = { min: 1, max: 3, likely: 2, breakdown: { critical: 0, serious: 1, minor: 1 } };
  }

  // Injury type mapping
  const injuryMap: Record<string, string[]> = {
    fire: ['Burns (2nd-3rd degree)', 'Smoke inhalation', 'Respiratory distress', 'Carbon monoxide poisoning'],
    accident: ['Fractures', 'Head trauma', 'Internal bleeding', 'Spinal injuries', 'Lacerations'],
    building_collapse: ['Crush syndrome', 'Fractures', 'Internal injuries', 'Dust inhalation', 'Traumatic asphyxia'],
    explosion: ['Blast injuries', 'Burns', 'Shrapnel wounds', 'Tympanic rupture', 'Traumatic amputation'],
    chemical_spill: ['Chemical burns', 'Respiratory failure', 'Toxic exposure', 'Eye injuries'],
    mass_gathering: ['Crush injuries', 'Cardiac arrest', 'Heat stroke', 'Fractures', 'Panic attacks'],
    violence: ['Penetrating trauma', 'Blunt trauma', 'Hemorrhage'],
    natural_disaster: ['Trauma', 'Drowning', 'Fractures', 'Hypothermia'],
    disease_outbreak: ['Respiratory distress', 'Fever', 'Dehydration'],
  };

  // Preparation recommendations
  const prepMap: Record<string, string[]> = {
    fire: ['Prepare burn unit', 'Ready ventilators', 'Stock IV fluids', 'Alert plastic surgery'],
    accident: ['Trauma bay ready', 'Blood bank alert', 'Ortho team standby', 'CT scanner available'],
    building_collapse: ['Mass casualty protocol', 'Crush injury kits', 'Dialysis standby', 'Blood products ready'],
    explosion: ['Trauma teams ready', 'OR availability', 'Blood bank full alert', 'Burn unit preparation'],
    chemical_spill: ['Decontamination setup', 'Antidotes ready', 'Respiratory support', 'Toxicology consult'],
    mass_gathering: ['Triage stations', 'Cardiac arrest kits', 'Cooling equipment', 'Security alert'],
    violence: ['Trauma surgery ready', 'Blood products', 'Security lockdown', 'Police coordination'],
    natural_disaster: ['Mass casualty mode', 'All hands on deck', 'Generator check', 'Supply inventory'],
    disease_outbreak: ['Isolation protocols', 'PPE distribution', 'Testing setup', 'Quarantine areas'],
  };

  // Location approximation in Mumbai
  const mumbaiLocations = [
    { name: 'Andheri', lat: 19.1136, lon: 72.8697 },
    { name: 'Bandra', lat: 19.0596, lon: 72.8295 },
    { name: 'Dadar', lat: 19.0178, lon: 72.8478 },
    { name: 'Kurla', lat: 19.0726, lon: 72.8845 },
    { name: 'Goregaon', lat: 19.1663, lon: 72.8526 },
    { name: 'Chembur', lat: 19.0522, lon: 72.9005 },
  ];
  
  let location = mumbaiLocations[Math.floor(Math.random() * mumbaiLocations.length)];
  for (const loc of mumbaiLocations) {
    if (lowerData.includes(loc.name.toLowerCase())) {
      location = loc;
      break;
    }
  }

  const distance = calculateDistance(
    HOSPITAL_LOCATION.latitude,
    HOSPITAL_LOCATION.longitude,
    location.lat,
    location.lon
  );

  return {
    source: 'news',
    type: detectedType,
    severity,
    title: rawData.substring(0, 60).replace(/[:\-].*$/, '').trim(),
    description: rawData,
    location: {
      address: `${location.name}, Mumbai`,
      latitude: location.lat,
      longitude: location.lon,
      distanceFromHospital: Math.round(distance * 10) / 10,
    },
    estimatedCasualties: casualties,
    expectedInjuryTypes: injuryMap[detectedType] || ['General trauma'],
    recommendedPreparations: prepMap[detectedType] || ['General emergency preparation'],
    estimatedArrivalTime: Math.round(8 + distance * 2 + Math.random() * 5),
    confidence: 70,
    rawData,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const manualScan = body.forceScan === true;
    
    // Generate realistic incidents
    const rawDataList = generateRealisticIncidents();
    
    // If no incidents generated and not forced, return empty
    if (rawDataList.length === 0 && !manualScan) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'No incidents detected in scanning area',
        incidentsDetected: 0,
        incidents: [],
      });
    }
    
    // Analyze each incident
    const incidents: IncidentReport[] = [];
    
    for (const rawData of rawDataList) {
      const analysis = await analyzeIncidentWithAI(rawData);
      if (analysis) {
        incidents.push({
          id: `INC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          ...analysis,
          detectedAt: new Date(),
          status: 'detected',
        } as IncidentReport);
      }
    }

    // Sort by severity and distance
    incidents.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.location.distanceFromHospital - b.location.distanceFromHospital;
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      scanRadius: HOSPITAL_LOCATION.scanRadius,
      hospitalLocation: HOSPITAL_LOCATION,
      incidentsDetected: incidents.length,
      incidents,
    });

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scan for incidents' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Emergency Intelligence Scanner',
    status: 'operational',
    version: '1.0.0',
    hospital: HOSPITAL_LOCATION.name,
    scanRadius: `${HOSPITAL_LOCATION.scanRadius} km`,
    capabilities: [
      'Real-time incident detection',
      'AI-powered casualty estimation',
      'Injury type prediction',
      'Preparation recommendations',
      'Arrival time estimation',
    ],
  });
}
