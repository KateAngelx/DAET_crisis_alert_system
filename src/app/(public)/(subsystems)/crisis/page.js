"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, Info, MapPin, 
  Clock, Bell, X, Mail, MessageSquare, Radio
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { useCrisisStore } from "@/app/store/crisisStore";
import { InfoPageHero, PublicPageShell, PublicPageContent, publicLayout } from "@/app/components/InfoPageHero";
import { AsyncState, ErrorState } from "@/app/components/ui/AsyncState";
import { PublicStatCardSkeleton, AlertCardSkeletonList, MapSkeleton } from "@/app/components/ui/Skeletons";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import { typography, iconSize } from "@/lib/designSystem";

// --- Map Integration Imports ---
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function CrisisPublicPage() {
  const { alerts, fetchAlerts, loading, error } = useCrisisStore();
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
          badge: "bg-red-100 text-red-700" 
        };
      case "High": 
        return { 
          border: "border-l-orange-500", 
          badge: "bg-orange-100 text-orange-700" 
        };
      case "Medium": 
        return { 
          border: "border-l-yellow-500", 
          badge: "bg-yellow-100 text-yellow-700" 
        };
      case "Low": 
      default: 
        return { 
          border: "border-l-blue-600", 
          badge: "bg-blue-100 text-blue-700" 
        };
    }
  };

  return (
    <PublicPageShell>
      <InfoPageHero
        title="Crisis Hub"
        description="Active alerts issued by Daet LGU. Each entry shows the crisis type, severity, affected location, time reported, and official instructions. Check the map for affected areas."
      />

      <PublicPageContent>
        <section className={publicLayout.section}>
          {loading ? (
            <PublicStatCardSkeleton count={3} />
          ) : (
          <div className={publicLayout.cardGridWide}>
            <PublicStatCard value={activeAlerts.length} label="Active Alerts" accent="zinc" />
            <PublicStatCard value={criticalAlerts.length} label="Require Immediate Action" accent="red" />
            <PublicStatCard value={viewedAlerts.size} label="Alerts Acknowledged" accent="green" />
          </div>
          )}
        </section>

        <section className={publicLayout.section}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="text-left">
              <h2 className={`${publicLayout.sectionTitle} flex items-center gap-2`}>
                <Bell className="text-blue-600" size={iconSize.section} /> Active Announcements
              </h2>

              <div className={`${publicLayout.stack} max-h-[600px] overflow-y-auto`}>
                <AsyncState
                  loading={loading}
                  error={error}
                  isEmpty={!loading && !error && activeAlerts.length === 0}
                  onRetry={fetchAlerts}
                  loadingFallback={<AlertCardSkeletonList count={3} />}
                  errorFallback={
                    <ErrorState message={error} onRetry={fetchAlerts} title="Could not load alerts" />
                  }
                  emptyFallback={
                    <div className="text-center py-16 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                      <Info size={iconSize.emptyLg} className="mx-auto text-zinc-300 mb-4" />
                      <p className="font-bold text-zinc-400 uppercase tracking-widest text-xs">No Active Alerts</p>
                      <p className="text-zinc-400 text-sm mt-2 font-medium">No crisis is currently reported for Daet. Check back when LGU issues a new advisory.</p>
                    </div>
                  }
                >
                  {activeAlerts.map((alert) => {
                    const styles = getPublicSeverityStyles(alert.severity);
                    return (
                      <Card
                        key={alert.id}
                        onClick={() => handleViewAlert(alert.id)}
                        className={`group cursor-pointer hover:scale-[1.01] transition-all p-6 border-l-[12px] rounded-3xl ${styles.border} text-left`}
                      >
                        <div className={publicLayout.stackTight}>
                          <div className="flex gap-2 flex-wrap">
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${styles.badge}`}>{alert.severity}</span>
                            <span className="text-[9px] font-black uppercase px-2 py-1 bg-zinc-100 rounded">INCIDENT: {alert.type}</span>
                          </div>
                          <h3 className={typography.cardTitle}>{alert.title}</h3>
                          <p className="text-zinc-500 line-clamp-2 text-sm leading-relaxed">{alert.message}</p>
                          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-zinc-400">
                            <span className="flex items-center gap-1.5 uppercase"><MapPin size={iconSize.inlineSm} className="text-blue-600" /> {alert.location}</span>
                            <span className="flex items-center gap-1.5 uppercase"><Clock size={iconSize.inlineSm} /> {new Date(alert.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </AsyncState>
              </div>
            </div>

            <div className="text-left">
              <h2 className={`${publicLayout.sectionTitle} flex items-center gap-2`}>
                <Radio className="text-red-500 animate-pulse" size={iconSize.section} /> Affected Areas Map
              </h2>
              <div className="bg-zinc-50 rounded-3xl border border-zinc-200 h-[480px] overflow-hidden">
                {loading ? (
                  <MapSkeleton height="h-full" />
                ) : mounted && (
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
                          <div className="p-2 text-left text-black">
                            <p className="text-[10px] font-black uppercase text-red-600 leading-none mb-1">{alert.severity} Alert</p>
                            <p className="font-bold text-sm leading-tight">{alert.title}</p>
                            <p className="text-[10px] text-zinc-500 mt-2 font-medium italic">{alert.location}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className={publicLayout.sectionTitle}>Alert Delivery Channels</h2>
          <div className={publicLayout.cardGridWide}>
            <NotificationCard icon={<Mail />} label="Email Alerts" status="When issued" />
            <NotificationCard icon={<MessageSquare />} label="SMS Alerts" status="When issued" />
            <NotificationCard icon={<Shield />} label="App Notifications" status="When issued" />
          </div>
        </section>
      </PublicPageContent>

      {selectedAlertData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedAlert(null)}>
           <Card className="max-w-2xl w-full p-0 overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="bg-blue-600 p-8 text-white text-left">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-white/20 rounded-2xl"><Shield size={iconSize.empty} /></div>
                  <button onClick={() => setSelectedAlert(null)}><X /></button>
                </div>
                <h2 className={`${typography.heroTitle} mb-4`}>{selectedAlertData.title}</h2>
                <div className="flex gap-2 text-[10px] font-black uppercase text-left font-sans">
                  <span className="bg-white/20 px-2 py-1 rounded font-sans">{selectedAlertData.severity}</span>
                  <span className="bg-white/20 px-2 py-1 rounded font-sans">{selectedAlertData.location}</span>
                </div>
              </div>
              <div className="p-8 space-y-6 bg-white text-left">
                <p className="text-sm font-medium leading-relaxed">{selectedAlertData.message}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Reported</p>
                    <p className="font-bold text-zinc-900">{new Date(selectedAlertData.created_at).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Status</p>
                    <p className="font-bold text-zinc-900 uppercase">{selectedAlertData.status}</p>
                  </div>
                </div>
                <div className={`${publicLayout.ctaCard.replace('mt-12', 'mt-0')} flex items-start gap-4`}>
                  <Shield className="text-blue-600 shrink-0" size={iconSize.auth} />
                  <div>
                    <p className="text-xs font-black uppercase text-blue-700 tracking-widest mb-1">Recommended Actions</p>
                    <p className="text-sm font-medium text-blue-900 leading-relaxed">
                      Follow the instructions above. Avoid the affected area ({selectedAlertData.location}) until this alert is marked Resolved. For immediate danger, call 911 or 117.
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedAlert(null)} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Acknowledge & Close</button>
              </div>
           </Card>
        </div>
      )}
    </PublicPageShell>
  );
}

function NotificationCard({ icon, label, status }) {
  return (
    <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-3xl flex items-center justify-between text-left">
      <div className="flex items-center gap-3">
        <div className="text-blue-600">{icon}</div>
        <span className="text-xs font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-[10px] font-bold text-green-600 uppercase">{status}</span>
    </div>
  );
}