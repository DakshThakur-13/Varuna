'use client';

import { useState, useEffect } from 'react';
import { generateMRN, validateVitals, cn } from '@/lib/utils';
import { Patient, CTAS_LEVELS } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { 
  EmergencyType, 
  EmergencyScenario, 
  EMERGENCY_SCENARIOS,
  START_TRIAGE
} from '@/types/emergency';
import { 
  User, 
  Activity, 
  Thermometer, 
  Heart, 
  Wind, 
  Droplets,
  AlertCircle,
  CheckCircle,
  Loader2,
  ClipboardList,
  Stethoscope,
  BedDouble,
  Siren,
  Flame,
  Car,
  Factory,
  Users,
  CloudLightning,
  Skull,
  Building2,
  HelpCircle,
  ChevronRight,
  Shield,
  Clock,
  UserPlus,
  Train,
  Wind as GasIcon,
  Bug,
  AlertTriangle,
  Plus,
  X,
  Zap,
  Eye,
  Brain,
  Bone,
  Droplet,
  CircleDot,
  Hash,
  RotateCcw,
  AlertOctagon,
  Info,
  ArrowRight
} from 'lucide-react';

interface TriageResult {
  level: 1 | 2 | 3 | 4 | 5;
  classification: string;
  confidence: number;
  differentialDiagnosis: string[];
  assignedBed: string;
  pathway: string;
  hfAnalysis?: { severity: string; score: number; reasoning?: string };
}

interface EmergencyProtocolResult {
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
    severity: string;
  }>;
  staffAlerts: string[];
}

// Rapid Entry Patient interface
interface RapidPatient {
  id: string;
  tagNumber: string;
  name: string;
  gender: 'male' | 'female' | 'other' | '';
  triageColor: 'red' | 'yellow' | 'green' | 'black';
  consciousness: 'alert' | 'voice' | 'pain' | 'unresponsive';
  vitalStatus: 'stable' | 'unstable' | 'critical';
  injuries: string[];
  heartRate?: number;
  spo2?: number;
  notes: string;
  timestamp: Date;
  aiSuggestion?: string;
  aiTreatment?: string;
  aiRecommendedColor?: 'red' | 'yellow' | 'green' | 'black';
  savedToDb?: boolean;
}

// Common injury types by emergency
const INJURY_TYPES: Record<EmergencyType, string[]> = {
  building_fire: ['Burns - Minor', 'Burns - Major', 'Smoke Inhalation', 'CO Poisoning', 'Trauma/Fall', 'Crush Injury'],
  car_crash: ['Blunt Trauma', 'Fracture', 'Head Injury', 'Spinal Injury', 'Internal Bleeding', 'Lacerations'],
  industrial_accident: ['Crush Injury', 'Amputation', 'Chemical Burn', 'Blast Injury', 'Electrocution', 'Fracture'],
  gas_leak: ['Respiratory Distress', 'Chemical Burn', 'Nausea/Vomiting', 'Unconscious', 'Eye Irritation', 'Skin Irritation'],
  stampede: ['Crush Asphyxia', 'Cardiac Arrest', 'Trampling Injury', 'Fractures', 'Concussion', 'Panic Attack'],
  train_accident: ['Polytrauma', 'Amputation', 'Crush Injury', 'Burns', 'Spinal Injury', 'Head Injury'],
  building_collapse: ['Crush Syndrome', 'Fractures', 'Dust Inhalation', 'Hypothermia', 'Dehydration', 'Trauma'],
  chemical_spill: ['Chemical Burns', 'Respiratory Failure', 'Eye Injury', 'Skin Burns', 'Poisoning', 'Nausea'],
  mass_casualty: ['Blast Injury', 'Penetrating Trauma', 'Burns', 'Fractures', 'Psychological', 'Multiple Injuries'],
  terror_attack: ['Blast Injury', 'Gunshot Wound', 'Shrapnel', 'Burns', 'Crush Injury', 'Psychological'],
  natural_disaster: ['Crush Injury', 'Drowning', 'Fractures', 'Hypothermia', 'Lacerations', 'Infections'],
  epidemic_outbreak: ['Respiratory Failure', 'Fever/Sepsis', 'Dehydration', 'Organ Failure', 'Pneumonia', 'Shock'],
};

// Emergency type icons mapping
const EMERGENCY_ICONS: Record<EmergencyType, React.ReactNode> = {
  building_fire: <Flame className="w-6 h-6" />,
  car_crash: <Car className="w-6 h-6" />,
  industrial_accident: <Factory className="w-6 h-6" />,
  gas_leak: <GasIcon className="w-6 h-6" />,
  stampede: <Users className="w-6 h-6" />,
  train_accident: <Train className="w-6 h-6" />,
  building_collapse: <Building2 className="w-6 h-6" />,
  chemical_spill: <Skull className="w-6 h-6" />,
  mass_casualty: <Siren className="w-6 h-6" />,
  terror_attack: <AlertTriangle className="w-6 h-6" />,
  natural_disaster: <CloudLightning className="w-6 h-6" />,
  epidemic_outbreak: <Bug className="w-6 h-6" />,
};

