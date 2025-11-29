import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { PostIncidentReport, IncidentReport } from '@/types/agent';

// Initialize Groq
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Store for tracking incidents (in production, use database)
const incidentHistory: Map<string, {
  incident: IncidentReport;
  actualPatients: number;
  responseActions: string[];
  vendorPerformance: { vendorId: string; vendorName: string; onTime: boolean; deliveryTime: number }[];
  hospitalCoordination: { hospitalId: string; hospitalName: string; patientsRedirected: number; helpful: boolean }[];
  startTime: Date;
  endTime?: Date;
}> = new Map();

// Learn from an incident
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { incidentId, action, data } = body;

    switch (action) {
      case 'start_tracking':
        // Start tracking a new incident
        incidentHistory.set(incidentId, {
          incident: data.incident,
          actualPatients: 0,
          responseActions: [],
          vendorPerformance: [],
          hospitalCoordination: [],
          startTime: new Date(),
        });
        return NextResponse.json({ success: true, message: 'Incident tracking started' });

      case 'update_patients':
        // Update actual patient count
        const trackingData = incidentHistory.get(incidentId);
        if (trackingData) {
          trackingData.actualPatients = data.count;
          incidentHistory.set(incidentId, trackingData);
        }
        return NextResponse.json({ success: true, message: 'Patient count updated' });

      case 'record_vendor':
        // Record vendor performance
        const vendorData = incidentHistory.get(incidentId);
        if (vendorData) {
          vendorData.vendorPerformance.push({
            vendorId: data.vendorId,
            vendorName: data.vendorName,
            onTime: data.onTime,
            deliveryTime: data.deliveryTime,
          });
          incidentHistory.set(incidentId, vendorData);
        }
        return NextResponse.json({ success: true, message: 'Vendor performance recorded' });

      case 'record_hospital':
        // Record hospital coordination
        const hospData = incidentHistory.get(incidentId);
        if (hospData) {
          hospData.hospitalCoordination.push({
            hospitalId: data.hospitalId,
            hospitalName: data.hospitalName,
            patientsRedirected: data.patientsRedirected,
            helpful: data.helpful,
          });
          incidentHistory.set(incidentId, hospData);
        }
        return NextResponse.json({ success: true, message: 'Hospital coordination recorded' });

      case 'resolve':
        // Generate post-incident report
        const resolveData = incidentHistory.get(incidentId);
        if (!resolveData) {
          return NextResponse.json({ success: false, error: 'Incident not found' }, { status: 404 });
        }
        
        resolveData.endTime = new Date();
        const report = await generatePostIncidentReport(incidentId, resolveData);
        
        return NextResponse.json({ 
          success: true, 
          report,
          message: 'Incident resolved and report generated'
        });

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Learning error:', error);
    return NextResponse.json({ success: false, error: 'Learning operation failed' }, { status: 500 });
  }
}

