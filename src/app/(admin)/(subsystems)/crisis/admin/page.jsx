"use client";
import React, { useState, useMemo, useEffect } from "react";
import { AdminHeader } from "@/app/components/AdminHeader";
import { AdminSidebar } from "@/app/components/AdminSidebar";
import { useCrisisStore } from "@/app/store/crisisStore";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { 
  AlertTriangle, Cloud, Heart, Shield, Info, MapPin, Search, CheckCircle, 
  Radio, X, BellRing, FileText, ChevronLeft, ChevronRight,
  Trash2, Edit3, Eye,
  Mail, MessageSquare, Smartphone, Map, Plus 
} from "lucide-react";

// --- Map Integration Imports ---
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

const ChangeMapView = dynamic(() => Promise.resolve(({ center }) => {
  const { useMap: useLeafletMap } = require('react-leaflet');
  const map = useLeafletMap();
  useEffect(() => {
    if (center && map) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
}), { ssr: false });

export default function CrisisAdminPage() {
  const { alerts, addAlert, updateAlert, updateAlertStatus, fetchAlerts, deleteAlert, totalUsers, fetchTotalUsers } = useCrisisStore();
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false); 
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false); 
  const [selectedAlert, setSelectedAlert] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [logSearchTerm, setLogSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    title: "", message: "", type: "General", severity: "Low", location: "",
    channels: { email: true, sms: true, app: true }
  });

  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [modalMapCenter, setModalMapCenter] = useState([14.1122, 122.9553]);
  const DAET_CENTER = [14.1122, 122.9553];

  useEffect(() => { 
    setMounted(true);
    fetchAlerts(); 
    fetchTotalUsers();
    const timer = setTimeout(() => setIsLoadingPage(false), 1200);
      
    if (typeof window !== 'undefined') {
        const L = require('leaflet');
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    }

    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, [fetchAlerts, fetchTotalUsers]);

  const findLocationOnMap = async () => {
    if (!formData.location) return;
    setIsSearchingLocation(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location + ", Daet, Philippines")}`);
      const data = await response.json();
      if (data && data.length > 0) {
        setModalMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (error) {
      console.error("Geocoding failed", error);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  useEffect(() => { 
    if (showToast) { 
      const timer = setTimeout(() => setShowToast(false), 3000); 
      return () => clearTimeout(timer); 
    } 
  }, [showToast]);

  const handleExportCSV = () => {
    const headers = ["Alert ID", "Timestamp", "Title", "Type", "Severity", "Location", "Status"];
    const csvRows = alerts.map(alert => [alert.id, alert.created_at, `"${alert.title.replace(/"/g, '""')}"`, alert.type, alert.severity, `"${alert.location.replace(/"/g, '""')}"`, alert.status]);
    const csvContent = [headers, ...csvRows].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Crisis_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage("CSV Export successful.");
    setShowToast(true);
  };

  const handleSubmitAttempt = (e) => { 
    e.preventDefault(); 
    if (!formData.title || !formData.message || !formData.location) return; 
    setShowConfirmModal(true); 
  };

  const confirmAndBroadcast = async () => {
    setShowConfirmModal(false);
    setIsPublishing(true);
    
    const result = await addAlert(formData);
    
    if (result.success) {
      setToastMessage(`Success: Broadcasted and saved to Database.`);
      setShowToast(true);
      setShowCreateModal(false); 
      setFormData({ title: "", message: "", type: "General", severity: "Low", location: "", channels: { email: true, sms: true, app: true } });
      setCurrentPage(1);
      await fetchAlerts();
    } else {
      setToastMessage(`Error: ${result.error}`);
      setShowToast(true);
    }
    
    setIsPublishing(false);
  };

  const handleViewClick = (alert) => {
    setSelectedAlert(alert);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (alert) => {
    setSelectedAlert(alert);
    setFormData({
      title: alert.title || "",
      message: alert.message || "",
      type: alert.type || "General",
      severity: alert.severity || "Low",
      location: alert.location || "",
      channels: alert.channels || { email: true, sms: true, app: true }
    });
    setIsEditModalOpen(true);
  };

  const onUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;

    const updatedPayload = {
      title: formData.title,
      message: formData.message,
      type: formData.type,
      severity: formData.severity,
      location: formData.location,
      channels: formData.channels
    };

    const result = await updateAlert(selectedAlert.id, updatedPayload);
    
    if (result.success) {
      setToastMessage("Log Entry updated successfully.");
      setShowToast(true);
      setIsEditModalOpen(false);
      setSelectedAlert(null);
      await fetchAlerts();
    } else {
      setToastMessage(`Update Failed: ${result.error}`);
      setShowToast(true);
    }
  };

  const handleResolveClick = (alert) => {
    setSelectedAlert(alert);
    setShowResolveConfirm(true);
  };

  const confirmResolve = async () => {
    const result = await updateAlertStatus(selectedAlert.id, "Resolved");
    setShowResolveConfirm(false);
    
    if (result && result.error) {
      setToastMessage(`Error: ${result.error}`);
    } else {
      setToastMessage("Alert marked as resolved.");
    }
    
    setShowToast(true);
    await fetchAlerts();
  };

  const handleDelete = async (id) => {
     if(confirm("Are you sure? This will remove the record from Database.")) {
       await deleteAlert(id);
       setToastMessage("Alert deleted permanently.");
       setShowToast(true);
     }
   };

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
      case "Critical": return "border-red-600 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 ring-red-600/20";
      case "High": return "border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 ring-orange-600/20";
      case "Medium": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 ring-yellow-600/20";
      default: return "border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 ring-green-600/20";
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (alert.status !== "Active") return false; // Hides the alert once resolved
      const matchesSearch = alert.title?.toLowerCase().includes(searchTerm.toLowerCase()) || alert.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeverity = filterSeverity === "All" || alert.severity === filterSeverity;
      return matchesSearch && matchesSeverity;
    });
  }, [alerts, searchTerm, filterSeverity]);

  const logFilteredAlerts = useMemo(() => {
    return alerts.filter(a => a.id.toLowerCase().includes(logSearchTerm.toLowerCase()) || a.title?.toLowerCase().includes(logSearchTerm.toLowerCase()));
  }, [alerts, logSearchTerm]);

  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return logFilteredAlerts.slice(startIndex, startIndex + itemsPerPage);
  }, [logFilteredAlerts, currentPage, itemsPerPage]);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative font-sans text-foreground text-left">
      
      {/* 1. VIEW MODAL (DETAILED) */}
      {isViewModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-3xl p-8 max-w-lg w-full border border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white leading-none">Alert Summary</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="space-y-5">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-white/5">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Title</p>
                <p className="font-bold text-lg uppercase">{selectedAlert.title}</p>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-white/5">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Severity</p>
                <p className="font-bold text-sm uppercase">{selectedAlert.severity}</p>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-white/5">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Status</p>
                <p className="font-bold text-sm uppercase">{selectedAlert.status}</p>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-white/5">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Message</p>
                <p className="text-sm font-medium leading-relaxed italic">"{selectedAlert.message}"</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-1 mb-1">Broadcast Channels</p>
                <div className="grid grid-cols-3 gap-2">
                  {['email', 'sms', 'app'].map(ch => (
                    <div key={ch} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${selectedAlert.channels?.[ch] ? 'bg-blue-50 border-blue-100 text-blue-600' : 'opacity-20 grayscale'}`}>
                      {ch === 'email' ? <Mail size={16}/> : ch === 'sms' ? <MessageSquare size={16}/> : <Smartphone size={16}/>}
                      <span className="text-[9px] font-black uppercase">{ch}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-2xl text-xs font-bold uppercase">
                <MapPin size={16}/> {selectedAlert.location}
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:opacity-90">Close Detailed View</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT MODAL (DETAILED) */}
      {isEditModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-[40px] p-10 max-w-xl w-full border border-gray-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Edit Broadcast Details</h2>
              <button onClick={() => setIsEditModalOpen(false)}><X size={24}/></button>
            </div>
            <form onSubmit={onUpdateSubmit} className="space-y-4">
              <input required className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Title" />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl font-bold text-xs" value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})}>
                  <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                </select>
                <input required className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl font-bold text-sm" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Location" />
              </div>
              <div className="flex gap-2">
                {['email', 'sms', 'app'].map(ch => (
                  <button key={ch} type="button" onClick={() => setFormData({...formData, channels: {...formData.channels, [ch]: !formData.channels[ch]}})} className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.channels[ch] ? 'bg-blue-600 text-white' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400'}`}>
                    {ch === 'email' ? <Mail size={16}/> : ch === 'sms' ? <MessageSquare size={16}/> : <Smartphone size={16}/>}
                  </button>
                ))}
              </div>
              <textarea required rows={4} className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="Instructions" />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-black uppercase text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-100">Update Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BROADCAST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-background rounded-[40px] p-10 max-w-xl w-full border border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8 leading-none">
                 <h2 className="text-2xl font-black tracking-tight uppercase text-zinc-900 dark:text-white">Emergency Broadcast</h2>
                 <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={24}/></button>
              </div>
              <div className="h-[180px] rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 shadow-inner relative z-0 mb-4">
                {mounted && showCreateModal && (
                   <MapContainer
                     key={`modal-map-${modalMapCenter.toString()}`}
                     center={modalMapCenter}
                     zoom={15}
                     style={{ height: '100%', width: '100%' }}
                     zoomControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                    <Marker position={modalMapCenter}>
                       <Popup><span className="text-xs font-black">Broadcast Target</span></Popup>
                    </Marker>
                    <ChangeMapView center={modalMapCenter} />
                  </MapContainer>
                )}
                <div className="absolute top-2 right-2 z-[1000] bg-white/90 dark:bg-zinc-900/90 px-2 py-1 rounded text-[8px] font-black uppercase shadow-sm border border-zinc-200 dark:border-white/10 text-zinc-500">Live Daet Map</div>
              </div>
              <form onSubmit={handleSubmitAttempt} className="space-y-5 font-sans">
                  <div className="flex gap-2">
                    <input required className="flex-1 p-4 bg-zinc-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Affected Area (e.g. Bagasbas)" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                    <button type="button" onClick={findLocationOnMap} className="p-4 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center">
                        {isSearchingLocation ? <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Search size={20}/>}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['email', 'sms', 'app'].map(ch => (
                      <button key={ch} type="button" onClick={() => setFormData({...formData, channels: {...formData.channels, [ch]: !formData.channels[ch]}})} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${formData.channels[ch] ? 'bg-blue-600 text-white' : 'bg-zinc-50 text-zinc-400 opacity-60'}`}>
                        {ch === 'email' ? <Mail size={16}/> : ch === 'sms' ? <MessageSquare size={16}/> : <Smartphone size={16}/>}
                        <span className="text-[9px] font-black uppercase leading-none">{ch}</span>
                      </button>
                    ))}
                  </div>
                  <input required className="w-full p-4 bg-zinc-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Alert Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <select className="w-full p-4 bg-zinc-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>Weather</option><option>Health</option><option>Security</option><option>General</option></select>
                    <select className="w-full p-4 bg-zinc-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500" value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
                  </div>
                  <textarea required rows={4} className="w-full p-4 bg-zinc-50 border border-gray-100 rounded-xl font-bold leading-relaxed text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Instructions..." value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                  <button type="submit" disabled={isPublishing} className={`w-full py-5 rounded-[24px] font-black transition-all shadow-lg uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-[0.98] ${isPublishing ? "bg-red-400" : "bg-red-600 text-white hover:bg-red-700 shadow-red-100"}`}>
                     {isPublishing ? "Broadcasting..." : (<><AlertTriangle size={20}/> Broadcast Alert Now</>)}
                  </button>
              </form>
           </div>
        </div>
      )}

      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden leading-none">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10 leading-none">
                <div>
                  <h1 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">Crisis Command Center</h1>
                  <p className="text-blue-100 text-sm font-medium leading-none italic">Real-time emergency monitoring for CONNECT-DAET ecosystem</p>
                </div>
                <div className="flex items-center gap-3 leading-none">
                   <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 leading-none border-b-4 border-red-800 active:border-b-0">
                     <Plus size={18} /> New Broadcast
                   </button>
                   <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 leading-none">
                     <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-white leading-none">System Live</span>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 leading-none">
                {!isLoadingPage && (
                  <>
                    <StatCard label="Total Users" value={totalUsers.toLocaleString()} icon={<Info size={18} />} />
                    <StatCard label="Active Alerts" value={alerts.filter(a => a.status === 'Active').length} icon={<Radio size={18} />} />
                    <StatCard label="Daily Reach" value="92%" icon={<CheckCircle size={18} />} />
                    <StatCard label="Critical Alerts" value={alerts.filter(a => a.severity === 'Critical' && a.status === 'Active').length} icon={<AlertTriangle size={18} />} isUrgent />
                  </>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-3 shadow-sm border border-gray-100 dark:border-white/5 leading-none flex flex-col md:flex-row items-center gap-6">
                <div className="flex items-center gap-3 shrink-0">
                   <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-blue-600"><Search size={18}/></div>
                   <h3 className="font-black uppercase text-[11px] tracking-widest text-zinc-500">Live Command Filters</h3>
                </div>
                <div className="flex-1 flex flex-col md:flex-row items-center gap-4 w-full">
                  <div className="relative w-full md:flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-xl py-3 pl-12 pr-4 text-xs focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-white placeholder-zinc-400 font-bold" placeholder="Search by area or alert name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <select className="w-full md:w-48 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-xl py-3 px-4 text-xs focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-white font-bold cursor-pointer" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
                    <option value="All">All Severity</option>
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 leading-none">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                   <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Radio className="text-red-500 animate-pulse" size={20} /> Active Incidents</h2>
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Real-time Data</span>
                </div>
                
                <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                  {!isLoadingPage && filteredAlerts.length > 0 ? (
                    filteredAlerts.map((alert) => (
                      <div key={alert.id} className={`p-6 rounded-2xl border-l-[10px] shadow-sm bg-background border border-gray-200 dark:border-white/10 ${getSeverityStyles(alert.severity)}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 leading-none">{getAlertIcon(alert.type)}</div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 leading-none">{alert.severity} • {alert.type}</span>
                              <h3 className="text-lg font-black mt-1 leading-tight uppercase font-bold">{alert.title}</h3>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold opacity-60 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md leading-none font-sans">{new Date(alert.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="mt-3 text-zinc-700 dark:text-zinc-300 text-sm font-medium leading-relaxed italic">"{alert.message}"</p>
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex justify-between items-center leading-none">
                          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase leading-none"><MapPin size={14} className="text-blue-500" /> {alert.location}</div>
                          <button onClick={() => handleResolveClick(alert)} className="px-4 py-2 bg-foreground text-background rounded-xl text-[10px] font-black uppercase hover:opacity-90 active:scale-95 transition-all leading-none shadow-sm font-sans">Resolve Incident</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center bg-zinc-50 dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-white/5">
                       <Shield size={48} className="mx-auto text-zinc-300 mb-4" />
                       <p className="font-bold text-zinc-400 uppercase tracking-widest text-xs">No Active Alerts</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                   <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Map className="text-blue-600" size={20} /> Situational Map</h2>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden h-[500px] relative z-0">
                  {mounted && !isLoadingPage && (
                    <MapContainer
                      key="modal-map-static"
                      center={modalMapCenter}
                      zoom={15}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                      {alerts.filter(a => a.status === "Active").map((alert, idx) => (
                        <Marker key={alert.id} position={[DAET_CENTER[0] + (idx * 0.005), DAET_CENTER[1] + (idx * 0.005)]}>
                          <Popup><div className="p-1 font-bold text-xs leading-tight font-sans text-black">{alert.title}<br/><span className="text-[10px] font-normal italic">{alert.location}</span></div></Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  )}
                </div>
              </div>
            </div>

            {/* AUDIT LOG SECTION */}
            <div className="bg-background rounded-3xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden leading-none">
              <div className="p-6 border-b border-gray-200 dark:border-white/10 flex flex-col md:flex-row justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 gap-4">
                <div className="flex items-center gap-4">
                   <h2 className="text-lg font-black uppercase leading-none">Crisis Audit Log</h2>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                      <input
                         className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-lg py-1.5 pl-9 pr-3 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500 w-48"
                         placeholder="Filter log history..."
                         value={logSearchTerm}
                        onChange={(e) => setLogSearchTerm(e.target.value)}
                      />
                   </div>
                </div>
                {!isLoadingPage && (
                  <button onClick={handleExportCSV} className="text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase flex items-center gap-2"><FileText size={14} /> Export CSV</button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse leading-none">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-500 dark:text-zinc-400 text-[9px] uppercase tracking-widest font-black">
                      <th className="px-6 py-4 text-left font-sans">Status</th>
                      <th className="px-6 py-4 text-left font-sans">Alert Details</th>
                      <th className="px-6 py-4 text-center font-sans">Channels</th>
                      <th className="px-6 py-4 text-left font-sans">Severity</th>
                      <th className="px-6 py-4 text-right font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10 font-medium">
                    {!isLoadingPage && paginatedAlerts.length > 0 ? paginatedAlerts.map(alert => (
                      <tr key={alert.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors text-xs group font-bold leading-none">
                        <td className="px-6 py-4"><span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${alert.status === 'Active' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : 'bg-green-100 text-green-700 dark:bg-green-900/30'}`}>{alert.status}</span></td>
                        <td className="px-6 py-4"><p className="text-xs font-black uppercase text-zinc-900 dark:text-white truncate max-w-[200px] mb-1">{alert.title}</p><p className="text-[9px] text-zinc-400 font-mono italic">{alert.location}</p></td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2 text-zinc-300">
                             {alert.channels?.email && <Mail size={14} className="text-blue-500" title="Email" />}
                             {alert.channels?.sms && <MessageSquare size={14} className="text-green-500" title="SMS" />}
                             {alert.channels?.app && <Smartphone size={14} className="text-purple-500" title="App Push" />}
                             {!alert.channels && <span className="text-[8px] opacity-20">N/A</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className={`size-2.5 rounded-full ${alert.severity === 'Critical' ? 'bg-red-600' : alert.severity === 'High' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleViewClick(alert)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg transition-all" title="View Details"><Eye size={16}/></button>
                            <button onClick={() => handleEditClick(alert)} className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 rounded-lg transition-all" title="Edit Entry"><Edit3 size={16}/></button>
                            <button onClick={() => handleDelete(alert.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-all" title="Delete Permanent"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="py-10 text-center text-zinc-400 text-xs font-bold uppercase font-sans">No matching audit logs found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* CONFIRMATION MODALS */}
      {showResolveConfirm && selectedAlert && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background rounded-3xl p-8 max-w-sm w-full border border-gray-200 dark:border-white/10 text-center shadow-2xl">
            <CheckCircle className="text-green-600 mx-auto mb-4" size={32} />
            <h3 className="text-xl font-black mb-2 uppercase">Mark as Resolved?</h3>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowResolveConfirm(false)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-2xl font-black text-xs uppercase">No</button>
              <button onClick={confirmResolve} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase">Yes</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-background rounded-3xl p-8 max-w-sm w-full border border-gray-200 dark:border-white/10 text-center shadow-2xl">
            <AlertTriangle className="text-red-600 mx-auto mb-4" size={32} />
            <h3 className="text-xl font-black mb-8 uppercase tracking-tight">Confirm Broadcast?</h3>
            <div className="flex gap-3 font-bold">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-2xl font-black text-xs uppercase">Cancel</button>
              <button onClick={confirmAndBroadcast} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs shadow-lg">Send</button>
            </div>
          </div>
        </div>
      )}
      
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
            <div className="bg-green-500 p-2 rounded-lg"><BellRing size={20}/></div>
            <div className="flex-1 font-bold text-sm uppercase">{toastMessage}</div>
            <button onClick={() => setShowToast(false)}><X size={18}/></button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, isUrgent = false }) {
  return (
    <div className={`p-6 rounded-2xl border transition-all hover:scale-[1.05] group cursor-default leading-none ${isUrgent ? 'bg-red-600/30 border-red-400/50 shadow-xl backdrop-blur-md' : 'bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-md'}`}>
      <div className="flex items-center gap-3 mb-4 opacity-80 group-hover:opacity-100 transition-opacity text-white leading-none font-sans">
        <div className="p-2 bg-white/20 rounded-lg text-white shadow-inner font-sans">{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white font-sans">{label}</span>
      </div>
      <p className="text-3xl font-black tracking-tighter text-white leading-none font-sans">{value}</p>
    </div>
  );
}