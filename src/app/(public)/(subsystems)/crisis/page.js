"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, Cloud, Heart, Shield, Info, MapPin, 
  Clock, Bell, Gift, X, Mail, MessageSquare, Radio
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { useCrisisStore } from "@/app/store/crisisStore";

// --- Map Integration Imports ---
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function CrisisPublicPage() {
  const { alerts, fetchAlerts } = useCrisisStore();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [viewedAlerts, setViewedAlerts] = useState(new Set());
  const [mounted, setMounted] = useState(false);

  const DAET_CENTER = [14.1122, 122.9553];

  useEffect(() => {
    setMounted(true);
    
    // Ang fetchAlerts ay nagbabalik ng cleanup function para sa realtime channel
    const initRealtime = async () => {
      const cleanup = await fetchAlerts();
      return cleanup;
    };
    
    const cleanupPromise = initRealtime();
    
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
      // Linisin ang realtime connection pag-alis sa page
      cleanupPromise.then(cleanup => {
        if (cleanup && typeof cleanup === 'function') cleanup();
      });
    };
  }, [fetchAlerts]);

  const activeAlerts = alerts.filter((a) => a.status === "Active" && a.is_public);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "Critical");

  const handleViewAlert = (alertId) => {
    setSelectedAlert(alertId);
    if (!viewedAlerts.has(alertId)) {
      setViewedAlerts(prev => new Set(prev).add(alertId));
    }
  };

  const selectedAlertData = alerts.find((a) => a.id === selectedAlert);

  const getPublicSeverityStyles = (severity) => {
    switch (severity) {
      case "Critical": 
        return { 
          border: "border-l-red-600", 
          badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
        };
      case "High": 
        return { 
          border: "border-l-orange-500", 
          badge: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400" 
        };
      case "Medium": 
        return { 
          border: "border-l-yellow-500", 
          badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" 
        };
      case "Low": 
      default: 
        return { 
          border: "border-l-blue-600", 
          badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
        };
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12 text-foreground font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* 1. Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-4 py-2 rounded-full mb-6 border border-blue-100 dark:border-blue-800/30 font-sans">
            <Bell size={16} />
            <span className="text-xs font-black uppercase tracking-widest text-left font-sans">Public Safety Feed</span>
          </div>
          <h1 className="text-5xl font-black mb-4 tracking-tighter text-left lg:text-center uppercase font-sans">Crisis Management</h1>
        </div>

        {/* 2. Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 font-sans">
          <Card className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/50">
             <p className="text-5xl font-black mb-1 text-left lg:text-center font-sans">{activeAlerts.length}</p>
             <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] text-left lg:text-center font-sans">Active Alerts</p>
          </Card>
          <Card className="p-8 text-center bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
             <p className="text-5xl font-black text-red-600 mb-1 text-left lg:text-center font-sans">{criticalAlerts.length}</p>
             <p className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] text-left lg:text-center font-sans">Critical Risk</p>
          </Card>
          <Card className="p-8 text-center bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30">
             <p className="text-5xl font-black text-green-600 mb-1 text-left lg:text-center font-sans">{viewedAlerts.size * 10}</p>
             <p className="text-[10px] font-black uppercase text-green-600 tracking-[0.2em] text-left lg:text-center font-sans">XP Reward</p>
          </Card>
        </div>

        {/* 3. Main Content Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start font-sans">
          
          <div className="space-y-6 text-left font-sans">
            <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2 font-sans">
              <Bell className="text-blue-600" size={20} /> Active Announcements
            </h2>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2 font-sans">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/30 rounded-[40px] border-2 border-dashed border-gray-200">
                   <Info size={48} className="mx-auto text-zinc-300 mb-4" />
                   <p className="font-bold text-zinc-400 uppercase tracking-widest text-xs font-sans">All Clear</p>
                </div>
              ) : (
                activeAlerts.map((alert) => {
                  const styles = getPublicSeverityStyles(alert.severity);
                  return (
                    <Card 
                      key={alert.id}
                      onClick={() => handleViewAlert(alert.id)}
                      className={`group cursor-pointer hover:scale-[1.01] transition-all p-6 border-l-[12px] ${styles.border} text-left font-sans`}
                    >
                      <div className="space-y-3 text-left font-sans">
                        <div className="flex gap-2 text-left font-sans">
                           <span className={`text-[9px] font-black uppercase px-2 py-1 rounded font-sans ${styles.badge}`}>{alert.severity}</span>
                           <span className="text-[9px] font-black uppercase px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded font-sans">INCIDENT: {alert.type}</span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-left uppercase leading-none font-sans">{alert.title}</h3>
                        <p className="text-zinc-500 line-clamp-2 text-sm text-left font-sans leading-relaxed">{alert.message}</p>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 text-left font-sans">
                           <span className="flex items-center gap-1.5 uppercase font-sans"><MapPin size={12} className="text-blue-600"/> {alert.location}</span>
                           <span className="flex items-center gap-1.5 uppercase font-sans"><Clock size={12}/> {new Date(alert.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-6 text-left h-full font-sans">
            <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2 font-sans">
              <Radio className="text-red-500 animate-pulse" size={20} /> Affected Areas Map
            </h2>
            <div className="bg-zinc-100 dark:bg-zinc-900 rounded-[40px] border-4 border-white dark:border-zinc-800 shadow-2xl h-[530px] overflow-hidden relative z-0">
               {mounted && (
                 <MapContainer 
                    key={`public-alert-map-${activeAlerts.length}`} 
                    center={DAET_CENTER} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%" }}
                 >
                   <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                   {activeAlerts.map((alert, idx) => (
                     <Marker key={alert.id} position={[DAET_CENTER[0] + (idx * 0.008), DAET_CENTER[1] + (idx * 0.008)]}>
                       <Popup>
                         <div className="p-2 text-left font-sans text-black">
                           <p className="text-[10px] font-black uppercase text-red-600 leading-none mb-1 font-sans">{alert.severity} Alert</p>
                           <p className="font-bold text-sm leading-tight font-sans">{alert.title}</p>
                           <p className="text-[10px] text-zinc-500 mt-2 font-medium italic font-sans">{alert.location}</p>
                         </div>
                       </Popup>
                     </Marker>
                   ))}
                 </MapContainer>
               )}
            </div>
          </div>

        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left font-sans">
           <NotificationCard icon={<Mail/>} label="Email Alert" status="Operational" />
           <NotificationCard icon={<MessageSquare/>} label="SMS Broadcast" status="Operational" />
           <NotificationCard icon={<Shield/>} label="App Push" status="Operational" />
        </div>
      </div>

      {selectedAlertData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedAlert(null)}>
           <Card className="max-w-2xl w-full p-0 overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="bg-blue-600 p-8 text-white text-left font-sans">
                <div className="flex justify-between items-start mb-6 font-sans">
                  <div className="p-3 bg-white/20 rounded-2xl text-left font-sans"><Shield size={32}/></div>
                  <button onClick={() => setSelectedAlert(null)}><X/></button>
                </div>
                <h2 className="text-3xl font-black tracking-tighter mb-2 uppercase text-left font-sans">{selectedAlertData.title}</h2>
                <div className="flex gap-2 text-[10px] font-black uppercase text-left font-sans">
                  <span className="bg-white/20 px-2 py-1 rounded font-sans">{selectedAlertData.severity}</span>
                  <span className="bg-white/20 px-2 py-1 rounded font-sans">{selectedAlertData.location}</span>
                </div>
              </div>
              <div className="p-8 space-y-6 bg-background text-left font-sans">
                <p className="text-lg font-medium leading-relaxed text-left font-sans">{selectedAlertData.message}</p>
                <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-3xl border border-green-100 dark:border-green-900/30 flex items-center gap-4 text-left font-sans">
                  <Gift className="text-green-600" size={32}/>
                  <div className="text-left font-sans">
                    <p className="text-xs font-black uppercase text-green-700 tracking-widest text-left font-sans">XP Reward Earned</p>
                    <p className="text-sm font-bold text-green-600 text-left font-sans">+10 Reward Points added to your account.</p>
                  </div>
                </div>
                <button onClick={() => setSelectedAlert(null)} className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest font-sans">Acknowledge & Close</button>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}

function NotificationCard({ icon, label, status }) {
  return (
    <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-left font-sans">
      <div className="flex items-center gap-3 text-left font-sans">
        <div className="text-blue-600 text-left font-sans">{icon}</div>
        <span className="text-xs font-black uppercase tracking-widest text-left font-sans">{label}</span>
      </div>
      <span className="text-[10px] font-bold text-green-500 uppercase text-left font-sans">{status}</span>
    </div>
  );
}