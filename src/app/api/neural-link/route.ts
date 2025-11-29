import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/ai';

// Neural Command & Control Interface API
// Powered by Groq AI (Llama 3.1 70B) with full dashboard context awareness

interface DashboardContext {
  defconLevel: number;
  aqi: number;
  activePatients: number;
  occupancyRate: number;
  oxygenHours: number;
  staffRatio: number;
  recentEvents: string[];
}

interface ChatRequest {
  message: string;
  context: DashboardContext;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message || '';
    const context: DashboardContext = {
      defconLevel: body?.context?.defconLevel ?? 3,
      aqi: body?.context?.aqi ?? 100,
      activePatients: body?.context?.activePatients ?? 0,
      occupancyRate: body?.context?.occupancyRate ?? 50,
      oxygenHours: body?.context?.oxygenHours ?? 24,
      staffRatio: body?.context?.staffRatio ?? 0.25,
      recentEvents: body?.context?.recentEvents ?? [],
    };
    
    // Build context-aware system prompt
    const systemPrompt = `You are Varuna AI, an advanced hospital operations command assistant. You have real-time access to the hospital's operational data and serve as the "Neural Command & Control Interface" for emergency department administrators.

CURRENT HOSPITAL STATUS:
- DEFCON Level: ${context.defconLevel} (1=Crisis, 5=Normal)
- Air Quality Index (AQI): ${context.aqi} ${context.aqi > 300 ? '⚠️ HAZARDOUS' : context.aqi > 200 ? '⚠️ VERY UNHEALTHY' : context.aqi > 150 ? '⚠️ UNHEALTHY' : ''}
- Active Patient Load: ${context.activePatients} patients
- ER Occupancy Rate: ${context.occupancyRate}%
- Oxygen Reserve: ${context.oxygenHours} hours autonomy
- Staffing Ratio: 1:${context.staffRatio > 0 ? Math.round(1/context.staffRatio) : '--'} (nurse:patient)

RECENT EVENTS:
${context.recentEvents.slice(0, 5).map(e => `- ${e}`).join('\n')}

YOUR CAPABILITIES:
1. Surge Predictions: Analyze environmental data (AQI, weather) to predict patient influx
2. Resource Optimization: Recommend staffing adjustments and bed allocations
3. Protocol Recommendations: Suggest activation of surge protocols based on DEFCON level
4. Risk Assessment: Identify potential bottlenecks before they become critical
5. Diversion Analysis: Simulate impact of ambulance diversion strategies

RESPONSE GUIDELINES:
- Be concise but thorough (2-4 sentences for simple queries, more for complex analysis)
- Use medical/operational terminology appropriately
- Provide actionable recommendations with specific numbers when possible
- Reference current metrics to ground your analysis
- For critical situations (DEFCON 1-2, AQI >300, Occupancy >90%), be more urgent in tone
- Always prioritize patient safety in recommendations`;

