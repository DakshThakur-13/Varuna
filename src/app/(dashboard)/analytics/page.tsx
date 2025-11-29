'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  AlertTriangle,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CTAS_LEVELS } from '@/types/database';

interface AnalyticsData {
  dailyAdmissions: Array<{ date: string; admissions: number; discharges: number }>;
  triageDistribution: Array<{ name: string; value: number; color: string }>;
  avgWaitTimes: Array<{ hour: string; waitTime: number }>;
  departmentLoad: Array<{ department: string; patients: number; capacity: number }>;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    dailyAdmissions: [],
    triageDistribution: [],
    avgWaitTimes: [],
    departmentLoad: []
  });

  // Stats
  const [totalPatients, setTotalPatients] = useState(0);
  const [avgWaitTime, setAvgWaitTime] = useState(0);
  const [criticalCases, setCriticalCases] = useState(0);
  const [bedOccupancy, setBedOccupancy] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      
      // Generate realistic mock data
      const days = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
      
      // Daily admissions data
      const dailyAdmissions = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        return {
          date: timeRange === '24h' 
            ? `${String(i).padStart(2, '0')}:00`
            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          admissions: Math.floor(Math.random() * 30) + 20,
          discharges: Math.floor(Math.random() * 25) + 15
        };
      });

      // Triage distribution
      const triageDistribution = Object.entries(CTAS_LEVELS).map(([level, info], idx) => ({
        name: `CTAS ${level}`,
        value: Math.floor(Math.random() * 30) + 5,
        color: COLORS[idx]
      }));

      // Average wait times by hour
      const avgWaitTimes = Array.from({ length: 24 }, (_, i) => ({
        hour: `${String(i).padStart(2, '0')}:00`,
        waitTime: Math.floor(Math.random() * 45) + 10
      }));

      // Department load
      const departments = ['Emergency', 'ICU', 'General Ward', 'Pediatrics', 'Surgery'];
      const departmentLoad = departments.map(dept => ({
        department: dept,
        patients: Math.floor(Math.random() * 40) + 10,
        capacity: 50
      }));

      setData({
        dailyAdmissions,
        triageDistribution,
        avgWaitTimes,
        departmentLoad
      });

      // Fetch real stats from Supabase if available
      if (supabase) {
        try {
          const { data: patients } = await supabase.from('patients').select('id, status, triage_level');
          if (patients) {
            setTotalPatients(patients.length);
            setCriticalCases(patients.filter(p => p.status === 'critical' || p.triage_level === 1).length);
          }

          const { data: resources } = await supabase.from('resource_status').select('*').limit(1);
          if (resources && resources.length > 0 && resources[0].beds_total > 0) {
            setBedOccupancy(Math.round((resources[0].beds_occupied / resources[0].beds_total) * 100));
          }
        } catch (error) {
          console.error('Error fetching analytics:', error);
        }
      } else {
        // Mock stats
        setTotalPatients(156);
        setCriticalCases(12);
        setBedOccupancy(78);
      }

      setAvgWaitTime(Math.floor(Math.random() * 20) + 15);
      setIsLoading(false);
    };

    fetchAnalytics();
  }, [timeRange]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-violet-400" />
            Analytics Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Real-time insights and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 rounded-lg p-1">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all",
                  timeRange === range
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
          <button title="Download report" className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <Download className="w-5 h-5" />
            <span className="sr-only">Download</span>
          </button>
          <button 
            title="Refresh data"
            onClick={() => setIsLoading(true)}
            className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
            <span className="sr-only">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              +12%
            </span>
          </div>
          <p className="text-slate-400 text-sm">Total Patients</p>
          <p className="text-3xl font-bold text-white">{totalPatients}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="flex items-center gap-1 text-sm text-red-400">
              <TrendingUp className="w-4 h-4" />
              +5 min
            </span>
          </div>
          <p className="text-slate-400 text-sm">Avg Wait Time</p>
          <p className="text-3xl font-bold text-white">{avgWaitTime} <span className="text-lg text-slate-500">min</span></p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <TrendingDown className="w-4 h-4" />
              -3
            </span>
          </div>
          <p className="text-slate-400 text-sm">Critical Cases</p>
          <p className="text-3xl font-bold text-white">{criticalCases}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Activity className="w-5 h-5 text-violet-400" />
            </div>
            <span className={cn(
              "text-sm",
              bedOccupancy > 85 ? 'text-red-400' : bedOccupancy > 70 ? 'text-amber-400' : 'text-emerald-400'
            )}>
              {bedOccupancy > 85 ? 'High' : bedOccupancy > 70 ? 'Moderate' : 'Normal'}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Bed Occupancy</p>
          <p className="text-3xl font-bold text-white">{bedOccupancy}%</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admissions Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Admissions vs Discharges
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.dailyAdmissions}>
              <defs>
                <linearGradient id="admissionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="dischargesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Legend />
              <Area type="monotone" dataKey="admissions" stroke="#3b82f6" fill="url(#admissionsGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="discharges" stroke="#22c55e" fill="url(#dischargesGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Triage Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-400" />
            Triage Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.triageDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.triageDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wait Times */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Average Wait Time by Hour
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.avgWaitTimes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={10} interval={2} />
              <YAxis stroke="#64748b" fontSize={12} unit=" min" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number) => [`${value} min`, 'Wait Time']}
              />
              <Line 
                type="monotone" 
                dataKey="waitTime" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Department Load */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" />
            Department Load
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.departmentLoad} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis type="category" dataKey="department" stroke="#64748b" fontSize={12} width={80} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="patients" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="capacity" fill="#334155" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
