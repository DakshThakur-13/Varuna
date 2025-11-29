/**
 * Medical Knowledge Graph for Varuna
 * 
 * This contains the core medical knowledge base with relationships.
 * The graph enables queries like:
 * - "Bus Crash" → finds all related protocols, staff, supplies
 * - "O-Negative Blood" → exact match, no hallucination
 * - "Severe bleeding" → semantic match → finds related treatments
 */

import {
  GraphNode,
  GraphEdge,
  KnowledgeGraph,
  NodeType,
  RelationType,
} from '@/types/graphrag';

// Helper to generate IDs
const generateId = (type: NodeType, name: string): string => {
  return `${type}:${name.toLowerCase().replace(/\s+/g, '_')}`;
};

// Helper to create a node
const createNode = (
  type: NodeType,
  name: string,
  keywords: string[],
  properties: Record<string, unknown> = {},
  exactMatchRequired = false,
  importance = 0.5
): GraphNode => ({
  id: generateId(type, name),
  type,
  name,
  keywords: [name.toLowerCase(), ...keywords.map(k => k.toLowerCase())],
  properties,
  createdAt: new Date(),
  updatedAt: new Date(),
  importance,
  exactMatchRequired,
});

// Helper to create an edge
const createEdge = (
  source: GraphNode,
  target: GraphNode,
  type: RelationType,
  weight = 1.0,
  properties: Record<string, unknown> = {},
  bidirectional = false
): GraphEdge => ({
  id: `${source.id}->${type}->${target.id}`,
  sourceId: source.id,
  targetId: target.id,
  type,
  weight,
  properties,
  bidirectional,
});

// ============================================
// EMERGENCY TYPES
// ============================================
const emergencyNodes: GraphNode[] = [
  createNode('emergency_type', 'Building Fire', 
    ['fire', 'blaze', 'inferno', 'smoke', 'flames', 'burn incident'],
    { severity: 'critical', expectedCasualties: '10-50', responseTime: 'immediate' },
    false, 0.9
  ),
  createNode('emergency_type', 'Mass Vehicle Accident',
    ['car crash', 'bus crash', 'mva', 'road accident', 'collision', 'traffic accident', 'pile-up'],
    { severity: 'critical', expectedCasualties: '5-30', responseTime: 'immediate' },
    false, 0.9
  ),
  createNode('emergency_type', 'Industrial Accident',
    ['factory accident', 'chemical spill', 'explosion', 'workplace injury'],
    { severity: 'critical', expectedCasualties: '5-20', responseTime: 'immediate' },
    false, 0.9
  ),
  createNode('emergency_type', 'Mass Casualty Incident',
    ['mci', 'mass trauma', 'multiple victims', 'disaster', 'catastrophe'],
    { severity: 'critical', expectedCasualties: '20+', responseTime: 'immediate' },
    false, 1.0
  ),
  createNode('emergency_type', 'Building Collapse',
    ['structural collapse', 'cave-in', 'debris', 'entrapment'],
    { severity: 'critical', expectedCasualties: '10-100', responseTime: 'immediate' },
    false, 0.95
  ),
  createNode('emergency_type', 'Chemical Exposure',
    ['toxic spill', 'hazmat', 'chemical burn', 'poisoning', 'toxic exposure'],
    { severity: 'critical', expectedCasualties: '5-50', responseTime: 'immediate' },
    false, 0.9
  ),
];

// ============================================
// DEPARTMENTS
// ============================================
const departmentNodes: GraphNode[] = [
  createNode('department', 'Trauma Center',
    ['trauma', 'trauma bay', 'trauma unit', 'level 1 trauma'],
    { beds: 12, level: 1, specialization: 'severe trauma' },
    false, 0.9
  ),
  createNode('department', 'Emergency Room',
    ['er', 'emergency department', 'ed', 'a&e', 'emergency'],
    { beds: 40, level: 1, specialization: 'emergency medicine' },
    false, 0.95
  ),
  createNode('department', 'Burn Unit',
    ['burn center', 'burn ward', 'burns icu'],
    { beds: 8, level: 1, specialization: 'burn care' },
    false, 0.85
  ),
  createNode('department', 'ICU',
    ['intensive care', 'critical care', 'icu', 'ccu'],
    { beds: 20, level: 1, specialization: 'critical care' },
    false, 0.9
  ),
  createNode('department', 'Operating Room',
    ['or', 'surgery', 'surgical suite', 'theater'],
    { beds: 8, level: 1, specialization: 'surgery' },
    false, 0.85
  ),
  createNode('department', 'Blood Bank',
    ['transfusion', 'blood supply', 'blood storage'],
    { capacity: 500, specialization: 'blood products' },
    true, 0.95
  ),
];

