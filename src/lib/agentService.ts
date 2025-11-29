/**
 * Varuna AI Agent Service
 * Connects to the Python FastAPI backend for AI agent operations
 */

// Python backend URL
const AGENT_BACKEND_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'https://varuna-kygm.onrender.com';

interface ScanResult {
  success: boolean;
  incidents: any[];
  scan_time: string;
  sources_checked: string[];
  message?: string;
}

interface OrchestrationResult {
  success: boolean;
  result: {
    incident_id: string;
    resource_status: any[];
    resource_requests: any[];
    hospital_alerts: any[];
    recommendations: string[];
    capacity_score: number;
    prepared: boolean;
  };
  message?: string;
}

interface LearningResult {
  success: boolean;
  report: {
    incident_id: string;
    predicted_casualties: number;
    actual_casualties: number;
    accuracy_score: number;
    response_rating: string;
    insights: any[];
    improvements: string[];
  };
  message?: string;
}

interface ChatResult {
  success: boolean;
  response: string;
  source: string;
  tools_used: string[];
}

class AgentService {
  private baseUrl: string;
  private useBackend: boolean = true;

  constructor() {
    this.baseUrl = AGENT_BACKEND_URL;
    // Check if backend is available
    this.checkBackendHealth();
  }

  private async checkBackendHealth(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      this.useBackend = response.ok;
      console.log(`🤖 Agent Backend: ${this.useBackend ? 'Connected' : 'Using fallback'}`);
    } catch {
      this.useBackend = false;
      console.log('🤖 Agent Backend: Using fallback (Next.js API)');
    }
  }

  /**
   * Scan for emergency incidents
   */
  async scan(options?: { radius_km?: number }): Promise<ScanResult> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.baseUrl}/api/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            radius_km: options?.radius_km || 15,
            include_sources: ['news', 'emergency', 'social'],
          }),
        });
        return await response.json();
      } catch (error) {
        console.error('Backend scan failed, using fallback:', error);
        return this.fallbackScan();
      }
    }
    return this.fallbackScan();
  }

  private async fallbackScan(): Promise<ScanResult> {
    try {
      const response = await fetch('/api/agent/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceScan: true }),
      });
      const data = await response.json();
      return {
        success: data.success,
        incidents: data.incidents || [],
        scan_time: new Date().toISOString(),
        sources_checked: ['next.js-api'],
        message: data.message,
      };
    } catch {
      return { success: false, incidents: [], scan_time: new Date().toISOString(), sources_checked: [] };
    }
  }

  /**
   * Orchestrate response to an incident
   */
  async orchestrate(incident: any, options?: {
    auto_request_resources?: boolean;
    auto_alert_hospitals?: boolean;
  }): Promise<OrchestrationResult> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.baseUrl}/api/orchestrate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incident,
            auto_request_resources: options?.auto_request_resources ?? false,
            auto_alert_hospitals: options?.auto_alert_hospitals ?? true,
          }),
        });
        return await response.json();
      } catch (error) {
        console.error('Backend orchestration failed, using fallback:', error);
        return this.fallbackOrchestrate(incident);
      }
    }
    return this.fallbackOrchestrate(incident);
  }

  private async fallbackOrchestrate(incident: any): Promise<OrchestrationResult> {
    try {
      const response = await fetch('/api/agent/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident }),
      });
      const data = await response.json();
      return {
        success: data.success,
        result: {
          incident_id: incident.id,
          resource_status: data.resourceCheck?.resources || [],
          resource_requests: data.vendorRequests?.requests || [],
          hospital_alerts: data.hospitalAlerts?.alerts || [],
          recommendations: data.recommendations || [],
          capacity_score: (data.resourceCheck?.capacityScore || 70) / 100,
          prepared: data.resourceCheck?.canHandleEmergency ?? true,
        },
      };
    } catch {
      return {
        success: false,
        result: {
          incident_id: incident.id,
          resource_status: [],
          resource_requests: [],
          hospital_alerts: [],
          recommendations: [],
          capacity_score: 0.5,
          prepared: false,
        },
      };
    }
  }

  /**
   * Post-incident learning analysis
   */
  async learn(data: {
    incident_id: string;
    actual_casualties: number;
    actual_arrival_time: number;
    notes?: string;
  }): Promise<LearningResult> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.baseUrl}/api/learn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        return await response.json();
      } catch (error) {
        console.error('Backend learning failed, using fallback:', error);
        return this.fallbackLearn(data);
      }
    }
    return this.fallbackLearn(data);
  }

  private async fallbackLearn(data: any): Promise<LearningResult> {
    try {
      const response = await fetch('/api/agent/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch {
      return {
        success: false,
        report: {
          incident_id: data.incident_id,
          predicted_casualties: 0,
          actual_casualties: data.actual_casualties,
          accuracy_score: 0,
          response_rating: 'N/A',
          insights: [],
          improvements: [],
        },
      };
    }
  }

  /**
   * Chat with AI agent
   */
  async chat(message: string, context?: Record<string, any>): Promise<ChatResult> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, context }),
        });
        return await response.json();
      } catch (error) {
        console.error('Backend chat failed:', error);
        return { success: false, response: 'Connection to AI agent failed.', source: 'error', tools_used: [] };
      }
    }
    return { success: false, response: 'AI agent backend not available.', source: 'fallback', tools_used: [] };
  }

  /**
   * Get current resource status
   */
  async getResources(): Promise<any> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.baseUrl}/api/resources`);
        return await response.json();
      } catch {
        return { resources: [], timestamp: new Date().toISOString() };
      }
    }
    return { resources: [], timestamp: new Date().toISOString() };
  }

  /**
   * Get active incidents
   */
  async getActiveIncidents(): Promise<any> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.baseUrl}/api/incidents`);
        return await response.json();
      } catch {
        return { incidents: [], count: 0 };
      }
    }
    return { incidents: [], count: 0 };
  }

  /**
   * Get agent status
   */
  async getStatus(): Promise<any> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.baseUrl}/status`);
        return await response.json();
      } catch {
        return { scanning: false, active_incidents: 0 };
      }
    }
    return { scanning: false, active_incidents: 0 };
  }

  /**
   * Start background scanning
   */
  async startScanning(): Promise<boolean> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.baseUrl}/api/control/start-scan`, { method: 'POST' });
        return response.ok;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Stop background scanning
   */
  async stopScanning(): Promise<boolean> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.baseUrl}/api/control/stop-scan`, { method: 'POST' });
        return response.ok;
      } catch {
        return false;
      }
    }
    return false;
  }
}

// Singleton instance
export const agentService = new AgentService();
export default agentService;
