import { NextRequest, NextResponse } from 'next/server';
import { generateTriageAssessment, analyzeSeverityWithHF } from '@/lib/ai';
import { getRAGContext, getEmergencyResources } from '@/lib/hybridSearch';

// AI Triage Assessment API
// Priority: Groq (Llama 3.1 70B) > Rule-based fallback
// Enhanced with GraphRAG for accurate supply/protocol retrieval

interface TriageRequest {
  full_name: string;
  age: string;
  gender: string;
  chief_complaint: string;
  symptom_duration: string;
  severity: number;
  bp_systolic: number;
  bp_diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  spo2: number;
  temperature: number;
  temperature_unit: string;
}

interface TriageResult {
  level: 1 | 2 | 3 | 4 | 5;
  classification: string;
  confidence: number;
  differentialDiagnosis: string[];
  assignedBed: string;
  pathway: string;
  hfAnalysis?: { severity: string; score: number; reasoning?: string };
}

// Bed assignment pools
const BEDS = {
  resuscitation: ['Resus Bay 1', 'Resus Bay 2', 'Trauma Bay A'],
  cardiac: ['Cardiac Monitored Bed 1', 'Cardiac Monitored Bed 2', 'Cardiac Monitored Bed 3'],
  respiratory: ['Respiratory Isolation 1', 'Respiratory Isolation 2'],
  general: ['ER Bed 5', 'ER Bed 6', 'ER Bed 7', 'ER Bed 8', 'ER Bed 9'],
  fastTrack: ['Fast Track A', 'Fast Track B', 'Fast Track C'],
};

// Get appropriate bed based on presentation
function getAssignedBed(complaint: string, level: 1 | 2 | 3 | 4 | 5): string {
  const lowerComplaint = complaint.toLowerCase();
  
  if (level === 1) {
    return BEDS.resuscitation[Math.floor(Math.random() * BEDS.resuscitation.length)];
  }
  if (lowerComplaint.includes('chest') || lowerComplaint.includes('cardiac') || lowerComplaint.includes('heart')) {
    return BEDS.cardiac[Math.floor(Math.random() * BEDS.cardiac.length)];
  }
  if (lowerComplaint.includes('breath') || lowerComplaint.includes('respiratory') || lowerComplaint.includes('asthma')) {
    return BEDS.respiratory[Math.floor(Math.random() * BEDS.respiratory.length)];
  }
  if (level === 5) {
    return BEDS.fastTrack[Math.floor(Math.random() * BEDS.fastTrack.length)];
  }
  return BEDS.general[Math.floor(Math.random() * BEDS.general.length)];
}

// Generate differential diagnosis based on chief complaint
function getDifferentialDiagnosis(complaint: string, level: number): string[] {
  const lowerComplaint = complaint.toLowerCase();
  
  if (lowerComplaint.includes('chest') || lowerComplaint.includes('cardiac')) {
    return ['Acute Coronary Syndrome', 'Unstable Angina', 'Pulmonary Embolism'];
  }
  if (lowerComplaint.includes('breath') || lowerComplaint.includes('asthma')) {
    return ['Acute Asthma Exacerbation', 'COPD Exacerbation', 'Pneumonia'];
  }
  if (lowerComplaint.includes('abdominal') || lowerComplaint.includes('stomach')) {
    return ['Appendicitis', 'Gastroenteritis', 'Cholecystitis'];
  }
  if (lowerComplaint.includes('head') || lowerComplaint.includes('migraine')) {
    return ['Migraine', 'Tension Headache', 'Meningitis'];
  }
  if (lowerComplaint.includes('fever')) {
    return ['Viral Infection', 'Bacterial Infection', 'Sepsis'];
  }
  if (level <= 2) {
    return ['Critical Emergency', 'Requires Immediate Assessment', 'Life-Threatening Condition'];
  }
  return ['Requires Clinical Assessment', 'Standard Workup Indicated', 'Monitor for Deterioration'];
}

export async function POST(request: NextRequest) {
  try {
    const data: TriageRequest = await request.json();
    
    // Convert temperature to Celsius if needed
    let tempCelsius = data.temperature || 37;
    if (data.temperature_unit === 'F' && data.temperature) {
      tempCelsius = (data.temperature - 32) * 5 / 9;
    }
    
    // Build symptoms description
    const symptoms = `${data.chief_complaint}. Duration: ${data.symptom_duration || 'not specified'}. Severity: ${data.severity}/10.`;
    
    // Prepare vitals
    const vitals = {
      heartRate: data.heart_rate || 80,
      bloodPressure: `${data.bp_systolic || 120}/${data.bp_diastolic || 80}`,
      temperature: tempCelsius,
      oxygenSaturation: data.spo2 || 98,
      respiratoryRate: data.respiratory_rate || 16,
    };
    
    const age = parseInt(data.age) || 30;
    
    // Get AI triage assessment
    const assessment = await generateTriageAssessment(symptoms, vitals, age);

    // Get Hugging Face severity analysis
    const hfAnalysis = await analyzeSeverityWithHF(data.chief_complaint);

    // Build full triage result
    const level = assessment.ctasLevel as 1 | 2 | 3 | 4 | 5;

    // Get GraphRAG context for accurate supply/protocol information
    const ragContext = getRAGContext(data.chief_complaint);
    const emergencyResources = level <= 2 
      ? getEmergencyResources(data.chief_complaint)
      : null;
    
    const classifications = {
      1: 'Resuscitation',
      2: 'Emergent',
      3: 'Urgent',
      4: 'Less Urgent',
      5: 'Non-Urgent',
    };
    
    const triageResult: TriageResult = {
      level,
      classification: classifications[level],
      confidence: level <= 2 ? 95 : level === 3 ? 88 : 80,
      differentialDiagnosis: getDifferentialDiagnosis(data.chief_complaint, level),
      assignedBed: getAssignedBed(data.chief_complaint, level),
      pathway: assessment.recommendations.join('. '),
      hfAnalysis,
    };
    
    return NextResponse.json({
      success: true,
      triageResult,
      reasoning: assessment.reasoning,
      timestamp: new Date().toISOString(),
      source: process.env.GROQ_API_KEY ? 'Groq AI (Llama 3.1 70B)' : 'Rule-Based Engine',
      // GraphRAG enhanced data
      graphRAG: {
        confidence: ragContext.confidence,
        relationships: ragContext.relationships.slice(0, 10),
        knowledgeContext: ragContext.contextString,
      },
      // Emergency resources for critical cases
      emergencyResources: emergencyResources ? {
        protocols: emergencyResources.protocols.map(r => r.node.name),
        supplies: emergencyResources.supplies.map(r => ({
          name: r.node.name,
          exactMatch: r.node.exactMatchRequired,
        })),
        equipment: emergencyResources.equipment.map(r => r.node.name),
        staff: emergencyResources.staff.map(r => r.node.name),
        departments: emergencyResources.departments.map(r => r.node.name),
      } : null,
    });
    
  } catch (error) {
    console.error('Triage API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process triage assessment' },
      { status: 500 }
    );
  }
}
