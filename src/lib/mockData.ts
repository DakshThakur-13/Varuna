/**
 * Mock Data Generators for Varuna
 * Used when Supabase is not configured or for demo purposes
 */

// Local types for mock data display
export interface InventoryItem {
  id: string;
  name: string;
  category: 'medication' | 'equipment' | 'consumable' | 'blood';
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  lastRestocked: string;
  expiryDate?: string;
  status: 'critical' | 'low' | 'adequate' | 'full';
}

export const generateInventoryData = (): InventoryItem[] => [
  { id: '1', name: 'Oxygen Cylinders (Type D)', category: 'equipment', currentStock: 45, minStock: 20, maxStock: 100, unit: 'units', lastRestocked: '2h ago', status: 'adequate' },
  { id: '2', name: 'N95 Respirators', category: 'consumable', currentStock: 1200, minStock: 500, maxStock: 5000, unit: 'pcs', lastRestocked: '1d ago', status: 'adequate' },
  { id: '3', name: 'Surgical Masks', category: 'consumable', currentStock: 3500, minStock: 1000, maxStock: 10000, unit: 'pcs', lastRestocked: '12h ago', status: 'full' },
  { id: '4', name: 'Ventilator Circuits', category: 'equipment', currentStock: 8, minStock: 15, maxStock: 50, unit: 'sets', lastRestocked: '3d ago', status: 'critical' },
  { id: '5', name: 'Salbutamol Nebules', category: 'medication', currentStock: 150, minStock: 100, maxStock: 500, unit: 'doses', lastRestocked: '6h ago', status: 'low' },
  { id: '6', name: 'IV Saline (500ml)', category: 'medication', currentStock: 280, minStock: 100, maxStock: 600, unit: 'bags', lastRestocked: '4h ago', status: 'adequate' },
  { id: '7', name: 'Blood O+', category: 'blood', currentStock: 12, minStock: 20, maxStock: 50, unit: 'units', lastRestocked: '1d ago', expiryDate: '5d', status: 'critical' },
  { id: '8', name: 'Blood A+', category: 'blood', currentStock: 18, minStock: 15, maxStock: 40, unit: 'units', lastRestocked: '2d ago', expiryDate: '12d', status: 'adequate' },
  { id: '9', name: 'Epinephrine (1mg/ml)', category: 'medication', currentStock: 45, minStock: 30, maxStock: 100, unit: 'ampules', lastRestocked: '8h ago', status: 'adequate' },
  { id: '10', name: 'Defibrillator Pads', category: 'equipment', currentStock: 6, minStock: 10, maxStock: 30, unit: 'pairs', lastRestocked: '5d ago', status: 'low' },
  { id: '11', name: 'Intubation Kits', category: 'equipment', currentStock: 15, minStock: 10, maxStock: 40, unit: 'kits', lastRestocked: '1d ago', status: 'adequate' },
  { id: '12', name: 'PPE Gowns', category: 'consumable', currentStock: 180, minStock: 200, maxStock: 800, unit: 'pcs', lastRestocked: '2d ago', status: 'low' },
];

// Staff Data
export interface StaffMember {
  id: string;
  name: string;
  role: 'doctor' | 'nurse' | 'technician' | 'specialist' | 'resident';
  specialty?: string;
  status: 'on-duty' | 'break' | 'off-duty' | 'on-call' | 'emergency';
  shift: string;
  zone: string;
  patientsAssigned: number;
  hoursWorked: number;
  phone: string;
}