async function generatePostIncidentReport(
  incidentId: string, 
  data: NonNullable<ReturnType<typeof incidentHistory.get>>
): Promise<PostIncidentReport> {
  const incident = data.incident;
  const duration = data.endTime 
    ? (data.endTime.getTime() - data.startTime.getTime()) / 1000 / 60 
    : 0;

  // Calculate prediction accuracy
  const predicted = incident.estimatedCasualties.likely;
  const actual = data.actualPatients || predicted; // Use predicted if no actual data
  const accuracy = predicted > 0 
    ? Math.round((1 - Math.abs(predicted - actual) / Math.max(predicted, actual)) * 100)
    : 0;

  // Generate AI-powered lessons learned
  let lessonsLearned: string[] = [];
  let recommendations: string[] = [];

  if (groq) {
    try {
      const prompt = `You are analyzing a hospital emergency response for learning purposes.

INCIDENT DETAILS:
- Type: ${incident.type}
- Severity: ${incident.severity}
- Predicted casualties: ${predicted}
- Actual casualties: ${actual}
- Prediction accuracy: ${accuracy}%
- Response duration: ${duration.toFixed(0)} minutes

VENDOR PERFORMANCE:
${data.vendorPerformance.map(v => `- ${v.vendorName}: ${v.onTime ? 'On-time' : 'LATE'} (${v.deliveryTime} mins)`).join('\n') || 'No vendor data'}

HOSPITAL COORDINATION:
${data.hospitalCoordination.map(h => `- ${h.hospitalName}: ${h.patientsRedirected} patients, ${h.helpful ? 'Helpful' : 'Not helpful'}`).join('\n') || 'No coordination data'}

Generate a JSON response with:
{
  "lessonsLearned": ["3-5 specific lessons from this incident"],
  "recommendations": ["3-5 actionable recommendations for future incidents"]
}

Focus on:
1. Prediction accuracy - what can improve it?
2. Response time optimization
3. Vendor reliability
4. Hospital network effectiveness
5. Resource allocation`;

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      });
      
      const text = completion.choices[0]?.message?.content?.trim() || '';
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        lessonsLearned = analysis.lessonsLearned || [];
        recommendations = analysis.recommendations || [];
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    }
  }

  // Fallback lessons
  if (lessonsLearned.length === 0) {
    lessonsLearned = [
      accuracy < 70 ? 'Casualty prediction model needs refinement for this incident type' : 'Prediction accuracy was acceptable',
      data.vendorPerformance.some(v => !v.onTime) ? 'Some vendors failed to deliver on time - review vendor priorities' : 'Vendor performance was satisfactory',
      data.hospitalCoordination.some(h => !h.helpful) ? 'Some hospitals were unresponsive - update contact protocols' : 'Hospital network coordination was effective',
    ];
  }

  if (recommendations.length === 0) {
    recommendations = [
      'Update incident type prediction models with this data',
      'Review and update vendor response time expectations',
      'Conduct quarterly drills with hospital network partners',
      'Maintain buffer stock for critical supplies',
    ];
  }

  const report: PostIncidentReport = {
    id: `RPT-${Date.now()}`,
    incidentId,
    generatedAt: new Date(),
    summary: {
      totalPatients: actual,
      criticalCases: Math.ceil(actual * 0.2),
      fatalities: 0,
      transferred: data.hospitalCoordination.reduce((sum, h) => sum + h.patientsRedirected, 0),
      discharged: Math.ceil(actual * 0.6),
    },
    predictions: {
      estimatedCasualties: predicted,
      actualCasualties: actual,
      accuracy,
    },
    timeline: {
      detectedAt: incident.detectedAt,
      firstAlertAt: new Date(new Date(incident.detectedAt).getTime() + 2 * 60000),
      firstPatientAt: new Date(new Date(incident.detectedAt).getTime() + incident.estimatedArrivalTime * 60000),
      peakLoadAt: new Date(new Date(incident.detectedAt).getTime() + (incident.estimatedArrivalTime + 30) * 60000),
      resolvedAt: data.endTime || new Date(),
    },
    resourceUsage: {
      bedsUsed: Math.ceil(actual * 0.8),
      icuBedsUsed: Math.ceil(actual * 0.15),
      suppliesConsumed: {
        'IV Fluids': actual * 3,
        'Blood Units': Math.ceil(actual * 0.5),
        'Bandages': actual * 10,
        'Medications': actual * 5,
      },
      staffHours: duration * (18 + 45) / 60, // doctors + nurses hours
    },
    vendorPerformance: data.vendorPerformance.map(v => ({
      ...v,
      requestedItems: ['Emergency supplies'],
    })),
    hospitalCoordination: data.hospitalCoordination.map(h => ({
      ...h,
      responseTime: 5,
    })),
    lessonsLearned,
    recommendations,
  };

  return report;
}

// Get learning insights
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const incidentType = url.searchParams.get('type');

  // In production, this would query a database of historical incidents
  const insights = {
    totalIncidentsAnalyzed: 127,
    averagePredictionAccuracy: 78,
    topPerformingVendors: [
      { name: 'Mumbai Blood Bank Network', reliability: 98, avgDeliveryTime: 18 },
      { name: 'MediSupply Express', reliability: 95, avgDeliveryTime: 22 },
    ],
    hospitalNetworkEffectiveness: 85,
    incidentTypeInsights: {
      accident: { avgCasualties: 8, avgResponseTime: 12, predictionAccuracy: 82 },
      fire: { avgCasualties: 15, avgResponseTime: 18, predictionAccuracy: 75 },
      building_collapse: { avgCasualties: 25, avgResponseTime: 25, predictionAccuracy: 68 },
      chemical_spill: { avgCasualties: 12, avgResponseTime: 20, predictionAccuracy: 70 },
    },
    recentImprovements: [
      'Casualty prediction accuracy improved 12% after model update',
      'Average vendor response time reduced by 8 minutes',
      'Hospital network acceptance rate increased to 92%',
    ],
    areasForImprovement: [
      'Building collapse predictions need more training data',
      'Night-time vendor availability remains a challenge',
      'ICU capacity forecasting needs refinement',
    ],
  };

  return NextResponse.json({
    success: true,
    service: 'Post-Incident Learning Engine',
    insights,
    lastUpdated: new Date().toISOString(),
  });
}
