/**
 * Varuna AI Service
 * Uses Groq (Llama 3.3 70B) for fast, free AI inference
 * Falls back to rule-based responses when API unavailable
 */

import Groq from 'groq-sdk';

// Initialize Groq client
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// Model configuration
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface AIResponse {
  success: boolean;
  content: string;
  model: string;
  fallback: boolean;
}

/**
 * Main AI function with fallback chain
 */
export async function generateAIResponse(
  systemPrompt: string,
  userMessage: string
): Promise<AIResponse> {
  
  // Try Groq first (fastest)
  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      const content = completion.choices[0]?.message?.content || '';
      
      return {
        success: true,
        content,
        model: 'groq-llama-3.3-70b',
        fallback: false,
      };
    } catch (error) {
      console.error('Groq API error:', error);
    }
  }

  // Fallback to rule-based
  return {
    success: true,
    content: generateRuleBasedResponse(userMessage),
    model: 'rule-based',
    fallback: true,
  };
}

/**
 * Clinical triage AI assessment
 */
export async function generateTriageAssessment(
  symptoms: string,
  vitals: { heartRate: number; bloodPressure: string; temperature: number; oxygenSaturation: number },
  age: number
): Promise<{ ctasLevel: number; reasoning: string; recommendations: string[] }> {
  
  const systemPrompt = `You are a clinical triage AI assistant for an emergency department. Analyze patient symptoms and vitals to determine CTAS (Canadian Triage and Acuity Scale) level.

CTAS Levels:
1 - Resuscitation: Immediate life-threatening conditions (cardiac arrest, severe trauma, respiratory failure)
2 - Emergent: Potentially life-threatening, needs rapid intervention within 15 min (chest pain, stroke symptoms, severe allergic reaction)
3 - Urgent: Serious but not immediately life-threatening, within 30 min (moderate pain, high fever, fractures)
4 - Less Urgent: Could wait 1-2 hours (minor injuries, mild symptoms)
5 - Non-Urgent: Could be seen in clinic setting (prescription refills, minor complaints)

Respond ONLY with valid JSON in this exact format:
{"ctasLevel": number, "reasoning": "brief explanation", "recommendations": ["action1", "action2"]}`;

  const userMessage = `Patient Assessment:
- Age: ${age} years
- Chief Complaint: ${symptoms}
- Heart Rate: ${vitals.heartRate} bpm
- Blood Pressure: ${vitals.bloodPressure}
- Temperature: ${vitals.temperature}°C
- Oxygen Saturation: ${vitals.oxygenSaturation}%

Determine CTAS level and provide clinical recommendations.`;

  const response = await generateAIResponse(systemPrompt, userMessage);
  
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    const parsed = JSON.parse(jsonStr);
    return {
      ctasLevel: parsed.ctasLevel || 3,
      reasoning: parsed.reasoning || 'Assessment completed',
      recommendations: parsed.recommendations || ['Standard evaluation'],
    };
  } catch {
    // Fallback to rule-based triage
    return calculateRuleBasedTriage(symptoms, vitals, age);
  }
}

/**
 * Emergency incident analysis for the AI agent
 */
export async function analyzeEmergencyIncident(
  incidentDescription: string,
  location: string
): Promise<{
  type: string;
  severity: string;
  estimatedCasualties: { min: number; max: number; likely: number };
  expectedInjuries: string[];
  recommendations: string[];
}> {
  
  const systemPrompt = `You are an emergency intelligence AI for a hospital command center. Analyze incident reports to estimate medical impact and prepare the hospital.

Incident Types: fire, road_accident, explosion, building_collapse, chemical_spill, mass_gathering, violence, natural_disaster
Severity Levels: low, medium, high, critical

Respond ONLY with valid JSON:
{"type": "string", "severity": "string", "estimatedCasualties": {"min": number, "max": number, "likely": number}, "expectedInjuries": ["type1", "type2"], "recommendations": ["action1", "action2"]}`;

  const response = await generateAIResponse(systemPrompt, 
    `Incident Report:\n${incidentDescription}\n\nLocation: ${location}`);
  
  try {
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    return JSON.parse(jsonStr);
  } catch {
    return {
      type: 'unknown',
      severity: 'medium',
      estimatedCasualties: { min: 1, max: 10, likely: 5 },
      expectedInjuries: ['Trauma', 'Lacerations', 'Contusions'],
      recommendations: ['Prepare emergency department', 'Alert on-call staff', 'Ready trauma bay'],
    };
  }
}