// ============================================
// STAFF ROLES
// ============================================
const staffNodes: GraphNode[] = [
  createNode('staff', 'Trauma Surgeon',
    ['trauma doctor', 'trauma specialist', 'surgical trauma'],
    { specialty: 'trauma surgery', onCall: true, criticalRole: true },
    false, 0.9
  ),
  createNode('staff', 'Emergency Physician',
    ['er doctor', 'emergency doctor', 'ed physician'],
    { specialty: 'emergency medicine', onCall: true, criticalRole: true },
    false, 0.9
  ),
  createNode('staff', 'Burn Specialist',
    ['burn surgeon', 'burn doctor', 'plastics burn'],
    { specialty: 'burn surgery', onCall: true, criticalRole: true },
    false, 0.85
  ),
  createNode('staff', 'Anesthesiologist',
    ['anesthesia', 'anesthetist', 'sedation specialist'],
    { specialty: 'anesthesiology', onCall: true, criticalRole: true },
    false, 0.85
  ),
  createNode('staff', 'Orthopedic Surgeon',
    ['ortho', 'bone doctor', 'orthopedics'],
    { specialty: 'orthopedic surgery', onCall: true, criticalRole: true },
    false, 0.8
  ),
  createNode('staff', 'Neurosurgeon',
    ['neuro', 'brain surgeon', 'spinal surgeon'],
    { specialty: 'neurosurgery', onCall: true, criticalRole: true },
    false, 0.85
  ),
  createNode('staff', 'Critical Care Nurse',
    ['icu nurse', 'trauma nurse', 'critical nurse'],
    { specialty: 'critical care nursing', onCall: true, criticalRole: true },
    false, 0.8
  ),
  createNode('staff', 'Respiratory Therapist',
    ['rt', 'pulmonary therapist', 'airway specialist'],
    { specialty: 'respiratory care', onCall: true, criticalRole: false },
    false, 0.75
  ),
];

