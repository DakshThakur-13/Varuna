/**
 * Emergency Mode Types for Varuna
 * Defines emergency scenarios and protocol structures
 */

export type EmergencyType = 
  | 'building_fire'
  | 'car_crash'
  | 'industrial_accident'
  | 'gas_leak'
  | 'stampede'
  | 'train_accident'
  | 'building_collapse'
  | 'chemical_spill'
  | 'mass_casualty'
  | 'terror_attack'
  | 'natural_disaster'
  | 'epidemic_outbreak';

export interface EmergencyScenario {
  type: EmergencyType;
  label: string;
  icon: string;
  description: string;
  expectedInjuries: string[];
  triagePriority: number; // 1 = highest
  avgCasualties: { min: number; max: number };
  color: string;
}

export const EMERGENCY_SCENARIOS: Record<EmergencyType, EmergencyScenario> = {
  building_fire: {
    type: 'building_fire',
    label: 'Building Fire',
    icon: '🔥',
    description: 'Structure fire with potential burn victims and smoke inhalation',
    expectedInjuries: ['Burns', 'Smoke inhalation', 'Trauma from falls', 'Carbon monoxide poisoning'],
    triagePriority: 1,
    avgCasualties: { min: 5, max: 50 },
    color: 'bg-orange-600',
  },
  car_crash: {
    type: 'car_crash',
    label: 'Vehicle Accident',
    icon: '🚗',
    description: 'Motor vehicle collision with trauma injuries',
    expectedInjuries: ['Blunt trauma', 'Lacerations', 'Fractures', 'Internal bleeding', 'Spinal injuries'],
    triagePriority: 1,
    avgCasualties: { min: 2, max: 15 },
    color: 'bg-red-600',
  },
  industrial_accident: {
    type: 'industrial_accident',
    label: 'Industrial Accident',
    icon: '🏭',
    description: 'Factory or industrial site accident',
    expectedInjuries: ['Crush injuries', 'Burns', 'Amputations', 'Chemical exposure', 'Electrocution'],
    triagePriority: 1,
    avgCasualties: { min: 3, max: 30 },
    color: 'bg-yellow-600',
  },
  gas_leak: {
    type: 'gas_leak',
    label: 'Gas Leak',
    icon: '💨',
    description: 'Toxic or combustible gas exposure',
    expectedInjuries: ['Respiratory distress', 'Chemical burns', 'Nausea', 'Unconsciousness'],
    triagePriority: 2,
    avgCasualties: { min: 5, max: 100 },
    color: 'bg-emerald-600',
  },
  stampede: {
    type: 'stampede',
    label: 'Stampede / Crowd Crush',
    icon: '👥',
    description: 'Mass gathering incident with crush injuries',
    expectedInjuries: ['Crush asphyxia', 'Trampling injuries', 'Fractures', 'Cardiac arrest'],
    triagePriority: 1,
    avgCasualties: { min: 10, max: 200 },
    color: 'bg-purple-600',
  },
  train_accident: {
    type: 'train_accident',
    label: 'Train Accident',
    icon: '🚆',
    description: 'Rail collision or derailment',
    expectedInjuries: ['Polytrauma', 'Crush injuries', 'Burns', 'Spinal injuries', 'Amputations'],
    triagePriority: 1,
    avgCasualties: { min: 20, max: 300 },
    color: 'bg-blue-600',
  },
  building_collapse: {
    type: 'building_collapse',
    label: 'Building Collapse',
    icon: '🏚️',
    description: 'Structural collapse with trapped victims',
    expectedInjuries: ['Crush syndrome', 'Dust inhalation', 'Fractures', 'Internal injuries'],
    triagePriority: 1,
    avgCasualties: { min: 10, max: 100 },
    color: 'bg-stone-600',
  },
  chemical_spill: {
    type: 'chemical_spill',
    label: 'Chemical Spill / HAZMAT',
    icon: '☣️',
    description: 'Hazardous material exposure incident',
    expectedInjuries: ['Chemical burns', 'Respiratory failure', 'Eye injuries', 'Systemic poisoning'],
    triagePriority: 1,
    avgCasualties: { min: 5, max: 50 },
    color: 'bg-lime-600',
  },
  mass_casualty: {
    type: 'mass_casualty',
    label: 'Mass Casualty Incident',
    icon: '🚨',
    description: 'Large-scale incident overwhelming local resources',
    expectedInjuries: ['Multiple trauma types', 'Burns', 'Blast injuries', 'Psychological trauma'],
    triagePriority: 1,
    avgCasualties: { min: 50, max: 500 },
    color: 'bg-red-700',
  },
  terror_attack: {
    type: 'terror_attack',
    label: 'Terror / Active Threat',
    icon: '⚠️',
    description: 'Intentional mass harm incident',
    expectedInjuries: ['Blast injuries', 'Penetrating trauma', 'Burns', 'Psychological trauma'],
    triagePriority: 1,
    avgCasualties: { min: 10, max: 200 },
    color: 'bg-black',
  },
  natural_disaster: {
    type: 'natural_disaster',
    label: 'Natural Disaster',
    icon: '🌊',
    description: 'Earthquake, flood, cyclone, or other natural event',
    expectedInjuries: ['Trauma', 'Drowning', 'Hypothermia', 'Crush injuries', 'Infections'],
    triagePriority: 2,
    avgCasualties: { min: 50, max: 1000 },
    color: 'bg-cyan-600',
  },
  epidemic_outbreak: {
    type: 'epidemic_outbreak',
    label: 'Epidemic / Outbreak',
    icon: '🦠',
    description: 'Infectious disease surge',
    expectedInjuries: ['Respiratory failure', 'Sepsis', 'Organ failure', 'Dehydration'],
    triagePriority: 2,
    avgCasualties: { min: 100, max: 5000 },
    color: 'bg-green-700',
  },
};