export const generateStaffData = (): StaffMember[] => [
  { id: 'S001', name: 'Dr. Priya Sharma', role: 'doctor', specialty: 'Emergency Medicine', status: 'on-duty', shift: '08:00-20:00', zone: 'ER Bay 1-4', patientsAssigned: 8, hoursWorked: 6.5, phone: '+91-98765-43210' },
  { id: 'S002', name: 'Dr. Rajesh Kapoor', role: 'specialist', specialty: 'Pulmonology', status: 'on-duty', shift: '08:00-20:00', zone: 'Respiratory ICU', patientsAssigned: 5, hoursWorked: 7.0, phone: '+91-98765-43211' },
  { id: 'S003', name: 'Dr. Amit Patel', role: 'doctor', specialty: 'Critical Care', status: 'break', shift: '08:00-20:00', zone: 'ICU', patientsAssigned: 4, hoursWorked: 5.5, phone: '+91-98765-43212' },
  { id: 'S004', name: 'Sr. Nurse Kavitha R.', role: 'nurse', status: 'on-duty', shift: '06:00-18:00', zone: 'ER Bay 1-2', patientsAssigned: 6, hoursWorked: 8.0, phone: '+91-98765-43213' },
  { id: 'S005', name: 'Nurse Deepa M.', role: 'nurse', status: 'on-duty', shift: '06:00-18:00', zone: 'ER Bay 3-4', patientsAssigned: 5, hoursWorked: 7.5, phone: '+91-98765-43214' },
  { id: 'S006', name: 'Nurse Suresh K.', role: 'nurse', status: 'emergency', shift: '06:00-18:00', zone: 'Trauma Bay', patientsAssigned: 2, hoursWorked: 6.0, phone: '+91-98765-43215' },
  { id: 'S007', name: 'Dr. Meera Reddy', role: 'resident', specialty: 'Emergency Medicine', status: 'on-duty', shift: '20:00-08:00', zone: 'ER Bay 5-8', patientsAssigned: 7, hoursWorked: 3.0, phone: '+91-98765-43216' },
  { id: 'S008', name: 'Tech. Ravi Kumar', role: 'technician', specialty: 'Radiology', status: 'on-duty', shift: '08:00-20:00', zone: 'Imaging', patientsAssigned: 0, hoursWorked: 6.0, phone: '+91-98765-43217' },
  { id: 'S009', name: 'Dr. Ananya Desai', role: 'specialist', specialty: 'Cardiology', status: 'on-call', shift: 'On-Call', zone: 'CCU', patientsAssigned: 0, hoursWorked: 0, phone: '+91-98765-43218' },
  { id: 'S010', name: 'Nurse Preethi S.', role: 'nurse', status: 'on-duty', shift: '18:00-06:00', zone: 'ICU', patientsAssigned: 4, hoursWorked: 2.0, phone: '+91-98765-43219' },
  { id: 'S011', name: 'Dr. Vikram Singh', role: 'doctor', specialty: 'Trauma Surgery', status: 'on-duty', shift: '08:00-20:00', zone: 'Trauma Bay', patientsAssigned: 3, hoursWorked: 5.0, phone: '+91-98765-43220' },
  { id: 'S012', name: 'Tech. Lakshmi N.', role: 'technician', specialty: 'Lab', status: 'on-duty', shift: '08:00-20:00', zone: 'Laboratory', patientsAssigned: 0, hoursWorked: 6.5, phone: '+91-98765-43221' },
];

// Patient Grid Data
export interface PatientGridItem {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  ctasLevel: 1 | 2 | 3 | 4 | 5;
  chiefComplaint: string;
  arrivalTime: string;
  waitTime: number;
  bed: string;
  status: 'waiting' | 'in-treatment' | 'admitted' | 'discharged' | 'critical';
  vitals: {
    bp: string;
    hr: number;
    spo2: number;
    temp: number;
  };
  assignedDoctor?: string;
  assignedNurse?: string;
}

