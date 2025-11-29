import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabase } from '@/lib/supabase';
import { 
  IncidentReport, 
  ResourceCheck, 
  ResourceRequest, 
  HospitalAlert,
  NearbyHospital,
  Vendor 
} from '@/types/agent';

// Initialize Groq
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Nearby hospitals database
const NEARBY_HOSPITALS: NearbyHospital[] = [
  { 
    id: 'H001', 
    name: 'Lilavati Hospital', 
    distance: 3.2, 
    availableBeds: 45, 
    icuAvailable: 8,
    erCapacity: 20,
    acceptingPatients: true, 
    specialties: ['Trauma', 'Cardiology', 'Burns', 'Neurology'], 
    contact: '+91-22-2675-1000',
    address: 'Bandra West, Mumbai',
    lastUpdated: new Date(),
  },
  { 
    id: 'H002', 
    name: 'Kokilaben Hospital', 
    distance: 5.1, 
    availableBeds: 62, 
    icuAvailable: 15,
    erCapacity: 30,
    acceptingPatients: true, 
    specialties: ['Multi-specialty', 'Trauma', 'Oncology'], 
    contact: '+91-22-4269-6969',
    address: 'Andheri West, Mumbai',
    lastUpdated: new Date(),
  },
  { 
    id: 'H003', 
    name: 'Hinduja Hospital', 
    distance: 4.8, 
    availableBeds: 38, 
    icuAvailable: 10,
    erCapacity: 25,
    acceptingPatients: true, 
    specialties: ['Emergency', 'Surgery', 'Orthopedics'], 
    contact: '+91-22-2444-9199',
    address: 'Mahim, Mumbai',
    lastUpdated: new Date(),
  },
  { 
    id: 'H004', 
    name: 'Nanavati Hospital', 
    distance: 6.2, 
    availableBeds: 52, 
    icuAvailable: 12,
    erCapacity: 28,
    acceptingPatients: true, 
    specialties: ['Multi-specialty', 'Cardiac Surgery'], 
    contact: '+91-22-2626-7500',
    address: 'Vile Parle, Mumbai',
    lastUpdated: new Date(),
  },
  { 
    id: 'H005', 
    name: 'Jaslok Hospital', 
    distance: 7.5, 
    availableBeds: 40, 
    icuAvailable: 8,
    erCapacity: 18,
    acceptingPatients: true, 
    specialties: ['Neurosurgery', 'Cardiology', 'Gastro'], 
    contact: '+91-22-6657-3333',
    address: 'Pedder Road, Mumbai',
    lastUpdated: new Date(),
  },
];

// Vendor database
const VENDORS: Vendor[] = [
  { 
    id: 'V001', 
    name: 'MediSupply Express', 
    categories: ['medication', 'supplies', 'consumables'],
    products: ['IV Fluids', 'Bandages', 'Syringes', 'Gloves', 'Antibiotics'],
    distance: 2.1, 
    avgResponseTime: 25, 
    reliability: 95, 
    contact: '+91-22-5555-0001',
    email: 'emergency@medisupply.in',
    available24x7: true,
    preferredPayment: 'Credit',
  },
  { 
    id: 'V002', 
    name: 'OxygenPlus India', 
    categories: ['equipment', 'oxygen', 'respiratory'],
    products: ['Oxygen Cylinders', 'Ventilator Parts', 'Nebulizers', 'CPAP Machines'],
    distance: 4.5, 
    avgResponseTime: 35, 
    reliability: 92, 
    contact: '+91-22-5555-0002',
    email: 'urgent@oxygenplus.in',
    available24x7: true,
    preferredPayment: 'Net 30',
  },
  { 
    id: 'V003', 
    name: 'Mumbai Blood Bank Network', 
    categories: ['blood', 'plasma'],
    products: ['Whole Blood', 'Packed RBCs', 'Platelets', 'FFP', 'Cryoprecipitate'],
    distance: 3.8, 
    avgResponseTime: 20, 
    reliability: 98, 
    contact: '+91-22-5555-0003',
    email: 'emergency@bloodbank.in',
    available24x7: true,
    preferredPayment: 'Immediate',
  },
  { 
    id: 'V004', 
    name: 'SafetyFirst PPE', 
    categories: ['ppe', 'protective', 'hazmat'],
    products: ['N95 Masks', 'Hazmat Suits', 'Face Shields', 'Gowns', 'Goggles'],
    distance: 5.2, 
    avgResponseTime: 40, 
    reliability: 90, 
    contact: '+91-22-5555-0004',
    email: 'orders@safetyfirst.in',
    available24x7: true,
    preferredPayment: 'Credit',
  },
  { 
    id: 'V005', 
    name: 'PharmaCare Wholesale', 
    categories: ['medication', 'emergency drugs', 'anesthesia'],
    products: ['Emergency Drugs', 'Anesthetics', 'Painkillers', 'Antidotes', 'Cardiac Drugs'],
    distance: 3.0, 
    avgResponseTime: 30, 
    reliability: 94, 
    contact: '+91-22-5555-0005',
    email: 'urgent@pharmacare.in',
    available24x7: false,
    preferredPayment: 'Net 15',
  },
];

