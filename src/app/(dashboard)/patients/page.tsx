'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/types/database';
import { cn } from '@/lib/utils';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Heart,
  Droplets,
  Thermometer,
  Timer,
  AlertCircle,
  Clock,
  Plus,
  MoreVertical,
  ChevronDown,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import Link from 'next/link';

// Extended patient type for grid display
interface PatientGridItem extends Patient {
  waitTime?: number;
}

// Helper for consistent time formatting
const formatTimeStr = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
};

export default function PatientsPage() {
  const [mounted, setMounted] = useState(false);
  const [patients, setPatients] = useState<PatientGridItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ctasFilter, setCtasFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Fetch patients from Supabase
  const fetchPatients = async () => {
    if (!supabase) {
      console.warn('Supabase not configured');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add calculated wait time
      const patientsWithWait = (data || []).map(patient => ({
        ...patient,
        waitTime: patient.status === 'waiting' 
          ? Math.floor((Date.now() - new Date(patient.created_at).getTime()) / 60000)
          : undefined
      }));

      setPatients(patientsWithWait);
      setIsConnected(true);
      if (mounted) setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching patients:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();

    // Set up real-time subscription
    if (!supabase) return;

    const channel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => {
          fetchPatients();
        }
      )
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, []);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.chief_complaint.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    const matchesCtas = ctasFilter === 'all' || patient.triage_level?.toString() === ctasFilter;
    return matchesSearch && matchesStatus && matchesCtas;
  });

  const statusCounts = {
    all: patients.length,
    waiting: patients.filter(p => p.status === 'waiting').length,
    triaged: patients.filter(p => p.status === 'triaged').length,
    admitted: patients.filter(p => p.status === 'admitted').length,
    discharged: patients.filter(p => p.status === 'discharged').length,
  };

  const getCtasColor = (level: number | undefined) => {
    switch (level) {
      case 1: return "bg-red-600 text-white";
      case 2: return "bg-orange-500 text-white";
      case 3: return "bg-yellow-500 text-black";
      case 4: return "bg-green-600 text-white";
      case 5: return "bg-blue-600 text-white";
      default: return "bg-slate-600 text-white";
    }
  };

  const getStatusBadge = (status: string, triageLevel?: number) => {
    const isCritical = triageLevel === 1 || triageLevel === 2;
    if (isCritical && status === 'triaged') {
      return { class: "bg-red-900/50 text-red-300 border border-red-700", label: "Critical" };
    }
    switch (status) {
      case 'waiting': return { class: "bg-amber-900/50 text-amber-300 border border-amber-700", label: "Waiting" };
      case 'triaged': return { class: "bg-blue-900/50 text-blue-300 border border-blue-700", label: "Triaged" };
      case 'admitted': return { class: "bg-violet-900/50 text-violet-300 border border-violet-700", label: "Admitted" };
      case 'discharged': return { class: "bg-green-900/50 text-green-300 border border-green-700", label: "Discharged" };
      default: return { class: "bg-slate-800 text-slate-400 border border-slate-700", label: status };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-400" />
            Patient Management
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span>Connected to Supabase • Real-time updates enabled</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-400" />
                <span>Disconnected • Check Supabase configuration</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchPatients}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </button>
          <Link 
            href="/intake"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Patient
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Patients', value: statusCounts.all, color: 'text-white', bg: 'bg-slate-800' },
          { label: 'Waiting', value: statusCounts.waiting, color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-800/50' },
          { label: 'Triaged', value: statusCounts.triaged, color: 'text-blue-400', bg: 'bg-blue-950/30 border-blue-800/50' },
          { label: 'Admitted', value: statusCounts.admitted, color: 'text-violet-400', bg: 'bg-violet-950/30 border-violet-800/50' },
          { label: 'Discharged', value: statusCounts.discharged, color: 'text-green-400', bg: 'bg-green-950/30 border-green-800/50' },
        ].map((stat) => (
          <div key={stat.label} className={cn("rounded-xl border border-slate-700 p-4", stat.bg)}>
            <p className="text-slate-400 text-sm">{stat.label}</p>
            <p className={cn("text-3xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, MRN, or complaint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="waiting">Waiting</option>
              <option value="triaged">Triaged</option>
              <option value="admitted">Admitted</option>
              <option value="discharged">Discharged</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>

          {/* CTAS Filter */}
          <div className="relative">
            <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={ctasFilter}
              onChange={(e) => setCtasFilter(e.target.value)}
              aria-label="Filter by CTAS level"
              className="pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All CTAS</option>
              <option value="1">CTAS 1 - Resuscitation</option>
              <option value="2">CTAS 2 - Emergent</option>
              <option value="3">CTAS 3 - Urgent</option>
              <option value="4">CTAS 4 - Less Urgent</option>
              <option value="5">CTAS 5 - Non-Urgent</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Patient Grid */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-slate-400 mt-4">Loading patients from Supabase...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Database className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No patients found</p>
            <p className="text-slate-500 text-sm mt-2">Add patients via the Intake form or check your Supabase connection</p>
            <Link 
              href="/intake"
              className="mt-4 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-colors"
            >
              Add First Patient
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700 bg-slate-800/50">
                  <th className="px-4 py-4 font-medium">MRN</th>
                  <th className="px-4 py-4 font-medium">Patient</th>
                  <th className="px-4 py-4 font-medium">CTAS</th>
                  <th className="px-4 py-4 font-medium">Chief Complaint</th>
                  <th className="px-4 py-4 font-medium">Bed</th>
                  <th className="px-4 py-4 font-medium">Vitals</th>
                  <th className="px-4 py-4 font-medium">Wait</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      No patients found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const statusBadge = getStatusBadge(patient.status, patient.triage_level);
                    return (
                      <tr key={patient.id} className={cn(
                        "border-b border-slate-800 hover:bg-slate-800/50 transition-colors",
                        patient.triage_level === 1 && "bg-red-950/20",
                        patient.triage_level === 2 && "bg-orange-950/20"
                      )}>
                        <td className="px-4 py-4 font-mono text-slate-400 text-xs">{patient.mrn}</td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">{patient.full_name}</div>
                          <div className="text-xs text-slate-500">
                            {patient.age}y {patient.gender} | {mounted ? formatTimeStr(new Date(patient.created_at)) : '--:--:--'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {patient.triage_level ? (
                            <span className={cn("px-2.5 py-1 rounded text-xs font-bold", getCtasColor(patient.triage_level))}>
                              CTAS {patient.triage_level}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-4 max-w-48">
                          <span className="text-slate-300 truncate block" title={patient.chief_complaint}>
                            {patient.chief_complaint}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "font-mono text-sm",
                            patient.assigned_bed ? 'text-violet-400' : 'text-slate-500'
                          )}>
                            {patient.assigned_bed || 'Waiting'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <Heart className="w-3 h-3 text-red-400" />
                              <span className={patient.heart_rate > 100 ? 'text-red-400' : 'text-slate-300'}>
                                {patient.heart_rate} bpm
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Droplets className="w-3 h-3 text-blue-400" />
                              <span className={patient.spo2 < 94 ? 'text-red-400' : 'text-slate-300'}>
                                {patient.spo2}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Thermometer className="w-3 h-3 text-amber-400" />
                              <span className={patient.temperature > 38 ? 'text-red-400' : 'text-slate-300'}>
                                {patient.temperature}°{patient.temperature_unit}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {patient.status === 'waiting' && patient.waitTime !== undefined ? (
                            <span className={cn(
                              "flex items-center gap-1",
                              patient.waitTime > 60 ? 'text-red-400' : patient.waitTime > 30 ? 'text-amber-400' : 'text-slate-400'
                            )}>
                              <Timer className="w-3 h-3" />
                              {patient.waitTime}m
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn("px-2.5 py-1 rounded text-xs font-medium inline-block", statusBadge.class)}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="More actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
        <span>Showing {filteredPatients.length} of {patients.length} patients</span>
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Last updated: {mounted && lastUpdated ? formatTimeStr(lastUpdated) : '--:--:--'}
        </span>
      </div>
    </div>
  );
}