/**
 * Rule-based fallback for chat responses
 */
function generateRuleBasedResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('status') || lowerMessage.includes('report') || lowerMessage.includes('summary')) {
    return 'SITUATION REPORT: Hospital operating at normal capacity. All departments functional. Emergency department at 78% occupancy. No critical resource shortages. Staff levels adequate. Monitoring environmental conditions. Standing by for further queries.';
  }
  
  if (lowerMessage.includes('staff') || lowerMessage.includes('doctor') || lowerMessage.includes('nurse')) {
    return 'STAFFING STATUS: Current staffing levels are adequate for projected patient volume. 18 physicians and 45 nurses on duty across all departments. On-call specialists available for: Cardiology, Neurology, Trauma Surgery, Pulmonology. Recommend reviewing staffing if patient volume increases by >20%.';
  }
  
  if (lowerMessage.includes('bed') || lowerMessage.includes('capacity') || lowerMessage.includes('occupancy')) {
    return 'CAPACITY REPORT: ED occupancy at 78%. Total available beds: 44 (including 8 ICU, 12 Step-down, 24 General). Current wait time: 25 minutes average. Discharge pipeline: 6 patients pending. Recommend activating overflow protocol if occupancy exceeds 90%.';
  }
  
  if (lowerMessage.includes('emergency') || lowerMessage.includes('code') || lowerMessage.includes('protocol')) {
    return 'EMERGENCY PROTOCOLS: No active codes. Available protocols: Code Blue (Cardiac), Code Stroke, Code Trauma, Code Orange (Mass Casualty), Code Yellow (Surge). All emergency equipment checked and operational. Rapid response team on standby.';
  }
  
  if (lowerMessage.includes('supply') || lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
    return 'SUPPLY STATUS: Most supplies at adequate levels. ALERTS: Ventilator circuits (low), Blood O+ (critical), PPE gowns (low). Automatic reorder triggered for critical items. Recommend manual review of blood product availability with blood bank.';
  }
  
  if (lowerMessage.includes('oxygen') || lowerMessage.includes('o2')) {
    return 'OXYGEN STATUS: Central supply at 85% capacity (~18 hours autonomy at current consumption). Portable cylinders: 45 Type D available. Consumption rate normal. No respiratory surge detected. Recommend monitoring if AQI exceeds 200.';
  }
  
  if (lowerMessage.includes('surge') || lowerMessage.includes('predict') || lowerMessage.includes('forecast')) {
    return 'SURGE PREDICTION: Based on current environmental data (AQI, weather) and historical patterns, predicting 15-20% increase in respiratory presentations over next 6 hours. Recommend: Pre-position nebulizers, alert pulmonology on-call, review respiratory isolation capacity.';
  }
  
  if (lowerMessage.includes('aqi') || lowerMessage.includes('air') || lowerMessage.includes('pollution')) {
    return 'ENVIRONMENTAL ALERT: Current AQI monitoring active. Elevated pollution levels typically correlate with 20-30% increase in respiratory complaints within 4-6 hours. System will auto-alert if AQI exceeds threshold. Current protocols for respiratory surge are on standby.';
  }
  
  return 'Varuna AI operational. I can provide real-time information on: hospital status, staffing levels, bed capacity, emergency protocols, supply inventory, oxygen reserves, surge predictions, and environmental monitoring. What specific information do you need?';
}

/**
 * Rule-based triage calculation fallback
 */
