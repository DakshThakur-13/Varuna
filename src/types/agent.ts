// Emergency Intelligence Agent Types

export interface IncidentReport {
  id: string;
  source: 'twitter' | 'news' | 'government' | 'traffic' | 'weather' | 'manual';
  type: 'accident' | 'fire' | 'explosion' | 'building_collapse' | 'chemical_spill' | 'mass_gathering' | 'violence' | 'natural_disaster' | 'disease_outbreak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    distanceFromHospital: number; // in km
  };
  estimatedCasualties: {
    min: number;
    max: number;
    likely: number;
    breakdown?: {
      critical: number;
      serious: number;
      minor: number;
    };
  };
  expectedInjuryTypes: string[];
  recommendedPreparations: string[];
  detectedAt: Date;
  estimatedArrivalTime: number; // minutes
  confidence: number; // 0-100
  rawData: string;
  status: 'detected' | 'verified' | 'alerted' | 'preparing' | 'receiving' | 'resolved';
}

export interface ResourceCheck {
  timestamp: Date;
  incidentId: string;
  hospital: {
    id: string;
    name: string;
    currentCapacity: number;
    maxCapacity: number;
    availableBeds: number;
    icuBeds: number;
    ventilators: number;
    operatingRooms: number;
  };
  staff: {
    doctorsOnDuty: number;
    nursesOnDuty: number;
    specialistsAvailable: string[];
    canHandle: boolean;
    shortfall: number;
  };
  supplies: {
    adequate: string[];
    low: string[];
    critical: string[];
    outOfStock: string[];
  };
  canHandleEmergency: boolean;
  capacityScore: number; // 0-100
  issues: string[];
  requiredResources: ResourceRequest[];
}

export interface ResourceRequest {
  id: string;
  incidentId: string;
  type: 'supplies' | 'staff' | 'beds' | 'equipment' | 'blood';
  item: string;
  quantity: number;
  unit: string;
  priority: 'normal' | 'urgent' | 'critical';
  status: 'pending' | 'sent' | 'confirmed' | 'in_transit' | 'delivered' | 'failed';
  vendor?: {
    id: string;
    name: string;
    eta: number; // minutes
    contact: string;
    trackingUrl?: string;
  };
  requestedAt: Date;
  expectedDelivery?: Date;
  deliveredAt?: Date;
  notes?: string;
}

export interface HospitalAlert {
  id: string;
  incidentId: string;
  targetHospitalId: string;
  targetHospitalName: string;
  message: string;
  requestType: 'awareness' | 'standby' | 'divert_patients' | 'send_resources' | 'accept_overflow';
  patientsToRedirect?: number;
  status: 'sent' | 'acknowledged' | 'accepted' | 'declined';
  sentAt: Date;
  respondedAt?: Date;
  responseMessage?: string;
}

export interface NearbyHospital {
  id: string;
  name: string;
  distance: number;
  availableBeds: number;
  icuAvailable: number;
  erCapacity: number;
  acceptingPatients: boolean;
  specialties: string[];
  contact: string;
  address: string;
  lastUpdated: Date;
}

export interface Vendor {
  id: string;
  name: string;
  categories: string[];
  products: string[];
  distance: number;
  avgResponseTime: number; // minutes
  reliability: number; // 0-100
  contact: string;
  email: string;
  available24x7: boolean;
  preferredPayment: string;
}

export interface AgentAction {
  id: string;
  timestamp: Date;
  type: 'scan' | 'detect' | 'analyze' | 'alert' | 'request' | 'coordinate' | 'learn';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details: Record<string, unknown>;
  duration?: number; // ms
}

export interface AgentSession {
  id: string;
  startedAt: Date;
  status: 'idle' | 'scanning' | 'responding' | 'coordinating';
  incidentsDetected: number;
  alertsSent: number;
  requestsMade: number;
  lastScanAt?: Date;
  actions: AgentAction[];
}

export interface PostIncidentReport {
  id: string;
  incidentId: string;
  generatedAt: Date;
  summary: {
    totalPatients: number;
    criticalCases: number;
    fatalities: number;
    transferred: number;
    discharged: number;
  };
  predictions: {
    estimatedCasualties: number;
    actualCasualties: number;
    accuracy: number;
  };
  timeline: {
    detectedAt: Date;
    firstAlertAt: Date;
    firstPatientAt: Date;
    peakLoadAt: Date;
    resolvedAt: Date;
  };
  resourceUsage: {
    bedsUsed: number;
    icuBedsUsed: number;
    suppliesConsumed: Record<string, number>;
    staffHours: number;
  };
  vendorPerformance: {
    vendorId: string;
    vendorName: string;
    requestedItems: string[];
    deliveryTime: number;
    onTime: boolean;
  }[];
  hospitalCoordination: {
    hospitalId: string;
    hospitalName: string;
    patientsRedirected: number;
    responseTime: number;
    helpful: boolean;
  }[];
  lessonsLearned: string[];
  recommendations: string[];
}

export interface AgentConfig {
  scanIntervalMs: number;
  scanRadius: number; // km
  autoAlertThreshold: 'low' | 'medium' | 'high' | 'critical';
  autoRequestSupplies: boolean;
  autoCoordinateHospitals: boolean;
  enableLearning: boolean;
  dataSources: {
    twitter: boolean;
    news: boolean;
    government: boolean;
    traffic: boolean;
    weather: boolean;
  };
}