// ============================================
// MEDICAL SUPPLIES (EXACT MATCH CRITICAL)
// ============================================
const supplyNodes: GraphNode[] = [
  // Blood Products - EXACT MATCH REQUIRED
  createNode('supply', 'O-Negative Blood',
    ['o neg', 'o- blood', 'universal donor blood', 'type o negative'],
    { quantity: 50, unit: 'units', critical: true, location: 'Blood Bank' },
    true, 1.0  // Exact match required!
  ),
  createNode('supply', 'O-Positive Blood',
    ['o pos', 'o+ blood', 'type o positive'],
    { quantity: 80, unit: 'units', critical: true, location: 'Blood Bank' },
    true, 0.95
  ),
  createNode('supply', 'AB-Positive Blood',
    ['ab pos', 'ab+ blood', 'universal recipient'],
    { quantity: 20, unit: 'units', critical: true, location: 'Blood Bank' },
    true, 0.9
  ),
  createNode('supply', 'Fresh Frozen Plasma',
    ['ffp', 'plasma', 'blood plasma'],
    { quantity: 40, unit: 'units', critical: true, location: 'Blood Bank' },
    true, 0.95
  ),
  createNode('supply', 'Platelets',
    ['plt', 'thrombocytes', 'platelet concentrate'],
    { quantity: 30, unit: 'units', critical: true, location: 'Blood Bank' },
    true, 0.9
  ),

  // Trauma Supplies - EXACT MATCH REQUIRED
  createNode('supply', 'Burn Kit',
    ['burn treatment kit', 'burn dressing kit', 'burn care supplies'],
    { quantity: 25, unit: 'kits', critical: true, location: 'Trauma Center' },
    true, 0.95  // Exact match! NOT "First Aid Kit"
  ),
  createNode('supply', 'Trauma Kit',
    ['trauma supplies', 'trauma pack', 'emergency trauma kit'],
    { quantity: 50, unit: 'kits', critical: true, location: 'Trauma Center' },
    true, 0.95
  ),
  createNode('supply', 'Chest Tube Kit',
    ['thoracostomy kit', 'chest drain kit'],
    { quantity: 30, unit: 'kits', critical: true, location: 'Trauma Center' },
    true, 0.9
  ),
  createNode('supply', 'Central Line Kit',
    ['cvc kit', 'central venous catheter', 'central access kit'],
    { quantity: 40, unit: 'kits', critical: true, location: 'ICU' },
    true, 0.9
  ),
  createNode('supply', 'Intubation Kit',
    ['airway kit', 'ett kit', 'endotracheal tube kit'],
    { quantity: 30, unit: 'kits', critical: true, location: 'Emergency Room' },
    true, 0.95
  ),
  createNode('supply', 'Surgical Suture Kit',
    ['suture kit', 'wound closure kit', 'stitching kit'],
    { quantity: 100, unit: 'kits', critical: false, location: 'Operating Room' },
    true, 0.8
  ),
  createNode('supply', 'Splint Set',
    ['fracture splint', 'immobilization kit', 'splinting supplies'],
    { quantity: 40, unit: 'sets', critical: false, location: 'Emergency Room' },
    true, 0.75
  ),
  createNode('supply', 'IV Fluids Normal Saline',
    ['ns', 'saline', '0.9% nacl', 'normal saline'],
    { quantity: 200, unit: 'liters', critical: true, location: 'Emergency Room' },
    true, 0.9
  ),
  createNode('supply', 'IV Fluids Lactated Ringers',
    ['lr', 'ringers lactate', 'lactated ringers'],
    { quantity: 150, unit: 'liters', critical: true, location: 'Emergency Room' },
    true, 0.9
  ),
];

// ============================================
// MEDICAL EQUIPMENT
// ============================================
const equipmentNodes: GraphNode[] = [
  createNode('equipment', 'Ventilator',
    ['mechanical ventilator', 'breathing machine', 'life support'],
    { quantity: 20, location: 'ICU', critical: true },
    true, 0.95
  ),
  createNode('equipment', 'Defibrillator',
    ['aed', 'defib', 'cardiac monitor defibrillator'],
    { quantity: 15, location: 'Emergency Room', critical: true },
    true, 0.95
  ),
  createNode('equipment', 'CT Scanner',
    ['computed tomography', 'ct scan', 'cat scan'],
    { quantity: 3, location: 'Radiology', critical: true },
    false, 0.85
  ),
  createNode('equipment', 'X-Ray Machine',
    ['radiograph', 'xray', 'portable xray'],
    { quantity: 5, location: 'Emergency Room', critical: true },
    false, 0.8
  ),
  createNode('equipment', 'Ultrasound Machine',
    ['sonography', 'fast exam', 'bedside ultrasound'],
    { quantity: 8, location: 'Emergency Room', critical: true },
    false, 0.8
  ),
  createNode('equipment', 'Blood Warmer',
    ['fluid warmer', 'rapid infuser', 'level 1'],
    { quantity: 6, location: 'Trauma Center', critical: true },
    true, 0.9
  ),
  createNode('equipment', 'Cardiac Monitor',
    ['telemetry', 'ecg monitor', 'heart monitor'],
    { quantity: 50, location: 'ICU', critical: true },
    false, 0.85
  ),
];

