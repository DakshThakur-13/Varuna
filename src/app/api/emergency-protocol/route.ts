'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { EmergencyType, EMERGENCY_SCENARIOS } from '@/types/emergency';
import { getRAGContext, getEmergencyResources, getHybridSearchEngine } from '@/lib/hybridSearch';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Interface for scenario input
interface EmergencyScenarioInput {
  emergencyType: EmergencyType;
  description: string;
  estimatedVictims: number;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  location?: string;
  timeSinceIncident?: string;
}

// Interface for protocol result
interface ProtocolResult {
  protocol: {
    id: string;
    emergencyType: EmergencyType;
    title: string;
    description: string;
    immediateActions: string[];
    requiredResources: string[];
    expectedInjuryTypes: string[];
  };
  triageRecommendation: {
    priority: string;
    color: string;
    reasoning: string;
  };
  immediateActions: string[];
  resourcesNeeded: string[];
  estimatedArrivalWaves: Array<{
    time: string;
    count: number;
    severity: 'critical' | 'serious' | 'minor';
  }>;
  staffAlerts: string[];
  timestamp: string;
}

// Emergency protocols knowledge base
const EMERGENCY_PROTOCOLS_KB: Record<EmergencyType, {
  id: string;
  title: string;
  description: string;
  immediateActions: string[];
  requiredResources: string[];
  staffingRequirements: { physicians: number; nurses: number; technicians: number; specialists: string[] };
  expectedInjuryTypes: string[];
  triagePriorities: Array<{ condition: string; priority: string; color: string }>;
  estimatedPatientVolume: { min: number; max: number; peak: number };
  specialConsiderations: string[];
}> = {
  building_fire: {
    id: 'fire-001',
    title: 'Building Fire Response Protocol',
    description: 'Multi-story building fire with potential trapped victims',
    immediateActions: [
      'Establish triage area at safe distance (minimum 100 meters)',
      'Activate burn unit standby and notify plastic surgery team',
      'Prepare smoke inhalation treatment stations',
      'Request additional respiratory therapists',
      'Set up decontamination area for soot exposure'
    ],
    requiredResources: [
      'Burn treatment supplies (silver sulfadiazine, burn dressings)',
      'Ventilators and oxygen supplies',
      'IV fluids for burn resuscitation (Parkland formula)',
      'Bronchodilators and nebulizers',
      'Carbon monoxide monitoring equipment'
    ],
    staffingRequirements: {
      physicians: 4,
      nurses: 8,
      technicians: 3,
      specialists: ['Burn Surgeon', 'Pulmonologist', 'Anesthesiologist']
    },
    expectedInjuryTypes: [
      'Thermal burns (1st, 2nd, 3rd degree)',
      'Smoke inhalation',
      'Carbon monoxide poisoning',
      'Trauma from falls/jumps',
      'Crush injuries'
    ],
    triagePriorities: [
      { condition: 'Airway burns or severe smoke inhalation', priority: 'immediate', color: 'red' },
      { condition: 'Burns >20% TBSA', priority: 'immediate', color: 'red' },
      { condition: 'Burns 10-20% TBSA without airway involvement', priority: 'delayed', color: 'yellow' },
      { condition: 'Minor burns <10% TBSA', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 15, max: 50, peak: 35 },
    specialConsiderations: [
      'Pediatric burn protocols differ - lower fluid thresholds',
      'Elderly patients at higher risk for complications',
      'Document %TBSA using Lund-Browder chart for accuracy'
    ]
  },
  car_crash: {
    id: 'vehicle-001',
    title: 'Major Vehicle Accident Response Protocol',
    description: 'Multi-vehicle collision with mass casualties',
    immediateActions: [
      'Activate trauma team and OR standby',
      'Prepare blood bank for massive transfusion protocol',
      'Set up multiple trauma bays',
      'Notify orthopedic and neurosurgery teams',
      'Prepare spinal immobilization equipment'
    ],
    requiredResources: [
      'Blood products (O-negative, platelets, FFP)',
      'Trauma surgical trays',
      'C-spine collars and backboards',
      'Portable X-ray and ultrasound',
      'Chest tube and thoracotomy trays'
    ],
    staffingRequirements: {
      physicians: 5,
      nurses: 10,
      technicians: 4,
      specialists: ['Trauma Surgeon', 'Orthopedic Surgeon', 'Neurosurgeon', 'Anesthesiologist']
    },
    expectedInjuryTypes: [
      'Blunt abdominal trauma',
      'Thoracic injuries (pneumothorax, hemothorax)',
      'Traumatic brain injury',
      'Spinal cord injuries',
      'Long bone fractures',
      'Internal hemorrhage'
    ],
    triagePriorities: [
      { condition: 'Active hemorrhage or hemodynamic instability', priority: 'immediate', color: 'red' },
      { condition: 'Decreased consciousness (GCS < 13)', priority: 'immediate', color: 'red' },
      { condition: 'Multiple fractures, stable vitals', priority: 'delayed', color: 'yellow' },
      { condition: 'Minor lacerations, contusions', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 10, max: 40, peak: 25 },
    specialConsiderations: [
      'Assume cervical spine injury until cleared',
      'Consider non-accidental trauma in pediatric cases',
      'Screen for alcohol/drug intoxication'
    ]
  },
  industrial_accident: {
    id: 'industrial-001',
    title: 'Industrial Accident Response Protocol',
    description: 'Factory explosion, machinery accident, or industrial site incident',
    immediateActions: [
      'Identify hazardous materials involved (MSDS review)',
      'Establish decontamination corridor',
      'Prepare for blast injuries and crush syndrome',
      'Alert nephrology for potential rhabdomyolysis',
      'Coordinate with HAZMAT teams'
    ],
    requiredResources: [
      'Decontamination equipment and showers',
      'Antidotes (based on exposure type)',
      'Dialysis capability',
      'Surgical amputation trays',
      'Wound debridement supplies'
    ],
    staffingRequirements: {
      physicians: 4,
      nurses: 8,
      technicians: 3,
      specialists: ['Toxicologist', 'Nephrologist', 'Trauma Surgeon', 'Occupational Medicine']
    },
    expectedInjuryTypes: [
      'Blast injuries (primary, secondary, tertiary)',
      'Crush injuries and compartment syndrome',
      'Chemical burns and exposures',
      'Traumatic amputations',
      'Hearing damage from blast'
    ],
    triagePriorities: [
      { condition: 'Blast lung or abdominal blast injury', priority: 'immediate', color: 'red' },
      { condition: 'Crush injury >4 hours - monitor for crush syndrome', priority: 'immediate', color: 'red' },
      { condition: 'Limb injuries with intact circulation', priority: 'delayed', color: 'yellow' },
      { condition: 'Minor burns, hearing complaints', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 5, max: 30, peak: 20 },
    specialConsiderations: [
      'Crush syndrome can develop hours after rescue - close K+ monitoring',
      'Secondary exposure risk to healthcare workers',
      'Document for workers compensation and OSHA'
    ]
  },
  gas_leak: {
    id: 'gas-001',
    title: 'Gas Leak / Toxic Exposure Protocol',
    description: 'Toxic or combustible gas exposure incident',
    immediateActions: [
      'Identify gas type (contact Poison Control)',
      'Establish hot/warm/cold zones',
      'Mandatory decontamination before entry',
      'Prepare specific antidotes if available',
      'Protect staff with appropriate PPE'
    ],
    requiredResources: [
      'Decontamination showers and runoff containment',
      'Level B/C PPE for staff',
      'Antidotes (atropine, pralidoxime, hydroxocobalamin)',
      'Activated charcoal',
      'Ventilators for respiratory failure'
    ],
    staffingRequirements: {
      physicians: 3,
      nurses: 6,
      technicians: 2,
      specialists: ['Toxicologist', 'Pulmonologist', 'Critical Care']
    },
    expectedInjuryTypes: [
      'Respiratory irritation/failure',
      'Chemical burns (skin/eyes)',
      'Systemic toxicity',
      'Neurological symptoms',
      'Cardiac arrhythmias'
    ],
    triagePriorities: [
      { condition: 'Respiratory distress, cyanosis', priority: 'immediate', color: 'red' },
      { condition: 'Altered mental status', priority: 'immediate', color: 'red' },
      { condition: 'Skin/eye burns, stable', priority: 'delayed', color: 'yellow' },
      { condition: 'Minimal exposure, asymptomatic', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 5, max: 100, peak: 30 },
    specialConsiderations: [
      'Secondary contamination risk - full decon mandatory',
      'Some agents have delayed onset (phosgene, nitrogen dioxide)',
      'Remove and bag all clothing',
      'Contact Poison Control: 1800-116-117'
    ]
  },
  stampede: {
    id: 'stampede-001',
    title: 'Stampede / Crowd Crush Protocol',
    description: 'Mass gathering incident with crush injuries',
    immediateActions: [
      'Activate mass casualty incident protocol',
      'Prepare for crush asphyxia and cardiac arrests',
      'Set up multiple resuscitation areas',
      'Alert cardiology and trauma teams',
      'Prepare psychological first aid teams'
    ],
    requiredResources: [
      'Multiple defibrillators and CPR equipment',
      'Ventilators and airway management supplies',
      'Fracture stabilization equipment',
      'Blood products for internal injuries',
      'Mental health crisis teams'
    ],
    staffingRequirements: {
      physicians: 6,
      nurses: 12,
      technicians: 4,
      specialists: ['Emergency Medicine', 'Cardiology', 'Trauma Surgery', 'Psychiatry']
    },
    expectedInjuryTypes: [
      'Crush asphyxia',
      'Traumatic cardiac arrest',
      'Trampling injuries',
      'Rib fractures',
      'Internal organ injuries',
      'Psychological trauma'
    ],
    triagePriorities: [
      { condition: 'Cardiac arrest - recently witnessed', priority: 'immediate', color: 'red' },
      { condition: 'Severe respiratory distress', priority: 'immediate', color: 'red' },
      { condition: 'Fractures, stable breathing', priority: 'delayed', color: 'yellow' },
      { condition: 'Minor injuries, psychological distress', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 10, max: 200, peak: 100 },
    specialConsiderations: [
      'Multiple cardiac arrests expected - triage carefully',
      'Psychological support for survivors essential',
      'Family reunification center needed',
      'Media management critical'
    ]
  },
  train_accident: {
    id: 'train-001',
    title: 'Train Accident Response Protocol',
    description: 'Rail collision or derailment with mass casualties',
    immediateActions: [
      'Activate full mass casualty response',
      'Prepare for polytrauma and crush injuries',
      'Set up field triage at multiple access points',
      'Notify all surgical specialties',
      'Prepare burn unit if fire involved'
    ],
    requiredResources: [
      'Mass transfusion blood supply',
      'Multiple OR suites ready',
      'Amputation and limb salvage equipment',
      'Spinal immobilization for all patients',
      'Heavy rescue coordination'
    ],
    staffingRequirements: {
      physicians: 10,
      nurses: 20,
      technicians: 8,
      specialists: ['Trauma Surgery', 'Orthopedics', 'Neurosurgery', 'Vascular Surgery', 'Burns']
    },
    expectedInjuryTypes: [
      'Polytrauma',
      'Crush injuries',
      'Burns from fire/electrical',
      'Spinal injuries',
      'Traumatic amputations',
      'Internal hemorrhage'
    ],
    triagePriorities: [
      { condition: 'Uncontrolled hemorrhage', priority: 'immediate', color: 'red' },
      { condition: 'Compromised airway', priority: 'immediate', color: 'red' },
      { condition: 'Stable fractures, ambulatory', priority: 'delayed', color: 'yellow' },
      { condition: 'Walking wounded', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 20, max: 300, peak: 150 },
    specialConsiderations: [
      'Extrication may take hours - prepare for prolonged rescue',
      'Electrocution risk from power lines',
      'Coordinate with railway emergency services'
    ]
  },
  building_collapse: {
    id: 'collapse-001',
    title: 'Structural Collapse Response Protocol',
    description: 'Building collapse with trapped victims',
    immediateActions: [
      'Coordinate with Urban Search and Rescue (USAR)',
      'Prepare for prolonged extrication cases',
      'Pre-position crush syndrome treatment',
      'Set up amputation capability in field if needed',
      'Prepare for hypothermia in trapped victims'
    ],
    requiredResources: [
      'IV fluids (0.9% NS) in large quantities',
      'Sodium bicarbonate for acidosis',
      'Dialysis capability or CRRT',
      'Warming equipment',
      'Amputation surgical kits'
    ],
    staffingRequirements: {
      physicians: 4,
      nurses: 8,
      technicians: 3,
      specialists: ['Trauma Surgeon', 'Nephrologist', 'Orthopedic Surgeon', 'Critical Care']
    },
    expectedInjuryTypes: [
      'Crush syndrome (rhabdomyolysis, hyperkalemia)',
      'Compartment syndrome',
      'Traumatic asphyxia',
      'Hypothermia',
      'Dehydration',
      'Psychological trauma'
    ],
    triagePriorities: [
      { condition: 'Signs of crush syndrome, prolonged entrapment', priority: 'immediate', color: 'red' },
      { condition: 'Respiratory distress, traumatic asphyxia', priority: 'immediate', color: 'red' },
      { condition: 'Limb injuries, ambulatory', priority: 'delayed', color: 'yellow' },
      { condition: 'Minor injuries, psychologically distressed', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 10, max: 100, peak: 40 },
    specialConsiderations: [
      'START IV fluids BEFORE extrication for prolonged entrapment',
      'Monitor for reperfusion injury and arrhythmias',
      'Expect delayed presentations as rescue continues',
      'Family notification center essential'
    ]
  },
  chemical_spill: {
    id: 'chem-001',
    title: 'Chemical Spill / HAZMAT Response Protocol',
    description: 'Hazardous material exposure incident',
    immediateActions: [
      'Identify chemical agent (contact Poison Control)',
      'Establish hot/warm/cold zones',
      'Mandatory decontamination before entry',
      'Prepare specific antidotes if available',
      'Protect staff with appropriate PPE'
    ],
    requiredResources: [
      'Decontamination showers and runoff containment',
      'Level B/C PPE for staff',
      'Specific antidotes based on agent',
      'Activated charcoal',
      'Ventilators for respiratory failure'
    ],
    staffingRequirements: {
      physicians: 3,
      nurses: 6,
      technicians: 2,
      specialists: ['Toxicologist', 'Pulmonologist', 'Critical Care']
    },
    expectedInjuryTypes: [
      'Chemical burns',
      'Respiratory failure',
      'Eye injuries',
      'Systemic poisoning',
      'Neurological effects'
    ],
    triagePriorities: [
      { condition: 'Respiratory distress, cyanosis', priority: 'immediate', color: 'red' },
      { condition: 'Altered mental status', priority: 'immediate', color: 'red' },
      { condition: 'Skin/eye burns, stable', priority: 'delayed', color: 'yellow' },
      { condition: 'Minimal exposure, asymptomatic', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 5, max: 50, peak: 25 },
    specialConsiderations: [
      'Secondary contamination risk - full decon mandatory',
      'Some agents have delayed onset',
      'Remove and bag all clothing',
      'Contact Poison Control immediately'
    ]
  },
  mass_casualty: {
    id: 'mci-001',
    title: 'Mass Casualty Incident Response Protocol',
    description: 'Large-scale event overwhelming normal hospital capacity',
    immediateActions: [
      'Activate Hospital Incident Command System (HICS)',
      'Cancel elective procedures and discharge stable patients',
      'Open surge capacity areas',
      'Call in off-duty staff',
      'Coordinate with regional hospitals for patient distribution'
    ],
    requiredResources: [
      'Surge capacity beds and equipment',
      'Mass transfusion supplies',
      'Triage tags and documentation',
      'Communication equipment (radios)',
      'Family reunification center supplies'
    ],
    staffingRequirements: {
      physicians: 10,
      nurses: 20,
      technicians: 8,
      specialists: ['Emergency Medicine', 'Trauma Surgery', 'Critical Care', 'Psychiatry']
    },
    expectedInjuryTypes: [
      'Varies by incident type',
      'Psychological trauma in all cases',
      'Crush and blast injuries in explosions',
      'Penetrating trauma in active shooter'
    ],
    triagePriorities: [
      { condition: 'Salvageable life-threatening injuries', priority: 'immediate', color: 'red' },
      { condition: 'Serious but stable injuries', priority: 'delayed', color: 'yellow' },
      { condition: 'Walking wounded', priority: 'minor', color: 'green' },
      { condition: 'Deceased or non-survivable injuries', priority: 'expectant', color: 'black' }
    ],
    estimatedPatientVolume: { min: 50, max: 200, peak: 100 },
    specialConsiderations: [
      'Use START triage for rapid assessment',
      'Psychological first aid for survivors',
      'Media management and family notification center',
      'Staff mental health support post-incident'
    ]
  },
  terror_attack: {
    id: 'terror-001',
    title: 'Terror / Active Threat Response Protocol',
    description: 'Intentional mass harm incident',
    immediateActions: [
      'Coordinate with law enforcement for scene safety',
      'Prepare for blast and penetrating injuries',
      'Activate lockdown protocols if threat ongoing',
      'Mass casualty triage with security awareness',
      'Psychological crisis team activation'
    ],
    requiredResources: [
      'Trauma surgical supplies',
      'Blood products in large quantities',
      'Tourniquet and hemorrhage control',
      'Security personnel',
      'Mental health crisis teams'
    ],
    staffingRequirements: {
      physicians: 8,
      nurses: 16,
      technicians: 6,
      specialists: ['Trauma Surgery', 'Vascular Surgery', 'Neurosurgery', 'Psychiatry']
    },
    expectedInjuryTypes: [
      'Blast injuries',
      'Penetrating trauma (gunshot, shrapnel)',
      'Burns',
      'Crush injuries',
      'Psychological trauma'
    ],
    triagePriorities: [
      { condition: 'Active hemorrhage, salvageable', priority: 'immediate', color: 'red' },
      { condition: 'Blast lung, respiratory distress', priority: 'immediate', color: 'red' },
      { condition: 'Stable penetrating injuries', priority: 'delayed', color: 'yellow' },
      { condition: 'Minor injuries, ambulatory', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 10, max: 200, peak: 75 },
    specialConsiderations: [
      'Secondary attack possibility - maintain vigilance',
      'Evidence preservation when possible',
      'Victim identification coordination',
      'Long-term psychological support planning'
    ]
  },
  natural_disaster: {
    id: 'disaster-001',
    title: 'Natural Disaster Response Protocol',
    description: 'Earthquake, flood, cyclone, or other natural event',
    immediateActions: [
      'Assess hospital structural integrity',
      'Activate disaster mode - conserve resources',
      'Prepare for sustained operations without external support',
      'Set up water purification if needed',
      'Establish communication with disaster management authorities'
    ],
    requiredResources: [
      'Water purification tablets and equipment',
      'Tetanus vaccines and antibiotics',
      'Wound care supplies for contaminated injuries',
      'Backup power and fuel',
      'Emergency food and water supplies'
    ],
    staffingRequirements: {
      physicians: 6,
      nurses: 12,
      technicians: 4,
      specialists: ['Emergency Medicine', 'Orthopedics', 'Infectious Disease']
    },
    expectedInjuryTypes: [
      'Crush injuries (earthquake)',
      'Drowning and near-drowning (flood)',
      'Wound infections from contaminated water',
      'Respiratory infections from exposure',
      'Waterborne diseases (cholera, typhoid)'
    ],
    triagePriorities: [
      { condition: 'Drowning with pulse', priority: 'immediate', color: 'red' },
      { condition: 'Crush injuries - potential rescue', priority: 'immediate', color: 'red' },
      { condition: 'Fractures, wounds needing debridement', priority: 'delayed', color: 'yellow' },
      { condition: 'Minor injuries, exposure', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 30, max: 500, peak: 150 },
    specialConsiderations: [
      'Delayed presentations common over days/weeks',
      'Mental health crisis intervention needed',
      'Vector-borne disease surge possible',
      'Cold chain for medications may be compromised'
    ]
  },
  epidemic_outbreak: {
    id: 'epidemic-001',
    title: 'Epidemic / Outbreak Response Protocol',
    description: 'Infectious disease surge',
    immediateActions: [
      'Activate infection control protocols',
      'Set up isolation areas',
      'Implement PPE requirements for all staff',
      'Begin contact tracing',
      'Coordinate with public health authorities'
    ],
    requiredResources: [
      'PPE (N95 masks, gowns, gloves, face shields)',
      'Negative pressure rooms',
      'Ventilators for respiratory failure',
      'IV fluids and antibiotics/antivirals',
      'Testing supplies'
    ],
    staffingRequirements: {
      physicians: 4,
      nurses: 10,
      technicians: 3,
      specialists: ['Infectious Disease', 'Pulmonology', 'Critical Care', 'Epidemiology']
    },
    expectedInjuryTypes: [
      'Respiratory failure',
      'Sepsis',
      'Organ failure',
      'Dehydration',
      'Secondary infections'
    ],
    triagePriorities: [
      { condition: 'Respiratory failure requiring ventilation', priority: 'immediate', color: 'red' },
      { condition: 'Septic shock', priority: 'immediate', color: 'red' },
      { condition: 'Moderate symptoms, stable vitals', priority: 'delayed', color: 'yellow' },
      { condition: 'Mild symptoms, monitoring only', priority: 'minor', color: 'green' }
    ],
    estimatedPatientVolume: { min: 100, max: 5000, peak: 500 },
    specialConsiderations: [
      'Staff protection is paramount',
      'Surge capacity planning essential',
      'Public communication coordination',
      'Supply chain for PPE and medications'
    ]
  }
};

// Generate triage recommendations using Groq LLM with Med42-style medical reasoning
async function generateTriageRecommendations(
  protocol: typeof EMERGENCY_PROTOCOLS_KB[EmergencyType],
  scenario: EmergencyScenarioInput
): Promise<ProtocolResult> {
  const systemPrompt = `You are an expert emergency medicine AI assistant based on Med42 medical knowledge. 
You provide precise, actionable medical triage recommendations for mass casualty incidents.
Always prioritize patient safety and evidence-based medicine.
Respond in JSON format only.`;

  const userPrompt = `
Emergency Type: ${scenario.emergencyType}
Scenario: ${scenario.description}
Estimated Victims: ${scenario.estimatedVictims}
Severity: ${scenario.severity}
Location: ${scenario.location || 'Not specified'}
Time Since Incident: ${scenario.timeSinceIncident || 'Unknown'}

Based on the ${protocol.title}, provide triage recommendations.

Protocol Knowledge:
- Expected Injuries: ${protocol.expectedInjuryTypes.join(', ')}
- Immediate Actions: ${protocol.immediateActions.slice(0, 3).join('; ')}
- Resources Needed: ${protocol.requiredResources.slice(0, 3).join('; ')}

Generate a JSON response with:
{
  "triageRecommendation": {
    "priority": "immediate|delayed|minor|expectant",
    "color": "red|yellow|green|black",
    "reasoning": "brief explanation"
  },
  "immediateActions": ["action1", "action2", "action3"],
  "resourcesNeeded": ["resource1", "resource2"],
  "estimatedArrivalWaves": [
    {"time": "0-15 min", "count": number, "severity": "critical|serious|minor"}
  ],
  "staffAlerts": ["alert1", "alert2"],
  "specialWarnings": ["warning if any"]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from LLM');
    }

    const aiRecommendations = JSON.parse(response);

    return {
      protocol: {
        id: protocol.id,
        emergencyType: scenario.emergencyType,
        title: protocol.title,
        description: protocol.description,
        immediateActions: protocol.immediateActions,
        requiredResources: protocol.requiredResources,
        expectedInjuryTypes: protocol.expectedInjuryTypes
      },
      triageRecommendation: aiRecommendations.triageRecommendation,
      immediateActions: aiRecommendations.immediateActions || protocol.immediateActions,
      resourcesNeeded: aiRecommendations.resourcesNeeded || protocol.requiredResources,
      estimatedArrivalWaves: aiRecommendations.estimatedArrivalWaves || [
        { time: '0-15 min', count: Math.floor(scenario.estimatedVictims * 0.3), severity: 'critical' as const },
        { time: '15-45 min', count: Math.floor(scenario.estimatedVictims * 0.5), severity: 'serious' as const },
        { time: '45+ min', count: Math.floor(scenario.estimatedVictims * 0.2), severity: 'minor' as const }
      ],
      staffAlerts: aiRecommendations.staffAlerts || protocol.staffingRequirements.specialists,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating triage recommendations:', error);
    
    return {
      protocol: {
        id: protocol.id,
        emergencyType: scenario.emergencyType,
        title: protocol.title,
        description: protocol.description,
        immediateActions: protocol.immediateActions,
        requiredResources: protocol.requiredResources,
        expectedInjuryTypes: protocol.expectedInjuryTypes
      },
      triageRecommendation: {
        priority: scenario.severity === 'critical' ? 'immediate' : 
                  scenario.severity === 'severe' ? 'delayed' : 'minor',
        color: scenario.severity === 'critical' ? 'red' : 
               scenario.severity === 'severe' ? 'yellow' : 'green',
        reasoning: `Based on ${protocol.title} protocol for ${scenario.severity} severity incident`
      },
      immediateActions: protocol.immediateActions.slice(0, 5),
      resourcesNeeded: protocol.requiredResources.slice(0, 5),
      estimatedArrivalWaves: [
        { time: '0-15 min', count: Math.floor(scenario.estimatedVictims * 0.3), severity: 'critical' as const },
        { time: '15-45 min', count: Math.floor(scenario.estimatedVictims * 0.5), severity: 'serious' as const },
        { time: '45+ min', count: Math.floor(scenario.estimatedVictims * 0.2), severity: 'minor' as const }
      ],
      staffAlerts: protocol.staffingRequirements.specialists,
      timestamp: new Date().toISOString()
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emergencyType, scenario } = body as {
      emergencyType: EmergencyType;
      scenario: EmergencyScenarioInput;
    };

    if (!emergencyType || !scenario) {
      return NextResponse.json(
        { error: 'Emergency type and scenario are required' },
        { status: 400 }
      );
    }

    if (!EMERGENCY_PROTOCOLS_KB[emergencyType]) {
      return NextResponse.json(
        { error: 'Invalid emergency type' },
        { status: 400 }
      );
    }

    const protocol = EMERGENCY_PROTOCOLS_KB[emergencyType];
    const triageResult = await generateTriageRecommendations(protocol, scenario);

    // Get GraphRAG enhanced data
    const ragContext = getRAGContext(scenario.description || emergencyType);
    const emergencyResources = getEmergencyResources(emergencyType);

    return NextResponse.json({
      success: true,
      result: triageResult,
      // GraphRAG enhanced response - verified supplies (no hallucination)
      graphRAG: {
        confidence: ragContext.confidence,
        knowledgeContext: ragContext.contextString,
        verifiedResources: {
          supplies: emergencyResources.supplies.map(r => ({
            name: r.node.name,
            exactMatch: r.node.exactMatchRequired,
            properties: r.node.properties,
          })),
          equipment: emergencyResources.equipment.map(r => ({
            name: r.node.name,
            properties: r.node.properties,
          })),
          staff: emergencyResources.staff.map(r => ({
            name: r.node.name,
            properties: r.node.properties,
          })),
          departments: emergencyResources.departments.map(r => ({
            name: r.node.name,
            properties: r.node.properties,
          })),
          protocols: emergencyResources.protocols.map(r => ({
            name: r.node.name,
            properties: r.node.properties,
          })),
        },
        relationships: ragContext.relationships,
      },
    });
  } catch (error) {
    console.error('Emergency protocol error:', error);
    return NextResponse.json(
      { error: 'Failed to process emergency protocol' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const emergencyTypes = Object.keys(EMERGENCY_PROTOCOLS_KB).map(type => ({
    type,
    title: EMERGENCY_PROTOCOLS_KB[type as EmergencyType].title,
    description: EMERGENCY_PROTOCOLS_KB[type as EmergencyType].description
  }));

  // Get graph statistics
  const engine = getHybridSearchEngine();
  const graphStats = engine.getStats();

  return NextResponse.json({ 
    emergencyTypes,
    graphStats: {
      totalNodes: graphStats.totalNodes,
      totalEdges: graphStats.totalEdges,
      exactMatchNodes: graphStats.exactMatchNodes,
      message: 'GraphRAG knowledge graph loaded with verified medical supplies and protocols'
    }
  });
}
