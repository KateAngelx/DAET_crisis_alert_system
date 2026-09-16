"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon, Plus, Search, X, Trash2, Edit3, BellRing, Navigation, ShieldAlert,
} from "lucide-react";
import { useDangerousLocationStore } from "@/app/store/dangerousLocationStore";
import { notifyTouristsOfDangerousLocation } from "@/lib/notificationService";
import { geocodeLocation } from "@/lib/geocodeLocation";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { ErrorState } from "@/app/components/ui/AsyncState";
import { StatCardSkeletonGrid, AlertCardSkeletonList } from "@/app/components/ui/Skeletons";
import { AlternativeRouteDisplay } from "@/app/components/danger/AlternativeRouteDisplay";
import {
  DANGER_TYPES, DANGER_SEVERITIES, getDangerSeverityStyles, formatWarningTimeRange,
} from "@/lib/dangerousLocationUtils";
import { createCategoryPinIcon, getDangerPinCategory } from "@/lib/mapPinUtils";
import { MapLegend } from "@/app/components/maps/MapLegend";
import { adminShell, iconSize, statGrid, portalLayout } from "@/lib/designSystem";
import { AdminFilterBar } from "@/app/components/admin/AdminFilterBar";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { RoadsHazardsSectionFilters } from "@/app/components/admin/RoadsHazardsSectionFilters";
import { AdminDashboardKpiSection } from "@/app/components/admin/AdminDashboardKpiSection";
import { AdminDashboardQuickNavLink, AdminDashboardQuickNavRow } from "@/app/components/admin/AdminDashboardQuickNavLink";
import { Radio } from "lucide-react";
import { DangerSeverityIcon } from "@/app/components/ui/cardTypeIcons";
import { AdminTablePanel } from "@/app/components/admin/AdminTablePanel";
import { AdminActiveOpsCard, hazardSeverityToCardSeverity } from "@/app/components/admin/AdminActiveOpsCard";
import { CharCounterTextarea } from "@/app/components/ui/CharCounterTextarea";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";
import { formatAreaHazardSms } from "@/lib/smsMessageFormat";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const DangerousLocationMapMarkers = dynamic(
  () => import("@/app/components/maps/DangerousLocationMapMarkers").then((m) => m.DangerousLocationMapMarkers),
  { ssr: false }
);

const DAET_CENTER = [14.1122, 122.9553];

const EMPTY_FORM = {
  dangerous_location: "",
  danger_type: DANGER_TYPES[0],
  severity: "Caution",
  warning_starts_at: "",
  warning_ends_at: "",
  current_location: "",
  alternative_route: "",
  destination: "",
  safety_instructions: "",
  latitude: null,
  longitude: null,
};

