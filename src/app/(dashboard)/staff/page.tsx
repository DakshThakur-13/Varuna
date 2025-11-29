'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff } from '@/types/database';
import { cn } from '@/lib/utils';
import {
  Stethoscope,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Users,
  ChevronDown,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Coffee,
  PhoneCall,
  Database,
  Wifi,
  WifiOff,
  Plus
} from 'lucide-react';

// Helper for consistent time formatting
const formatTimeStr = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
};

export default function StaffPage() {
  const [mounted, setMounted] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Fetch staff from Supabase
  const fetchStaff = async () => {
    if (!supabase) {
      console.warn('Supabase not configured');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('status', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;

      setStaff(data || []);
      setIsConnected(true);
      if (mounted) setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching staff:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();

    // Set up real-time subscription
    if (!supabase) return;

    const channel = supabase
      .channel('staff-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        () => {
          fetchStaff();
        }
      )
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, []);

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const statusCounts = {
    all: staff.length,
    'on-duty': staff.filter(s => s.status === 'on-duty').length,
    'off-duty': staff.filter(s => s.status === 'off-duty').length,
    'on-break': staff.filter(s => s.status === 'on-break').length,
    'on-call': staff.filter(s => s.status === 'on-call').length,
  };

  const roleCounts = {
    doctor: staff.filter(s => s.role === 'doctor').length,
    nurse: staff.filter(s => s.role === 'nurse').length,
    technician: staff.filter(s => s.role === 'technician').length,
    specialist: staff.filter(s => s.role === 'specialist').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-duty': return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'off-duty': return <UserX className="w-4 h-4 text-slate-500" />;
      case 'on-break': return <Coffee className="w-4 h-4 text-amber-400" />;
      case 'on-call': return <PhoneCall className="w-4 h-4 text-blue-400" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on-duty': return { class: "bg-emerald-900/50 text-emerald-300 border border-emerald-700", label: "On Duty" };
      case 'off-duty': return { class: "bg-slate-800 text-slate-400 border border-slate-700", label: "Off Duty" };
      case 'on-break': return { class: "bg-amber-900/50 text-amber-300 border border-amber-700", label: "On Break" };
      case 'on-call': return { class: "bg-blue-900/50 text-blue-300 border border-blue-700", label: "On Call" };
      default: return { class: "bg-slate-800 text-slate-400 border border-slate-700", label: status };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'doctor': return { class: "bg-violet-900/50 text-violet-300", label: "Doctor" };
      case 'nurse': return { class: "bg-blue-900/50 text-blue-300", label: "Nurse" };
      case 'technician': return { class: "bg-cyan-900/50 text-cyan-300", label: "Technician" };
      case 'specialist': return { class: "bg-purple-900/50 text-purple-300", label: "Specialist" };
      case 'admin': return { class: "bg-slate-800 text-slate-300", label: "Admin" };
      default: return { class: "bg-slate-800 text-slate-300", label: role };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Stethoscope className="w-7 h-7 text-violet-400" />
            Staff Management
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
            onClick={fetchStaff}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 rounded-lg text-white hover:bg-violet-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        {/* Status counts */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-slate-400 text-sm">Total Staff</p>
          <p className="text-3xl font-bold mt-1 text-white">{statusCounts.all}</p>
        </div>
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4">
          <p className="text-slate-400 text-sm">On Duty</p>
          <p className="text-3xl font-bold mt-1 text-emerald-400">{statusCounts['on-duty']}</p>
        </div>
        <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-4">
          <p className="text-slate-400 text-sm">On Call</p>
          <p className="text-3xl font-bold mt-1 text-blue-400">{statusCounts['on-call']}</p>
        </div>
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-4">
          <p className="text-slate-400 text-sm">On Break</p>
          <p className="text-3xl font-bold mt-1 text-amber-400">{statusCounts['on-break']}</p>
        </div>
        {/* Role counts */}
        <div className="rounded-xl border border-violet-800/50 bg-violet-950/30 p-4">
          <p className="text-slate-400 text-sm">Doctors</p>
          <p className="text-3xl font-bold mt-1 text-violet-400">{roleCounts.doctor}</p>
        </div>
        <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-4">
          <p className="text-slate-400 text-sm">Nurses</p>
          <p className="text-3xl font-bold mt-1 text-blue-400">{roleCounts.nurse}</p>
        </div>
        <div className="rounded-xl border border-cyan-800/50 bg-cyan-950/30 p-4">
          <p className="text-slate-400 text-sm">Technicians</p>
          <p className="text-3xl font-bold mt-1 text-cyan-400">{roleCounts.technician}</p>
        </div>
        <div className="rounded-xl border border-purple-800/50 bg-purple-950/30 p-4">
          <p className="text-slate-400 text-sm">Specialists</p>
          <p className="text-3xl font-bold mt-1 text-purple-400">{roleCounts.specialist}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, ID, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
          
          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
              className="pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none cursor-pointer focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Roles</option>
              <option value="doctor">Doctors</option>
              <option value="nurse">Nurses</option>
              <option value="technician">Technicians</option>
              <option value="specialist">Specialists</option>
              <option value="admin">Admin</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none cursor-pointer focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Status</option>
              <option value="on-duty">On Duty</option>
              <option value="off-duty">Off Duty</option>
              <option value="on-break">On Break</option>
              <option value="on-call">On Call</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-slate-400 mt-4">Loading staff from Supabase...</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Database className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No staff found</p>
            <p className="text-slate-500 text-sm mt-2">Add staff records or check your Supabase connection</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredStaff.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">
                No staff found matching your criteria
              </div>
            ) : (
              filteredStaff.map((member) => {
                const statusBadge = getStatusBadge(member.status);
                const roleBadge = getRoleBadge(member.role);
                return (
                  <div 
                    key={member.id} 
                    className={cn(
                      "rounded-xl border p-5 transition-all hover:border-slate-600",
                      member.status === 'on-duty' ? 'border-emerald-800/50 bg-slate-800/50' : 'border-slate-700 bg-slate-800/30'
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
                          member.status === 'on-duty' ? 'bg-emerald-600' : 'bg-slate-700'
                        )}>
                          {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{member.full_name}</h3>
                          <p className="text-xs text-slate-400">{member.employee_id}</p>
                        </div>
                      </div>
                      {getStatusIcon(member.status)}
                    </div>

                    <div className="flex gap-2 mb-4">
                      <span className={cn("px-2 py-1 rounded text-xs font-medium", roleBadge.class)}>
                        {roleBadge.label}
                      </span>
                      <span className={cn("px-2 py-1 rounded text-xs font-medium", statusBadge.class)}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Department</span>
                        <span className="text-slate-200">{member.department}</span>
                      </div>
                      {member.specialization && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Specialization</span>
                          <span className="text-slate-200">{member.specialization}</span>
                        </div>
                      )}
                      {member.shift && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Shift</span>
                          <span className="text-slate-200 capitalize">{member.shift}</span>
                        </div>
                      )}
                      {member.current_assignment && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Assignment</span>
                          <span className="text-violet-400 text-xs">{member.current_assignment}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Patients</span>
                        <span className={cn(
                          "font-medium",
                          member.patients_assigned > 5 ? 'text-amber-400' : 'text-slate-200'
                        )}>
                          {member.patients_assigned}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Hours Today</span>
                        <span className="text-slate-200">{member.hours_worked}h</span>
                      </div>
                    </div>

                    {/* Contact buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
                      {member.phone && (
                        <a 
                          href={`tel:${member.phone}`}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </a>
                      )}
                      {member.email && (
                        <a 
                          href={`mailto:${member.email}`}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          Email
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
        <span>Showing {filteredStaff.length} of {staff.length} staff members</span>
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Last updated: {mounted && lastUpdated ? formatTimeStr(lastUpdated) : '--:--:--'}
        </span>
      </div>
    </div>
  );
}