// ============================================
// MEDICATIONS (EXACT MATCH CRITICAL)
// ============================================
const medicationNodes: GraphNode[] = [
  createNode('medication', 'Epinephrine',
    ['adrenaline', 'epi', 'vasopressor'],
    { dosage: '1mg/ml', route: 'IV/IM', critical: true },
    true, 0.95
  ),
  createNode('medication', 'Norepinephrine',
    ['levophed', 'noradrenaline', 'vasopressor'],
    { dosage: '4mg/4ml', route: 'IV', critical: true },
    true, 0.95
  ),
  createNode('medication', 'Morphine',
    ['morphine sulfate', 'ms contin', 'opioid analgesic'],
    { dosage: '10mg/ml', route: 'IV', critical: true, controlled: true },
    true, 0.9
  ),
  createNode('medication', 'Fentanyl',
    ['fentanyl citrate', 'sublimaze', 'opioid'],
    { dosage: '50mcg/ml', route: 'IV', critical: true, controlled: true },
    true, 0.9
  ),
  createNode('medication', 'Ketamine',
    ['ketalar', 'dissociative anesthetic'],
    { dosage: '50mg/ml', route: 'IV/IM', critical: true, controlled: true },
    true, 0.9
  ),
  createNode('medication', 'Propofol',
    ['diprivan', 'sedative', 'anesthetic'],
    { dosage: '10mg/ml', route: 'IV', critical: true },
    true, 0.9
  ),
  createNode('medication', 'Tranexamic Acid',
    ['txa', 'cyklokapron', 'antifibrinolytic'],
    { dosage: '1g/10ml', route: 'IV', critical: true },
    true, 0.95
  ),
  createNode('medication', 'Antibiotics Broad Spectrum',
    ['ceftriaxone', 'piperacillin', 'meropenem'],
    { critical: true },
    false, 0.85
  ),
];

// ============================================
// CONDITIONS
// ============================================
const conditionNodes: GraphNode[] = [
  createNode('condition', 'Hemorrhagic Shock',
    ['blood loss', 'hypovolemic shock', 'severe bleeding', 'exsanguination'],
    { severity: 'critical', triageLevel: 1 },
    false, 0.95
  ),
  createNode('condition', 'Traumatic Brain Injury',
    ['tbi', 'head injury', 'brain trauma', 'concussion', 'skull fracture'],
    { severity: 'critical', triageLevel: 1 },
    false, 0.95
  ),
  createNode('condition', 'Major Burns',
    ['third degree burns', 'extensive burns', 'burn injury', 'thermal injury'],
    { severity: 'critical', triageLevel: 1 },
    false, 0.95
  ),
  createNode('condition', 'Crush Syndrome',
    ['rhabdomyolysis', 'crush injury', 'entrapment injury'],
    { severity: 'critical', triageLevel: 1 },
    false, 0.9
  ),
  createNode('condition', 'Multiple Fractures',
    ['polytrauma', 'multiple broken bones', 'compound fractures'],
    { severity: 'high', triageLevel: 2 },
    false, 0.85
  ),
  createNode('condition', 'Smoke Inhalation',
    ['inhalation injury', 'airway burn', 'carbon monoxide poisoning'],
    { severity: 'critical', triageLevel: 1 },
    false, 0.9
  ),
  createNode('condition', 'Spinal Cord Injury',
    ['spinal trauma', 'paralysis', 'vertebral fracture'],
    { severity: 'critical', triageLevel: 1 },
    false, 0.95
  ),
  createNode('condition', 'Chemical Burns',
    ['acid burn', 'alkali burn', 'chemical injury'],
    { severity: 'high', triageLevel: 2 },
    false, 0.85
  ),
];

// ============================================
// PROTOCOLS
// ============================================
const protocolNodes: GraphNode[] = [
  createNode('protocol', 'Mass Casualty Protocol',
    ['mci protocol', 'disaster response', 'mass trauma protocol'],
    { 
      activationCriteria: '5+ critical patients',
      responseTime: 'immediate',
      staffRequired: 'all available'
    },
    false, 1.0
  ),
  createNode('protocol', 'Trauma Activation',
    ['trauma code', 'trauma alert', 'level 1 trauma'],
    { 
      activationCriteria: 'severe trauma',
      responseTime: '5 minutes',
      staffRequired: 'trauma team'
    },
    false, 0.95
  ),
  createNode('protocol', 'Burn Protocol',
    ['burn activation', 'burn response', 'thermal injury protocol'],
    { 
      activationCriteria: '>20% TBSA or airway involvement',
      responseTime: '10 minutes',
      staffRequired: 'burn team'
    },
    false, 0.9
  ),
  createNode('protocol', 'Massive Transfusion Protocol',
    ['mtp', 'blood protocol', 'hemorrhage protocol'],
    { 
      activationCriteria: 'severe hemorrhage',
      responseTime: 'immediate',
      bloodProducts: 'O-Negative Blood, Fresh Frozen Plasma, Platelets'
    },
    false, 0.95
  ),
  createNode('protocol', 'Code Blue',
    ['cardiac arrest', 'resuscitation', 'cpr protocol'],
    { 
      activationCriteria: 'cardiac arrest',
      responseTime: 'immediate',
      staffRequired: 'code team'
    },
    false, 0.95
  ),
  createNode('protocol', 'Airway Emergency Protocol',
    ['difficult airway', 'failed airway', 'cricothyrotomy'],
    { 
      activationCriteria: 'airway compromise',
      responseTime: 'immediate',
      staffRequired: 'anesthesia, RT'
    },
    false, 0.9
  ),
  createNode('protocol', 'Chemical Decontamination',
    ['hazmat protocol', 'decon protocol', 'chemical exposure protocol'],
    { 
      activationCriteria: 'chemical exposure',
      responseTime: '5 minutes',
      staffRequired: 'hazmat team'
    },
    false, 0.9
  ),
];

