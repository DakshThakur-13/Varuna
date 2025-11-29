'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Package,
  ClipboardPlus,
  Activity,
  Settings,
  Bell,
  ChevronDown,
  Menu,
  X,
  Bot,
  Heart,
  Zap
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
  description?: string;
}

const mainNavItems: NavItem[] = [
  { name: 'Command Center', href: '/dashboard', icon: LayoutDashboard, description: 'Real-time overview' },
  { name: 'AI Operations', href: '/agent', icon: Bot, badgeColor: 'bg-cyan-500', description: 'Intelligent agent' },
  { name: 'Patient Intake', href: '/intake', icon: ClipboardPlus, description: 'Triage & admission' },
  { name: 'Patient Registry', href: '/patients', icon: Users, badge: 12, description: 'Active cases' },
  { name: 'Staff Management', href: '/staff', icon: Stethoscope, badge: 8, description: 'Personnel status' },
  { name: 'Resource Inventory', href: '/inventory', icon: Package, badge: 3, badgeColor: 'bg-red-500', description: 'Supplies & equipment' },
];

const secondaryNavItems: NavItem[] = [
  { name: 'Analytics', href: '/analytics', icon: Activity },
  { name: 'System Config', href: '/settings', icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications] = useState(5);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300",
        isExpanded ? "lg:w-72" : "lg:w-20",
        "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/50"
      )}>
        {/* Logo & Brand */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 via-cyan-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            {isExpanded && (
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Varuna</h1>
                <p className="text-[10px] text-cyan-400/80 font-medium uppercase tracking-wider">Healthcare AI</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded ? "rotate-90" : "-rotate-90")} />
          </button>
        </div>

        {/* System Status Bar */}
        {isExpanded && (
          <div className="mx-4 mt-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">System Status</span>
              </div>
              <span className="live-indicator text-[10px]">OPERATIONAL</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-slate-500 text-xs">Local Time</span>
              <span className="font-mono text-sm text-white font-medium">{currentTime}</span>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className={cn(
            "mb-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest",
            isExpanded ? "px-3" : "text-center"
          )}>
            {isExpanded ? "Operations" : "•••"}
          </p>
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",
                  isActive
                    ? "bg-gradient-to-r from-cyan-600/20 to-teal-600/10 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent"
                )}
                title={!isExpanded ? item.name : undefined}
              >
                <div className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                  isActive ? "bg-cyan-500/20" : "bg-slate-800/50 group-hover:bg-slate-700/50"
                )}>
                  <item.icon className={cn("w-5 h-5", isActive ? "text-cyan-400" : "")} />
                </div>
                {isExpanded && (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{item.name}</span>
                      {item.description && (
                        <span className="text-[10px] text-slate-500 block truncate">{item.description}</span>
                      )}
                    </div>
                    {item.badge !== undefined && (
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-md",
                        item.badgeColor || "bg-slate-700 text-slate-300"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full" />
                )}
              </Link>
            );
          })}

          <div className="pt-6">
            <p className={cn(
              "mb-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest",
              isExpanded ? "px-3" : "text-center"
            )}>
              {isExpanded ? "System" : "•••"}
            </p>
            {secondaryNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-gradient-to-r from-cyan-600/20 to-teal-600/10 text-cyan-400 border border-cyan-500/30"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent"
                  )}
                  title={!isExpanded ? item.name : undefined}
                >
                  <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                    isActive ? "bg-cyan-500/20" : "bg-slate-800/50 group-hover:bg-slate-700/50"
                  )}>
                    <item.icon className={cn("w-5 h-5", isActive ? "text-cyan-400" : "")} />
                  </div>
                  {isExpanded && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800/50">
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer",
            !isExpanded && "justify-center"
          )}>
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">AD</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
            </div>
            {isExpanded && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">Admin User</p>
                  <p className="text-xs text-slate-500 truncate">Central Delhi ERU</p>
                </div>
                <button className="text-slate-400 hover:text-white p-1" title="User menu">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-white">Varuna</span>
                <span className="text-cyan-400 text-[10px] ml-1 font-medium">AI</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400">{currentTime}</span>
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Notifications">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="px-4 py-4 space-y-1 bg-slate-900/95 border-t border-slate-800/50 backdrop-blur-md">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-gradient-to-r from-cyan-600/20 to-teal-600/10 text-cyan-400 border border-cyan-500/30"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge !== undefined && (
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-md",
                      item.badgeColor || "bg-slate-700 text-slate-300"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="pt-4 border-t border-slate-800/50 mt-4 space-y-1">
              {secondaryNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-gradient-to-r from-cyan-600/20 to-teal-600/10 text-cyan-400"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Mobile spacer */}
      <div className="lg:hidden h-14" />
    </>
  );
}
