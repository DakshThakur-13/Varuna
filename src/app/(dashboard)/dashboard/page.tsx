'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Patient, Alert, DEFCON_LEVELS, CTAS_LEVELS } from '@/types/database';
import { calculateDefconLevel, formatTime, getAQISeverity, cn } from '@/lib/utils';
import { generateMockSurgeData, generateResourceRadarData, generatePatientGridData, generateStaffData, generateInventoryData } from '@/lib/mockData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BedDouble,
  Bot,
  Clock,
  Droplets,
  Send,
  Users,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  Volume2,
  RefreshCw,
  Stethoscope,
  LucideIcon,
  Package,
  ArrowRight,
  AlertCircle,
  Shield,
  Thermometer,
  Wind,
  HeartPulse,
  Radio,
  MonitorDot
} from 'lucide-react';
import WarRoomAlerts from '@/components/WarRoomAlerts';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'normal' | 'warning' | 'critical';
  description?: string;
  accentColor?: 'teal' | 'blue' | 'amber' | 'rose' | 'emerald';
}

function KPICard({ title, value, unit, icon: Icon, trend, trendValue, status = 'normal', description, accentColor = 'teal' }: KPICardProps) {
  const statusConfig = {
    normal: {
      border: 'border-slate-700/50',
      bg: 'bg-slate-800/40',
      glow: '',
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-950/20',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    },
    critical: {
      border: 'border-rose-500/40',
      bg: 'bg-rose-950/20',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    },
  };

  const accentColors = {
    teal: 'from-teal-500/20 to-teal-600/5 text-teal-400',
    blue: 'from-blue-500/20 to-blue-600/5 text-blue-400',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-400',
    rose: 'from-rose-500/20 to-rose-600/5 text-rose-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400',
  };
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-rose-400' : trend === 'down' ? 'text-emerald-400' : 'text-slate-500';
  
  const config = statusConfig[status];
  
  return (
    <div className={cn(
      "relative rounded-xl border backdrop-blur-sm p-5 transition-all duration-300 hover:scale-[1.02]",
      config.border,
      config.bg,
      config.glow,
      status === 'critical' && 'animate-pulse'
    )}>
      {/* Subtle gradient overlay */}
      <div className={cn(
        "absolute inset-0 rounded-xl bg-gradient-to-br opacity-50 pointer-events-none",
        accentColors[accentColor]
      )} />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-2.5 rounded-lg bg-gradient-to-br",
            status === 'critical' ? 'from-rose-500/30 to-rose-600/10' : 
            status === 'warning' ? 'from-amber-500/30 to-amber-600/10' : 
            `from-${accentColor}-500/30 to-${accentColor}-600/10`
          )}>
            <Icon className={cn(
              "w-5 h-5",
              status === 'critical' ? 'text-rose-400' : 
              status === 'warning' ? 'text-amber-400' : 
              accentColors[accentColor].split(' ')[1]
            )} />
          </div>
          {trend && (
            <div className={cn("flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-slate-800/60", trendColor)}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        
        <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-3xl font-bold tracking-tight",
            status === 'critical' ? 'text-rose-400' : 
            status === 'warning' ? 'text-amber-400' : 
            'text-white'
          )}>
            {value}
          </span>
          {unit && <span className="text-slate-500 text-sm font-medium">{unit}</span>}
        </div>
        {description && <p className="text-slate-500 text-xs mt-2 font-medium">{description}</p>}
      </div>
    </div>
  );
}