// ============================================
// BUILD RELATIONSHIPS (EDGES)
// ============================================
function buildEdges(): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const allNodes = [
    ...emergencyNodes, ...departmentNodes, ...staffNodes,
    ...supplyNodes, ...equipmentNodes, ...medicationNodes,
    ...conditionNodes, ...protocolNodes
  ];

  const findNode = (name: string): GraphNode | undefined => 
    allNodes.find(n => n.name.toLowerCase() === name.toLowerCase());

  // Emergency Type → Protocol relationships
  const emergencyProtocolMap: Record<string, string[]> = {
    'Building Fire': ['Mass Casualty Protocol', 'Burn Protocol', 'Airway Emergency Protocol'],
    'Mass Vehicle Accident': ['Mass Casualty Protocol', 'Trauma Activation', 'Massive Transfusion Protocol'],
    'Industrial Accident': ['Mass Casualty Protocol', 'Trauma Activation', 'Chemical Decontamination'],
    'Mass Casualty Incident': ['Mass Casualty Protocol', 'Trauma Activation', 'Massive Transfusion Protocol'],
    'Building Collapse': ['Mass Casualty Protocol', 'Trauma Activation'],
    'Chemical Exposure': ['Chemical Decontamination', 'Airway Emergency Protocol'],
  };

  Object.entries(emergencyProtocolMap).forEach(([emergency, protocols]) => {
    const emergencyNode = findNode(emergency);
    if (emergencyNode) {
      protocols.forEach(protocol => {
        const protocolNode = findNode(protocol);
        if (protocolNode) {
          edges.push(createEdge(emergencyNode, protocolNode, 'ACTIVATES', 1.0));
        }
      });
    }
  });

  // Protocol → Department relationships
  const protocolDeptMap: Record<string, string[]> = {
    'Mass Casualty Protocol': ['Emergency Room', 'Trauma Center', 'ICU', 'Operating Room'],
    'Trauma Activation': ['Trauma Center', 'Operating Room', 'ICU'],
    'Burn Protocol': ['Burn Unit', 'ICU'],
    'Massive Transfusion Protocol': ['Blood Bank', 'Trauma Center'],
    'Chemical Decontamination': ['Emergency Room'],
  };

  Object.entries(protocolDeptMap).forEach(([protocol, depts]) => {
    const protocolNode = findNode(protocol);
    if (protocolNode) {
      depts.forEach(dept => {
        const deptNode = findNode(dept);
        if (deptNode) {
          edges.push(createEdge(protocolNode, deptNode, 'REQUIRES', 0.9));
        }
      });
    }
  });

  // Protocol → Staff relationships
  const protocolStaffMap: Record<string, string[]> = {
    'Mass Casualty Protocol': ['Trauma Surgeon', 'Emergency Physician', 'Critical Care Nurse'],
    'Trauma Activation': ['Trauma Surgeon', 'Anesthesiologist', 'Critical Care Nurse'],
    'Burn Protocol': ['Burn Specialist', 'Anesthesiologist', 'Critical Care Nurse'],
    'Massive Transfusion Protocol': ['Trauma Surgeon', 'Anesthesiologist'],
    'Airway Emergency Protocol': ['Anesthesiologist', 'Respiratory Therapist'],
  };

  Object.entries(protocolStaffMap).forEach(([protocol, staff]) => {
    const protocolNode = findNode(protocol);
    if (protocolNode) {
      staff.forEach(s => {
        const staffNode = findNode(s);
        if (staffNode) {
          edges.push(createEdge(protocolNode, staffNode, 'ALERTS', 0.95));
        }
      });
    }
  });

  // Protocol → Supply relationships (CRITICAL - exact match)
  const protocolSupplyMap: Record<string, string[]> = {
    'Burn Protocol': ['Burn Kit', 'IV Fluids Normal Saline', 'IV Fluids Lactated Ringers'],
    'Trauma Activation': ['Trauma Kit', 'Chest Tube Kit', 'Central Line Kit', 'Intubation Kit'],
    'Massive Transfusion Protocol': ['O-Negative Blood', 'Fresh Frozen Plasma', 'Platelets'],
    'Airway Emergency Protocol': ['Intubation Kit'],
  };

  Object.entries(protocolSupplyMap).forEach(([protocol, supplies]) => {
    const protocolNode = findNode(protocol);
    if (protocolNode) {
      supplies.forEach(supply => {
        const supplyNode = findNode(supply);
        if (supplyNode) {
          edges.push(createEdge(protocolNode, supplyNode, 'REQUIRES', 1.0, 
            { exactMatch: true }));
        }
      });
    }
  });

  // Protocol → Equipment relationships
  const protocolEquipmentMap: Record<string, string[]> = {
    'Trauma Activation': ['CT Scanner', 'Blood Warmer', 'Ultrasound Machine'],
    'Burn Protocol': ['Ventilator'],
    'Code Blue': ['Defibrillator', 'Cardiac Monitor'],
    'Airway Emergency Protocol': ['Ventilator'],
    'Massive Transfusion Protocol': ['Blood Warmer'],
  };

  Object.entries(protocolEquipmentMap).forEach(([protocol, equipment]) => {
    const protocolNode = findNode(protocol);
    if (protocolNode) {
      equipment.forEach(eq => {
        const eqNode = findNode(eq);
        if (eqNode) {
          edges.push(createEdge(protocolNode, eqNode, 'USES', 0.9));
        }
      });
    }
  });

  // Condition → Protocol relationships
  const conditionProtocolMap: Record<string, string[]> = {
    'Hemorrhagic Shock': ['Massive Transfusion Protocol', 'Trauma Activation'],
    'Traumatic Brain Injury': ['Trauma Activation'],
    'Major Burns': ['Burn Protocol'],
    'Crush Syndrome': ['Trauma Activation', 'Massive Transfusion Protocol'],
    'Smoke Inhalation': ['Airway Emergency Protocol', 'Burn Protocol'],
    'Spinal Cord Injury': ['Trauma Activation'],
    'Chemical Burns': ['Chemical Decontamination', 'Burn Protocol'],
  };

  Object.entries(conditionProtocolMap).forEach(([condition, protocols]) => {
    const conditionNode = findNode(condition);
    if (conditionNode) {
      protocols.forEach(protocol => {
        const protocolNode = findNode(protocol);
        if (protocolNode) {
          edges.push(createEdge(conditionNode, protocolNode, 'ACTIVATES', 0.85));
        }
      });
    }
  });

  // Staff → Department relationships
  const staffDeptMap: Record<string, string> = {
    'Trauma Surgeon': 'Trauma Center',
    'Emergency Physician': 'Emergency Room',
    'Burn Specialist': 'Burn Unit',
    'Anesthesiologist': 'Operating Room',
    'Neurosurgeon': 'Operating Room',
    'Critical Care Nurse': 'ICU',
    'Respiratory Therapist': 'ICU',
  };

  Object.entries(staffDeptMap).forEach(([staff, dept]) => {
    const staffNode = findNode(staff);
    const deptNode = findNode(dept);
    if (staffNode && deptNode) {
      edges.push(createEdge(staffNode, deptNode, 'LOCATED_IN', 0.8, {}, true));
    }
  });

  // Supply → Department relationships
  const supplyDeptMap: Record<string, string> = {
    'O-Negative Blood': 'Blood Bank',
    'O-Positive Blood': 'Blood Bank',
    'Fresh Frozen Plasma': 'Blood Bank',
    'Platelets': 'Blood Bank',
    'Burn Kit': 'Burn Unit',
    'Trauma Kit': 'Trauma Center',
    'Intubation Kit': 'Emergency Room',
    'IV Fluids Normal Saline': 'Emergency Room',
  };

  Object.entries(supplyDeptMap).forEach(([supply, dept]) => {
    const supplyNode = findNode(supply);
    const deptNode = findNode(dept);
    if (supplyNode && deptNode) {
      edges.push(createEdge(supplyNode, deptNode, 'LOCATED_IN', 0.9));
    }
  });

  // Medication → Condition relationships (TREATS)
  const medConditionMap: Record<string, string[]> = {
    'Epinephrine': ['Hemorrhagic Shock'],
    'Norepinephrine': ['Hemorrhagic Shock'],
    'Tranexamic Acid': ['Hemorrhagic Shock'],
    'Morphine': ['Multiple Fractures', 'Major Burns'],
    'Fentanyl': ['Major Burns', 'Traumatic Brain Injury'],
    'Ketamine': ['Major Burns', 'Multiple Fractures'],
  };

  Object.entries(medConditionMap).forEach(([med, conditions]) => {
    const medNode = findNode(med);
    if (medNode) {
      conditions.forEach(condition => {
        const conditionNode = findNode(condition);
        if (conditionNode) {
          edges.push(createEdge(medNode, conditionNode, 'TREATS', 0.85));
        }
      });
    }
  });

  return edges;
}