export default function IntakePage() {
  // Emergency Mode State
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<EmergencyType | null>(null);
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [estimatedVictims, setEstimatedVictims] = useState(10);
  const [emergencySeverity, setEmergencySeverity] = useState<'minor' | 'moderate' | 'severe' | 'critical'>('moderate');
  const [emergencyLocation, setEmergencyLocation] = useState('');
  const [emergencyProtocolResult, setEmergencyProtocolResult] = useState<EmergencyProtocolResult | null>(null);
  const [isLoadingProtocol, setIsLoadingProtocol] = useState(false);

  // Rapid Patient Entry State
  const [showRapidEntry, setShowRapidEntry] = useState(false);
  const [rapidPatients, setRapidPatients] = useState<RapidPatient[]>([]);
  const [currentTagNumber, setCurrentTagNumber] = useState(1);
  const [isSubmittingRapid, setIsSubmittingRapid] = useState(false);
  const [rapidFormData, setRapidFormData] = useState<Omit<RapidPatient, 'id' | 'tagNumber' | 'timestamp' | 'savedToDb'>>({
    name: '',
    gender: '',
    triageColor: 'yellow',
    consciousness: 'alert',
    vitalStatus: 'stable',
    injuries: [],
    heartRate: undefined,
    spo2: undefined,
    notes: '',
    aiSuggestion: undefined,
    aiTreatment: undefined,
    aiRecommendedColor: undefined,
  });
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [resourceWarning, setResourceWarning] = useState<string | null>(null);
  const [otherInjury, setOtherInjury] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Auto-update triage color based on AI suggestion
  useEffect(() => {
    const fetchAIRecommendation = async () => {
      if (rapidFormData.injuries.length === 0) {
        setRapidFormData(prev => ({
          ...prev,
          aiSuggestion: undefined,
          aiTreatment: undefined,
          aiRecommendedColor: undefined
        }));
        return;
      }

      setIsAiLoading(true);
      try {
        const response = await fetch('/api/agent/rapid-triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            injuries: rapidFormData.injuries,
            consciousness: rapidFormData.consciousness,
            vitalStatus: rapidFormData.vitalStatus,
            age: 0, // Unknown in rapid entry
            gender: rapidFormData.gender
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setRapidFormData(prev => ({
            ...prev,
            triageColor: data.triageColor,
            aiRecommendedColor: data.triageColor,
            aiSuggestion: data.reasoning,
            aiTreatment: data.treatment
          }));
        }
      } catch (error) {
        console.error('Failed to fetch AI recommendation:', error);
      } finally {
        setIsAiLoading(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchAIRecommendation();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [rapidFormData.injuries, rapidFormData.consciousness, rapidFormData.vitalStatus, rapidFormData.gender]);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: '' as '' | 'male' | 'female' | 'other',
    chief_complaint: '',
    symptom_duration: '',
    severity: 5,
    bp_systolic: '',
    bp_diastolic: '',
    heart_rate: '',
    respiratory_rate: '',
    spo2: '',
    temperature: '',
    temperature_unit: 'C' as 'C' | 'F',
  });

  // UI state
  const [mrn, setMrn] = useState('');
  const [patientId, setPatientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Generate MRN and UUID on mount
  useEffect(() => {
    setMrn(generateMRN());
    setPatientId(crypto.randomUUID());
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors([]);
  };

  // Handle severity slider
  const handleSeverityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, severity: parseInt(e.target.value) }));
  };

  // Run AI Triage Assessment
  const runTriageAssessment = async () => {
    setIsSubmitting(true);
    setErrors([]);
    setTriageResult(null);

    // Validate vitals
    const vitals = {
      bp_systolic: parseInt(formData.bp_systolic) || 0,
      bp_diastolic: parseInt(formData.bp_diastolic) || 0,
      heart_rate: parseInt(formData.heart_rate) || 0,
      respiratory_rate: parseInt(formData.respiratory_rate) || 0,
      spo2: parseInt(formData.spo2) || 0,
      temperature: parseFloat(formData.temperature) || 0,
    };

    const validation = validateVitals(vitals);
    if (!validation.valid) {
      setErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    // Validate required fields
    if (!formData.full_name || !formData.age || !formData.gender || !formData.chief_complaint) {
      setErrors(['Please fill in all required fields (Name, Age, Gender, Chief Complaint)']);
      setIsSubmitting(false);
      return;
    }

    try {
      // Call AI Triage API
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...vitals,
          mrn,
          id: patientId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Triage assessment failed');
      }

      setTriageResult(data.triageResult);

      // Insert patient into database
      const patientRecord: Omit<Patient, 'id' | 'created_at' | 'updated_at'> = {
        mrn,
        full_name: formData.full_name,
        age: parseInt(formData.age),
        gender: formData.gender as 'male' | 'female' | 'other',
        chief_complaint: formData.chief_complaint,
        symptom_duration: formData.symptom_duration,
        severity: formData.severity,
        bp_systolic: vitals.bp_systolic,
        bp_diastolic: vitals.bp_diastolic,
        heart_rate: vitals.heart_rate,
        respiratory_rate: vitals.respiratory_rate,
        spo2: vitals.spo2,
        temperature: vitals.temperature,
        temperature_unit: formData.temperature_unit,
        triage_level: data.triageResult.level,
        triage_classification: data.triageResult.classification,
        confidence_score: data.triageResult.confidence,
        differential_diagnosis: data.triageResult.differentialDiagnosis,
        assigned_bed: data.triageResult.assignedBed,
        status: 'triaged',
      };

      // Only insert into database if Supabase is configured
      if (supabase) {
        const { error: dbError } = await supabase
          .from('patients')
          .insert(patientRecord);

        if (dbError) {
          console.error('Database error:', dbError);
        }
      } else {
        console.log('Demo mode: Patient record not saved to database');
      }

      setShowSuccess(true);
    } catch (error) {
      console.error('Triage error:', error);
      setErrors([error instanceof Error ? error.message : 'An error occurred during triage']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run Emergency Protocol Assessment using RAG
  const runEmergencyProtocol = async () => {
    if (!selectedEmergencyType) {
      setErrors(['Please select an emergency type']);
      return;
    }

    setIsLoadingProtocol(true);
    setErrors([]);
    setEmergencyProtocolResult(null);

    try {
      const scenario = EMERGENCY_SCENARIOS[selectedEmergencyType];
      
      const response = await fetch('/api/emergency-protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergencyType: selectedEmergencyType,
          scenario: {
            emergencyType: selectedEmergencyType,
            description: emergencyDescription || scenario.description,
            estimatedVictims: estimatedVictims,
            severity: emergencySeverity,
            location: emergencyLocation || 'Hospital vicinity',
            timeSinceIncident: 'Just reported',
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get emergency protocol');
      }

      setEmergencyProtocolResult(data.result);
    } catch (error) {
      console.error('Emergency protocol error:', error);
      setErrors([error instanceof Error ? error.message : 'Failed to get emergency protocol']);
    } finally {
      setIsLoadingProtocol(false);
    }
  };

  // Reset form for new patient
  const resetForm = () => {
    setFormData({
      full_name: '',
      age: '',
      gender: '',
      chief_complaint: '',
      symptom_duration: '',
      severity: 5,
      bp_systolic: '',
      bp_diastolic: '',
      heart_rate: '',
      respiratory_rate: '',
      spo2: '',
      temperature: '',
      temperature_unit: 'C',
    });
    setMrn(generateMRN());
    setPatientId(crypto.randomUUID());
    setTriageResult(null);
    setShowSuccess(false);
    setErrors([]);
    // Reset emergency mode
    setIsEmergencyMode(false);
    setSelectedEmergencyType(null);
    setEmergencyDescription('');
    setEstimatedVictims(10);
    setEmergencySeverity('moderate');
    setEmergencyLocation('');
    setEmergencyProtocolResult(null);
  };

  // Get severity color
  const getSeverityColor = () => {
    if (formData.severity <= 3) return "text-emerald-600";
    if (formData.severity <= 5) return "text-yellow-600";
    if (formData.severity <= 7) return "text-orange-600";
    return "text-rose-600";
  };

  // Get emergency severity color
  const getEmergencySeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'bg-green-600';
      case 'moderate': return 'bg-yellow-600';
      case 'severe': return 'bg-orange-600';
      case 'critical': return 'bg-red-600';
      default: return 'bg-slate-600';
    }
  };

  // Get triage color styling
  const getTriageColorStyle = (color: RapidPatient['triageColor']) => {
    switch (color) {
      case 'red': return { bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-500', label: 'IMMEDIATE' };
      case 'yellow': return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500', label: 'DELAYED' };
      case 'green': return { bg: 'bg-green-600', text: 'text-green-400', border: 'border-green-500', label: 'MINOR' };
      case 'black': return { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-500', label: 'EXPECTANT' };
    }
  };

  // Get AI suggestion for triage based on injury, consciousness, and vitals
  const getAISuggestion = (
    injury: string, 
    consciousness: RapidPatient['consciousness'],
    vitalStatus: RapidPatient['vitalStatus']
  ): { color: RapidPatient['triageColor']; reason: string } => {
    // Critical conditions always RED
    const criticalInjuries = ['Cardiac Arrest', 'Respiratory Failure', 'Crush Asphyxia', 'Internal Bleeding', 'Amputation', 'Blast Injury', 'Gunshot Wound'];
    const severeInjuries = ['Head Injury', 'Spinal Injury', 'Burns - Major', 'Polytrauma', 'Multiple Injuries', 'Crush Syndrome', 'Chemical Burns'];
    const moderateInjuries = ['Fracture', 'Burns - Minor', 'Smoke Inhalation', 'Concussion', 'Lacerations', 'Blunt Trauma'];
    
    // Unresponsive patients
    if (consciousness === 'unresponsive') {
      if (criticalInjuries.some(i => injury.includes(i))) {
        return { color: 'black', reason: 'Unresponsive with critical injury - Expectant' };
      }
      return { color: 'red', reason: 'Unresponsive - Immediate attention required' };
    }
    
    // Critical Vitals
    if (vitalStatus === 'critical') {
      return { color: 'red', reason: 'Critical vital signs - Immediate intervention' };
    }

    // Unstable Vitals
    if (vitalStatus === 'unstable') {
      if (consciousness !== 'alert') {
        return { color: 'red', reason: 'Unstable vitals with altered mental status - Immediate' };
      }
      return { color: 'yellow', reason: 'Unstable vitals - Urgent assessment needed' };
    }

    // Pain response only
    if (consciousness === 'pain') {
      return { color: 'red', reason: 'Responds to pain only - Immediate' };
    }
    
    // Critical injuries
    if (criticalInjuries.some(i => injury.includes(i))) {
      return { color: 'red', reason: `${injury} requires immediate intervention` };
    }
    
    // Severe injuries
    if (severeInjuries.some(i => injury.includes(i))) {
      if (consciousness === 'voice') {
        return { color: 'red', reason: `${injury} with altered consciousness - Immediate` };
      }
      return { color: 'yellow', reason: `${injury} - Delayed care appropriate` };
    }
    
    // Moderate injuries
    if (moderateInjuries.some(i => injury.includes(i))) {
      return { color: 'yellow', reason: `${injury} - Delayed care appropriate` };
    }
    
    // Minor injuries with alert consciousness
    if (consciousness === 'alert' && vitalStatus === 'stable') {
      return { color: 'green', reason: 'Alert patient with minor injury - Walking wounded' };
    }
    
    return { color: 'yellow', reason: 'Default: Delayed assessment recommended' };
  };

  // Add rapid patient and save to Supabase
  const addRapidPatient = async () => {
    if (rapidFormData.injuries.length === 0) return;
    
    setIsSubmittingRapid(true);
    const tagNumber = `E${String(currentTagNumber).padStart(4, '0')}`;
    const mrn = generateMRN();
    
    const newPatient: RapidPatient = {
      id: crypto.randomUUID(),
      tagNumber,
      ...rapidFormData,
      timestamp: new Date(),
      savedToDb: false,
    };
    
    // Save to Supabase
    try {
      if (supabase) {
        const patientRecord = {
          mrn,
          full_name: rapidFormData.name || `Emergency Patient ${tagNumber}`,
          age: 0, // Unknown in rapid entry
          gender: rapidFormData.gender || 'other',
          chief_complaint: rapidFormData.injuries.join(', '),
          symptom_duration: 'Just occurred',
          severity: rapidFormData.triageColor === 'red' ? 10 : 
                   rapidFormData.triageColor === 'yellow' ? 7 :
                   rapidFormData.triageColor === 'green' ? 3 : 10,
          bp_systolic: 0,
          bp_diastolic: 0,
          heart_rate: rapidFormData.heartRate || 0,
          respiratory_rate: 0,
          spo2: rapidFormData.spo2 || 0,
          temperature: 0,
          temperature_unit: 'C',
          triage_level: rapidFormData.triageColor === 'red' ? 1 :
                        rapidFormData.triageColor === 'yellow' ? 3 :
                        rapidFormData.triageColor === 'green' ? 5 : 1,
          triage_classification: rapidFormData.triageColor === 'red' ? 'Resuscitation' :
                                  rapidFormData.triageColor === 'yellow' ? 'Urgent' :
                                  rapidFormData.triageColor === 'green' ? 'Non-Urgent' : 'Expectant',
          confidence_score: 90,
          differential_diagnosis: [rapidFormData.aiSuggestion || 'Emergency triage'],
          assigned_bed: rapidFormData.triageColor === 'red' ? 'Resus Bay' :
                        rapidFormData.triageColor === 'yellow' ? 'ER Bed' : 'Fast Track',
          status: 'triaged',
        };

        const { error } = await supabase.from('patients').insert(patientRecord);
        
        if (!error) {
          newPatient.savedToDb = true;
        } else {
          console.error('Failed to save rapid patient:', error);
        }
      }
    } catch (err) {
      console.error('Database error:', err);
    }
    
    setRapidPatients(prev => [newPatient, ...prev]);
    setCurrentTagNumber(prev => prev + 1);
    
    // Reset form for next patient
    setRapidFormData({
      name: '',
      gender: '',
      triageColor: 'yellow',
      consciousness: 'alert',
      vitalStatus: 'stable',
      injuries: [],
      heartRate: undefined,
      spo2: undefined,
      notes: '',
      aiSuggestion: undefined,
      aiRecommendedColor: undefined,
    });
    
    setIsSubmittingRapid(false);
    
    // Check resource warnings
    const redCount = rapidPatients.filter(p => p.triageColor === 'red').length + (newPatient.triageColor === 'red' ? 1 : 0);
    const yellowCount = rapidPatients.filter(p => p.triageColor === 'yellow').length + (newPatient.triageColor === 'yellow' ? 1 : 0);
    
    if (redCount >= 5) {
      setResourceWarning(`⚠️ CRITICAL: ${redCount} RED patients - Request additional trauma staff and ICU beds`);
    } else if (yellowCount >= 10) {
      setResourceWarning(`⚠️ WARNING: ${yellowCount} YELLOW patients - Consider expanding treatment area`);
    } else {
      setResourceWarning(null);
    }
    
    // Check for special protocol warnings
    const injuryString = newPatient.injuries.join(' ');
    if (injuryString.includes('Chemical') || injuryString.includes('Poison')) {
      setAiWarning('🧪 DECONTAMINATION REQUIRED: Isolate patient before treatment');
    } else if (injuryString.includes('Burn') && newPatient.triageColor === 'red') {
      setAiWarning('🔥 BURNS PROTOCOL: Prepare burn unit, IV fluids, and pain management');
    } else if (injuryString.includes('Spinal')) {
      setAiWarning('🦴 SPINAL PRECAUTIONS: Maintain immobilization, prepare imaging');
    } else {
      setAiWarning(null);
    }
  };

  // Get patient stats
  const getPatientStats = () => {
    return {
      red: rapidPatients.filter(p => p.triageColor === 'red').length,
      yellow: rapidPatients.filter(p => p.triageColor === 'yellow').length,
      green: rapidPatients.filter(p => p.triageColor === 'green').length,
      black: rapidPatients.filter(p => p.triageColor === 'black').length,
      total: rapidPatients.length,
    };
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg",
                isEmergencyMode 
                  ? "bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400/30 shadow-rose-500/20 animate-pulse" 
                  : "bg-gradient-to-br from-teal-500 to-teal-600 border-teal-400/30 shadow-teal-500/20"
              )}>
                {isEmergencyMode ? <Siren className="w-6 h-6 text-white" /> : <Stethoscope className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h1 className={cn(
                  "text-2xl font-bold tracking-tight",
                  isEmergencyMode ? "text-rose-400" : "text-white"
                )}>
                  {isEmergencyMode ? 'EMERGENCY MODE' : 'Patient Intake'}
                </h1>
                <p className="text-sm text-slate-400 font-medium">
                  {isEmergencyMode ? 'Mass Casualty Protocol Active' : 'AI-Powered Triage Assessment'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Emergency Mode Toggle */}
              <button
                onClick={() => {
                  setIsEmergencyMode(!isEmergencyMode);
                  if (!isEmergencyMode) {
                    setSelectedEmergencyType(null);
                    setEmergencyProtocolResult(null);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all border",
                  isEmergencyMode
                    ? "bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-700/60"
                    : "bg-gradient-to-r from-rose-500 to-rose-600 border-rose-400/30 text-white shadow-lg shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700"
                )}
              >
                <Siren className="w-5 h-5" />
                {isEmergencyMode ? 'Exit Emergency' : 'EMERGENCY'}
              </button>
              <div className="text-right bg-slate-800/50 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-slate-700/50">
                <p className="text-sm font-semibold text-white">MRN: {mrn}</p>
                <p className="text-xs text-slate-500 font-medium">Auto-generated</p>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Mode UI */}
        {isEmergencyMode && (
          <div className="mb-8 animate-in slide-in-from-top-4 duration-300">
            {/* Emergency Type Selection */}
            {!emergencyProtocolResult && (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 bg-gradient-to-b from-rose-400 to-rose-600 rounded-full" />
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                      <h2 className="text-lg font-semibold text-white">Select Emergency Type</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(Object.keys(EMERGENCY_SCENARIOS) as EmergencyType[]).map((type) => {
                      const scenario = EMERGENCY_SCENARIOS[type];
                      const isSelected = selectedEmergencyType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => setSelectedEmergencyType(type)}
                          className={cn(
                            "relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all overflow-hidden group",
                            isSelected
                              ? `${scenario.color} border-white/50 text-white shadow-lg`
                              : "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800"
                          )}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 bg-white/10 pointer-events-none" />
                          )}
                          <span className="text-2xl relative z-10">{scenario.icon}</span>
                          <span className="text-sm font-semibold text-center relative z-10">{scenario.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Emergency Details */}
                {selectedEmergencyType && (
                  <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/10">
                          <Shield className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Incident Details</h3>
                          <p className="text-xs text-slate-500">Configure emergency parameters</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Location */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Incident Location
                          </label>
                          <input
                            type="text"
                            value={emergencyLocation}
                            onChange={(e) => setEmergencyLocation(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all placeholder-slate-500"
                            placeholder="e.g., Highway 101, Building A"
                          />
                        </div>

                        {/* Estimated Victims */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Estimated Victims: <span className="text-rose-400 font-bold">{estimatedVictims}</span>
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="200"
                            value={estimatedVictims}
                            onChange={(e) => setEstimatedVictims(parseInt(e.target.value))}
                            aria-label="Estimated number of victims"
                            className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-emerald-500 via-amber-500 via-orange-500 to-rose-500"
                          />
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>1</span>
                            <span>50</span>
                            <span>100</span>
                            <span>200+</span>
                          </div>
                        </div>

                        {/* Severity */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Incident Severity
                          </label>
                          <div className="flex gap-2">
                            {(['minor', 'moderate', 'severe', 'critical'] as const).map((sev) => (
                              <button
                                key={sev}
                                onClick={() => setEmergencySeverity(sev)}
                                className={cn(
                                  "flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all capitalize border",
                                  emergencySeverity === sev
                                    ? `${getEmergencySeverityColor(sev)} border-transparent text-white shadow-lg`
                                    : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-700/60"
                                )}
                              >
                                {sev}
                              </button>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Additional Details
                        </label>
                        <input
                          type="text"
                          value={emergencyDescription}
                          onChange={(e) => setEmergencyDescription(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all placeholder-slate-500"
                          placeholder="Any additional information..."
                        />
                      </div>
                    </div>

                    {/* Expected Injuries Preview */}
                    <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                      <h4 className="text-sm font-semibold text-amber-400 mb-3">Expected Injury Types:</h4>
                      <div className="flex flex-wrap gap-2">
                        {EMERGENCY_SCENARIOS[selectedEmergencyType].expectedInjuries.map((injury, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-slate-800/60 text-slate-300 text-xs font-medium rounded-lg border border-slate-700/50">
                            {injury}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Get Protocol Button */}
                    <button
                      onClick={runEmergencyProtocol}
                      disabled={isLoadingProtocol}
                      className={cn(
                        "w-full mt-6 py-4 px-6 rounded-xl font-bold text-lg text-white transition-all border shadow-lg",
                        isLoadingProtocol
                          ? "bg-rose-700/80 border-rose-600/50 cursor-wait"
                          : "bg-gradient-to-r from-rose-500 to-rose-600 border-rose-400/30 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/20"
                      )}
                    >
                      {isLoadingProtocol ? (
                        <span className="flex items-center justify-center gap-3">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Analyzing with RAG + Med42 AI...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-3">
                          <Shield className="w-6 h-6" />
                          Get Emergency Protocol
                        </span>
                      )}
                    </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Emergency Protocol Result */}
            {emergencyProtocolResult && selectedEmergencyType && (
              <div className="animate-in slide-in-from-top-4 duration-500">
                {/* Protocol Header */}
                <div className={cn(
                  "rounded-t-xl px-6 py-4",
                  EMERGENCY_SCENARIOS[selectedEmergencyType].color
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{EMERGENCY_SCENARIOS[selectedEmergencyType].icon}</span>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {EMERGENCY_SCENARIOS[selectedEmergencyType].label} Protocol
                        </h3>
                        <p className="text-sm text-white/80">
                          Triage Priority: {emergencyProtocolResult.triageRecommendation.priority.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-lg font-bold text-lg",
                      emergencyProtocolResult.triageRecommendation.color === 'red' ? 'bg-red-900 text-red-200' :
                      emergencyProtocolResult.triageRecommendation.color === 'yellow' ? 'bg-yellow-900 text-yellow-200' :
                      emergencyProtocolResult.triageRecommendation.color === 'green' ? 'bg-green-900 text-green-200' :
                      'bg-slate-900 text-slate-200'
                    )}>
                      {emergencyProtocolResult.triageRecommendation.color.toUpperCase()} TAG
                    </div>
                  </div>
                </div>

                {/* Protocol Details */}
                <div className="bg-slate-800 rounded-b-xl border border-t-0 border-slate-700 p-6">
                  {/* AI Reasoning */}
                  <div className="mb-6 p-4 bg-blue-950/30 border border-blue-800/50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" /> AI Analysis (Med42)
                    </h4>
                    <p className="text-blue-300">{emergencyProtocolResult.triageRecommendation.reasoning}</p>
                  </div>

                  {/* Immediate Actions */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Immediate Actions
                    </h4>
                    <ol className="space-y-2">
                      {emergencyProtocolResult.immediateActions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-white">
                          <span className="w-6 h-6 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Resources Needed */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-amber-400 mb-3">Resources Required</h4>
                    <div className="flex flex-wrap gap-2">
                      {emergencyProtocolResult.resourcesNeeded.map((resource, idx) => (
                        <span key={idx} className="px-3 py-1 bg-amber-500/20 text-amber-300 text-sm rounded-full">
                          {resource}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expected Arrival Waves */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Expected Patient Arrival Waves
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      {emergencyProtocolResult.estimatedArrivalWaves.map((wave, idx) => (
                        <div key={idx} className="p-4 bg-slate-900/50 rounded-lg text-center">
                          <p className="text-slate-400 text-xs mb-1">{wave.time}</p>
                          <p className="text-2xl font-bold text-white">{wave.count}</p>
                          <p className={cn(
                            "text-xs font-medium capitalize",
                            wave.severity === 'critical' ? 'text-red-400' :
                            wave.severity === 'serious' ? 'text-orange-400' : 'text-green-400'
                          )}>
                            {wave.severity}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Staff Alerts */}
                  <div className="mb-6 p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-lg">
                    <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" /> Staff Alerts Sent
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {emergencyProtocolResult.staffAlerts.map((alert, idx) => (
                        <span key={idx} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-sm rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {alert}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setEmergencyProtocolResult(null);
                        setSelectedEmergencyType(null);
                      }}
                      className="flex-1 py-3 px-6 rounded-lg font-semibold text-white bg-slate-700 border border-slate-600 hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                      New Emergency
                    </button>
                    <button
                      onClick={() => setShowRapidEntry(true)}
                      className="flex-1 py-3 px-6 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-500 transition-all flex items-center justify-center gap-2 animate-pulse"
                    >
                      <UserPlus className="w-5 h-5" />
                      Start Rapid Patient Entry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rapid Patient Entry Section */}
            {showRapidEntry && emergencyProtocolResult && selectedEmergencyType && (
              <div className="mt-6 animate-in slide-in-from-bottom-4 duration-500">
                {/* Resource Warning Banner */}
                {resourceWarning && (
                  <div className="mb-4 p-4 bg-orange-950/50 border border-orange-700 rounded-xl flex items-center gap-3">
                    <AlertOctagon className="w-6 h-6 text-orange-400 flex-shrink-0" />
                    <p className="text-orange-300 font-medium">{resourceWarning}</p>
                  </div>
                )}

                {/* AI Protocol Warning */}
                {aiWarning && (
                  <div className="mb-4 p-4 bg-blue-950/50 border border-blue-700 rounded-xl flex items-center gap-3">
                    <Info className="w-6 h-6 text-blue-400 flex-shrink-0" />
                    <p className="text-blue-300 font-medium">{aiWarning}</p>
                    <button onClick={() => setAiWarning(null)} className="ml-auto text-blue-400 hover:text-blue-300" title="Dismiss warning" aria-label="Dismiss warning">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Stats Bar */}
                <div className="mb-4 grid grid-cols-5 gap-2">
                  <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-400">{getPatientStats().red}</p>
                    <p className="text-xs text-red-300">IMMEDIATE</p>
                  </div>
                  <div className="p-3 bg-yellow-950/50 border border-yellow-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-400">{getPatientStats().yellow}</p>
                    <p className="text-xs text-yellow-300">DELAYED</p>
                  </div>
                  <div className="p-3 bg-green-950/50 border border-green-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-400">{getPatientStats().green}</p>
                    <p className="text-xs text-green-300">MINOR</p>
                  </div>
                  <div className="p-3 bg-slate-800 border border-slate-600 rounded-lg text-center">
                    <p className="text-2xl font-bold text-slate-400">{getPatientStats().black}</p>
                    <p className="text-xs text-slate-300">EXPECTANT</p>
                  </div>
                  <div className="p-3 bg-blue-950/50 border border-blue-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-400">{getPatientStats().total}</p>
                    <p className="text-xs text-blue-300">TOTAL</p>
                  </div>
                </div>

                {/* Rapid Entry Form */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Hash className="w-6 h-6 text-red-400" />
                        Rapid Triage Entry
                      </h3>
                      <p className="text-slate-400 text-sm">Tag #E{String(currentTagNumber).padStart(4, '0')}</p>
                    </div>
                    <button
                      onClick={() => setShowRapidEntry(false)}
                      className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Close rapid entry"
                      aria-label="Close rapid entry"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Primary Survey */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-blue-400 mb-2">
                        <Activity className="w-5 h-5" />
                        <h4 className="font-semibold uppercase tracking-wider text-sm">Primary Survey</h4>
                      </div>

                      {/* Mental Status (AVPU) */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Mental Status (AVPU)</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['alert', 'voice', 'pain', 'unresponsive'] as const).map((level) => (
                            <button
                              key={level}
                              onClick={() => setRapidFormData(prev => ({ ...prev, consciousness: level }))}
                              className={cn(
                                "p-3 rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-1 h-20",
                                rapidFormData.consciousness === level
                                  ? level === 'alert' ? 'bg-green-600 border-green-400 text-white' :
                                    level === 'voice' ? 'bg-yellow-600 border-yellow-400 text-white' :
                                    level === 'pain' ? 'bg-orange-600 border-orange-400 text-white' :
                                    'bg-red-600 border-red-400 text-white'
                                  : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500 hover:bg-slate-800'
                              )}
                            >
                              <span className="text-lg font-bold uppercase">{level[0]}</span>
                              <span className="text-xs font-medium capitalize">{level}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Clinical Status */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Clinical Status</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['stable', 'unstable', 'critical'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => setRapidFormData(prev => ({ ...prev, vitalStatus: status }))}
                              className={cn(
                                "p-3 rounded-lg border transition-all text-center",
                                rapidFormData.vitalStatus === status
                                  ? status === 'stable' ? 'bg-emerald-600 border-emerald-400 text-white' :
                                    status === 'unstable' ? 'bg-amber-600 border-amber-400 text-white' :
                                    'bg-rose-600 border-rose-400 text-white'
                                  : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500 hover:bg-slate-800'
                              )}
                            >
                              <p className="font-bold capitalize">{status}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quick Vitals (Optional) */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Heart Rate (BPM)</label>
                          <input
                            type="number"
                            value={rapidFormData.heartRate || ''}
                            onChange={(e) => setRapidFormData(prev => ({ ...prev, heartRate: e.target.value ? parseInt(e.target.value) : undefined }))}
                            placeholder="--"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:ring-1 focus:ring-blue-500 text-center font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">SpO2 (%)</label>
                          <input
                            type="number"
                            value={rapidFormData.spo2 || ''}
                            onChange={(e) => setRapidFormData(prev => ({ ...prev, spo2: e.target.value ? parseInt(e.target.value) : undefined }))}
                            placeholder="--"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:ring-1 focus:ring-blue-500 text-center font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Patient Info & Injuries */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <User className="w-5 h-5" />
                        <h4 className="font-semibold uppercase tracking-wider text-sm">Patient & Injuries</h4>
                      </div>

                      {/* Name and Gender Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Patient Name</label>
                          <input
                            type="text"
                            value={rapidFormData.name}
                            onChange={(e) => setRapidFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter name..."
                            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm capitalize"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Gender</label>
                          <div className="grid grid-cols-3 gap-1">
                            {(['male', 'female', 'other'] as const).map((g) => (
                              <button
                                key={g}
                                onClick={() => setRapidFormData(prev => ({ ...prev, gender: g }))}
                                className={cn(
                                  "py-2.5 rounded-lg text-xs font-bold capitalize transition-all border",
                                  rapidFormData.gender === g
                                    ? 'bg-blue-600 border-blue-400 text-white'
                                    : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
                                )}
                              >
                                {g === 'male' ? 'M' : g === 'female' ? 'F' : 'O'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Injuries Multi-Select */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Select Injuries <span className="text-slate-500">(multiple allowed)</span>
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3 max-h-36 overflow-y-auto pr-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                          {INJURY_TYPES[selectedEmergencyType].map((injury) => {
                            const isSelected = rapidFormData.injuries.includes(injury);
                            return (
                              <button
                                key={injury}
                                onClick={() => {
                                  setRapidFormData(prev => ({
                                    ...prev,
                                    injuries: isSelected
                                      ? prev.injuries.filter(i => i !== injury)
                                      : [...prev.injuries, injury]
                                  }));
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all border flex items-center gap-1.5",
                                  isSelected
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                                )}
                              >
                                {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                                {injury}
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Other Injury Input */}
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={otherInjury}
                            onChange={(e) => setOtherInjury(e.target.value)}
                            placeholder="Other injury..."
                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && otherInjury.trim()) {
                                e.preventDefault();
                                setRapidFormData(prev => ({
                                  ...prev,
                                  injuries: [...prev.injuries, otherInjury.trim()]
                                }));
                                setOtherInjury('');
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (otherInjury.trim()) {
                                setRapidFormData(prev => ({
                                  ...prev,
                                  injuries: [...prev.injuries, otherInjury.trim()]
                                }));
                                setOtherInjury('');
                              }
                            }}
                            disabled={!otherInjury.trim()}
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>

                        {rapidFormData.injuries.length > 0 && (
                          <div className="text-xs text-slate-400 mb-2">
                            Selected: <span className="text-blue-400 font-medium">{rapidFormData.injuries.length}</span> injuries
                          </div>
                        )}
                      </div>

                      {/* AI Recommendation - Auto Applied */}
                      {rapidFormData.injuries.length > 0 && rapidFormData.aiSuggestion && (
                        <div className="p-4 bg-gradient-to-r from-indigo-950/50 to-purple-950/30 border border-indigo-500/30 rounded-xl animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-indigo-500/20 rounded-full">
                              <Brain className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">AI Recommendation</p>
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-black uppercase",
                                    rapidFormData.aiRecommendedColor === 'red' ? 'bg-red-600 text-white' :
                                    rapidFormData.aiRecommendedColor === 'yellow' ? 'bg-yellow-500 text-black' :
                                    rapidFormData.aiRecommendedColor === 'green' ? 'bg-green-600 text-white' :
                                    'bg-slate-700 text-white'
                                  )}>
                                    {rapidFormData.aiRecommendedColor?.toUpperCase()} TAG
                                  </div>
                                  <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded border border-emerald-500/30 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    AUTO-APPLIED
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-white/90 mb-3">{rapidFormData.aiSuggestion}</p>
                              
                              {rapidFormData.aiTreatment && (
                                <div className="mt-3 pt-3 border-t border-indigo-500/30">
                                  <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-1">First Aid & Treatment</p>
                                  <div className="text-sm text-slate-300 whitespace-pre-line mb-3">
                                    {rapidFormData.aiTreatment}
                                  </div>
                                  <button
                                    onClick={() => {
                                      const treatmentNote = `\n\n[AI Treatment Plan]:\n${rapidFormData.aiTreatment}`;
                                      setRapidFormData(prev => ({
                                        ...prev,
                                        notes: prev.notes + treatmentNote
                                      }));
                                    }}
                                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
                                  >
                                    <ClipboardList className="w-3 h-3" />
                                    Add to Clinical Notes
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Current Triage Status Display */}
                      {rapidFormData.injuries.length > 0 && (
                        <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-700/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">Current Triage:</span>
                            <div className={cn(
                              "px-4 py-2 rounded-lg font-black text-lg uppercase tracking-wider",
                              rapidFormData.triageColor === 'red' ? 'bg-red-600 text-white' :
                              rapidFormData.triageColor === 'yellow' ? 'bg-yellow-500 text-black' :
                              rapidFormData.triageColor === 'green' ? 'bg-green-600 text-white' :
                              'bg-slate-700 text-white'
                            )}>
                              {getTriageColorStyle(rapidFormData.triageColor).label}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-8 pt-6 border-t border-slate-700 flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={rapidFormData.notes}
                        onChange={(e) => setRapidFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add clinical notes (optional)..."
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={addRapidPatient}
                      disabled={rapidFormData.injuries.length === 0 || isSubmittingRapid}
                      className={cn(
                        "px-8 py-3 rounded-xl font-bold text-white transition-all flex items-center gap-2 shadow-lg",
                        rapidFormData.injuries.length > 0 && !isSubmittingRapid
                          ? "bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20 hover:-translate-y-0.5"
                          : "bg-slate-700 cursor-not-allowed text-slate-400"
                      )}
                    >
                      {isSubmittingRapid ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Register Patient
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Patient List */}
                {rapidPatients.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Registered Patients ({rapidPatients.length})
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {rapidPatients.map((patient) => {
                        const style = getTriageColorStyle(patient.triageColor);
                        return (
                          <div
                            key={patient.id}
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-lg border-l-4",
                              style.border,
                              "bg-slate-800"
                            )}
                          >
                            <div className={cn("w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0", style.bg)}>
                              <span className="text-white font-bold text-sm">{patient.tagNumber}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("px-2 py-0.5 rounded text-xs font-bold", style.bg, "text-white")}>
                                  {patient.triageColor.toUpperCase()}
                                </span>
                                {patient.name && (
                                  <span className="text-white font-semibold">{patient.name}</span>
                                )}
                                {patient.gender && (
                                  <span className="text-slate-400 text-xs uppercase">({patient.gender[0]})</span>
                                )}
                                {patient.savedToDb && (
                                  <span className="text-emerald-400 text-xs flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Saved
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {patient.injuries.map((injury, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">
                                    {injury}
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-3 mt-1 text-xs text-slate-500">
                                <span>AVPU: {patient.consciousness[0].toUpperCase()}</span>
                                <span>Status: {patient.vitalStatus}</span>
                                {patient.heartRate && <span>HR: {patient.heartRate}</span>}
                                {patient.spo2 && <span>SpO2: {patient.spo2}%</span>}
                              </div>
                              {patient.aiSuggestion && (
                                <p className="text-xs text-purple-400 mt-1 truncate">AI: {patient.aiSuggestion}</p>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex-shrink-0">
                              {patient.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Regular Intake Form - Only show when not in emergency mode */}
        {!isEmergencyMode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
            {/* Left Column: Demographics & Clinical */}
            <div className="space-y-6">
              {/* Section A: Patient Demographics */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">Patient Demographics</h2>
                </div>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Full Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all capitalize placeholder-slate-500"
                        placeholder="Enter patient name"
                        autoComplete="off"
                      />
                    </div>

                    {/* Age */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Age <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        min="0"
                        max="150"
                        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all placeholder-slate-500"
                        placeholder="Years"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Gender <span className="text-rose-400">*</span>
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        title="Select patient gender"
                        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section B: Clinical Assessment */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
                  <ClipboardList className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">Clinical Assessment</h2>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                  <div className="relative">
                    {/* Chief Complaint */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Chief Complaint <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        name="chief_complaint"
                        value={formData.chief_complaint}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all resize-none placeholder-slate-500"
                        placeholder="Describe symptoms..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Symptom Duration */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Duration
                        </label>
                        <input
                          type="text"
                          name="symptom_duration"
                          value={formData.symptom_duration}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all placeholder-slate-500"
                          placeholder="e.g., 2 hours"
                        />
                      </div>

                      {/* Severity Slider */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Pain/Severity: <span className={cn("font-bold", getSeverityColor())}>{formData.severity}/10</span>
                        </label>
                        <input
                          type="range"
                          name="severity"
                          value={formData.severity}
                          onChange={handleSeverityChange}
                          min="1"
                          max="10"
                          title="Pain severity level"
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>Mild</span>
                          <span>Severe</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Vitals & Triage */}
            <div className="space-y-6">

              {/* Section C: Vital Signs */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full" />
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold text-white">Vital Signs</h2>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                  <div className="relative grid grid-cols-2 gap-4">
                    {/* Blood Pressure */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Blood Pressure
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="bp_systolic"
                          value={formData.bp_systolic}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white text-center focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50"
                          placeholder="SYS"
                        />
                        <span className="text-slate-500 font-bold">/</span>
                        <input
                          type="number"
                          name="bp_diastolic"
                          value={formData.bp_diastolic}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white text-center focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50"
                          placeholder="DIA"
                        />
                      </div>
                    </div>

                    {/* Heart Rate */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Heart Rate</label>
                      <div className="relative">
                        <Heart className="absolute left-3 top-3.5 w-4 h-4 text-rose-400/60" />
                        <input
                          type="number"
                          name="heart_rate"
                          value={formData.heart_rate}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50"
                          placeholder="BPM"
                        />
                      </div>
                    </div>

                    {/* SpO2 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">SpO2</label>
                      <div className="relative">
                        <Droplets className="absolute left-3 top-3.5 w-4 h-4 text-blue-400/60" />
                        <input
                          type="number"
                          name="spo2"
                          value={formData.spo2}
                          onChange={handleChange}
                          className={cn(
                            "w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50",
                            parseInt(formData.spo2) > 0 && parseInt(formData.spo2) < 92 && "border-rose-500/50 bg-rose-950/20"
                          )}
                          placeholder="%"
                        />
                      </div>
                    </div>

                    {/* Resp Rate */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Resp Rate</label>
                      <div className="relative">
                        <Wind className="absolute left-3 top-3.5 w-4 h-4 text-cyan-400/60" />
                        <input
                          type="number"
                          name="respiratory_rate"
                          value={formData.respiratory_rate}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50"
                          placeholder="/min"
                        />
                      </div>
                    </div>

                    {/* Temp */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Temp</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          name="temperature"
                          value={formData.temperature}
                          onChange={handleChange}
                          className="w-full px-2 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50"
                          placeholder="°C"
                        />
                        <select
                          name="temperature_unit"
                          value={formData.temperature_unit}
                          onChange={handleChange}
                          title="Temperature unit"
                          className="px-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm"
                        >
                          <option value="C">C</option>
                          <option value="F">F</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Error Display */}
              {errors.length > 0 && (
                <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-rose-300">Validation Errors</h3>
                    <ul className="mt-1 text-sm text-rose-400 list-disc list-inside">
                      {errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Section D: AI Triage Button & Results */}
              <section>
                {!triageResult ? (
                  <button
                    onClick={runTriageAssessment}
                    disabled={isSubmitting}
                    className={cn(
                      "w-full py-4 px-6 rounded-xl font-bold text-lg text-white transition-all transform shadow-lg border",
                      isSubmitting
                        ? "bg-teal-700/80 border-teal-600/50 cursor-wait"
                        : "bg-gradient-to-r from-teal-500 to-teal-600 border-teal-400/30 hover:from-teal-600 hover:to-teal-700 hover:scale-[1.01] active:scale-[0.99] shadow-teal-500/20",
                      isSubmitting && "animate-pulse"
                    )}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Running AI Triage...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-3">
                        <Stethoscope className="w-6 h-6" />
                        Run AI Triage Assessment
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="animate-in slide-in-from-top-4 duration-500">
                    {/* CTAS Banner */}
                    <div className={cn(
                      "rounded-t-xl px-6 py-5 text-center shadow-lg",
                      CTAS_LEVELS[triageResult.level].color,
                      CTAS_LEVELS[triageResult.level].textColor
                    )}>
                      <h3 className="text-2xl font-bold tracking-tight">
                        CTAS {triageResult.level}: {CTAS_LEVELS[triageResult.level].name}
                      </h3>
                      <p className="text-sm opacity-90 mt-1 font-medium">
                        {CTAS_LEVELS[triageResult.level].description}
                      </p>
                    </div>

                    {/* Result Details */}
                    <div className="relative overflow-hidden rounded-b-xl border border-t-0 border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
                      <div className="relative">
                        {/* Med42 Severity Analysis */}
                        {triageResult.hfAnalysis && (
                          <div className="mb-6 p-4 bg-purple-950/20 border border-purple-700/30 rounded-xl">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/20">
                                <Brain className="w-5 h-5 text-purple-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-purple-400 font-semibold">Med42 Clinical Severity Analysis</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={cn(
                                    "font-bold text-lg",
                                    triageResult.hfAnalysis.severity === 'Critical Emergency' ? 'text-rose-400' :
                                    triageResult.hfAnalysis.severity === 'Urgent' ? 'text-orange-400' :
                                    triageResult.hfAnalysis.severity === 'Semi-Urgent' ? 'text-amber-400' :
                                    'text-emerald-400'
                                  )}>{triageResult.hfAnalysis.severity}</span>
                                  <span className="text-xs text-purple-200 bg-purple-900/50 px-2.5 py-1 rounded-full border border-purple-700/50 font-medium">
                                    {(triageResult.hfAnalysis.score * 100).toFixed(0)}% Confidence
                                  </span>
                                </div>
                                {triageResult.hfAnalysis.reasoning && (
                                  <p className="text-xs text-purple-300/80 mt-2 italic leading-relaxed">
                                    {triageResult.hfAnalysis.reasoning}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Confidence Score */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-300">Triage Confidence</span>
                            <span className="text-sm font-bold text-white">{triageResult.confidence}%</span>
                          </div>
                          <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-teal-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${triageResult.confidence}%` }}
                            />
                          </div>
                        </div>

                        {/* Differential Diagnosis */}
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-slate-300 mb-3">Differential Diagnosis</h4>
                          <div className="flex flex-wrap gap-2">
                            {triageResult.differentialDiagnosis.map((diagnosis, idx) => (
                              <span key={idx} className="px-3 py-1.5 bg-blue-500/15 text-blue-300 text-sm rounded-lg border border-blue-500/20 font-medium">
                                {diagnosis}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Assigned Bed */}
                        <div className="mb-6 p-4 bg-emerald-950/20 border border-emerald-700/30 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/20">
                              <BedDouble className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm text-emerald-400 font-medium">Bed Assignment</p>
                              <p className="font-bold text-emerald-300 text-lg">{triageResult.assignedBed}</p>
                            </div>
                          </div>
                        </div>

                        {/* Actionable Pathway */}
                        <div className="p-4 bg-blue-950/20 border border-blue-700/30 rounded-xl mb-6">
                          <h4 className="text-sm font-semibold text-blue-400 mb-1">Recommended Pathway</h4>
                          <p className="text-blue-300 font-medium text-sm">{triageResult.pathway}</p>
                        </div>

                        {/* New Patient Button */}
                        <button
                          onClick={resetForm}
                          className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600/50 transition-all flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Start New Patient
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
      )}
      </div>
    </div>
  );
}
