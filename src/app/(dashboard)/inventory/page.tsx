'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@/types/database';
import { cn } from '@/lib/utils';
import {
  Package, Search, Filter, RefreshCw, AlertTriangle, Clock, ChevronDown,
  Pill, Wrench, ShieldCheck, Droplets, Box, Database, Wifi, WifiOff, Plus, Calendar
} from 'lucide-react';

// Memoized helper functions
const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    medication: <Pill className="w-4 h-4" />,
    equipment: <Wrench className="w-4 h-4" />,
    supplies: <Box className="w-4 h-4" />,
    ppe: <ShieldCheck className="w-4 h-4" />,
    blood: <Droplets className="w-4 h-4" />,
  };
  return icons[category] || <Package className="w-4 h-4" />;
};

const getStatusBadge = (status: string) => {
  const badges: Record<string, { class: string; label: string }> = {
    adequate: { class: "bg-emerald-900/50 text-emerald-300 border border-emerald-700", label: "Adequate" },
    low: { class: "bg-amber-900/50 text-amber-300 border border-amber-700", label: "Low Stock" },
    critical: { class: "bg-red-900/50 text-red-300 border border-red-700", label: "Critical" },
    'out-of-stock': { class: "bg-slate-800 text-slate-400 border border-slate-700", label: "Out of Stock" },
  };
  return badges[status] || { class: "bg-slate-800 text-slate-400 border border-slate-700", label: status };
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    medication: 'text-blue-400 bg-blue-500/20',
    equipment: 'text-violet-400 bg-violet-500/20',
    supplies: 'text-cyan-400 bg-cyan-500/20',
    ppe: 'text-emerald-400 bg-emerald-500/20',
    blood: 'text-red-400 bg-red-500/20',
  };
  return colors[category] || 'text-slate-400 bg-slate-500/20';
};

const getStockBarColor = (status: string) => {
  const colors: Record<string, string> = {
    adequate: 'bg-emerald-500',
    low: 'bg-amber-500',
    critical: 'bg-red-500',
    'out-of-stock': 'bg-slate-600',
  };
  return colors[status] || 'bg-slate-500';
};

// Helper for consistent time formatting
const formatTimeStr = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
};