// Fetch current hospital resources
async function fetchHospitalResources() {
  const defaultData = {
    id: 'HOSP-001',
    name: 'Central Mumbai Medical Center',
    currentCapacity: 156,
    maxCapacity: 200,
    availableBeds: 44,
    icuBeds: 8,
    ventilators: 12,
    operatingRooms: 3,
    doctorsOnDuty: 18,
    nursesOnDuty: 45,
    specialistsAvailable: ['Trauma Surgeon', 'Cardiologist', 'Pulmonologist', 'Orthopedic Surgeon', 'Anesthesiologist'],
    supplies: {
      adequate: ['Bandages', 'Syringes', 'Gloves', 'Basic Medications'],
      low: ['IV Fluids', 'Blood Products'],
      critical: ['Oxygen Cylinders'],
      outOfStock: [] as string[],
    }
  };

  if (!supabase) return defaultData;

  try {
    // Fetch from Supabase
    const [staffResult, inventoryResult, resourceResult] = await Promise.all([
      supabase.from('staff').select('*').eq('status', 'on-duty'),
      supabase.from('inventory').select('*'),
      supabase.from('resource_status').select('*').single(),
    ]);

    const staffData = staffResult.data || [];
    const inventoryData = inventoryResult.data || [];
    const resourceData = resourceResult.data;

    // Process staff
    const doctors = staffData.filter(s => s.role === 'Doctor' || s.role === 'Specialist').length || defaultData.doctorsOnDuty;
    const nurses = staffData.filter(s => s.role === 'Nurse').length || defaultData.nursesOnDuty;
    const specialists = [...new Set(staffData.filter(s => s.role === 'Specialist').map(s => s.department))] as string[];

    // Process inventory
    const supplies = { adequate: [] as string[], low: [] as string[], critical: [] as string[], outOfStock: [] as string[] };
    inventoryData.forEach(item => {
      const list = supplies[item.status as keyof typeof supplies];
      if (list) list.push(item.name);
    });

    return {
      id: 'HOSP-001',
      name: 'Central Mumbai Medical Center',
      currentCapacity: resourceData?.beds_occupied || defaultData.currentCapacity,
      maxCapacity: resourceData?.beds_total || defaultData.maxCapacity,
      availableBeds: (resourceData?.beds_total || defaultData.maxCapacity) - (resourceData?.beds_occupied || defaultData.currentCapacity),
      icuBeds: resourceData?.icu_available || defaultData.icuBeds,
      ventilators: resourceData?.ventilators_available || defaultData.ventilators,
      operatingRooms: 3,
      doctorsOnDuty: doctors || defaultData.doctorsOnDuty,
      nursesOnDuty: nurses || defaultData.nursesOnDuty,
      specialistsAvailable: specialists.length > 0 ? specialists : defaultData.specialistsAvailable,
      supplies: supplies.adequate.length > 0 ? supplies : defaultData.supplies,
    };
  } catch (error) {
    console.error('Error fetching resources:', error);
    return defaultData;
  }
}