export const generatePatientGridData = (): PatientGridItem[] => [
  { id: 'P001', name: 'Ramesh Kumar', age: 58, gender: 'M', ctasLevel: 1, chiefComplaint: 'Severe chest pain, SOB', arrivalTime: '14:23', waitTime: 0, bed: 'Resus-1', status: 'critical', vitals: { bp: '90/60', hr: 120, spo2: 88, temp: 37.2 }, assignedDoctor: 'Dr. Priya Sharma', assignedNurse: 'Nurse Suresh K.' },
  { id: 'P002', name: 'Sunita Devi', age: 45, gender: 'F', ctasLevel: 2, chiefComplaint: 'Acute asthma exacerbation', arrivalTime: '14:45', waitTime: 0, bed: 'ER-3', status: 'in-treatment', vitals: { bp: '130/85', hr: 110, spo2: 91, temp: 37.5 }, assignedDoctor: 'Dr. Rajesh Kapoor', assignedNurse: 'Sr. Nurse Kavitha R.' },
  { id: 'P003', name: 'Anil Mehta', age: 67, gender: 'M', ctasLevel: 2, chiefComplaint: 'Diabetic ketoacidosis', arrivalTime: '15:10', waitTime: 0, bed: 'ER-5', status: 'in-treatment', vitals: { bp: '100/70', hr: 105, spo2: 94, temp: 37.8 }, assignedDoctor: 'Dr. Amit Patel', assignedNurse: 'Nurse Deepa M.' },
  { id: 'P004', name: 'Lakshmi Iyer', age: 34, gender: 'F', ctasLevel: 3, chiefComplaint: 'High fever, cough 3 days', arrivalTime: '15:30', waitTime: 45, bed: 'Waiting', status: 'waiting', vitals: { bp: '120/80', hr: 98, spo2: 96, temp: 39.2 }, assignedDoctor: undefined, assignedNurse: undefined },
  { id: 'P005', name: 'Mohammad Ali', age: 52, gender: 'M', ctasLevel: 3, chiefComplaint: 'Abdominal pain, vomiting', arrivalTime: '15:45', waitTime: 30, bed: 'ER-7', status: 'in-treatment', vitals: { bp: '140/90', hr: 88, spo2: 98, temp: 37.0 }, assignedDoctor: 'Dr. Meera Reddy', assignedNurse: 'Nurse Deepa M.' },
  { id: 'P006', name: 'Geeta Sharma', age: 72, gender: 'F', ctasLevel: 2, chiefComplaint: 'Stroke symptoms, left weakness', arrivalTime: '16:00', waitTime: 0, bed: 'Resus-2', status: 'critical', vitals: { bp: '180/100', hr: 78, spo2: 95, temp: 36.8 }, assignedDoctor: 'Dr. Vikram Singh', assignedNurse: 'Nurse Suresh K.' },
  { id: 'P007', name: 'Rahul Verma', age: 28, gender: 'M', ctasLevel: 4, chiefComplaint: 'Laceration right hand', arrivalTime: '16:15', waitTime: 60, bed: 'Waiting', status: 'waiting', vitals: { bp: '125/82', hr: 76, spo2: 99, temp: 36.6 }, assignedDoctor: undefined, assignedNurse: undefined },
  { id: 'P008', name: 'Anjali Nair', age: 41, gender: 'F', ctasLevel: 3, chiefComplaint: 'Severe migraine, photophobia', arrivalTime: '16:30', waitTime: 25, bed: 'ER-8', status: 'in-treatment', vitals: { bp: '135/88', hr: 82, spo2: 98, temp: 36.9 }, assignedDoctor: 'Dr. Priya Sharma', assignedNurse: 'Sr. Nurse Kavitha R.' },
  { id: 'P009', name: 'Vijay Patil', age: 55, gender: 'M', ctasLevel: 5, chiefComplaint: 'Prescription refill needed', arrivalTime: '16:45', waitTime: 90, bed: 'Waiting', status: 'waiting', vitals: { bp: '130/85', hr: 72, spo2: 98, temp: 36.5 }, assignedDoctor: undefined, assignedNurse: undefined },
  { id: 'P010', name: 'Pooja Reddy', age: 8, gender: 'F', ctasLevel: 3, chiefComplaint: 'Respiratory distress, wheezing', arrivalTime: '17:00', waitTime: 10, bed: 'Peds-1', status: 'in-treatment', vitals: { bp: '95/60', hr: 120, spo2: 93, temp: 38.1 }, assignedDoctor: 'Dr. Rajesh Kapoor', assignedNurse: 'Nurse Preethi S.' },
  { id: 'P011', name: 'Sanjay Gupta', age: 63, gender: 'M', ctasLevel: 2, chiefComplaint: 'Cardiac arrhythmia', arrivalTime: '17:15', waitTime: 0, bed: 'CCU-3', status: 'admitted', vitals: { bp: '145/95', hr: 145, spo2: 94, temp: 36.7 }, assignedDoctor: 'Dr. Ananya Desai', assignedNurse: 'Nurse Preethi S.' },
  { id: 'P012', name: 'Fatima Begum', age: 38, gender: 'F', ctasLevel: 4, chiefComplaint: 'Urinary tract infection', arrivalTime: '17:30', waitTime: 55, bed: 'Waiting', status: 'waiting', vitals: { bp: '118/76', hr: 84, spo2: 99, temp: 37.8 }, assignedDoctor: undefined, assignedNurse: undefined },
];

