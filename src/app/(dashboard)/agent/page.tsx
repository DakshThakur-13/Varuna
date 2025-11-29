'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radar,
  Bot,
  AlertTriangle,
  Radio,
  Truck,
  Building2,
  Activity,
  Zap,
  Clock,
  MapPin,
  Users,
  Heart,
  Package,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  ChevronRight,
  Bell,
  TrendingUp,
  ShieldAlert,
  Ambulance,
  Phone,
  Send,
  Eye,
  Brain,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  IncidentReport, 
  ResourceRequest, 
  HospitalAlert, 
  AgentAction 
} from '@/types/agent';

interface AgentLog {
  id: string;
  timestamp: Date;
  type: 'scan' | 'detect' | 'analyze' | 'alert' | 'request' | 'coordinate' | 'info' | 'success' | 'error';
  message: string;
}

// Helper function for consistent time formatting
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true 
  });
};

export default function AgentPage() {
  // Hydration fix - only render time after mount
  const [mounted, setMounted] = useState(false);
  
  // Agent state
  const [isRunning, setIsRunning] = useState(false);
  const [scanInterval, setScanInterval] = useState(30); // seconds
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [nextScan, setNextScan] = useState<number>(0);
  
  // Detected incidents
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  
  // Response data
  const [resourceRequests, setResourceRequests] = useState<ResourceRequest[]>([]);
  const [hospitalAlerts, setHospitalAlerts] = useState<HospitalAlert[]>([]);
  const [capacityScore, setCapacityScore] = useState(100);
  const [issues, setIssues] = useState<string[]>([]);
  
  // Agent logs - initialize empty, populate after mount
  const [logs, setLogs] = useState<AgentLog[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    incidentsDetected: 0,
    alertsSent: 0,
    requestsMade: 0,
    patientsManaged: 0,
  });

  const logsEndRef = useRef<HTMLDivElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((type: AgentLog['type'], message: string) => {
    const newLog: AgentLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      type,
      message,
    };
    setLogs(prev => [...prev.slice(-100), newLog]);
  }, []);

  // Initialize on mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setLogs([
      { id: '1', timestamp: new Date(), type: 'info', message: 'Emergency Intelligence Agent initialized' },
      { id: '2', timestamp: new Date(), type: 'info', message: 'Connected to hospital network (5 facilities)' },
      { id: '3', timestamp: new Date(), type: 'info', message: 'Vendor database loaded (5 suppliers)' },
    ]);
  }, []);

  // Scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Scan for incidents
  const performScan = useCallback(async () => {
    addLog('scan', 'Scanning external data sources...');
    
    try {
      const response = await fetch('/api/agent/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceScan: true }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastScan(new Date());
        addLog('info', `Scan complete. Analyzed ${data.incidentsDetected || 0} potential incidents.`);
        
        if (data.incidents && data.incidents.length > 0) {
          // New incidents detected
          for (const incident of data.incidents) {
            addLog('detect', `🚨 INCIDENT DETECTED: ${incident.title}`);
            addLog('analyze', `Type: ${incident.type.toUpperCase()} | Severity: ${incident.severity.toUpperCase()}`);
            addLog('analyze', `Estimated casualties: ${incident.estimatedCasualties.likely} (${incident.estimatedCasualties.min}-${incident.estimatedCasualties.max})`);
            addLog('analyze', `Location: ${incident.location.address} (${incident.location.distanceFromHospital} km)`);
            addLog('analyze', `ETA: ${incident.estimatedArrivalTime} minutes`);
            
            setIncidents(prev => {
              const exists = prev.some(i => i.id === incident.id);
              if (exists) return prev;
              return [incident, ...prev].slice(0, 10);
            });
            
            setStats(prev => ({ ...prev, incidentsDetected: prev.incidentsDetected + 1 }));
            
            // Auto-trigger orchestration for high/critical incidents
            if (incident.severity === 'critical' || incident.severity === 'high') {
              addLog('info', 'High-severity incident - initiating automatic response...');
              await orchestrateResponse(incident);
            }
          }
        }
      }
    } catch (error) {
      addLog('error', `Scan failed: ${error}`);
    }
  }, [addLog]);

  // Orchestrate response to incident
  const orchestrateResponse = async (incident: IncidentReport) => {
    addLog('coordinate', `Initiating response orchestration for: ${incident.title}`);
    
    try {
      const response = await fetch('/api/agent/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update capacity score
        setCapacityScore(data.resourceCheck.capacityScore);
        setIssues(data.resourceCheck.issues || []);
        
        // Log resource check results
        if (data.resourceCheck.canHandleEmergency) {
          addLog('success', `✓ Hospital can handle emergency (Capacity Score: ${data.resourceCheck.capacityScore}%)`);
        } else {
          addLog('alert', `⚠ Hospital capacity strained (Score: ${data.resourceCheck.capacityScore}%)`);
          data.resourceCheck.issues?.forEach((issue: string) => {
            addLog('alert', `  - ${issue}`);
          });
        }
        
        // Process vendor requests
        if (data.vendorRequests.requests.length > 0) {
          addLog('request', `📦 Generating ${data.vendorRequests.count} supply requests...`);
          
          for (const req of data.vendorRequests.requests) {
            addLog('request', `  → ${req.item} (${req.quantity} ${req.unit}) from ${req.vendor?.name}`);
            addLog('info', `    ETA: ${req.vendor?.eta} minutes | Priority: ${req.priority.toUpperCase()}`);
          }
          
          setResourceRequests(prev => [...data.vendorRequests.requests, ...prev].slice(0, 20));
          setStats(prev => ({ ...prev, requestsMade: prev.requestsMade + data.vendorRequests.count }));
        }
        
        // Process hospital alerts
        if (data.hospitalAlerts.alerts.length > 0) {
          addLog('coordinate', `🏥 Alerting ${data.hospitalAlerts.count} nearby hospitals (${data.hospitalAlerts.alertType})...`);
          
          for (const alert of data.hospitalAlerts.alerts) {
            addLog('alert', `  → ${alert.targetHospitalName}: ${alert.requestType.replace('_', ' ')}`);
            if (alert.patientsToRedirect && alert.patientsToRedirect > 0) {
              addLog('info', `    Requesting acceptance of ${alert.patientsToRedirect} patients`);
            }
          }
          
          setHospitalAlerts(prev => [...data.hospitalAlerts.alerts, ...prev].slice(0, 20));
          setStats(prev => ({ ...prev, alertsSent: prev.alertsSent + data.hospitalAlerts.count }));
        }
        
        // Log recommendations
        if (data.recommendations && data.recommendations.length > 0) {
          addLog('info', '📋 Recommended preparations:');
          data.recommendations.forEach((rec: string) => {
            addLog('info', `  • ${rec}`);
          });
        }
        
        addLog('success', '✓ Response orchestration complete');
      }
    } catch (error) {
      addLog('error', `Orchestration failed: ${error}`);
    }
  };

  // Start/stop scanning
  const toggleAgent = () => {
    if (isRunning) {
      // Stop
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setIsRunning(false);
      addLog('info', 'Agent paused');
    } else {
      // Start
      setIsRunning(true);
      addLog('success', 'Agent activated - beginning surveillance');
      performScan(); // Immediate first scan
      setNextScan(scanInterval);
      
      // Countdown timer
      countdownRef.current = setInterval(() => {
        setNextScan(prev => {
          if (prev <= 1) return scanInterval;
          return prev - 1;
        });
      }, 1000);
      
      // Scan interval
      scanIntervalRef.current = setInterval(() => {
        performScan();
        setNextScan(scanInterval);
      }, scanInterval * 1000);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getLogIcon = (type: AgentLog['type']) => {
    switch (type) {
      case 'scan': return <Radar className="w-4 h-4 text-blue-400" />;
      case 'detect': return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'analyze': return <Brain className="w-4 h-4 text-violet-400" />;
      case 'alert': return <Bell className="w-4 h-4 text-orange-400" />;
      case 'request': return <Truck className="w-4 h-4 text-amber-400" />;
      case 'coordinate': return <Building2 className="w-4 h-4 text-cyan-400" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600">
              <Bot className="w-6 h-6 text-white" />
            </div>
            Emergency Intelligence Agent
          </h1>
          <p className="text-slate-400 mt-1">AI-powered threat detection & automated response coordination</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            )} />
            {isRunning ? 'Active' : 'Paused'}
          </div>
          
          {/* Next scan countdown */}
          {isRunning && (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-slate-300">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Next scan: {nextScan}s
            </div>
          )}
          
          {/* Start/Stop button */}
          <button
            onClick={toggleAgent}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all",
              isRunning 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Stop Agent' : 'Start Agent'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Incidents Detected</p>
              <p className="text-2xl font-bold text-white">{stats.incidentsDetected}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Bell className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Alerts Sent</p>
              <p className="text-2xl font-bold text-white">{stats.alertsSent}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Supply Requests</p>
              <p className="text-2xl font-bold text-white">{stats.requestsMade}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              capacityScore >= 70 ? 'bg-emerald-500/20' : 
              capacityScore >= 40 ? 'bg-amber-500/20' : 'bg-red-500/20'
            )}>
              <Activity className={cn(
                "w-5 h-5",
                capacityScore >= 70 ? 'text-emerald-400' : 
                capacityScore >= 40 ? 'text-amber-400' : 'text-red-400'
              )} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Capacity Score</p>
              <p className="text-2xl font-bold text-white">{capacityScore}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Log */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-violet-400" />
              Agent Activity Log
            </h2>
            <span className="text-sm text-slate-400">
              {mounted && lastScan ? `Last scan: ${formatTime(lastScan)}` : 'No scans yet'}
            </span>
          </div>
          
          <div className="h-[400px] overflow-y-auto p-4 space-y-2 font-mono text-sm bg-slate-950">
            {logs.map((log) => (
              <div 
                key={log.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded",
                  log.type === 'error' ? 'bg-red-950/30' :
                  log.type === 'detect' ? 'bg-red-950/20' :
                  log.type === 'success' ? 'bg-emerald-950/20' :
                  log.type === 'alert' ? 'bg-orange-950/20' :
                  'bg-slate-900/30'
                )}
              >
                <span className="text-slate-500 whitespace-nowrap">
                  [{mounted ? formatTime(log.timestamp) : '--:--:--'}]
                </span>
                {getLogIcon(log.type)}
                <span className={cn(
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'detect' ? 'text-red-300' :
                  log.type === 'success' ? 'text-emerald-400' :
                  log.type === 'alert' ? 'text-orange-300' :
                  'text-slate-300'
                )}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Detected Incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Detected Incidents
            </h2>
          </div>
          
          <div className="h-[400px] overflow-y-auto">
            {incidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Radar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No incidents detected</p>
                <p className="text-sm">Agent will scan for threats when active</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {incidents.map((incident) => (
                  <div 
                    key={incident.id}
                    className="p-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            getSeverityColor(incident.severity)
                          )}>
                            {incident.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-500">
                            {mounted ? formatTime(new Date(incident.detectedAt)) : '--:--:--'}
                          </span>
                        </div>
                        <h3 className="text-white font-medium text-sm line-clamp-2">
                          {incident.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {incident.location.distanceFromHospital} km
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            ~{incident.estimatedCasualties.likely} casualties
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {incident.estimatedArrivalTime} min
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resource Requests & Hospital Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Requests */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              Auto-Generated Supply Requests
            </h2>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {resourceRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Truck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {resourceRequests.slice(0, 10).map((req) => (
                  <div key={req.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            req.priority === 'critical' ? 'bg-red-600 text-white' :
                            req.priority === 'urgent' ? 'bg-orange-600 text-white' :
                            'bg-blue-600 text-white'
                          )}>
                            {req.priority.toUpperCase()}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs",
                            req.status === 'pending' ? 'bg-slate-700 text-slate-300' :
                            req.status === 'confirmed' ? 'bg-emerald-600 text-white' :
                            'bg-blue-600 text-white'
                          )}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-white font-medium">{req.item}</p>
                        <p className="text-sm text-slate-400">
                          {req.quantity} {req.unit} from {req.vendor?.name}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-slate-400">ETA</p>
                        <p className="text-white font-medium">{req.vendor?.eta} min</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hospital Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Hospital Network Alerts
            </h2>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {hospitalAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No alerts sent</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {hospitalAlerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            alert.requestType === 'divert_patients' ? 'bg-red-600 text-white' :
                            alert.requestType === 'standby' ? 'bg-orange-600 text-white' :
                            alert.requestType === 'accept_overflow' ? 'bg-amber-600 text-white' :
                            'bg-blue-600 text-white'
                          )}>
                            {alert.requestType.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs",
                            alert.status === 'sent' ? 'bg-slate-700 text-slate-300' :
                            alert.status === 'acknowledged' ? 'bg-blue-600 text-white' :
                            alert.status === 'accepted' ? 'bg-emerald-600 text-white' :
                            'bg-red-600 text-white'
                          )}>
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-white font-medium">{alert.targetHospitalName}</p>
                        {alert.patientsToRedirect && alert.patientsToRedirect > 0 && (
                          <p className="text-sm text-slate-400">
                            {alert.patientsToRedirect} patients to redirect
                          </p>
                        )}
                      </div>
                      <button
                        title="Call hospital"
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                      >
                        <Phone className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Capacity Issues */}
      {issues.length > 0 && (
        <div className="bg-red-950/30 border border-red-800 rounded-xl p-4">
          <h3 className="text-red-400 font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" />
            Capacity Issues Detected
          </h3>
          <ul className="space-y-2">
            {issues.map((issue, idx) => (
              <li key={idx} className="text-red-300 text-sm flex items-start gap-2">
                <span className="text-red-500">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <span className={cn(
                    "px-3 py-1 rounded text-sm font-medium",
                    getSeverityColor(selectedIncident.severity)
                  )}>
                    {selectedIncident.severity.toUpperCase()} - {selectedIncident.type.toUpperCase()}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-3">{selectedIncident.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-slate-400 hover:text-white"
                  title="Close incident details"
                  aria-label="Close incident details"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-slate-300">{selectedIncident.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Location</p>
                  <p className="text-white font-medium">{selectedIncident.location.address}</p>
                  <p className="text-slate-400 text-sm mt-1">
                    {selectedIncident.location.distanceFromHospital} km from hospital
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Estimated Casualties</p>
                  <p className="text-white text-2xl font-bold">
                    {selectedIncident.estimatedCasualties.likely}
                  </p>
                  <p className="text-slate-400 text-sm">
                    Range: {selectedIncident.estimatedCasualties.min} - {selectedIncident.estimatedCasualties.max}
                  </p>
                </div>
              </div>
              
              {selectedIncident.estimatedCasualties.breakdown && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-3">Casualty Breakdown</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-red-400 text-2xl font-bold">
                        {selectedIncident.estimatedCasualties.breakdown.critical}
                      </p>
                      <p className="text-slate-400 text-sm">Critical</p>
                    </div>
                    <div className="text-center">
                      <p className="text-orange-400 text-2xl font-bold">
                        {selectedIncident.estimatedCasualties.breakdown.serious}
                      </p>
                      <p className="text-slate-400 text-sm">Serious</p>
                    </div>
                    <div className="text-center">
                      <p className="text-yellow-400 text-2xl font-bold">
                        {selectedIncident.estimatedCasualties.breakdown.minor}
                      </p>
                      <p className="text-slate-400 text-sm">Minor</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-slate-400 text-sm mb-2">Expected Injury Types</p>
                <div className="flex flex-wrap gap-2">
                  {selectedIncident.expectedInjuryTypes.map((injury, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slate-800 rounded-full text-sm text-white">
                      {injury}
                    </span>
                  ))}
                </div>
              </div>
              
              {selectedIncident.recommendedPreparations && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Recommended Preparations</p>
                  <ul className="space-y-2">
                    {selectedIncident.recommendedPreparations.map((prep, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        {prep}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    orchestrateResponse(selectedIncident);
                    setSelectedIncident(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 rounded-lg text-white font-medium"
                >
                  <Zap className="w-5 h-5" />
                  Initiate Full Response
                </button>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
