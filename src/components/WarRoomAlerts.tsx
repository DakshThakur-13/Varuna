'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, CheckCircle, XCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentAlert {
  id: string;
  incident_type: string;
  severity: string;
  location: string;
  description: string;
  recommended_actions: any;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function WarRoomAlerts() {
  const [alerts, setAlerts] = useState<IncidentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    fetchAlerts();
    
    // Real-time subscription
    const channel = supabase
      .channel('war-room-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('incident_alerts')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet - silently handle
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setAlerts([]);
          return;
        }
        throw error;
      }
      setAlerts(data || []);
    } catch (err: unknown) {
      // Only log if it's a real error, not a missing table
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('does not exist')) {
        console.error('Error fetching alerts:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    if (!supabase) return;
    
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('incident_alerts')
        .update({ 
          status: action,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // Optimistic update
      setAlerts(prev => prev.filter(a => a.id !== id));
      
    } catch (err) {
      console.error(`Error ${action} alert:`, err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && alerts.length === 0) return null;
  if (alerts.length === 0) return null;

  return (
    <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
      <div className="bg-red-950/30 border border-red-500/50 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.2)]">
        <div className="bg-red-900/50 px-6 py-3 border-b border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg animate-pulse">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">WAR ROOM: APPROVAL REQUIRED</h3>
              <p className="text-xs text-red-300 font-mono">AI AGENT PAUSED • HUMAN INTERVENTION NEEDED</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-red-500 text-white text-xs font-black rounded-full animate-pulse">
            {alerts.length} PENDING
          </span>
        </div>

        <div className="divide-y divide-red-500/20">
          {alerts.map((alert) => (
            <div key={alert.id} className="p-6 hover:bg-red-900/10 transition-colors">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold uppercase rounded border border-red-500/30">
                      {alert.incident_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">{alert.description}</h4>
                  <p className="text-slate-300 text-sm mb-4 flex items-center gap-2">
                    <span className="text-slate-500">Location:</span> {alert.location}
                  </p>
                  
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">AI Proposed Actions:</p>
                    <ul className="space-y-1">
                      {alert.recommended_actions?.resource_requests?.map((req: any, idx: number) => (
                        <li key={idx} className="text-sm text-blue-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                          Order {req.quantity} units of {req.resource_type} from {req.vendor_name}
                        </li>
                      ))}
                      {alert.recommended_actions?.hospital_alerts?.map((h: any, idx: number) => (
                        <li key={idx} className="text-sm text-orange-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                          Alert {h.hospital_name}: {h.alert_type}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-3 min-w-[160px]">
                  <button
                    onClick={() => handleAction(alert.id, 'approved')}
                    disabled={!!processingId}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {processingId === alert.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    APPROVE
                  </button>
                  <button
                    onClick={() => handleAction(alert.id, 'rejected')}
                    disabled={!!processingId}
                    className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:bg-red-900/50 hover:text-red-400 disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    REJECT
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
