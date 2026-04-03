import React, { useState, useMemo } from "react";
import { 
  AlertTriangle, 
  Cloud, 
  Heart, 
  Shield, 
  Info,
  MapPin,
  Search,
  Filter,
  CheckCircle,
  Radio,
  X
} from "lucide-react";

// Mock initial data to replace the store
const INITIAL_ALERTS = [
  { id: "AL-882", timestamp: "2026-04-03 10:30", type: "Weather", severity: "Critical", title: "Flash Flood Warning", message: "Heavy rainfall in San Lorenzo. Evacuate immediately.", location: "San Lorenzo River", status: "Active", readRate: "92%" },
  { id: "AL-881", timestamp: "2026-04-02 14:15", type: "Security", severity: "Medium", title: "Crowd Control", message: "High tourist volume at Bagasbas Beach. Expect delays.", location: "Bagasbas Beach", status: "Resolved", readRate: "45%" },
];

export default function CrisisAdminPage() {
  // State Management
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("All");

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "General",
    severity: "Low",
    location: "",
  });

  // Handlers
  const handleCreateAlert = (e) => {
    e.preventDefault();
    const newAlert = {
      ...formData,
      id: `AL-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleString(),
      status: "Active",
      readRate: "0%"
    };
    setAlerts([newAlert, ...alerts]);
    setShowCreateForm(false);
    setFormData({ title: "", message: "", type: "General", severity: "Low", location: "" });
  };

  const updateAlertStatus = (id, newStatus) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: newStatus } : a));
  };

  // Helpers
  const getAlertIcon = (type) => {
    switch (type) {
      case "Weather": return <Cloud size={20} />;
      case "Health": return <Heart size={20} />;
      case "Security": return <Shield size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "Critical": return "border-red-600 bg-red-50 text-red-700 ring-red-600/20";
      case "High": return "border-orange-500 bg-orange-50 text-orange-700 ring-orange-600/20";
      case "Medium": return "border-yellow-500 bg-yellow-50 text-yellow-700 ring-yellow-600/20";
      default: return "border-green-500 bg-green-50 text-green-700 ring-green-600/20";
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            alert.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeverity = filterSeverity === "All" || alert.severity === filterSeverity;
      return matchesSearch && matchesSeverity;
    });
  }, [alerts, searchTerm, filterSeverity]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header / Stats Banner */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Crisis Management Center</h1>
              <p className="text-blue-100 mt-1">Real-time monitoring for CONNECT-DAET.ai ecosystem</p>
            </div>
            <div className="flex items-center gap-2 bg-blue-500/30 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">System Live</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value="12,450" icon={<Info />} />
            <StatCard label="Active Bookings" value="3,892" icon={<CheckCircle />} />
            <StatCard label="Daily Revenue" value="₱245.5k" icon={<span>₱</span>} />
            <StatCard 
              label="Critical Alerts" 
              value={alerts.filter(a => a.severity === 'Critical' && a.status === 'Active').length} 
              icon={<AlertTriangle />} 
              isUrgent 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Radio className="text-red-500 animate-pulse" size={20} />
                Live Alert Feed
              </h2>
            </div>

            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className={`p-5 rounded-xl border-l-4 shadow-sm transition-all hover:shadow-md ${getSeverityStyles(alert.severity)}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">{getAlertIcon(alert.type)}</div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/50 ring-1 ring-inset ring-black/5">
                          {alert.severity} • {alert.type}
                        </span>
                        <h3 className="text-lg font-bold mt-1 text-slate-900">{alert.title}</h3>
                      </div>
                    </div>
                    <span className="text-xs font-medium opacity-60">{alert.timestamp}</span>
                  </div>
                  <p className="mt-3 text-slate-700 leading-relaxed">{alert.message}</p>
                  <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center">
                    <div className="flex items-center gap-1 text-sm font-medium text-slate-600">
                      <MapPin size={16} /> {alert.location}
                    </div>
                    {alert.status === "Active" ? (
                      <button 
                        onClick={() => updateAlertStatus(alert.id, "Resolved")}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                      >
                        Resolve Alert
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 font-bold text-sm">
                        <CheckCircle size={16} /> Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Emergency Controls</h2>
              {!showCreateForm ? (
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-red-200"
                >
                  <AlertTriangle size={20} />
                  New Emergency Broadcast
                </button>
              ) : (
                <form onSubmit={handleCreateAlert} className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-500 uppercase">Compose Alert</span>
                    <button type="button" onClick={() => setShowCreateForm(false)}><X size={20}/></button>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Title</label>
                    <input 
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. Tsunami Alert"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Type</label>
                      <select 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                      >
                        <option>Weather</option>
                        <option>Health</option>
                        <option>Security</option>
                        <option>General</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Severity</label>
                      <select 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                        value={formData.severity}
                        onChange={e => setFormData({...formData, severity: e.target.value})}
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Message</label>
                    <textarea 
                      required
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Enter emergency instructions..."
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                    />
                  </div>

                  <button className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">
                    Broadcast Now
                  </button>
                </form>
              )}
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl text-white">
              <h3 className="font-bold mb-4">Quick Filters</h3>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input 
                    className="w-full bg-slate-800 border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Search location..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="w-full bg-slate-800 border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500"
                  value={filterSeverity}
                  onChange={e => setFilterSeverity(e.target.value)}
                >
                  <option value="All">All Severities</option>
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Log Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold">Historical Audit Log</h2>
            <button className="text-blue-600 font-bold text-sm hover:underline">Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Reach</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAlerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{alert.id}</td>
                    <td className="px-6 py-4 text-sm">{alert.timestamp}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                        alert.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{alert.location}</td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-600">{alert.readRate}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-bold ${alert.status === 'Active' ? 'text-green-600' : 'text-slate-400'}`}>
                        {alert.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for Stats
function StatCard({ label, value, icon, isUrgent = false }) {
  return (
    <div className={`p-5 rounded-xl border backdrop-blur-md transition-transform hover:scale-[1.02] ${
      isUrgent ? 'bg-red-500/20 border-white/40' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-3 mb-3 opacity-80">
        <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}