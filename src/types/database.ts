export interface Patient {
  id: string;
  mrn: string;
  full_name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  chief_complaint: string;
  symptom_duration: string;
  severity: number;
  bp_systolic: number;
  bp_diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  spo2: number;
  temperature: number;
  temperature_unit: 'C' | 'F';
  triage_level?: number;
  triage_classification?: string;
  confidence_score?: number;
  differential_diagnosis?: string[];
  assigned_bed?: string;
  status: 'waiting' | 'triaged' | 'admitted' | 'discharged';
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  type: 'environmental' | 'system' | 'patient' | 'resource';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  source: string;
  acknowledged: boolean;
  created_at: string;
}

export interface EnvironmentalData {
  id: string;
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface ResourceStatus {
  id: string;
  icu_beds_total: number;
  icu_beds_occupied: number;
  ventilators_total: number;
  ventilators_in_use: number;
  ppe_stock_level: number;
  nursing_staff_on_duty: number;
  doctors_on_duty: number;
  oxygen_reserve_hours: number;
  updated_at: string;
}

export interface Staff {
  id: string;
  employee_id: string;
  full_name: string;
  role: 'doctor' | 'nurse' | 'technician' | 'admin' | 'specialist';
  department: string;
  specialization?: string;
  status: 'on-duty' | 'off-duty' | 'on-break' | 'on-call';
  shift?: 'morning' | 'afternoon' | 'night';
  phone?: string;
  email?: string;
  current_assignment?: string;
  patients_assigned: number;
  hours_worked: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  item_code: string;
  name: string;
  category: 'medication' | 'equipment' | 'supplies' | 'ppe' | 'blood';
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  location?: string;
  supplier?: string;
  last_restocked?: string;
  expiry_date?: string;
  status: 'adequate' | 'low' | 'critical' | 'out-of-stock';
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: Patient;
        Insert: Omit<Patient, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Patient>;
      };
      alerts: {
        Row: Alert;
        Insert: Omit<Alert, 'id' | 'created_at'>;
        Update: Partial<Alert>;
      };
      environmental_data: {
        Row: EnvironmentalData;
        Insert: Omit<EnvironmentalData, 'id'>;
        Update: Partial<EnvironmentalData>;
      };
      resource_status: {
        Row: ResourceStatus;
        Insert: Omit<ResourceStatus, 'id' | 'updated_at'>;
        Update: Partial<ResourceStatus>;
      };
      staff: {
        Row: Staff;
        Insert: Omit<Staff, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Staff>;
      };
      inventory: {
        Row: InventoryItem;
        Insert: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status'>;
        Update: Partial<InventoryItem>;
      };
    };
  };
}

// CTAS (Canadian Triage and Acuity Scale) Classifications
export const CTAS_LEVELS = {
  1: { name: 'Resuscitation', color: 'bg-red-600', textColor: 'text-white', description: 'Immediate life-threatening condition' },
  2: { name: 'Emergent', color: 'bg-orange-500', textColor: 'text-white', description: 'Potential threat to life or limb' },
  3: { name: 'Urgent', color: 'bg-yellow-500', textColor: 'text-black', description: 'Serious condition requiring emergency care' },
  4: { name: 'Less Urgent', color: 'bg-green-500', textColor: 'text-white', description: 'Condition requiring care within 1-2 hours' },
  5: { name: 'Non-Urgent', color: 'bg-blue-500', textColor: 'text-white', description: 'Condition may be treated in clinic setting' },
} as const;

// DEFCON Status Levels for Dashboard
export const DEFCON_LEVELS = {
  5: { name: 'DEFCON 5', color: 'bg-emerald-500', description: 'Normal Operations' },
  4: { name: 'DEFCON 4', color: 'bg-lime-500', description: 'Elevated Activity' },
  3: { name: 'DEFCON 3', color: 'bg-yellow-500', description: 'Increased Readiness' },
  2: { name: 'DEFCON 2', color: 'bg-orange-500', description: 'High Alert' },
  1: { name: 'DEFCON 1', color: 'bg-red-600 animate-pulse', description: 'Maximum Emergency' },
} as const;