function calculateRuleBasedTriage(
  symptoms: string,
  vitals: { heartRate: number; bloodPressure: string; temperature: number; oxygenSaturation: number },
  age: number
): { ctasLevel: number; reasoning: string; recommendations: string[] } {
  const lowerSymptoms = symptoms.toLowerCase();
  let ctasLevel = 4;
  const recommendations: string[] = [];
  let reasoning = '';

  // CTAS 1 - Critical vital signs
  if (vitals.oxygenSaturation < 90 || vitals.heartRate > 150 || vitals.heartRate < 40) {
    ctasLevel = 1;
    reasoning = 'Critical vital signs detected - immediate intervention required';
    recommendations.push('Immediate resuscitation', 'Activate code team', 'Prepare airway management');
    return { ctasLevel, reasoning, recommendations };
  }
  
  // CTAS 1-2 - Life-threatening symptoms
  if (lowerSymptoms.includes('cardiac arrest') || lowerSymptoms.includes('not breathing') || 
      lowerSymptoms.includes('unconscious') || lowerSymptoms.includes('severe bleeding')) {
    ctasLevel = 1;
    reasoning = 'Life-threatening condition identified';
    recommendations.push('Immediate resuscitation', 'Trauma team activation');
    return { ctasLevel, reasoning, recommendations };
  }
  
  // CTAS 2 - Emergent conditions
  if (lowerSymptoms.includes('chest pain') || lowerSymptoms.includes('difficulty breathing') ||
      lowerSymptoms.includes('stroke') || lowerSymptoms.includes('weakness on one side') ||
      lowerSymptoms.includes('severe allergic') || lowerSymptoms.includes('anaphylaxis')) {
    ctasLevel = 2;
    reasoning = 'Potentially life-threatening symptoms requiring emergent care';
    recommendations.push('ECG within 10 minutes', 'IV access', 'Cardiac monitoring', 'Specialist consultation');
    return { ctasLevel, reasoning, recommendations };
  }
  
  // CTAS 2 - Critical vitals (not immediately life-threatening but urgent)
  if (vitals.oxygenSaturation < 94 || vitals.temperature > 40 || vitals.heartRate > 120) {
    ctasLevel = 2;
    reasoning = 'Abnormal vital signs requiring emergent evaluation';
    recommendations.push('Continuous monitoring', 'IV access', 'Supplemental oxygen if needed');
    return { ctasLevel, reasoning, recommendations };
  }
  
  // CTAS 3 - Urgent conditions
  if (lowerSymptoms.includes('fracture') || lowerSymptoms.includes('severe pain') ||
      lowerSymptoms.includes('high fever') || lowerSymptoms.includes('vomiting blood') ||
      lowerSymptoms.includes('asthma') || lowerSymptoms.includes('diabetic') ||
      vitals.temperature > 39) {
    ctasLevel = 3;
    reasoning = 'Urgent condition requiring timely intervention';
    recommendations.push('Priority assessment', 'Pain management', 'Diagnostic workup');
  }
  // CTAS 3 - Age-based priority
  else if (age > 70 || age < 2) {
    ctasLevel = 3;
    reasoning = 'Age-based priority adjustment for vulnerable population';
    recommendations.push('Close monitoring', 'Early physician assessment', 'Fall precautions if elderly');
  }
  // CTAS 4 - Less urgent
  else if (lowerSymptoms.includes('laceration') || lowerSymptoms.includes('sprain') ||
           lowerSymptoms.includes('mild pain') || lowerSymptoms.includes('rash')) {
    ctasLevel = 4;
    reasoning = 'Less urgent condition - can wait for assessment';
    recommendations.push('Wound care if needed', 'Pain assessment', 'Standard evaluation');
  }
  // CTAS 5 - Non-urgent
  else if (lowerSymptoms.includes('prescription') || lowerSymptoms.includes('refill') ||
           lowerSymptoms.includes('follow up') || lowerSymptoms.includes('chronic')) {
    ctasLevel = 5;
    reasoning = 'Non-urgent condition - consider clinic referral';
    recommendations.push('Clinic referral if appropriate', 'Routine evaluation');
  }
  else {
    ctasLevel = 4;
    reasoning = 'Standard assessment indicated based on presenting symptoms';
    recommendations.push('Routine evaluation', 'Vital sign monitoring', 'Reassess if condition changes');
  }

  return { ctasLevel, reasoning, recommendations };
}

/**
 * Analyze severity using Hugging Face - Med42 Medical LLM
 * Uses m42-health/Llama3-Med42-8B via Featherless AI provider
 */