// Helper for consistent time formatting
const formatTimeLocal = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [defconLevel, setDefconLevel] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [aqi, setAqi] = useState(285);
  const [surgeData, setSurgeData] = useState<ReturnType<typeof generateMockSurgeData>>([]);
  const [resourceData] = useState(generateResourceRadarData());
  
  const [activePatients, setActivePatients] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(78);
  const [oxygenHours, setOxygenHours] = useState(18);
  const [staffRatio, setStaffRatio] = useState(0.28);
  
  // Stats from Supabase
  const [patientCount, setPatientCount] = useState(0);
  const [criticalPatients, setCriticalPatients] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [staffOnDuty, setStaffOnDuty] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [criticalInventory, setCriticalInventory] = useState(0);
  
  // Fetch real stats from Supabase
  useEffect(() => {
    const fetchStats = async () => {
      if (!supabase) {
        // Fallback to mock data
        const patientData = generatePatientGridData();
        const staffData = generateStaffData();
        const inventoryData = generateInventoryData();
        setPatientCount(patientData.length);
        setCriticalPatients(patientData.filter(p => p.status === 'critical').length);
        setStaffCount(staffData.length);
        setStaffOnDuty(staffData.filter(s => s.status === 'on-duty').length);
        setInventoryCount(inventoryData.length);
        setCriticalInventory(inventoryData.filter(i => i.status === 'critical').length);
        setActivePatients(patientData.length);
        return;
      }
      
      try {
        // Fetch patient stats
        const { data: patients } = await supabase.from('patients').select('id, status');
        if (patients) {
          setPatientCount(patients.length);
          setCriticalPatients(patients.filter(p => p.status === 'critical').length);
          setActivePatients(patients.length);
        }
        
        // Fetch staff stats
        const { data: staff } = await supabase.from('staff').select('id, status');
        if (staff) {
          setStaffCount(staff.length);
          setStaffOnDuty(staff.filter(s => s.status === 'on-duty').length);
          // Calculate staff ratio
          if (patients && patients.length > 0) {
            setStaffRatio(staff.filter(s => s.status === 'on-duty').length / patients.length);
          }
        }
        
        // Fetch inventory stats
        const { data: inventory } = await supabase.from('inventory').select('id, status');
        if (inventory) {
          setInventoryCount(inventory.length);
          setCriticalInventory(inventory.filter(i => i.status === 'critical').length);
        }
        
        // Fetch resource_status for oxygen etc
        const { data: resources } = await supabase.from('resource_status').select('*').limit(1);
        if (resources && resources.length > 0) {
          const res = resources[0];
          if (res.beds_total > 0) {
            setOccupancyRate(Math.round((res.beds_occupied / res.beds_total) * 100));
          }
          // Oxygen hours calculation (assuming 1 unit = 1 hour worth)
          setOxygenHours(Math.round((res.oxygen_supply / 100) * 24));
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };
    
    fetchStats();
  }, []);
  
  // Chat state - initialize empty to avoid hydration mismatch
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  const [feedItems, setFeedItems] = useState<Array<{ id: string; time: string; message: string; type: 'ai' | 'alert' | 'patient' }>>([]);
  
  const chatRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Initialize on mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    // Initialize surge data with current AQI
    setSurgeData(generateMockSurgeData(285, 65));
    setChatMessages([{
      id: '1',
      type: 'ai',
      content: 'Varuna AI online. I\'m monitoring environmental conditions and patient flow. Current AQI is elevated. Standing by for queries.',
      timestamp: new Date(),
    }]);
    setFeedItems([
      { id: '1', time: formatTime(new Date()), message: 'System initialized. Monitoring active.', type: 'ai' },
      { id: '2', time: formatTime(new Date(Date.now() - 60000)), message: 'Environmental sensors connected.', type: 'ai' },
    ]);
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const newDefcon = calculateDefconLevel(occupancyRate, oxygenHours, staffRatio, 20);
    setDefconLevel(newDefcon);
  }, [occupancyRate, oxygenHours, staffRatio]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePatients(prev => Math.max(40, Math.min(120, prev + Math.floor(Math.random() * 5) - 2)));
      setOccupancyRate(prev => Math.max(50, Math.min(100, prev + Math.floor(Math.random() * 3) - 1)));
      setOxygenHours(prev => Math.max(4, Math.min(48, prev + (Math.random() > 0.7 ? -1 : 0.5))));
      // AQI changes more gradually and realistically
      setAqi(prev => {
        const change = Math.floor(Math.random() * 15) - 7; // -7 to +7
        return Math.max(100, Math.min(500, prev + change));
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update surge predictions when AQI or patient count changes significantly
  useEffect(() => {
    if (mounted) {
      setSurgeData(generateMockSurgeData(aqi, activePatients || 65));
    }
  }, [aqi, mounted, activePatients]);

  // Update surge data every minute for time progression
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setSurgeData(generateMockSurgeData(aqi, activePatients || 65));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [mounted, aqi, activePatients]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('patients-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, (payload) => {
        const newPatient = payload.new as Patient;
        setActivePatients(prev => prev + 1);
        const triageInfo = newPatient.triage_level 
          ? `CTAS ${newPatient.triage_level} (${CTAS_LEVELS[newPatient.triage_level as keyof typeof CTAS_LEVELS]?.name || 'Unknown'})`
          : 'Pending Triage';
        setFeedItems(prev => [{ id: crypto.randomUUID(), time: formatTime(new Date()), message: `New Triage: ${triageInfo}`, type: 'patient' }, ...prev.slice(0, 49)]);
      })
      .subscribe();
    return () => { if (supabase) supabase.removeChannel(channel); };
  }, []);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiTyping) return;
    
    const userMessage: ChatMessage = { id: crypto.randomUUID(), type: 'user', content: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    const queryText = chatInput;
    setChatInput('');
    setIsAiTyping(true);
    
    try {
      const response = await fetch('/api/neural-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          context: { defconLevel, aqi, activePatients, occupancyRate, oxygenHours, staffRatio, recentEvents: feedItems.slice(0, 10).map(f => f.message) }
        }),
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'ai', content: data.response || 'Unable to process query.', timestamp: new Date() }]);
    } catch {
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'ai', content: `Connection disrupted. DEFCON ${defconLevel} | ${activePatients} patients | ${occupancyRate}% occupancy.`, timestamp: new Date() }]);
    }
    setIsAiTyping(false);
  };

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages]);

  const aqiSeverity = getAQISeverity(aqi);
  const defconInfo = DEFCON_LEVELS[defconLevel];

  // Format date for header
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen text-white">
      {/* Command Center Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left: Time & Location */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 flex items-center justify-center border border-teal-500/20">
                  <Clock className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <span className="font-mono text-xl font-bold text-white tracking-wide">
                    {mounted && currentTime ? formatTimeLocal(currentTime) : '--:--:--'}
                  </span>
                  <p className="text-xs text-slate-500 font-medium">
                    {mounted && currentTime ? formatDate(currentTime) : '---'}
                  </p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300 font-medium">Central Delhi ERU</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
            
            {/* Center: DEFCON Status */}
            <div className={cn(
              "flex items-center gap-4 px-6 py-3 rounded-xl font-bold border transition-all",
              defconLevel <= 2 ? 'bg-rose-950/40 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.2)]' :
              defconLevel === 3 ? 'bg-amber-950/40 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]' :
              'bg-slate-800/50 border-slate-700/50'
            )}>
              <Shield className={cn(
                "w-6 h-6",
                defconLevel <= 2 ? 'text-rose-400' : defconLevel === 3 ? 'text-amber-400' : 'text-teal-400'
              )} />
              <div className="text-center">
                <span className={cn(
                  "text-lg font-bold tracking-wide",
                  defconLevel <= 2 ? 'text-rose-400' : defconLevel === 3 ? 'text-amber-400' : 'text-teal-400'
                )}>
                  DEFCON {defconLevel}
                </span>
                <p className={cn(
                  "text-xs font-medium",
                  defconLevel <= 2 ? 'text-rose-300/70' : defconLevel === 3 ? 'text-amber-300/70' : 'text-slate-400'
                )}>
                  {defconInfo.name}
                </p>
              </div>
              <MonitorDot className={cn(
                "w-5 h-5 animate-pulse",
                defconLevel <= 2 ? 'text-rose-400' : defconLevel === 3 ? 'text-amber-400' : 'text-teal-400'
              )} />
            </div>

            {/* Right: Quick Stats */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-medium text-white">{criticalPatients}</span>
                <span className="text-xs text-slate-500">Critical</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">{activePatients}</span>
                <span className="text-xs text-slate-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Environmental Alert Banner */}
      {aqi > 200 && (
        <div className={cn(
          "px-6 py-3 flex items-center justify-between gap-4 border-b",
          aqi > 400 ? 'bg-gradient-to-r from-rose-950/60 via-rose-900/40 to-rose-950/60 border-rose-700/50' :
          aqi > 300 ? 'bg-gradient-to-r from-orange-950/60 via-orange-900/40 to-orange-950/60 border-orange-700/50' :
          'bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border-amber-700/50'
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-2 rounded-lg",
              aqi > 400 ? 'bg-rose-500/20' : aqi > 300 ? 'bg-orange-500/20' : 'bg-amber-500/20'
            )}>
              <Wind className={cn(
                "w-5 h-5",
                aqi > 400 ? 'text-rose-400' : aqi > 300 ? 'text-orange-400' : 'text-amber-400'
              )} />
            </div>
            <div>
              <span className={cn(
                "font-semibold text-sm",
                aqi > 400 ? 'text-rose-300' : aqi > 300 ? 'text-orange-300' : 'text-amber-300'
              )}>
                {aqiSeverity.label} Air Quality Alert
              </span>
              <p className="text-xs text-slate-400">
                AQI {aqi} • {aqi > 300 ? 'Respiratory surge protocol active' : 'Monitor for potential surge'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold",
              aqi > 400 ? 'bg-rose-500/20 text-rose-300' : aqi > 300 ? 'bg-orange-500/20 text-orange-300' : 'bg-amber-500/20 text-amber-300'
            )}>
              ACTIVE
            </span>
            <Volume2 className={cn(
              "w-4 h-4",
              aqi > 400 ? 'text-rose-400' : aqi > 300 ? 'text-orange-400' : 'text-amber-400'
            )} />
          </div>
        </div>
      )}

      <main className="p-6 space-y-6">
        {/* War Room Alerts */}
        <WarRoomAlerts />

        {/* KPI Cards Grid */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-teal-400 to-teal-600 rounded-full" />
            <h2 className="text-lg font-semibold text-white">System Vitals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KPICard
              title="Patient Load"
              value={activePatients}
              unit="active"
              icon={Users}
              trend={activePatients > 60 ? 'up' : 'stable'}
              trendValue={activePatients > 60 ? '+12%' : '±0%'}
              status={activePatients > 80 ? 'critical' : activePatients > 60 ? 'warning' : 'normal'}
              description="Current ER capacity"
              accentColor="blue"
            />
            <KPICard
              title="Bed Occupancy"
              value={occupancyRate}
              unit="%"
              icon={BedDouble}
              trend={occupancyRate > 85 ? 'up' : 'stable'}
              trendValue={occupancyRate > 85 ? '+8%' : '±2%'}
              status={occupancyRate >= 95 ? 'critical' : occupancyRate >= 85 ? 'warning' : 'normal'}
              description="ER bed utilization"
              accentColor="teal"
            />
            <KPICard
              title="O₂ Reserve"
              value={oxygenHours.toFixed(1)}
              unit="hrs"
              icon={Droplets}
              trend={oxygenHours < 12 ? 'down' : 'stable'}
              trendValue={oxygenHours < 12 ? '-2.5h' : 'Stable'}
              status={oxygenHours <= 8 ? 'critical' : oxygenHours <= 12 ? 'warning' : 'normal'}
              description="Oxygen autonomy"
              accentColor="emerald"
            />
            <KPICard
              title="Staff Ratio"
              value={staffRatio > 0 ? `1:${Math.round(1/staffRatio)}` : '1:--'}
              unit="N:P"
              icon={Stethoscope}
              trend={staffRatio < 0.25 ? 'down' : 'stable'}
              trendValue={staffRatio < 0.25 ? '-15%' : 'Optimal'}
              status={staffRatio <= 0.15 ? 'critical' : staffRatio <= 0.25 ? 'warning' : 'normal'}
              description="Nurse to patient"
              accentColor="amber"
            />
          </div>
        </section>

        {/* Quick Access Cards */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Quick Access</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/patients" className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-5 transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/10">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Patient Grid</h3>
              <p className="text-slate-400 text-sm font-medium">
                <span className="text-white">{patientCount}</span> patients • <span className="text-rose-400">{criticalPatients}</span> critical
              </p>
            </Link>
            
            <Link href="/staff" className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-5 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/10">
                  <Stethoscope className="w-5 h-5 text-emerald-400" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Staff Grid</h3>
              <p className="text-slate-400 text-sm font-medium">
                <span className="text-white">{staffCount}</span> staff • <span className="text-emerald-400">{staffOnDuty}</span> on duty
              </p>
            </Link>
            
            <Link href="/inventory" className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-5 transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/10">
                  <Package className="w-5 h-5 text-amber-400" />
                </div>
                {criticalInventory > 0 && (
                  <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> {criticalInventory}
                  </span>
                )}
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Inventory</h3>
              <p className="text-slate-400 text-sm font-medium">
                <span className="text-white">{inventoryCount}</span> items • <span className={criticalInventory > 0 ? 'text-rose-400' : 'text-emerald-400'}>{criticalInventory}</span> critical
              </p>
            </Link>
          </div>
        </section>

        {/* Analytics Charts */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Analytics</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Surge Predictor Chart */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/10">
                      <TrendingUp className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Surge Predictor</h3>
                      <p className="text-xs text-slate-500">
                        AQI Impact: <span className={cn(
                          "font-medium",
                          aqi > 300 ? 'text-rose-400' : aqi > 200 ? 'text-amber-400' : 'text-emerald-400'
                        )}>{aqi > 300 ? 'High' : aqi > 200 ? 'Moderate' : 'Low'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="text-slate-400">Actual</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                      <span className="text-slate-400">Predicted</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                      <span className="text-slate-400">Baseline</span>
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={surgeData}>
                    <defs>
                      <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} label={{ value: 'Patients', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(51, 65, 85, 0.5)', borderRadius: '12px', color: '#fff', backdropFilter: 'blur(8px)' }}
                      formatter={(value: number, name: string) => [value, name === 'baseline' ? 'Normal Baseline' : name === 'actual' ? 'Actual Patients' : 'AI Prediction']}
                    />
                    <Area type="monotone" dataKey="baseline" stroke="#475569" strokeWidth={1} strokeDasharray="3 3" fill="none" connectNulls />
                    <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fill="url(#actualGradient)" connectNulls={false} />
                    <Area type="monotone" dataKey="predicted" stroke="#14b8a6" strokeWidth={2} strokeDasharray="5 5" fill="url(#predictedGradient)" connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Resource Health Radar */}
            <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/10">
                    <Activity className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Resource Health</h3>
                    <p className="text-xs text-slate-500">System capacity overview</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={resourceData}>
                    <PolarGrid stroke="#334155" strokeOpacity={0.5} />
                    <PolarAngleAxis dataKey="resource" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Radar name="Resources" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Command Center Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Command Center</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentinel Feed */}
            <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/10">
                      <Bell className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Sentinel Feed</h3>
                      <p className="text-xs text-slate-500">Real-time system events</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-medium">Live</span>
                  </div>
                </div>
                <div ref={feedRef} className="h-64 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
                  {feedItems.map((item) => (
                    <div key={item.id} className={cn(
                      "flex items-start gap-3 p-3 rounded-lg text-sm border transition-all hover:translate-x-1",
                      item.type === 'alert' ? 'bg-rose-950/20 border-rose-800/30' :
                      item.type === 'patient' ? 'bg-blue-950/20 border-blue-800/30' :
                      'bg-slate-800/40 border-slate-700/30'
                    )}>
                      <span className="text-slate-500 font-mono text-xs whitespace-nowrap mt-0.5">[{item.time}]</span>
                      <span className={cn(
                        "font-medium",
                        item.type === 'alert' ? 'text-rose-300' : item.type === 'patient' ? 'text-blue-300' : 'text-slate-300'
                      )}>{item.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Neural Link */}
            <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6 flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
              <div className="relative flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/10">
                      <Bot className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Varuna Neural Link</h3>
                      <p className="text-xs text-slate-500">AI Command Interface</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">Connected</span>
                  </div>
                </div>
                
                <div ref={chatRef} className="flex-1 h-48 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-3", msg.type === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.type === 'ai' && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[80%] p-3 rounded-xl text-sm",
                        msg.type === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-sm'
                      )}>{msg.content}</div>
                      {msg.type === 'user' && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isAiTyping && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-slate-800/80 text-slate-400 p-3 rounded-xl rounded-bl-sm text-sm border border-slate-700/50">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                          <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about protocols, surge predictions, resources..."
                    className="flex-1 px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all text-sm"
                    disabled={isAiTyping}
                  />
                  <button
                    type="submit"
                    title="Send message"
                    disabled={isAiTyping || !chatInput.trim()}
                    className={cn(
                      "px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2",
                      isAiTyping || !chatInput.trim() 
                        ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-700/50' 
                        : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-lg shadow-teal-500/20'
                    )}
                  >
                    <Send className="w-4 h-4" />
                    <span className="sr-only">Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