// Analyze capacity against incident requirements
function analyzeCapacity(
  resources: Awaited<ReturnType<typeof fetchHospitalResources>>,
  incident: IncidentReport
): { canHandle: boolean; capacityScore: number; issues: string[]; shortfall: number } {
  const issues: string[] = [];
  let capacityScore = 100;
  let shortfall = 0;

  const expected = incident.estimatedCasualties.likely;
  const critical = incident.estimatedCasualties.breakdown?.critical || Math.ceil(expected * 0.3);
  const serious = incident.estimatedCasualties.breakdown?.serious || Math.ceil(expected * 0.5);

  // Check general beds
  if (resources.availableBeds < expected) {
    const deficit = expected - resources.availableBeds;
    issues.push(`Bed shortage: Need ${expected}, have ${resources.availableBeds} (-${deficit})`);
    capacityScore -= deficit * 3;
    shortfall += deficit;
  }

  // Check ICU capacity
  if (resources.icuBeds < critical) {
    const deficit = critical - resources.icuBeds;
    issues.push(`ICU shortage: Need ${critical} critical beds, have ${resources.icuBeds} (-${deficit})`);
    capacityScore -= deficit * 5;
    shortfall += deficit;
  }

  // Check ventilators for respiratory cases
  const injuryTypes = incident.expectedInjuryTypes || [];
  if (injuryTypes.some(t => t.toLowerCase().match(/respiratory|smoke|inhalation|chemical/))) {
    const ventsNeeded = Math.ceil(expected * 0.25);
    if (resources.ventilators < ventsNeeded) {
      issues.push(`Ventilator shortage: Need ${ventsNeeded}, have ${resources.ventilators}`);
      capacityScore -= 15;
    }
  }

  // Check OR availability for trauma
  if (incident.type === 'accident' || incident.type === 'building_collapse' || incident.type === 'explosion') {
    const orsNeeded = Math.ceil(critical * 0.5);
    if (resources.operatingRooms < orsNeeded) {
      issues.push(`OR capacity limited: May need ${orsNeeded} ORs, have ${resources.operatingRooms}`);
      capacityScore -= 10;
    }
  }

  // Check staff ratios
  const nursesNeeded = Math.ceil(expected / 3);
  if (resources.nursesOnDuty < nursesNeeded + 20) {
    issues.push(`Staff shortage: Need ${nursesNeeded} additional nurses for surge`);
    capacityScore -= 10;
  }

  // Check supplies
  if (resources.supplies.critical.length > 0) {
    issues.push(`CRITICAL supplies low: ${resources.supplies.critical.join(', ')}`);
    capacityScore -= resources.supplies.critical.length * 10;
  }
  if (resources.supplies.outOfStock.length > 0) {
    issues.push(`OUT OF STOCK: ${resources.supplies.outOfStock.join(', ')}`);
    capacityScore -= resources.supplies.outOfStock.length * 15;
  }

  capacityScore = Math.max(0, Math.min(100, capacityScore));

  return {
    canHandle: capacityScore >= 60 && shortfall <= 5,
    capacityScore,
    issues,
    shortfall,
  };
}

// Generate automated vendor requests
function generateVendorRequests(
  incident: IncidentReport,
  resources: Awaited<ReturnType<typeof fetchHospitalResources>>,
  capacityAnalysis: ReturnType<typeof analyzeCapacity>
): ResourceRequest[] {
  const requests: ResourceRequest[] = [];
  const now = new Date();

  // Request critical and out-of-stock supplies
  const urgentItems = [...resources.supplies.critical, ...resources.supplies.outOfStock];
  
  for (const item of urgentItems) {
    const vendor = findBestVendor(item);
    if (vendor) {
      requests.push({
        id: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        incidentId: incident.id,
        type: 'supplies',
        item,
        quantity: 50,
        unit: 'units',
        priority: resources.supplies.outOfStock.includes(item) ? 'critical' : 'urgent',
        status: 'pending',
        vendor: {
          id: vendor.id,
          name: vendor.name,
          eta: vendor.avgResponseTime,
          contact: vendor.contact,
        },
        requestedAt: now,
        expectedDelivery: new Date(now.getTime() + vendor.avgResponseTime * 60000),
      });
    }
  }

  // Request blood products for trauma incidents
  if (['accident', 'building_collapse', 'explosion', 'violence'].includes(incident.type)) {
    const bloodVendor = VENDORS.find(v => v.categories.includes('blood'));
    if (bloodVendor) {
      const units = Math.ceil(incident.estimatedCasualties.likely * 2);
      requests.push({
        id: `REQ-${Date.now()}-BLOOD`,
        incidentId: incident.id,
        type: 'blood',
        item: 'Emergency Blood Products (O-neg, Packed RBCs)',
        quantity: units,
        unit: 'units',
        priority: 'critical',
        status: 'pending',
        vendor: {
          id: bloodVendor.id,
          name: bloodVendor.name,
          eta: bloodVendor.avgResponseTime,
          contact: bloodVendor.contact,
        },
        requestedAt: now,
        expectedDelivery: new Date(now.getTime() + bloodVendor.avgResponseTime * 60000),
      });
    }
  }

  // Request oxygen for respiratory emergencies
  const incidentInjuryTypes = incident.expectedInjuryTypes || [];
  if (incidentInjuryTypes.some(t => t.toLowerCase().match(/respiratory|smoke|inhalation/))) {
    const oxygenVendor = VENDORS.find(v => v.categories.includes('oxygen'));
    if (oxygenVendor) {
      requests.push({
        id: `REQ-${Date.now()}-O2`,
        incidentId: incident.id,
        type: 'equipment',
        item: 'Oxygen Cylinders (Type D)',
        quantity: Math.ceil(incident.estimatedCasualties.likely * 1.5),
        unit: 'cylinders',
        priority: 'critical',
        status: 'pending',
        vendor: {
          id: oxygenVendor.id,
          name: oxygenVendor.name,
          eta: oxygenVendor.avgResponseTime,
          contact: oxygenVendor.contact,
        },
        requestedAt: now,
        expectedDelivery: new Date(now.getTime() + oxygenVendor.avgResponseTime * 60000),
      });
    }
  }

  // Request PPE for chemical/hazmat incidents
  if (incident.type === 'chemical_spill' || incidentInjuryTypes.some(t => t.toLowerCase().includes('chemical'))) {
    const ppeVendor = VENDORS.find(v => v.categories.includes('hazmat'));
    if (ppeVendor) {
      requests.push({
        id: `REQ-${Date.now()}-PPE`,
        incidentId: incident.id,
        type: 'supplies',
        item: 'Hazmat Protection Kits',
        quantity: 20,
        unit: 'kits',
        priority: 'urgent',
        status: 'pending',
        vendor: {
          id: ppeVendor.id,
          name: ppeVendor.name,
          eta: ppeVendor.avgResponseTime,
          contact: ppeVendor.contact,
        },
        requestedAt: now,
        expectedDelivery: new Date(now.getTime() + ppeVendor.avgResponseTime * 60000),
      });
    }
  }

  return requests;
}