export function AreaHazardsAdminPanel({
  embedded = false,
  createIntent = false,
  onCreateIntentConsumed,
  activeSection = "areas",
  onSectionChange,
}) {
  const {
    warnings, fetchWarnings, addWarning, updateWarning, setWarningStatus, deleteWarning,
    loading, error,
  } = useDangerousLocationStore();

  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState(DAET_CENTER);
  const [toast, setToast] = useState("");
  const { confirm } = useConfirm();

  useEffect(() => {
    setMounted(true);
    fetchWarnings();
    if (typeof window !== "undefined") {
      const L = require("leaflet");
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
    }
    return () => setMounted(false);
  }, [fetchWarnings]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const activeWarnings = warnings.filter((w) => w.status === "Active");
  const inactiveWarnings = warnings.filter((w) => w.status !== "Active");
  const dangerousCount = activeWarnings.filter((w) => w.severity !== "Caution").length;
  const cautionCount = activeWarnings.filter((w) => w.severity === "Caution").length;

  const mapBlocked = showModal || showConfirm;

  const filtered = useMemo(() => {
    return warnings.filter((w) => {
      const matchesSearch =
        !searchTerm ||
        w.dangerous_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.destination?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeverity = filterSeverity === "All" || w.severity === filterSeverity;
      return matchesSearch && matchesSeverity;
    });
  }, [warnings, searchTerm, filterSeverity]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      warning_starts_at: new Date().toISOString().slice(0, 16),
    });
    setMapCenter(DAET_CENTER);
    setShowModal(true);
  };

  useEffect(() => {
    if (!createIntent) return;
    openCreate();
    onCreateIntentConsumed?.();
  }, [createIntent, onCreateIntentConsumed]);

  const openEdit = (warning) => {
    setEditingId(warning.id);
    setFormData({
      dangerous_location: warning.dangerous_location || "",
      danger_type: warning.danger_type || DANGER_TYPES[0],
      severity: warning.severity || "Caution",
      warning_starts_at: warning.warning_starts_at?.slice(0, 16) || "",
      warning_ends_at: warning.warning_ends_at?.slice(0, 16) || "",
      current_location: warning.current_location || "",
      alternative_route: warning.alternative_route || "",
      destination: warning.destination || "",
      safety_instructions: warning.safety_instructions || "",
      latitude: warning.latitude ?? null,
      longitude: warning.longitude ?? null,
    });
    if (warning.latitude && warning.longitude) {
      setMapCenter([Number(warning.latitude), Number(warning.longitude)]);
    }
    setShowModal(true);
  };

  const findOnMap = async () => {
    if (!formData.dangerous_location) return;
    setIsSearching(true);
    try {
      const coords = await geocodeLocation(formData.dangerous_location);
      if (coords) {
        setMapCenter(coords);
        setFormData((prev) => ({ ...prev, latitude: coords[0], longitude: coords[1] }));
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.dangerous_location || !formData.alternative_route || !formData.destination) return;
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);

    let payload = {
      ...formData,
      warning_starts_at: formData.warning_starts_at
        ? new Date(formData.warning_starts_at).toISOString()
        : new Date().toISOString(),
      warning_ends_at: formData.warning_ends_at
        ? new Date(formData.warning_ends_at).toISOString()
        : null,
    };

    if (!payload.latitude || !payload.longitude) {
      const coords = await geocodeLocation(payload.dangerous_location);
      if (coords) {
        payload = { ...payload, latitude: coords[0], longitude: coords[1] };
      }
    }

    const result = editingId
      ? await updateWarning(editingId, payload)
      : await addWarning(payload);

    if (result.success) {
      if (!editingId && result.warning?.id) {
        const notify = await notifyTouristsOfDangerousLocation(result.warning.id);
        setToast(
          notify.success
            ? `Area hazard published. ${notify.notified} tourist${notify.notified === 1 ? "" : "s"} notified.`
            : "Hazard saved, but tourist notifications could not be sent."
        );
      } else {
        setToast(editingId ? "Area hazard updated." : "Area hazard published.");
      }
      setShowModal(false);
      await fetchWarnings();
    } else {
      setToast(`Error: ${result.error}`);
    }

    setIsSaving(false);
  };

  const handleDeactivate = async (warning) => {
    const ok = await confirm({
      title: "Deactivate area hazard?",
      description:
        "This removes the hazard from the public travel map. You can reactivate it later from the inactive list.",
      confirmLabel: "Deactivate",
      variant: "warning",
    });
    if (!ok) return;
    const result = await setWarningStatus(warning.id, "Inactive");
    setToast(result.success ? "Area hazard deactivated." : result.error);
    if (result.success) await fetchWarnings();
  };

  const handleReactivate = async (warning) => {
    const ok = await confirm({
      title: "Reactivate area hazard?",
      description: "This publishes the hazard on the public map again and sends tourist notifications.",
      confirmLabel: "Reactivate & notify",
      variant: "success",
    });
    if (!ok) return;
    const result = await setWarningStatus(warning.id, "Active");
    if (result.success) {
      await notifyTouristsOfDangerousLocation(warning.id);
      setToast("Area hazard reactivated and tourists notified.");
      await fetchWarnings();
    } else {
      setToast(result.error);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: "Remove area hazard?",
      description: "This permanently deletes the hazard record. Tourists will no longer see it on the travel map.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    await deleteWarning(id);
    setToast("Area hazard removed.");
    await fetchWarnings();
  };

  return (
    <div className={`${portalLayout.stack} text-left`}>
      {toast && (
        <div className="fixed top-24 right-4 z-[200] bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold animate-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {!embedded && (
        <DashboardPageHeader
          title="Area Hazards"
          description="Mark unsafe areas, publish alternative paths, and warn tourists in real time."
          action={
            <button
              type="button"
              onClick={openCreate}
              className={adminShell.btnDanger}
            >
              <Plus size={16} /> Mark Area Hazard
            </button>
          }
        />
      )}

      {error && <ErrorState message={error} onRetry={fetchWarnings} title="Could not load area hazards" />}

      <AdminDashboardKpiSection
        footer={
          embedded ? (
            <AdminDashboardQuickNavRow>
              <AdminDashboardQuickNavLink href="/crisis/admin" icon={Radio} label="Command Center" />
            </AdminDashboardQuickNavRow>
          ) : null
        }
      >
        {loading ? (
          <StatCardSkeletonGrid count={3} className={statGrid.dashboardThree} />
        ) : (
          <div className={statGrid.dashboardThree}>
            <DashboardStatCard compact label="Active Hazards" value={activeWarnings.length} icon={<AlertOctagon size={iconSize.stat} />} accent="red" />
            <DashboardStatCard compact label="Avoid Areas" value={dangerousCount} icon={<ShieldAlert size={iconSize.stat} />} accent="red" />
            <DashboardStatCard compact label="Caution Areas" value={cautionCount} icon={<Navigation size={iconSize.stat} />} accent="orange" />
          </div>
        )}
      </AdminDashboardKpiSection>

      <AdminFilterBar
        compact
        title="Live command filters"
        searchPlaceholder="Search location or destination..."
        searchValue={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
      >
        <select
          className={`${adminShell.select} !py-2 !text-xs min-w-[7.5rem]`}
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
        >
          <option value="All">All Severity</option>
          {DANGER_SEVERITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </AdminFilterBar>

      <div className={portalLayout.splitGrid}>
        <AdminPanel
          title="Active area hazards"
          compact
          className={portalLayout.panelFill}
          bodyClassName={portalLayout.panelBodyStack}
        >
          {onSectionChange ? (
            <RoadsHazardsSectionFilters activeSection={activeSection} onSectionChange={onSectionChange} />
          ) : null}
          {loading ? (
            <div className={portalLayout.listScrollPaneCompact}>
              <AlertCardSkeletonList count={3} />
            </div>
          ) : filtered.filter((w) => w.status === "Active").length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl">
              <Navigation size={36} className="mx-auto text-zinc-300 mb-2" />
              <p className="font-black uppercase tracking-widest text-[10px] text-zinc-400">No active area hazards</p>
            </div>
          ) : (
            <div className={`space-y-2 ${portalLayout.listScrollPaneCompact}`}>
            {filtered
              .filter((w) => w.status === "Active")
              .map((warning) => {
                const styles = getDangerSeverityStyles(warning.severity);
                const meta = `${warning.severity} • ${warning.danger_type || "Hazard"}`;
                const message =
                  warning.safety_instructions?.trim() ||
                  warning.reason?.trim() ||
                  formatWarningTimeRange(warning);
                return (
                  <div key={warning.id} className="space-y-2">
                    <AdminActiveOpsCard
                      compact
                      severityForCard={hazardSeverityToCardSeverity(warning.severity)}
                      borderClassName={styles.border}
                      metaLabel={meta}
                      title={warning.dangerous_location}
                      message={message}
                      location={warning.affected_area || warning.dangerous_location}
                      timeLabel={
                        warning.updated_at
                          ? new Date(warning.updated_at).toLocaleTimeString()
                          : warning.created_at
                            ? new Date(warning.created_at).toLocaleTimeString()
                            : null
                      }
                      icon={
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 leading-none shrink-0">
                          <DangerSeverityIcon severity={warning.severity} size={iconSize.section} />
                        </div>
                      }
                      primaryAction={{ label: "Deactivate", onClick: () => handleDeactivate(warning) }}
                      secondaryActions={[
                        {
                          key: "edit",
                          label: "Edit",
                          icon: Edit3,
                          onClick: () => openEdit(warning),
                          className: "hover:bg-amber-50 text-amber-600",
                        },
                        {
                          key: "delete",
                          label: "Delete",
                          icon: Trash2,
                          onClick: () => handleDelete(warning.id),
                          className: "hover:bg-red-50 text-red-600",
                        },
                      ]}
                    />
                    <AlternativeRouteDisplay warning={warning} compact />
                  </div>
                );
              })}
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          title="Hazard map"
          className={`${portalLayout.panelFill} ${mapBlocked ? "pointer-events-none opacity-40" : ""}`}
          noPadding
          bodyClassName={portalLayout.mapColumnBody}
        >
          <div className={`leaflet-map-shell relative ${portalLayout.mapColumnFill}`}>
            {mounted && !mapBlocked && (
              <MapContainer center={DAET_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                <DangerousLocationMapMarkers warnings={activeWarnings} />
              </MapContainer>
            )}
            <div className="absolute bottom-3 left-3 z-[3]">
              <MapLegend compact />
            </div>
          </div>
        </AdminPanel>
      </div>

      {inactiveWarnings.length > 0 && (
        <AdminTablePanel title="Inactive area hazards" subtitle="Deactivated hazards — reactivate or delete from here">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-[9px] uppercase tracking-widest font-black">
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Location</th>
                <th className="px-6 py-3 text-left">Severity</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {inactiveWarnings.map((warning) => (
                <tr key={warning.id} className="hover:bg-zinc-50/80">
                  <td className="px-6 py-3">
                    <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">Inactive</span>
                  </td>
                  <td className="px-6 py-3 font-black uppercase text-zinc-900 max-w-[220px] truncate">{warning.dangerous_location}</td>
                  <td className="px-6 py-3 text-zinc-500 font-medium">{warning.severity}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => handleReactivate(warning)} className="p-2 hover:bg-green-50 text-green-600 rounded-lg" title="Reactivate">
                        <BellRing size={16} />
                      </button>
                      <button type="button" onClick={() => openEdit(warning)} className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg" title="Edit">
                        <Edit3 size={16} />
                      </button>
                      <button type="button" onClick={() => handleDelete(warning.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTablePanel>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative z-[2001] bg-white dark:bg-zinc-900 rounded-[40px] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase">{editingId ? "Update Area Hazard" : "Mark Area Hazard"}</h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 rounded-full"><X size={22} /></button>
            </div>

            <div className="leaflet-modal-map-shell h-[160px] rounded-2xl overflow-hidden border border-zinc-100 mb-4">
              {mounted && (
                <MapContainer center={mapCenter} zoom={15} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker
                    position={mapCenter}
                    icon={createCategoryPinIcon(getDangerPinCategory({ severity: formData.severity }))}
                  />
                </MapContainer>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <input
                  required
                  className="flex-1 p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Unsafe area / destination"
                  value={formData.dangerous_location}
                  onChange={(e) => setFormData({ ...formData, dangerous_location: e.target.value, latitude: null, longitude: null })}
                />
                <button type="button" onClick={findOnMap} className="p-3 bg-zinc-900 text-white rounded-xl">
                  {isSearching ? "..." : <Search size={18} />}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-xs" value={formData.danger_type} onChange={(e) => setFormData({ ...formData, danger_type: e.target.value })}>
                  {DANGER_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-xs" value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })}>
                  {DANGER_SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Warning starts</label>
                  <input type="datetime-local" className="w-full mt-1 p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-xs" value={formData.warning_starts_at} onChange={(e) => setFormData({ ...formData, warning_starts_at: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Warning ends (optional)</label>
                  <input type="datetime-local" className="w-full mt-1 p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-xs" value={formData.warning_ends_at} onChange={(e) => setFormData({ ...formData, warning_ends_at: e.target.value })} />
                </div>
              </div>

              <input className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm" placeholder="Current location (route start, optional)" value={formData.current_location} onChange={(e) => setFormData({ ...formData, current_location: e.target.value })} />
              <input required className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-bold text-sm text-blue-900" placeholder="Recommended alternative / safer route" value={formData.alternative_route} onChange={(e) => setFormData({ ...formData, alternative_route: e.target.value })} />
              <input required className="w-full p-3 bg-green-50 border border-green-100 rounded-xl font-bold text-sm text-green-900" placeholder="Destination" value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} />
              <CharCounterTextarea
                rows={3}
                smsGuide
                smsLength={formatAreaHazardSms(formData).length}
                className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm"
                placeholder="Safety instructions for tourists..."
                value={formData.safety_instructions}
                onChange={(e) => setFormData({ ...formData, safety_instructions: e.target.value })}
              />

              <button type="submit" disabled={isSaving} className={`w-full ${adminShell.btnDanger} disabled:opacity-60`}>
                {isSaving ? "Saving..." : editingId ? "Update Hazard" : "Publish Hazard & Notify Tourists"}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title={editingId ? "Update area hazard?" : "Publish area hazard?"}
        description={`Tourists will be notified about ${formData.dangerous_location || "this area"} and the alternative route to ${formData.destination || "the safe destination"}.`}
        confirmLabel={editingId ? "Update" : "Publish & notify"}
        cancelLabel="Cancel"
        variant="danger"
        loading={isSaving}
        onConfirm={confirmSave}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