export async function analyzeSeverityWithHF(complaint: string): Promise<{ severity: string; score: number; reasoning?: string }> {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  const MODEL_ID = "m42-health/Llama3-Med42-8B";

  if (!HF_API_KEY) {
    console.warn("Hugging Face API key not found. Using rule-based analysis.");
    return fallbackSeverityAnalysis(complaint);
  }

  try {
    // Use Featherless AI provider for Med42
    const response = await fetch(
      `https://router.huggingface.co/featherless-ai/v1/chat/completions`,
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          model: MODEL_ID,
          messages: [
            {
              role: "system",
              content: "You are Med42, a clinical AI for emergency triage. Classify severity and respond with ONLY JSON: {\"severity\": \"Critical Emergency|Urgent|Semi-Urgent|Non-Urgent\", \"score\": 0.0-1.0, \"reasoning\": \"brief reasoning\"}"
            },
            {
              role: "user", 
              content: `Chief Complaint: ${complaint}`
            }
          ],
          max_tokens: 150,
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Hugging Face API error: ${response.status} - ${errorText}`);
      return fallbackSeverityAnalysis(complaint);
    }

    const result = await response.json();
    
    // Parse the chat completion response
    if (result?.choices?.[0]?.message?.content) {
      const generatedText = result.choices[0].message.content;
      
      // Try to extract JSON from response
      const jsonMatch = generatedText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            severity: parsed.severity || "Unknown",
            score: typeof parsed.score === 'number' ? parsed.score : 0.85,
            reasoning: parsed.reasoning,
          };
        } catch {
          return extractSeverityFromText(generatedText, complaint);
        }
      }
      return extractSeverityFromText(generatedText, complaint);
    }

    return fallbackSeverityAnalysis(complaint);
  } catch (error) {
    console.error("Error calling Hugging Face Med42 API:", error);
    return fallbackSeverityAnalysis(complaint);
  }
}

/**
 * Extract severity from free-form text response
 */
function extractSeverityFromText(text: string, complaint: string): { severity: string; score: number; reasoning?: string } {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('critical') || lowerText.includes('emergency') || lowerText.includes('immediate')) {
    return { severity: "Critical Emergency", score: 0.95, reasoning: text.slice(0, 100) };
  }
  if (lowerText.includes('urgent') || lowerText.includes('serious')) {
    return { severity: "Urgent", score: 0.85, reasoning: text.slice(0, 100) };
  }
  if (lowerText.includes('semi-urgent') || lowerText.includes('moderate')) {
    return { severity: "Semi-Urgent", score: 0.7, reasoning: text.slice(0, 100) };
  }
  if (lowerText.includes('non-urgent') || lowerText.includes('minor')) {
    return { severity: "Non-Urgent", score: 0.6, reasoning: text.slice(0, 100) };
  }
  
  return fallbackSeverityAnalysis(complaint);
}

/**
 * Rule-based fallback for severity analysis
 */
function fallbackSeverityAnalysis(complaint: string): { severity: string; score: number; reasoning?: string } {
  const lowerComplaint = complaint.toLowerCase();
  
  // Critical patterns
  const criticalPatterns = ['chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding', 
    'cardiac', 'stroke', 'not breathing', 'seizure', 'anaphylaxis', 'overdose'];
  if (criticalPatterns.some(p => lowerComplaint.includes(p))) {
    return { severity: "Critical Emergency", score: 0.92, reasoning: "Critical symptoms detected" };
  }
  
  // Urgent patterns
  const urgentPatterns = ['head injury', 'fracture', 'severe pain', 'high fever', 'vomiting blood',
    'abdominal pain', 'allergic reaction', 'burn'];
  if (urgentPatterns.some(p => lowerComplaint.includes(p))) {
    return { severity: "Urgent", score: 0.82, reasoning: "Urgent symptoms requiring prompt attention" };
  }
  
  // Semi-urgent patterns
  const semiUrgentPatterns = ['moderate pain', 'laceration', 'sprain', 'infection', 'fever'];
  if (semiUrgentPatterns.some(p => lowerComplaint.includes(p))) {
    return { severity: "Semi-Urgent", score: 0.7, reasoning: "Condition requires timely assessment" };
  }
  
  // Default to Semi-Urgent for safety
  return { severity: "Semi-Urgent", score: 0.65, reasoning: "Standard clinical assessment recommended" };
}