export default function InventoryPage() {
  const [mounted, setMounted] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchInventory = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('status', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      setInventory(data || []);
      setIsConnected(true);
      if (mounted) setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    if (!supabase) return;
    const channel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, fetchInventory)
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [fetchInventory]);

  // Memoized computed values
  const filteredInventory = useMemo(() => 
    inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.item_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    }), [inventory, searchQuery, categoryFilter, statusFilter]);

  const statusCounts = useMemo(() => ({
    all: inventory.length,
    adequate: inventory.filter(i => i.status === 'adequate').length,
    low: inventory.filter(i => i.status === 'low').length,
    critical: inventory.filter(i => i.status === 'critical').length,
    'out-of-stock': inventory.filter(i => i.status === 'out-of-stock').length,
  }), [inventory]);

  const categoryCounts = useMemo(() => ({
    medication: inventory.filter(i => i.category === 'medication').length,
    equipment: inventory.filter(i => i.category === 'equipment').length,
    supplies: inventory.filter(i => i.category === 'supplies').length,
    ppe: inventory.filter(i => i.category === 'ppe').length,
    blood: inventory.filter(i => i.category === 'blood').length,
  }), [inventory]);

  const getStockPercentage = (current: number, max: number) => 
    max > 0 ? Math.round((current / max) * 100) : 0;

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    return days <= 30 && days >= 0;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="w-7 h-7 text-cyan-400" />
            Inventory Management
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
            onClick={fetchInventory}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600 rounded-lg text-white hover:bg-cyan-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Stats Cards - Status */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-slate-400 text-sm">Total Items</p>
          <p className="text-3xl font-bold mt-1 text-white">{statusCounts.all}</p>
        </div>
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4">
          <p className="text-slate-400 text-sm">Adequate</p>
          <p className="text-3xl font-bold mt-1 text-emerald-400">{statusCounts.adequate}</p>
        </div>
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-4">
          <p className="text-slate-400 text-sm">Low Stock</p>
          <p className="text-3xl font-bold mt-1 text-amber-400">{statusCounts.low}</p>
        </div>
        <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4">
          <p className="text-slate-400 text-sm flex items-center gap-1">
            Critical
            {statusCounts.critical > 0 && <AlertTriangle className="w-3 h-3" />}
          </p>
          <p className="text-3xl font-bold mt-1 text-red-400">{statusCounts.critical}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-slate-400 text-sm">Out of Stock</p>
          <p className="text-3xl font-bold mt-1 text-slate-500">{statusCounts['out-of-stock']}</p>
        </div>
      </div>

      {/* Stats Cards - Categories */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-4">
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Pill className="w-4 h-4 text-blue-400" /> Medications
          </p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{categoryCounts.medication}</p>
        </div>
        <div className="rounded-xl border border-violet-800/50 bg-violet-950/30 p-4">
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Wrench className="w-4 h-4 text-violet-400" /> Equipment
          </p>
          <p className="text-2xl font-bold mt-1 text-violet-400">{categoryCounts.equipment}</p>
        </div>
        <div className="rounded-xl border border-cyan-800/50 bg-cyan-950/30 p-4">
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Box className="w-4 h-4 text-cyan-400" /> Supplies
          </p>
          <p className="text-2xl font-bold mt-1 text-cyan-400">{categoryCounts.supplies}</p>
        </div>
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4">
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> PPE
          </p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{categoryCounts.ppe}</p>
        </div>
        <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4">
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Droplets className="w-4 h-4 text-red-400" /> Blood Products
          </p>
          <p className="text-2xl font-bold mt-1 text-red-400">{categoryCounts.blood}</p>
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
              placeholder="Search by name or item code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          
          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none cursor-pointer focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Categories</option>
              <option value="medication">Medications</option>
              <option value="equipment">Equipment</option>
              <option value="supplies">Supplies</option>
              <option value="ppe">PPE</option>
              <option value="blood">Blood Products</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none cursor-pointer focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Status</option>
              <option value="adequate">Adequate</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-slate-400 mt-4">Loading inventory from Supabase...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Database className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No inventory items found</p>
            <p className="text-slate-500 text-sm mt-2">Add inventory items or check your Supabase connection</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700 bg-slate-800/50">
                  <th className="px-4 py-4 font-medium">Item Code</th>
                  <th className="px-4 py-4 font-medium">Name</th>
                  <th className="px-4 py-4 font-medium">Category</th>
                  <th className="px-4 py-4 font-medium">Stock Level</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Location</th>
                  <th className="px-4 py-4 font-medium">Expiry</th>
                  <th className="px-4 py-4 font-medium">Last Restocked</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      No inventory items found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const statusBadge = getStatusBadge(item.status);
                    const stockPercent = getStockPercentage(item.current_stock, item.max_stock);
                    const expiringSoon = isExpiringSoon(item.expiry_date);
                    
                    return (
                      <tr key={item.id} className={cn(
                        "border-b border-slate-800 hover:bg-slate-800/50 transition-colors",
                        item.status === 'critical' && "bg-red-950/20",
                        item.status === 'out-of-stock' && "bg-slate-900/50"
                      )}>
                        <td className="px-4 py-4 font-mono text-slate-400 text-xs">{item.item_code}</td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">{item.name}</div>
                          {item.supplier && (
                            <div className="text-xs text-slate-500">by {item.supplier}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium",
                            getCategoryColor(item.category)
                          )}>
                            {getCategoryIcon(item.category)}
                            <span className="capitalize">{item.category}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300">
                                {item.current_stock} / {item.max_stock} {item.unit}
                              </span>
                              <span className={cn(
                                "font-medium",
                                stockPercent > 50 ? 'text-emerald-400' : 
                                stockPercent > 20 ? 'text-amber-400' : 'text-red-400'
                              )}>
                                {stockPercent}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div 
                                className={cn("h-2 rounded-full transition-all", getStockBarColor(item.status))}
                                style={{ width: `${stockPercent}%` }}
                              />
                            </div>
                            {item.current_stock <= item.min_stock && (
                              <p className="text-xs text-red-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Below minimum ({item.min_stock})
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn("px-2.5 py-1 rounded text-xs font-medium", statusBadge.class)}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-300 text-xs">
                          {item.location || '-'}
                        </td>
                        <td className="px-4 py-4">
                          {item.expiry_date ? (
                            <span className={cn(
                              "flex items-center gap-1 text-xs",
                              expiringSoon ? 'text-amber-400' : 'text-slate-400'
                            )}>
                              {expiringSoon && <AlertTriangle className="w-3 h-3" />}
                              <Calendar className="w-3 h-3" />
                              {new Date(item.expiry_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-400 text-xs">
                          {item.last_restocked 
                            ? new Date(item.last_restocked).toLocaleDateString()
                            : '-'
                          }
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
        <span>Showing {filteredInventory.length} of {inventory.length} items</span>
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Last updated: {mounted && lastUpdated ? formatTimeStr(lastUpdated) : '--:--:--'}
        </span>
      </div>
    </div>
  );
}