    try {
      const result = await generateAIResponse(systemPrompt, message);
      
      return NextResponse.json({
        success: true,
        response: result.content,
        source: result.fallback ? 'Rule-Based' : `${result.model}`,
      });
      
    } catch (aiError) {
      console.error('AI Error:', aiError);
      return NextResponse.json({
        success: true,
        response: generateFallbackResponse(message, context),
        source: 'Rule-Based (AI Fallback)',
      });
    }
    
  } catch (error) {
    console.error('Neural Link API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}

// Fallback response generator when AI is unavailable
function generateFallbackResponse(query: string, ctx: DashboardContext): string {
  const q = query.toLowerCase();
  
  // Surge/Prediction queries
  if (q.includes('surge') || q.includes('prediction') || q.includes('forecast')) {
    const surgeRisk = ctx.aqi > 300 ? 'HIGH' : ctx.aqi > 200 ? 'MODERATE' : 'LOW';
    const increase = ctx.aqi > 300 ? '25-40%' : ctx.aqi > 200 ? '15-25%' : '5-10%';
    return `Based on current environmental data (AQI: ${ctx.aqi}), surge risk is ${surgeRisk}. Predicting ${increase} increase in respiratory presentations over the next 4 hours. ${ctx.aqi > 300 ? 'Recommend: Pre-position respiratory equipment and activate on-call pulmonology staff.' : 'Continue standard monitoring protocols.'}`;
  }
  
  // Staffing queries
  if (q.includes('staff') || q.includes('ratio') || q.includes('nurse')) {
    const ratio = ctx.staffRatio > 0 ? Math.round(1/ctx.staffRatio) : 0;
    const status = ctx.staffRatio < 0.2 ? 'CRITICAL' : ctx.staffRatio < 0.25 ? 'SUBOPTIMAL' : 'ADEQUATE';
    return `Current nurse-to-patient ratio is 1:${ratio} (${status}). ${ctx.staffRatio < 0.25 ? `Recommendation: Activate on-call nursing pool. Consider diverting non-critical ambulance traffic until ratio improves to 1:4 or better.` : `Ratio is within acceptable limits. Monitoring for changes based on predicted ${ctx.aqi > 200 ? 'respiratory surge' : 'patient flow'}.`}`;
  }
  
  // Oxygen queries
  if (q.includes('oxygen') || q.includes('o2') || q.includes('reserve')) {
    const status = ctx.oxygenHours <= 8 ? 'CRITICAL' : ctx.oxygenHours <= 12 ? 'LOW' : 'STABLE';
    return `Oxygen reserves at ${ctx.oxygenHours.toFixed(1)} hours autonomy (${status}). ${ctx.oxygenHours < 12 ? `ALERT: Recommend placing emergency refill order. High-flow usage trending upward due to AQI ${ctx.aqi}.` : 'Levels stable. Continuous monitoring active for consumption rate anomalies.'}`;
  }
  
  // Protocol queries
  if (q.includes('protocol') || q.includes('code') || q.includes('activate')) {
    if (ctx.defconLevel <= 2) {
      return `Given current DEFCON ${ctx.defconLevel} status, recommend activating 'Code Yellow' surge protocol: 1) Recall off-duty Pulmonary specialists 2) Convert Observation Unit to ED overflow 3) Notify regional hospitals for potential diversion 4) Deploy respiratory isolation protocols 5) Increase O2 monitoring frequency.`;
    }
    return `Current operational status is DEFCON ${ctx.defconLevel}. No emergency protocols required. Continue standard monitoring. Readiness protocols are on standby for rapid activation if metrics deteriorate.`;
  }
  
  // AQI/Pollution queries
  if (q.includes('pollution') || q.includes('aqi') || q.includes('air') || q.includes('environment')) {
    const severity = ctx.aqi > 300 ? 'HAZARDOUS' : ctx.aqi > 200 ? 'VERY UNHEALTHY' : ctx.aqi > 150 ? 'UNHEALTHY' : 'MODERATE';
    return `Current AQI reading: ${ctx.aqi} (${severity}). ${ctx.aqi > 300 ? 'Health emergency conditions - expect 40%+ increase in respiratory ED visits. Recommend: Issue public advisory, maximize nebulizer availability, consider temporary triage tent deployment.' : ctx.aqi > 200 ? 'Elevated levels correlate with increased respiratory presentations. Monitoring external conditions for further deterioration.' : 'Air quality within manageable parameters. Standard protocols apply.'}`;
  }
  
  // Diversion queries
  if (q.includes('divert') || q.includes('ambulance') || q.includes('redirect')) {
    return `Current occupancy: ${ctx.occupancyRate}%. ${ctx.occupancyRate > 90 ? `Diversion RECOMMENDED. Simulated impact: Redirecting ambulances for 2 hours would reduce intake by ~15 patients, bringing occupancy to ~${Math.max(70, ctx.occupancyRate - 15)}%. Notify dispatch and regional hospitals.` : `Diversion not currently recommended. Capacity exists for continued intake. Monitor occupancy trend.`}`;
  }
  
  // Bed/Capacity queries
  if (q.includes('bed') || q.includes('capacity') || q.includes('occupancy')) {
    return `ER occupancy at ${ctx.occupancyRate}%. Active patients: ${ctx.activePatients}. ${ctx.occupancyRate > 90 ? 'CRITICAL: Approaching capacity limits. Recommend expediting discharges, opening overflow areas, and considering ambulance diversion.' : ctx.occupancyRate > 80 ? 'Elevated occupancy. Monitoring discharge pipeline and admission rate.' : 'Capacity within normal operational limits.'}`;
  }
  
  // Status/Overview queries
  if (q.includes('status') || q.includes('overview') || q.includes('summary') || q.includes('situation')) {
    return `SITUATION REPORT | DEFCON ${ctx.defconLevel} | Patients: ${ctx.activePatients} | Occupancy: ${ctx.occupancyRate}% | O2: ${ctx.oxygenHours.toFixed(1)}h | Staff: 1:${ctx.staffRatio > 0 ? Math.round(1/ctx.staffRatio) : '--'} | AQI: ${ctx.aqi}. ${ctx.defconLevel <= 2 ? 'ELEVATED ALERT STATUS. Surge protocols may be required.' : 'Operations within normal parameters. Continuous monitoring active.'}`;
  }
  
  // Default response
  return `I'm analyzing your query against current operational data. DEFCON: ${ctx.defconLevel} | Patients: ${ctx.activePatients} | Occupancy: ${ctx.occupancyRate}% | AQI: ${ctx.aqi}. I can provide insights on: surge predictions, staffing optimization, oxygen reserves, protocol recommendations, diversion analysis, or environmental impact. What specific aspect would you like me to elaborate on?`;
}
