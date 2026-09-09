"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useCrisisStore } from "@/app/store/crisisStore";
import { useDangerousLocationStore } from "@/app/store/dangerousLocationStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { notifyTouristsOfCrisisAlert } from "@/lib/notificationService";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { Card } from "@/app/components/ui/Card";
import { StatCardSkeleton, AlertCardSkeletonList, MapSkeleton, TableSkeleton } from "@/app/components/ui/Skeletons";
import { ErrorState } from "@/app/components/ui/AsyncState";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { 
  AlertTriangle, Cloud, Heart, Shield, Info, MapPin, Search, CheckCircle, 
  Radio, X, BellRing, FileText, ChevronLeft, ChevronRight,
  Trash2, Edit3, Eye,
  Mail, MessageSquare, Smartphone, Map, Plus, ArrowRight, Route
} from "lucide-react";
import { iconSize, statGrid, typography, getSeverityOutline, outlinedCard } from "@/lib/designSystem";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { geocodeLocation } from "@/lib/geocodeLocation";
import { createCategoryPinIcon, getAlertPinCategory } from "@/lib/mapPinUtils";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { CharCounterTextarea } from "@/app/components/ui/CharCounterTextarea";
import { formatCrisisAlertSms } from "@/lib/smsMessageFormat";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";
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
  const { alerts, addAlert, updateAlert, updateAlertStatus, fetchAlerts, deleteAlert, totalUsers, fetchTotalUsers, loading, error } = useCrisisStore();
  const { warnings, fetchWarnings } = useDangerousLocationStore();
  const { advisories, fetchAdvisories } = useRouteAdvisoryStore();
  
  const [mounted, setMounted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const { confirm } = useConfirm();

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
    latitude: null, longitude: null,
    channels: { email: true, sms: true, app: true }
  });

  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [modalMapCenter, setModalMapCenter] = useState([14.1122, 122.9553]);
  const DAET_CENTER = [14.1122, 122.9553];

  useEffect(() => { 
    setMounted(true);
    fetchAlerts(); 
    fetchTotalUsers();
    fetchWarnings();
    fetchAdvisories();
      
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
      setMounted(false);
    };
  }, [fetchAlerts, fetchTotalUsers, fetchWarnings, fetchAdvisories]);

  const findLocationOnMap = async () => {
    if (!formData.location) return;
    setIsSearchingLocation(true);
    try {
      const coords = await geocodeLocation(formData.location);
      if (coords) {
        setModalMapCenter(coords);
        setFormData((prev) => ({ ...prev, latitude: coords[0], longitude: coords[1] }));
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

  const mapBlocked = showCreateModal || showConfirmModal || showResolveConfirm || isViewModalOpen || isEditModalOpen;
  const activeAlerts = alerts.filter((a) => a.status === "Active");
  const activeDangerWarnings = warnings.filter((w) => w.status === "Active");
  const activeRouteAdvisories = advisories.filter((a) => a.status === "Active");

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
    setIsPublishing(true);

    let broadcastPayload = { ...formData };
    if (broadcastPayload.latitude == null || broadcastPayload.longitude == null) {
      const coords = await geocodeLocation(broadcastPayload.location);
      if (coords) {
        broadcastPayload = { ...broadcastPayload, latitude: coords[0], longitude: coords[1] };
        setModalMapCenter(coords);
      }
    }

    const result = await addAlert(broadcastPayload);

    if (result.success) {
      const notifyResult = result.alert?.id
        ? await notifyTouristsOfCrisisAlert(result.alert.id)
        : { success: false, error: "Alert saved but notification dispatch could not start." };

      if (notifyResult.success) {
        const emailPart = notifyResult.emailQueued
          ? `${notifyResult.emailQueued} email(s) queued.`
          : "No email queued (check tourist emails & Email channel).";
        const smsPart = notifyResult.smsQueued
          ? `${notifyResult.smsQueued} SMS queued.`
          : "No SMS queued (check phone numbers & SMS channel).";
        const warnPart = notifyResult.warnings?.length
          ? ` Warnings: ${notifyResult.warnings.join("; ")}`
          : "";
        setToastMessage(
          `Success: Alert broadcast. ${notifyResult.notified} in-app. ${emailPart} ${smsPart}${warnPart}`
        );
      } else {
        setToastMessage(`Alert saved, but tourist notifications failed: ${notifyResult.error}`);
      }

      setShowToast(true);
      setShowCreateModal(false);
      setFormData({ title: "", message: "", type: "General", severity: "Low", location: "", latitude: null, longitude: null, channels: { email: true, sms: true, app: true } });
      setCurrentPage(1);
      await fetchAlerts();
    } else {
      setToastMessage(`Error: ${result.error}`);
      setShowToast(true);
    }

    setIsPublishing(false);
    setShowConfirmModal(false);
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
      latitude: alert.latitude ?? null,
      longitude: alert.longitude ?? null,
      channels: alert.channels || { email: true, sms: true, app: true }
    });
    setIsEditModalOpen(true);
  };

  const onUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;

    let updatedPayload = {
      title: formData.title,
      message: formData.message,
      type: formData.type,
      severity: formData.severity,
      location: formData.location,
      latitude: formData.latitude,
      longitude: formData.longitude,
      channels: formData.channels
    };

    if (updatedPayload.latitude == null || updatedPayload.longitude == null) {
      const coords = await geocodeLocation(updatedPayload.location);
      if (coords) {
        updatedPayload = { ...updatedPayload, latitude: coords[0], longitude: coords[1] };
      }
    }

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
    const ok = await confirm({
      title: "Delete alert permanently?",
      description: "This removes the record from the database and cannot be undone. It will no longer appear in active or resolved lists.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    await deleteAlert(id);
    setToastMessage("Alert deleted permanently.");
    setShowToast(true);
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case "Weather": return <Cloud size={20} />;
      case "Health": return <Heart size={20} />;
      case "Security": return <Shield size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getSeverityStyles = (severity) => getSeverityOutline(severity);

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
    <>
      {/* 1. VIEW MODAL (DETAILED) */}
      {isViewModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative z-[2001] bg-background rounded-3xl p-8 max-w-lg w-full border border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar animate-in zoom-in-95 duration-200">
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative z-[2001] bg-background rounded-[40px] p-10 max-w-xl w-full border border-gray-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
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
              <CharCounterTextarea
                required
                rows={4}
                smsGuide
                smsLength={formatCrisisAlertSms({
                  severity: formData.severity,
                  title: formData.title,
                  location: formData.location,
                  message: formData.message,
                }).length}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Instructions"
              />
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="relative z-[2001] bg-background rounded-[40px] p-10 max-w-xl w-full border border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8 leading-none">
                 <h2 className="text-2xl font-black tracking-tight uppercase text-zinc-900 dark:text-white">Emergency Broadcast</h2>
                 <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={24}/></button>
              </div>
              <div className="leaflet-modal-map-shell h-[180px] rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 shadow-inner relative z-0 mb-4">
                {mounted && showCreateModal && (
                   <MapContainer
                     key={`modal-map-${modalMapCenter.toString()}`}
                     center={modalMapCenter}
                     zoom={15}
                     style={{ height: '100%', width: '100%' }}
                     zoomControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                    <Marker
                      position={modalMapCenter}
                      icon={createCategoryPinIcon(getAlertPinCategory({ type: formData.type, severity: formData.severity }))}
                    >
                       <Popup><span className="text-xs font-black">Broadcast Target</span></Popup>
                    </Marker>
                    <ChangeMapView center={modalMapCenter} />
                  </MapContainer>
                )}
                <div className="absolute top-2 right-2 z-[3] bg-white/90 dark:bg-zinc-900/90 px-2 py-1 rounded text-[8px] font-black uppercase shadow-sm border border-zinc-200 dark:border-white/10 text-zinc-500">Preview</div>
              </div>
              <form onSubmit={handleSubmitAttempt} className="space-y-5 font-sans">
                  <div className="flex gap-2">
                    <input required className="flex-1 p-4 bg-zinc-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Affected Area (e.g. Bagasbas)" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value, latitude: null, longitude: null})} />
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
                  {formData.channels.email && (
                    <p className="text-[10px] text-blue-700 font-medium -mt-2 mb-1">
                      Email reaches all registered tourists with an email on file (see Admin → Settings → Notification Audience).
                    </p>
                  )}
                  <input required className="w-full p-4 bg-zinc-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Alert Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <select className="w-full p-4 bg-zinc-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>Weather</option><option>Health</option><option>Security</option><option>General</option></select>
                    <select className="w-full p-4 bg-zinc-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500" value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
                  </div>
                  <CharCounterTextarea
                    required
                    rows={4}
                    smsGuide
                    smsLength={formatCrisisAlertSms({
                      severity: formData.severity,
                      title: formData.title,
                      location: formData.location,
                      message: formData.message,
                    }).length}
                    className="w-full p-4 bg-zinc-50 border border-gray-100 rounded-xl font-bold leading-relaxed text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Instructions..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                  <button type="submit" disabled={isPublishing} className={`w-full py-5 rounded-[24px] font-black transition-all shadow-lg uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-[0.98] ${isPublishing ? "bg-red-400" : "bg-red-600 text-white hover:bg-red-700 shadow-red-100"}`}>
                     {isPublishing ? "Broadcasting..." : (<><AlertTriangle size={20}/> Broadcast Alert Now</>)}
                  </button>
              </form>
           </div>
        </div>
      )}

      <div className="space-y-6 text-left">
            <DashboardPageHeader
              title={ROLE_INTERFACE.admin.commandCenter.title}
              description={ROLE_INTERFACE.admin.commandCenter.description}
              action={
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95"
                >
                  <Plus size={18} /> New Broadcast
                </button>
              }
            />

            <RoleContextBanner helper={ROLE_INTERFACE.admin.commandCenter.helper} tone="info" />

            {error && (
              <ErrorState message={error} onRetry={fetchAlerts} title="Could not load alerts" />
            )}

            <div className={statGrid.dashboard}>
              {loading ? (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                  ))}
                </>
              ) : (
                <>
                  <DashboardStatCard compact label="Total Users" value={totalUsers.toLocaleString()} icon={<Info size={iconSize.stat} />} accent="blue" badge="Live" />
                  <DashboardStatCard compact label="Active Alerts" value={alerts.filter(a => a.status === 'Active').length} icon={<Radio size={iconSize.stat} />} accent="red" />
                  <DashboardStatCard compact label="Resolved Alerts" value={alerts.filter(a => a.status === 'Resolved').length} icon={<CheckCircle size={iconSize.stat} />} accent="green" />
                  <DashboardStatCard compact label="Critical Alerts" value={alerts.filter(a => a.severity === 'Critical' && a.status === 'Active').length} icon={<AlertTriangle size={iconSize.stat} />} accent="red" />
                </>
              )}
            </div>

            <Card className="p-5 border-zinc-100 bg-blue-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Route className="text-blue-600 shrink-0" size={22} />
                  <div>
                    <p className="text-xs font-black uppercase text-blue-700 tracking-widest">Roads & Hazards</p>
                    <p className="text-sm text-blue-900 font-medium mt-1">
                      {activeRouteAdvisories.length} active route{activeRouteAdvisories.length === 1 ? "" : "s"},{" "}
                      {activeDangerWarnings.length} area hazard{activeDangerWarnings.length === 1 ? "" : "s"}.
                      Manage routes and point hazards in one place.
                    </p>
                  </div>
                </div>
                <Link
                  href="/crisis/admin/routes"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shrink-0"
                >
                  Manage <ArrowRight size={14} />
                </Link>
              </div>
            </Card>

            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">Live Command Filters</h2>
              <Card className="p-4 border-zinc-100">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search by area or alert name..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="px-3 py-2.5 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    value={filterSeverity}
                    onChange={e => setFilterSeverity(e.target.value)}
                  >
                    <option value="All">All Severity</option>
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">Active Incidents</h2>
                
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {loading ? (
                    <AlertCardSkeletonList count={3} />
                  ) : filteredAlerts.length > 0 ? (
                    filteredAlerts.map((alert) => (
                      <OutlinedCard
                        key={alert.id}
                        variant="severity"
                        severity={alert.severity}
                        padding={outlinedCard.alertPadding}
                        className="bg-background"
                      >
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
                      </OutlinedCard>
                    ))
                  ) : (
                    <div className="py-20 text-center border-2 border-dashed border-zinc-200 rounded-3xl">
                       <Shield size={48} className="mx-auto text-zinc-200 mb-4" />
                       <p className="text-zinc-400 font-black uppercase tracking-widest text-xs">No Active Alerts</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={mapBlocked ? "pointer-events-none opacity-40" : ""}>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">Alert Map</h2>
                <Card className="overflow-hidden !p-0 border-zinc-100 relative z-0">
                  {loading ? (
                    <MapSkeleton height="h-[500px]" />
                  ) : mounted && !mapBlocked ? (
                    <CrisisHubMap
                      alerts={activeAlerts}
                      warnings={[]}
                      heightClass="h-[500px]"
                    />
                  ) : (
                    <div className="h-[500px] bg-zinc-50" />
                  )}
                </Card>
              </div>
            </div>

            {/* AUDIT LOG SECTION */}
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">Crisis Audit Log</h2>
              <Card className="overflow-hidden border-zinc-100 !p-0">
              <div className="p-5 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-50/50">
                <div className="relative w-full md:w-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                      <input
                         className="w-full md:w-48 bg-white border border-zinc-100 rounded-xl py-2 pl-9 pr-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="Filter log history..."
                         value={logSearchTerm}
                        onChange={(e) => setLogSearchTerm(e.target.value)}
                      />
                </div>
                {!loading && (
                  <button onClick={handleExportCSV} className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 hover:underline"><FileText size={14} /> Export CSV</button>
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
                    {loading ? (
                      <TableSkeleton rows={5} columns={5} />
                    ) : paginatedAlerts.length > 0 ? paginatedAlerts.map(alert => (
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
              </Card>
            </div>
      </div>

      <ConfirmDialog
        open={showResolveConfirm && !!selectedAlert}
        title="Mark as resolved?"
        description="This removes the alert from the public active feed. Tourists can still view it under Resolved Alerts for reference."
        confirmLabel="Yes, resolve"
        cancelLabel="Not yet"
        variant="success"
        onConfirm={confirmResolve}
        onCancel={() => setShowResolveConfirm(false)}
      />

      <ConfirmDialog
        open={showConfirmModal}
        title="Confirm broadcast?"
        description="This sends the crisis alert to registered tourists through the channels you selected — in-app, email, and/or SMS."
        confirmLabel="Send alert"
        cancelLabel="Cancel"
        variant="danger"
        loading={isPublishing}
        onConfirm={confirmAndBroadcast}
        onCancel={() => !isPublishing && setShowConfirmModal(false)}
      />
      
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
            <div className="bg-green-500 p-2 rounded-lg"><BellRing size={20}/></div>
            <div className="flex-1 font-bold text-sm uppercase">{toastMessage}</div>
            <button onClick={() => setShowToast(false)}><X size={18}/></button>
          </div>
        </div>
      )}
    </>
  );
}
