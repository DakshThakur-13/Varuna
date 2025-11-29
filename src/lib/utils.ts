/**
 * Core Utilities for Varuna
 */

// Class name utility - simple and efficient
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Generate a human-readable Medical Record Number
export function generateMRN(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MRN-${timestamp}-${random}`;
}

// Format timestamp for display
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', { 
    hour: '2-digit', minute: '2-digit', hour12: false 
  });
}

// Format full datetime
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
  });
}

// Get severity color based on 1-10 scale
export function getSeverityColor(severity: number): string {
  if (severity <= 3) return 'bg-emerald-500';
  if (severity <= 5) return 'bg-yellow-500';
  if (severity <= 7) return 'bg-orange-500';
  return 'bg-rose-500';
}

// Get severity gradient for slider track
export function getSeverityGradient(): string {
  return 'linear-gradient(to right, #10b981, #10b981 30%, #f59e0b 50%, #f97316 70%, #f43f5e 100%)';
}

// Calculate DEFCON level based on metrics
export function calculateDefconLevel(
  occupancy: number,
  oxygenHours: number,
  staffRatio: number,
  predictedSurge: number
): 1 | 2 | 3 | 4 | 5 {
  let score = 0;
  
  // Occupancy scoring
  if (occupancy >= 95) score += 4;
  else if (occupancy >= 85) score += 3;
  else if (occupancy >= 75) score += 2;
  else if (occupancy >= 60) score += 1;
  
  // Oxygen autonomy scoring
  if (oxygenHours <= 4) score += 4;
  else if (oxygenHours <= 8) score += 3;
  else if (oxygenHours <= 12) score += 2;
  else if (oxygenHours <= 24) score += 1;
  
  // Staffing ratio scoring (lower is worse)
  if (staffRatio <= 0.15) score += 4;
  else if (staffRatio <= 0.2) score += 3;
  else if (staffRatio <= 0.25) score += 2;
  else if (staffRatio <= 0.3) score += 1;
  
  // Predicted surge scoring
  if (predictedSurge >= 50) score += 4;
  else if (predictedSurge >= 30) score += 3;
  else if (predictedSurge >= 20) score += 2;
  else if (predictedSurge >= 10) score += 1;
  
  // Convert score to DEFCON level (inverted: higher score = lower DEFCON)
  if (score >= 12) return 1;
  if (score >= 9) return 2;
  if (score >= 6) return 3;
  if (score >= 3) return 4;
  return 5;
}

// Get AQI severity classification
export function getAQISeverity(aqi: number): { label: string; color: string; description: string } {
  if (aqi <= 50) return { label: 'Good', color: 'bg-green-500', description: 'Air quality is satisfactory' };
  if (aqi <= 100) return { label: 'Moderate', color: 'bg-yellow-500', description: 'Acceptable air quality' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: 'bg-orange-500', description: 'Sensitive groups may experience effects' };
  if (aqi <= 200) return { label: 'Unhealthy', color: 'bg-red-500', description: 'Everyone may experience health effects' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: 'bg-purple-600', description: 'Health warnings of emergency conditions' };
  return { label: 'Hazardous', color: 'bg-rose-900', description: 'Health alert: everyone may experience serious effects' };
}

// Validate vital signs for physiological plausibility
export function validateVitals(vitals: {
  bp_systolic: number;
  bp_diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  spo2: number;
  temperature: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (vitals.bp_systolic < 60 || vitals.bp_systolic > 250) {
    errors.push('Systolic BP out of physiological range (60-250)');
  }
  if (vitals.bp_diastolic < 30 || vitals.bp_diastolic > 150) {
    errors.push('Diastolic BP out of physiological range (30-150)');
  }
  if (vitals.bp_diastolic >= vitals.bp_systolic) {
    errors.push('Diastolic must be less than systolic');
  }
  if (vitals.heart_rate < 20 || vitals.heart_rate > 250) {
    errors.push('Heart rate out of physiological range (20-250)');
  }
  if (vitals.respiratory_rate < 4 || vitals.respiratory_rate > 60) {
    errors.push('Respiratory rate out of physiological range (4-60)');
  }
  if (vitals.spo2 < 50 || vitals.spo2 > 100) {
    errors.push('SpO2 out of physiological range (50-100)');
  }
  if (vitals.temperature < 30 || vitals.temperature > 45) {
    errors.push('Temperature out of physiological range (30-45°C)');
  }
  
  return { valid: errors.length === 0, errors };
}