function findBestVendor(item: string): Vendor | undefined {
  const itemLower = item.toLowerCase();
  
  // Find vendors that might carry this item
  const matchingVendors = VENDORS.filter(v => 
    v.available24x7 && (
      v.products.some(p => p.toLowerCase().includes(itemLower) || itemLower.includes(p.toLowerCase())) ||
      v.categories.some(c => itemLower.includes(c))
    )
  );

  if (matchingVendors.length === 0) {
    // Fallback to general medical supplier
    return VENDORS.find(v => v.categories.includes('supplies') && v.available24x7);
  }

  // Sort by reliability * (1 / response time)
  return matchingVendors.sort((a, b) => 
    (b.reliability / b.avgResponseTime) - (a.reliability / a.avgResponseTime)
  )[0];
}

// Generate hospital coordination alerts
function generateHospitalAlerts(
  incident: IncidentReport,
  capacityAnalysis: ReturnType<typeof analyzeCapacity>
): HospitalAlert[] {
  const alerts: HospitalAlert[] = [];
  const now = new Date();

  // Determine alert type based on capacity
  let alertType: HospitalAlert['requestType'] = 'awareness';
  let patientsToRedirect = 0;

  if (capacityAnalysis.shortfall > 15) {
    alertType = 'divert_patients';
    patientsToRedirect = capacityAnalysis.shortfall;
  } else if (capacityAnalysis.shortfall > 5) {
    alertType = 'standby';
    patientsToRedirect = Math.ceil(capacityAnalysis.shortfall / 2);
  } else if (!capacityAnalysis.canHandle) {
    alertType = 'accept_overflow';
    patientsToRedirect = 5;
  }

  // Sort hospitals by capacity and distance
  const sortedHospitals = [...NEARBY_HOSPITALS]
    .filter(h => h.acceptingPatients)
    .sort((a, b) => {
      const capacityScore = (b.availableBeds + b.icuAvailable * 2) - (a.availableBeds + a.icuAvailable * 2);
      if (Math.abs(capacityScore) > 10) return capacityScore;
      return a.distance - b.distance;
    });

  // Generate alerts for top hospitals
  const hospitalsToAlert = alertType === 'divert_patients' ? 4 : 3;
  
  sortedHospitals.slice(0, hospitalsToAlert).forEach((hospital, index) => {
    const message = generateAlertMessage(incident, alertType, patientsToRedirect, hospital);
    
    alerts.push({
      id: `ALERT-${Date.now()}-${hospital.id}`,
      incidentId: incident.id,
      targetHospitalId: hospital.id,
      targetHospitalName: hospital.name,
      message,
      requestType: alertType,
      patientsToRedirect: index === 0 ? patientsToRedirect : Math.ceil(patientsToRedirect / 2),
      status: 'sent',
      sentAt: now,
    });
  });

  return alerts;
}