export interface EmergencyProtocol {
  id: string;
  emergencyType: EmergencyType;
  title: string;
  content: string;
  triageGuidelines: string;
  resourceRequirements: string[];
  staffingProtocol: string;
  decontaminationRequired: boolean;
  isolationRequired: boolean;
  specialEquipment: string[];
  estimatedResponseTime: number; // minutes
  embedding?: number[]; // Vector embedding for RAG
}

export interface EmergencyModeState {
  isActive: boolean;
  emergencyType: EmergencyType | null;
  incidentId: string | null;
  startTime: Date | null;
  estimatedCasualties: number;
  protocol: EmergencyProtocol | null;
  aiRecommendations: string[];
  resourceStatus: {
    bedsAvailable: number;
    staffOnCall: number;
    criticalSupplies: string[];
  };
}

export interface EmergencyPatient {
  id: string;
  incidentId: string;
  emergencyType: EmergencyType;
  tagColor: 'red' | 'yellow' | 'green' | 'black'; // START triage colors
  injuries: string[];
  consciousness: 'alert' | 'verbal' | 'pain' | 'unresponsive';
  breathing: 'normal' | 'abnormal' | 'absent';
  circulation: 'normal' | 'abnormal' | 'absent';
  notes: string;
  arrivalTime: Date;
  triageTime?: Date;
  disposition?: 'resuscitation' | 'immediate' | 'delayed' | 'minor' | 'deceased';
}

// START Triage Algorithm for Mass Casualty
export const START_TRIAGE = {
  BLACK: { color: 'black', label: 'DECEASED/EXPECTANT', priority: 4, description: 'Dead or non-survivable injuries' },
  RED: { color: 'red', label: 'IMMEDIATE', priority: 1, description: 'Life-threatening, needs immediate care' },
  YELLOW: { color: 'yellow', label: 'DELAYED', priority: 2, description: 'Serious but stable, can wait' },
  GREEN: { color: 'green', label: 'MINOR', priority: 3, description: 'Walking wounded, minimal treatment' },
};