// ============================================
// BUILD KNOWLEDGE GRAPH
// ============================================
export function buildMedicalKnowledgeGraph(): KnowledgeGraph {
  const allNodes = [
    ...emergencyNodes,
    ...departmentNodes,
    ...staffNodes,
    ...supplyNodes,
    ...equipmentNodes,
    ...medicationNodes,
    ...conditionNodes,
    ...protocolNodes,
  ];

  const edges = buildEdges();

  // Build node map
  const nodes = new Map<string, GraphNode>();
  allNodes.forEach(node => nodes.set(node.id, node));

  // Build adjacency lists
  const adjacencyList = new Map<string, string[]>();
  const reverseAdjacencyList = new Map<string, string[]>();

  // Initialize all nodes in adjacency lists
  allNodes.forEach(node => {
    adjacencyList.set(node.id, []);
    reverseAdjacencyList.set(node.id, []);
  });

  // Populate adjacency lists from edges
  edges.forEach(edge => {
    const outgoing = adjacencyList.get(edge.sourceId) || [];
    outgoing.push(edge.targetId);
    adjacencyList.set(edge.sourceId, outgoing);

    const incoming = reverseAdjacencyList.get(edge.targetId) || [];
    incoming.push(edge.sourceId);
    reverseAdjacencyList.set(edge.targetId, incoming);

    // Handle bidirectional edges
    if (edge.bidirectional) {
      const reverseOut = adjacencyList.get(edge.targetId) || [];
      reverseOut.push(edge.sourceId);
      adjacencyList.set(edge.targetId, reverseOut);

      const reverseIn = reverseAdjacencyList.get(edge.sourceId) || [];
      reverseIn.push(edge.targetId);
      reverseAdjacencyList.set(edge.sourceId, reverseIn);
    }
  });

  return {
    nodes,
    edges,
    adjacencyList,
    reverseAdjacencyList,
  };
}

// Export individual node collections for direct access
export {
  emergencyNodes,
  departmentNodes,
  staffNodes,
  supplyNodes,
  equipmentNodes,
  medicationNodes,
  conditionNodes,
  protocolNodes,
};

// Singleton instance
let graphInstance: KnowledgeGraph | null = null;

export function getMedicalKnowledgeGraph(): KnowledgeGraph {
  if (!graphInstance) {
    graphInstance = buildMedicalKnowledgeGraph();
  }
  return graphInstance;
}

// Get graph statistics
export function getGraphStats(): {
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<NodeType, number>;
} {
  const graph = getMedicalKnowledgeGraph();
  const nodesByType: Partial<Record<NodeType, number>> = {};
  
  graph.nodes.forEach(node => {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  });

  return {
    nodeCount: graph.nodes.size,
    edgeCount: graph.edges.length,
    nodesByType: nodesByType as Record<NodeType, number>,
  };
}