function generateAlertMessage(
  incident: IncidentReport, 
  alertType: HospitalAlert['requestType'],
  patientsToRedirect: number,
  hospital: NearbyHospital
): string {
  const expectedInjuries = (incident.expectedInjuryTypes || ['Trauma', 'General']).slice(0, 3).join(', ');
  const base = `[VARUNA NETWORK ALERT]\n\nIncident: ${incident.title || 'Emergency Incident'}\nType: ${(incident.type || 'emergency').toUpperCase()}\nSeverity: ${(incident.severity || 'high').toUpperCase()}\nExpected casualties: ${incident.estimatedCasualties?.likely || 'Unknown'}\nExpected injuries: ${expectedInjuries}\nETA: ${incident.estimatedArrivalTime || 15} minutes`;

  switch (alertType) {
    case 'divert_patients':
      return `${base}\n\n⚠️ URGENT REQUEST: We are at capacity. Requesting diversion of approximately ${patientsToRedirect} patients to your facility.\n\nYour current capacity: ${hospital.availableBeds} beds, ${hospital.icuAvailable} ICU\n\nPlease confirm acceptance immediately.`;
    
    case 'standby':
      return `${base}\n\n🔶 STANDBY REQUEST: We may require overflow support. Please prepare to accept ${patientsToRedirect} patients if needed.\n\nWe will update status in 10 minutes.`;
    
    case 'accept_overflow':
      return `${base}\n\n📋 OVERFLOW NOTICE: We may redirect some stable patients to your facility for continued care.\n\nExpected: ${patientsToRedirect} non-critical patients`;
    
    default:
      return `${base}\n\nℹ️ AWARENESS: This is for your situational awareness. No action required at this time.`;
  }
}

// Main orchestration endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const incident = body.incident as IncidentReport;

    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'No incident provided' },
        { status: 400 }
      );
    }

    // 1. Fetch current hospital resources
    const resources = await fetchHospitalResources();

    // 2. Analyze capacity
    const capacityAnalysis = analyzeCapacity(resources, incident);

    // 3. Generate vendor requests
    const vendorRequests = generateVendorRequests(incident, resources, capacityAnalysis);

    // 4. Generate hospital alerts
    const hospitalAlerts = generateHospitalAlerts(incident, capacityAnalysis);

    // 5. Build resource check report
    const resourceCheck: ResourceCheck = {
      timestamp: new Date(),
      incidentId: incident.id,
      hospital: {
        id: resources.id,
        name: resources.name,
        currentCapacity: resources.currentCapacity,
        maxCapacity: resources.maxCapacity,
        availableBeds: resources.availableBeds,
        icuBeds: resources.icuBeds,
        ventilators: resources.ventilators,
        operatingRooms: resources.operatingRooms,
      },
      staff: {
        doctorsOnDuty: resources.doctorsOnDuty,
        nursesOnDuty: resources.nursesOnDuty,
        specialistsAvailable: resources.specialistsAvailable,
        canHandle: capacityAnalysis.canHandle,
        shortfall: capacityAnalysis.shortfall,
      },
      supplies: resources.supplies,
      canHandleEmergency: capacityAnalysis.canHandle,
      capacityScore: capacityAnalysis.capacityScore,
      issues: capacityAnalysis.issues,
      requiredResources: vendorRequests,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      incident: {
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        estimatedCasualties: incident.estimatedCasualties,
      },
      resourceCheck,
      vendorRequests: {
        count: vendorRequests.length,
        requests: vendorRequests,
        totalETA: Math.max(...vendorRequests.map(r => r.vendor?.eta || 0), 0),
      },
      hospitalAlerts: {
        count: hospitalAlerts.length,
        alerts: hospitalAlerts,
        alertType: hospitalAlerts[0]?.requestType || 'awareness',
      },
      recommendations: incident.recommendedPreparations || [],
      nearbyHospitals: NEARBY_HOSPITALS.map(h => ({
        name: h.name,
        distance: h.distance,
        availableBeds: h.availableBeds,
        icuAvailable: h.icuAvailable,
        contact: h.contact,
      })),
    });

  } catch (error) {
    console.error('Orchestrator API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to orchestrate response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const resources = await fetchHospitalResources();
  
  return NextResponse.json({
    service: 'Resource Orchestration Engine',
    status: 'operational',
    hospital: resources.name,
    currentStatus: {
      beds: `${resources.availableBeds}/${resources.maxCapacity} available`,
      icu: `${resources.icuBeds} available`,
      ventilators: resources.ventilators,
      staff: `${resources.doctorsOnDuty} doctors, ${resources.nursesOnDuty} nurses`,
    },
    connectedHospitals: NEARBY_HOSPITALS.length,
    registeredVendors: VENDORS.length,
  });
}
