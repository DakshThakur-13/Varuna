import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { injuries, consciousness, vitalStatus, age, gender } = body;

    if (!injuries || injuries.length === 0) {
      return NextResponse.json({ 
        triageColor: 'green', 
        reasoning: 'No injuries reported.',
        treatment: 'Monitor patient.'
      });
    }

    const systemPrompt = `You are an expert emergency medical triage AI. 
    Analyze the patient's injuries and status to determine the triage color and provide immediate first aid/treatment recommendations.
    
    Triage Colors:
    - RED: Immediate/Resuscitation (Life-threatening, requires immediate intervention)
    - YELLOW: Urgent (Serious but not immediately life-threatening)
    - GREEN: Minor (Walking wounded)
    - BLACK: Expectant (Deceased or non-survivable)

    Consider that MULTIPLE injuries significantly increase severity and may escalate the triage color (e.g., multiple moderate injuries might become RED).
    
    Respond ONLY with valid JSON in this exact format:
    {
      "triageColor": "red" | "yellow" | "green" | "black",
      "reasoning": "Brief explanation of why this color was chosen, noting multiple injuries if applicable.",
      "treatment": "Concise bullet points of immediate first aid and temporary treatment steps."
    }`;

    const userMessage = `Patient Assessment:
    - Injuries: ${injuries.join(', ')}
    - Consciousness: ${consciousness}
    - Vital Status: ${vitalStatus}
    ${age ? `- Age: ${age}` : ''}
    ${gender ? `- Gender: ${gender}` : ''}
    
    Provide triage assessment and immediate treatment.`;

    const aiResponse = await generateAIResponse(systemPrompt, userMessage);
    
    let result;
    try {
      // Clean up markdown code blocks if present
      const cleanContent = aiResponse.content.replace(/```json\n?|\n?```/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback if JSON parsing fails
      result = {
        triageColor: 'yellow',
        reasoning: 'AI response parsing failed, defaulting to Urgent.',
        treatment: aiResponse.content // Return raw content as treatment if parsing fails
      };
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Rapid triage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
