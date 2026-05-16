import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { clsx } from 'clsx';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [userData, summaryData] = await Promise.all([
          api.get('/users/me'),
          api.get('/admin/summary')
        ]);
        setUser(userData);
        setSummary(summaryData);
      } catch (err) {
        setError('Failed to load profile data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm animate-pulse">Loading admin profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-md">
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-white font-bold text-lg mb-2">Error</h2>
          <p className="text-red-400 text-sm mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Routes', value: summary?.routesCount, icon: '🗺️', color: 'blue' },
    { label: 'Apartments', value: summary?.apartmentsCount, icon: '🏠', color: 'green' },
    { label: 'Offices', value: summary?.officesCount, icon: '🏢', color: 'purple' },
    { label: 'Surveys', value: summary?.surveysCount, icon: '📊', color: 'amber' },
    { label: 'Pending Pings', value: summary?.pendingLocationsCount, icon: '📍', color: 'red' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Profile Section */}
      <div className="relative overflow-hidden bg-surface-1 border border-surface-border rounded-3xl p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <img 
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name}&background=1a1a24&color=22c55e`} 
              alt={user?.name}
              className="relative w-32 h-32 rounded-full border-4 border-surface-1 object-cover"
            />
            <div className="absolute bottom-1 right-1 w-6 h-6 bg-brand-500 border-4 border-surface-1 rounded-full shadow-lg" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">{user?.name}</h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20 uppercase tracking-wider">
                {user?.role}
              </span>
            </div>
            <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2">
              <span className="text-lg opacity-60">✉️</span>
              {user?.email}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-6 text-sm text-slate-500 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Session
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">🕒</span>
                Joined {user?.createdAt ? new Date(user?.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-[200px]">
            <button 
              onClick={() => { localStorage.removeItem('tt_admin_token'); window.location.href = '/login'; }}
              className="w-full px-6 py-3 bg-red-500/10 text-red-500 rounded-2xl text-sm font-semibold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="group bg-surface-1 border border-surface-border p-5 rounded-3xl hover:border-brand-500/30 transition-all duration-300">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
              <div className="text-2xl font-bold text-white tracking-tight">{stat.value?.toLocaleString() || '0'}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Account Details & Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-1 border border-surface-border rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-2/50">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="opacity-60">👤</span> Account Details
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
              <span className="text-slate-400 text-sm">Internal User ID</span>
              <span className="text-white text-sm font-mono bg-surface-2 px-2 py-0.5 rounded">{user?.id}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
              <span className="text-slate-400 text-sm">Phone Number</span>
              <span className="text-white text-sm">{user?.phone || 'Not linked'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
              <span className="text-slate-400 text-sm">WhatsApp Opt-in</span>
              <span className={clsx("text-sm font-bold", user?.whatsappOpt ? "text-brand-500" : "text-red-400")}>
                {user?.whatsappOpt ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400 text-sm">Access Level</span>
              <span className="text-white text-sm font-semibold">Full Administrator</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-1 border border-surface-border rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-2/50">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="opacity-60">⚙️</span> Preferences
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Dark Mode</p>
                <p className="text-slate-500 text-xs">System preference default</p>
              </div>
              <div className="w-10 h-5 bg-brand-500 rounded-full relative flex items-center px-1">
                 <div className="w-3.5 h-3.5 bg-white rounded-full ml-auto" />
              </div>
            </div>
            <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
              <div>
                <p className="text-white text-sm font-medium">Email Alerts</p>
                <p className="text-slate-500 text-xs">Daily summary reports</p>
              </div>
              <div className="w-10 h-5 bg-slate-700 rounded-full relative flex items-center px-1">
                 <div className="w-3.5 h-3.5 bg-slate-400 rounded-full" />
              </div>
            </div>
            <div className="pt-4">
              <button className="text-xs text-brand-500 font-bold hover:underline" onClick={() => alert('Feature coming soon!')}>
                View System Audit Logs →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-8">
        <p className="text-slate-600 text-xs tracking-widest uppercase">
          Tellapur Transit Admin Console · v1.0.4-stable
        </p>
      </div>
    </div>
  );
}