// Surge Data Generator - Creates realistic patient surge predictions
export const generateMockSurgeData = (currentAqi: number = 285, currentPatients: number = 65) => {
  const now = new Date();
  const currentHour = now.getHours();
  const data = [];
  
  // Time-of-day baseline multipliers (hospital patterns)
  const hourlyMultipliers: Record<number, number> = {
    0: 0.6, 1: 0.5, 2: 0.4, 3: 0.4, 4: 0.5, 5: 0.6,
    6: 0.7, 7: 0.8, 8: 1.0, 9: 1.2, 10: 1.3, 11: 1.2,
    12: 1.1, 13: 1.0, 14: 1.1, 15: 1.2, 16: 1.3, 17: 1.4,
    18: 1.3, 19: 1.2, 20: 1.0, 21: 0.9, 22: 0.8, 23: 0.7
  };
  
  // AQI impact multiplier
  const getAqiMultiplier = (aqi: number): number => {
    if (aqi > 400) return 1.5;  // Severe - major respiratory surge
    if (aqi > 300) return 1.3;  // Very Poor - significant increase
    if (aqi > 200) return 1.15; // Poor - moderate increase
    if (aqi > 100) return 1.05; // Moderate - slight increase
    return 1.0;
  };
  
  const aqiMultiplier = getAqiMultiplier(currentAqi);
  const basePatients = currentPatients || 65;
  
  // Generate 9 hours: 4 past, current, 4 future
  for (let i = -4; i <= 4; i++) {
    const targetHour = (currentHour + i + 24) % 24;
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    const isPast = i <= 0;
    
    // Calculate patient count based on time and AQI
    const hourMultiplier = hourlyMultipliers[targetHour] || 1;
    const futureAqiFactor = isPast ? 1 : aqiMultiplier * (1 + i * 0.05); // AQI impact increases over time
    const predictedValue = Math.round(basePatients * hourMultiplier * futureAqiFactor);
    
    // Add slight variance to past data to simulate actual measurements
    const actualVariance = isPast ? (Math.random() - 0.5) * 8 : 0;
    
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      actual: isPast ? Math.round(predictedValue + actualVariance) : null,
      predicted: !isPast ? predictedValue : null,
      baseline: Math.round(basePatients * hourMultiplier), // Baseline without AQI impact
      hour: i,
    });
  }
  return data;
};

// Resource Radar Data
export const generateResourceRadarData = () => [
  { resource: 'ICU Beds', value: 65, fullMark: 100 },
  { resource: 'Ventilators', value: 45, fullMark: 100 },
  { resource: 'PPE Stock', value: 78, fullMark: 100 },
  { resource: 'Nursing', value: 55, fullMark: 100 },
  { resource: 'Doctors', value: 70, fullMark: 100 },
];
