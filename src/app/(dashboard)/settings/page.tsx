'use client';

import { useState } from 'react';
import {
  Settings,
  Bell,
  Shield,
  Moon,
  Sun,
  Globe,
  Database,
  Key,
  User,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ElementType;
}

const sections: SettingSection[] = [
  { id: 'general', title: 'General', icon: Settings },
  { id: 'notifications', title: 'Notifications', icon: Bell },
  { id: 'security', title: 'Security', icon: Shield },
  { id: 'integrations', title: 'Integrations', icon: Database },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    patientUpdates: true,
    staffChanges: false,
    inventoryAlerts: true,
    systemUpdates: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSaving(false);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-violet-400" />
            Settings
          </h1>
          <p className="text-slate-400 mt-1">Configure your Varuna preferences</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
            isSaving ? 'bg-slate-700 text-slate-400 cursor-not-allowed' :
            saveStatus === 'success' ? 'bg-emerald-600 text-white' :
            'bg-violet-600 text-white hover:bg-violet-700'
          )}
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : saveStatus === 'success' ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-56 flex-shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                  activeSection === section.id
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <section.icon className="w-5 h-5" />
                <span className="font-medium">{section.title}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-6">
          {activeSection === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">General Settings</h2>
              
              {/* Theme */}
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-4">
                  {isDarkMode ? <Moon className="w-5 h-5 text-violet-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
                  <div>
                    <p className="text-white font-medium">Theme</p>
                    <p className="text-sm text-slate-400">Choose your preferred appearance</p>
                  </div>
                </div>
                <button
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={cn(
                    "relative w-14 h-7 rounded-full transition-colors",
                    isDarkMode ? 'bg-violet-600' : 'bg-slate-600'
                  )}
                >
                  <span className={cn(
                    "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform",
                    isDarkMode ? 'translate-x-8' : 'translate-x-1'
                  )} />
                  <span className="sr-only">Toggle theme</span>
                </button>
              </div>

              {/* Language */}
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">Language</p>
                    <p className="text-sm text-slate-400">Select your preferred language</p>
                  </div>
                </div>
                <select title="Select language" aria-label="Language selection" className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-violet-500">
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                  <option value="mr">मराठी</option>
                </select>
              </div>

              {/* Facility Name */}
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-4 mb-3">
                  <User className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-white font-medium">Facility Name</p>
                    <p className="text-sm text-slate-400">Name displayed in reports and alerts</p>
                  </div>
                </div>
                <input
                  type="text"
                  title="Facility name"
                  placeholder="Enter facility name"
                  aria-label="Facility name"
                  defaultValue="Central Delhi Emergency Response Unit"
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Notification Preferences</h2>
              
              {Object.entries(notifications).map(([key, enabled]) => {
                const labels: Record<string, { title: string; desc: string }> = {
                  criticalAlerts: { title: 'Critical Alerts', desc: 'Immediate notifications for CTAS 1-2 patients' },
                  patientUpdates: { title: 'Patient Updates', desc: 'Status changes and triage updates' },
                  staffChanges: { title: 'Staff Changes', desc: 'Shift changes and availability updates' },
                  inventoryAlerts: { title: 'Inventory Alerts', desc: 'Low stock and expiring items' },
                  systemUpdates: { title: 'System Updates', desc: 'Maintenance and feature announcements' }
                };
                
                return (
                  <div key={key} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Bell className={cn("w-5 h-5", enabled ? 'text-violet-400' : 'text-slate-500')} />
                      <div>
                        <p className="text-white font-medium">{labels[key].title}</p>
                        <p className="text-sm text-slate-400">{labels[key].desc}</p>
                      </div>
                    </div>
                    <button
                      title={`Toggle ${labels[key].title}`}
                      onClick={() => setNotifications(prev => ({ ...prev, [key]: !enabled }))}
                      className={cn(
                        "relative w-14 h-7 rounded-full transition-colors",
                        enabled ? 'bg-violet-600' : 'bg-slate-600'
                      )}
                    >
                      <span className={cn(
                        "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform",
                        enabled ? 'translate-x-8' : 'translate-x-1'
                      )} />
                      <span className="sr-only">Toggle {labels[key].title}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Security Settings</h2>
              
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-4 mb-3">
                  <Key className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-white font-medium">API Keys</p>
                    <p className="text-sm text-slate-400">Manage your integration API keys</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-700 px-4 py-2 rounded">
                    <span className="text-slate-300 font-mono text-sm">GEMINI_API_KEY</span>
                    <span className="text-emerald-400 text-sm flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Configured
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-700 px-4 py-2 rounded">
                    <span className="text-slate-300 font-mono text-sm">SUPABASE_URL</span>
                    <span className="text-emerald-400 text-sm flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Configured
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-700 px-4 py-2 rounded">
                    <span className="text-slate-300 font-mono text-sm">HF_TOKEN</span>
                    <span className="text-amber-400 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Optional
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-4 mb-3">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-white font-medium">Session Timeout</p>
                    <p className="text-sm text-slate-400">Automatically log out after inactivity</p>
                  </div>
                </div>
                <select title="Session timeout" aria-label="Session timeout duration" className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-violet-500">
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="0">Never</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Integrations</h2>
              
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Supabase</p>
                      <p className="text-sm text-slate-400">Real-time database & authentication</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                    Connected
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Google Gemini AI</p>
                      <p className="text-sm text-slate-400">Neural Link & predictive analytics</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                    Connected
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">HuggingFace Med42</p>
                      <p className="text-sm text-slate-400">Medical AI triage assistance</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
                    Optional
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
