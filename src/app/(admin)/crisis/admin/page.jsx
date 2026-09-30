"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useCrisisStore } from "@/app/store/crisisStore";
import { useDangerousLocationStore } from "@/app/store/dangerousLocationStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { notifyTouristsOfCrisisAlert } from "@/lib/notificationService";
import { formatBroadcastNotifyToast } from "@/lib/broadcastNotifyToast";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { Card } from "@/app/components/ui/Card";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { AdminFilterBar } from "@/app/components/admin/AdminFilterBar";
import { AdminDashboardKpiSection } from "@/app/components/admin/AdminDashboardKpiSection";
import {
  AdminDashboardQuickNavDivider,
  AdminDashboardQuickNavLink,
  AdminDashboardQuickNavRow,
} from "@/app/components/admin/AdminDashboardQuickNavLink";
import { AdminTablePanel } from "@/app/components/admin/AdminTablePanel";
import { StatCardSkeleton, AlertCardSkeletonList, MapSkeleton, TableSkeleton } from "@/app/components/ui/Skeletons";
import { ErrorState } from "@/app/components/ui/AsyncState";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { 
  AlertTriangle, Cloud, Heart, Shield, Info, MapPin, Search, CheckCircle, 
  Radio, X, BellRing, FileText, ChevronLeft, ChevronRight,
  Mail, MessageSquare, Smartphone, Map, Plus, ArrowRight, Route, Users, Archive
} from "lucide-react";
import { adminShell, iconSize, statGrid, typography, getSeverityOutline, outlinedCard, portalLayout } from "@/lib/designSystem";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { geocodeLocation } from "@/lib/geocodeLocation";
import { createCategoryPinIcon, getAlertPinCategory } from "@/lib/mapPinUtils";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { CharCounterTextarea } from "@/app/components/ui/CharCounterTextarea";
import { formatCrisisAlertSms } from "@/lib/smsMessageFormat";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { CategoryFilterSelect, StatusRecordList } from "@/app/components/shell/StatusRecordList";
import { DEFAULT_CRISIS_TYPE_OPTIONS } from "@/app/components/shell/PublicCategorizedCardFilters";
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
  const { alerts, addAlert, updateAlert, updateAlertStatus, fetchAlerts, deleteAlert, userStats, fetchUserStats, loading, error } = useCrisisStore();
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
  const [filterType, setFilterType] = useState("All");

  const auditLogPreviewCount = 5;
  const [auditLogExpanded, setAuditLogExpanded] = useState(false);
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
    fetchUserStats();
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
  }, [fetchAlerts, fetchUserStats, fetchWarnings, fetchAdvisories]);

  useEffect(() => {
    if (!mounted) return;
  }, [mounted, userStats?.touristCount]);

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
        setToastMessage(formatBroadcastNotifyToast(notifyResult));
      } else {
        setToastMessage(`Alert saved, but tourist notifications failed: ${notifyResult.error}`);
      }

      setShowToast(true);
      setShowCreateModal(false);
      setFormData({ title: "", message: "", type: "General", severity: "Low", location: "", latitude: null, longitude: null, channels: { email: true, sms: true, app: true } });
      setAuditLogExpanded(false);
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
      const matchesType = filterType === "All" || (alert.type || "General") === filterType;
      return matchesSearch && matchesSeverity && matchesType;
    });
  }, [alerts, searchTerm, filterSeverity, filterType]);

  const logFilteredAlerts = useMemo(() => {
    return alerts.filter(a => a.id.toLowerCase().includes(logSearchTerm.toLowerCase()) || a.title?.toLowerCase().includes(logSearchTerm.toLowerCase()));
  }, [alerts, logSearchTerm]);

  const displayedAuditAlerts = useMemo(() => {
    if (auditLogExpanded) return logFilteredAlerts;
    return logFilteredAlerts.slice(0, auditLogPreviewCount);
  }, [logFilteredAlerts, auditLogExpanded, auditLogPreviewCount]);

  const auditLogHasMore = logFilteredAlerts.length > auditLogPreviewCount;

  useEffect(() => {
    setAuditLogExpanded(false);
  }, [logSearchTerm]);

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
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setIsViewModalOpen(false); handleEditClick(selectedAlert); }} className="py-3 rounded-2xl border border-amber-200 text-amber-700 font-black uppercase text-[10px] tracking-widest hover:bg-amber-50">Edit</button>
                {selectedAlert.status === "Active" ? (
                  <button type="button" onClick={() => { setIsViewModalOpen(false); handleResolveClick(selectedAlert); }} className="py-3 rounded-2xl border border-green-200 text-green-700 font-black uppercase text-[10px] tracking-widest hover:bg-green-50">Resolve</button>
                ) : (
                  <span />
                )}
                <button type="button" onClick={() => { setIsViewModalOpen(false); handleDelete(selectedAlert.id); }} className="py-3 rounded-2xl border border-red-200 text-red-600 font-black uppercase text-[10px] tracking-widest hover:bg-red-50">Delete</button>
                <button type="button" onClick={() => setIsViewModalOpen(false)} className="py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:opacity-90">Close</button>
              </div>
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
                  <button type="submit" disabled={isPublishing} className={`w-full py-4 ${adminShell.btnDanger} !text-sm !py-4 disabled:opacity-50`}>
                     {isPublishing ? "Broadcasting..." : (<><AlertTriangle size={20}/> Broadcast Alert Now</>)}
                  </button>
              </form>
           </div>
        </div>
      )}

      <>
            <DashboardPageHeader
              title={ROLE_INTERFACE.admin.commandCenter.title}
              description={ROLE_INTERFACE.admin.commandCenter.description}
              action={
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className={adminShell.btnDanger}
                >
                  <Plus size={18} /> New Broadcast
                </button>
              }
            />

            <RoleContextBanner helper={ROLE_INTERFACE.admin.commandCenter.helper} tone="info" />

            {error && (
              <ErrorState message={error} onRetry={fetchAlerts} title="Could not load alerts" />
            )}

            <AdminDashboardKpiSection
              pageId="command-center"
              footer={
                <AdminDashboardQuickNavRow>
                  <AdminDashboardQuickNavLink
                    href="/crisis/admin/routes"
                    icon={Route}
                    label="Roads & hazards"
                    meta={`${activeRouteAdvisories.length} routes · ${activeDangerWarnings.length} hazards`}
                  />
                  <AdminDashboardQuickNavDivider />
                  <AdminDashboardQuickNavLink
                    href="/admin/archive"
                    icon={Archive}
                    label="Archive & history"
                    meta={`${alerts.filter((a) => a.status === "Resolved").length} resolved`}
                  />
                </AdminDashboardQuickNavRow>
              }
            >
              <div className={statGrid.dashboard}>
                {loading ? (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <StatCardSkeleton key={i} />
                    ))}
                  </>
                ) : (
                  <>
                    <DashboardStatCard
                      compact
                      label="Registered Tourists"
                      value={(userStats?.touristCount ?? 0).toLocaleString()}
                      icon={<Users size={iconSize.stat} />}
                      accent="blue"
                      badge="Live"
                    />
                    <DashboardStatCard compact label="Active Alerts" value={alerts.filter(a => a.status === 'Active').length} icon={<Radio size={iconSize.stat} />} accent="red" />
                    <DashboardStatCard compact label="Resolved Alerts" value={alerts.filter(a => a.status === 'Resolved').length} icon={<CheckCircle size={iconSize.stat} />} accent="green" />
                    <DashboardStatCard compact label="Critical Alerts" value={alerts.filter(a => a.severity === 'Critical' && a.status === 'Active').length} icon={<AlertTriangle size={iconSize.stat} />} accent="red" />
                  </>
                )}
              </div>
            </AdminDashboardKpiSection>

            <AdminFilterBar
              compact
              title="Live command filters"
              searchPlaceholder="Search by area or alert name..."
              searchValue={searchTerm}
              onSearchChange={(e) => setSearchTerm(e.target.value)}
            >
            </AdminFilterBar>

            <div className={portalLayout.splitGrid}>
              <AdminPanel
                title="Active incidents"
                compact
                className={portalLayout.panelFill}
                bodyClassName={portalLayout.panelBodyStack}
              >
                {loading ? (
                  <div className={portalLayout.listScrollPaneCompact}>
                    <AlertCardSkeletonList count={3} />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <CategoryFilterSelect
                        label="Crisis type"
                        value={filterType}
                        onChange={setFilterType}
                        options={DEFAULT_CRISIS_TYPE_OPTIONS}
                        allValue="All"
                      />
                      <CategoryFilterSelect
                        label="Severity"
                        value={filterSeverity}
                        onChange={setFilterSeverity}
                        options={["Critical", "High", "Medium", "Low"]}
                        allValue="All"
                      />
                    </div>
                    {filteredAlerts.length > 0 ? (
                      <StatusRecordList
                        rows={filteredAlerts.map((alert) => ({
                          id: alert.id,
                          status: alert.severity || "Low",
                          statusClass: getSeverityOutline(alert.severity).badge,
                          place: alert.location || alert.title,
                          type: alert.type || "General",
                          when: alert.created_at ? new Date(alert.created_at).toLocaleString() : "",
                          actions: [
                            { label: "View", onClick: () => handleViewClick(alert) },
                            { label: "Edit", onClick: () => handleEditClick(alert) },
                            { label: "Resolve", onClick: () => handleResolveClick(alert), tone: "success" },
                            { label: "Delete", onClick: () => handleDelete(alert.id), tone: "danger" },
                          ],
                        }))}
                      />
                    ) : (
                  <div className="py-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl">
                    <Shield size={36} className="mx-auto text-zinc-200 mb-2" />
                    <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">No Active Alerts</p>
                  </div>
                    )}
                  </>
                )}
              </AdminPanel>

              <AdminPanel
                title="Alert map"
                className={`${portalLayout.panelFill} ${mapBlocked ? "pointer-events-none opacity-40" : ""}`}
                noPadding
                bodyClassName={portalLayout.mapColumnBody}
              >
                  {loading ? (
                    <MapSkeleton height={portalLayout.mapColumnFill} />
                  ) : mounted && !mapBlocked ? (
                    <CrisisHubMap
                      alerts={filteredAlerts}
                      warnings={[]}
                      showWarnings={false}
                      showTouristSpots={false}
                      fitToAlerts
                      heightClass={portalLayout.mapColumnFill}
                    />
                  ) : (
                    <div className="h-[500px] bg-zinc-50" />
                  )}
              </AdminPanel>
            </div>

            <AdminTablePanel
              title="Crisis audit log"
              action={
                !loading ? (
                  <button type="button" onClick={handleExportCSV} className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 hover:underline">
                    <FileText size={14} /> Export CSV
                  </button>
                ) : null
              }
            >
              <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 bg-zinc-50/70 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                      <input
                         className="w-full md:w-48 bg-white border border-zinc-100 rounded-xl py-2 pl-9 pr-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="Filter log history..."
                         value={logSearchTerm}
                        onChange={(e) => setLogSearchTerm(e.target.value)}
                      />
                </div>
              </div>
                <div className={`px-4 sm:px-6 py-4 ${auditLogExpanded && auditLogHasMore ? portalLayout.listScrollPaneAdmin : ""}`}>
                  {loading ? (
                    <TableSkeleton rows={5} columns={4} />
                  ) : (
                    <StatusRecordList
                      rows={displayedAuditAlerts.map((alert) => {
                        const channels = [
                          alert.channels?.email && "Email",
                          alert.channels?.sms && "SMS",
                          alert.channels?.app && "App",
                        ].filter(Boolean);
                        return {
                          id: alert.id,
                          status: alert.status,
                          statusClass: alert.status === "Active" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700",
                          place: alert.location || alert.title,
                          type: [alert.severity, alert.type || "General", channels.join(", ")].filter(Boolean).join(" · "),
                          when: alert.updated_at || alert.created_at
                            ? new Date(alert.updated_at || alert.created_at).toLocaleString()
                            : "",
                          actions: [
                            { label: "View", onClick: () => handleViewClick(alert) },
                            { label: "Edit", onClick: () => handleEditClick(alert) },
                            ...(alert.status === "Active"
                              ? [{ label: "Resolve", onClick: () => handleResolveClick(alert), tone: "success" }]
                              : []),
                            { label: "Delete", onClick: () => handleDelete(alert.id), tone: "danger" },
                          ],
                        };
                      })}
                      emptyMessage="No matching audit logs found."
                    />
                  )}
                </div>
                {!loading && auditLogHasMore ? (
                  <div className="px-4 sm:px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide font-sans">
                      {auditLogExpanded
                        ? `Showing all ${logFilteredAlerts.length} entries`
                        : `Showing ${displayedAuditAlerts.length} of ${logFilteredAlerts.length} entries`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAuditLogExpanded((v) => !v)}
                      className={`${adminShell.btnGhost} !text-[10px] !py-2 !px-3`}
                    >
                      {auditLogExpanded ? "Show less" : "View more"}
                    </button>
                  </div>
                ) : null}
            </AdminTablePanel>
      </>

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
            <div className="flex-1 font-medium text-sm leading-snug normal-case">{toastMessage}</div>
            <button onClick={() => setShowToast(false)}><X size={18}/></button>
          </div>
        </div>
      )}
    </>
  );
}
