"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Route, Plus, Search, X, MapPin, Trash2, Edit3, Ban, CheckCircle, Navigation, Loader2,
} from "lucide-react";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import {
  buildRoutePathFromLocations,
  hasRoutePath,
  parseRoutePath,
  serializeRoutePath,
  suggestRouteTitle,
} from "@/lib/routeGeometryUtils";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { ErrorState } from "@/app/components/ui/AsyncState";
import { StatCardSkeletonGrid, AlertCardSkeletonList } from "@/app/components/ui/Skeletons";
import {
  ROUTE_ADVISORY_STATUSES, ROUTE_ADVISORY_TYPES, HAZARD_TYPES, getRouteAdvisoryStatusStyles,
} from "@/lib/routeAdvisoryUtils";
import { iconSize, statGrid, typography, outlinedCard } from "@/lib/designSystem";
import { AreaHazardsAdminPanel } from "@/app/components/admin/AreaHazardsAdminPanel";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const RouteAdvisoryPolylines = dynamic(
  () => import("@/app/components/maps/RouteAdvisoryPolylines").then((m) => m.RouteAdvisoryPolylines),
  { ssr: false }
);

const DAET_CENTER = [14.1122, 122.9553];

const EMPTY_FORM = {
  title: "",
  route_status: "Caution",
  route_type: "primary",
  parent_route_id: "",
  from_location: "",
  to_location: "",
  via_location: "",
  affected_location: "",
  hazard_type: HAZARD_TYPES[0],
  reason: "",
  safety_instructions: "",
  warning_starts_at: "",
  warning_ends_at: "",
};

function FormSection({ step, title, description, children }) {
  return (
    <section className="space-y-3 pt-4 border-t border-zinc-100 first:border-t-0 first:pt-0">
      <div>
        <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Step {step}</p>
        <h3 className="font-black uppercase text-sm text-zinc-900 mt-1">{title}</h3>
        {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function RouteAdvisoriesAdminPanel({ embedded = false }) {
  const router = useRouter();
  const {
    advisories, fetchAdvisories, addAdvisory, updateAdvisory, setAdvisoryStatus, deleteAdvisory,
    loading, error,
  } = useRouteAdvisoryStore();

  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isSaving, setIsSaving] = useState(false);
  const [isBuildingPath, setIsBuildingPath] = useState(false);
  const [previewPath, setPreviewPath] = useState([]);
  const [mapCenter, setMapCenter] = useState(DAET_CENTER);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchAdvisories();
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
  }, [fetchAdvisories]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!showModal) return undefined;

    const timer = setTimeout(async () => {
      if (!formData.from_location?.trim() && !formData.to_location?.trim()) {
        setPreviewPath([]);
        return;
      }

      setIsBuildingPath(true);
      try {
        const path = await buildRoutePathFromLocations({
          from: formData.from_location,
          to: formData.to_location,
          via: formData.via_location,
        });
        setPreviewPath(path);
        if (path.length > 0) setMapCenter([path[0].lat, path[0].lng]);
      } finally {
        setIsBuildingPath(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [showModal, formData.from_location, formData.to_location, formData.via_location]);

  const activeAdvisories = advisories.filter((a) => a.status === "Active");

  const filtered = useMemo(() => {
    return advisories.filter((a) => {
      const hay = `${a.title} ${a.from_location} ${a.to_location} ${a.affected_location}`.toLowerCase();
      const matchesSearch = !searchTerm || hay.includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "All" || a.route_status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [advisories, searchTerm, filterStatus]);

  const parentOptions = advisories.filter(
    (a) => a.route_type === "primary" && a.status === "Active" && a.id !== editingId
  );

  const previewAdvisory = useMemo(
    () => ({
      id: "preview",
      title: formData.title || suggestRouteTitle(formData.from_location, formData.to_location, formData.via_location),
      route_status: formData.route_status,
      route_type: formData.route_type,
      from_location: formData.from_location,
      to_location: formData.to_location,
      route_path: previewPath,
    }),
    [formData, previewPath]
  );

  const openCreate = (type = "primary") => {
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      route_type: type,
      route_status: type === "alternative" ? "Safe" : "Caution",
      warning_starts_at: new Date().toISOString().slice(0, 16),
    });
    setPreviewPath([]);
    setMapCenter(DAET_CENTER);
    setShowModal(true);
  };

  const openEdit = (advisory) => {
    setEditingId(advisory.id);
    setFormData({
      title: advisory.title || "",
      route_status: advisory.route_status || "Caution",
      route_type: advisory.route_type || "primary",
      parent_route_id: advisory.parent_route_id || "",
      from_location: advisory.from_location || "",
      to_location: advisory.to_location || "",
      via_location: advisory.via_location || "",
      affected_location: advisory.affected_location || "",
      hazard_type: advisory.hazard_type || HAZARD_TYPES[0],
      reason: advisory.reason || "",
      safety_instructions: advisory.safety_instructions || "",
      warning_starts_at: advisory.warning_starts_at?.slice(0, 16) || "",
      warning_ends_at: advisory.warning_ends_at?.slice(0, 16) || "",
    });
    const existingPath = serializeRoutePath(advisory.route_path || []);
    setPreviewPath(existingPath);
    const pathPoints = parseRoutePath(advisory);
    if (pathPoints.length > 0) setMapCenter(pathPoints[0]);
    else if (advisory.latitude && advisory.longitude) {
      setMapCenter([Number(advisory.latitude), Number(advisory.longitude)]);
    }
    setShowModal(true);
  };

  const applySuggestedTitle = () => {
    const suggested = suggestRouteTitle(formData.from_location, formData.to_location, formData.via_location);
    if (suggested) setFormData((prev) => ({ ...prev, title: suggested }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.to_location?.trim()) {
      setToast("Destination (To) is required.");
      return;
    }

    setIsSaving(true);

    const routePath = await buildRoutePathFromLocations({
      from: formData.from_location,
      to: formData.to_location,
      via: formData.via_location,
    });

    let payload = {
      ...formData,
      title: formData.title?.trim() || suggestRouteTitle(formData.from_location, formData.to_location, formData.via_location),
      parent_route_id: formData.parent_route_id || null,
      route_path: routePath,
      warning_starts_at: formData.warning_starts_at
        ? new Date(formData.warning_starts_at).toISOString()
        : new Date().toISOString(),
      warning_ends_at: formData.warning_ends_at
        ? new Date(formData.warning_ends_at).toISOString()
        : null,
    };

    if (routePath.length >= 1) {
      payload = { ...payload, latitude: routePath[0].lat, longitude: routePath[0].lng };
    }

    if (payload.route_type === "alternative") {
      payload.route_status = "Safe";
    }

    const result = editingId
      ? await updateAdvisory(editingId, payload)
      : await addAdvisory(payload);

    if (result.success) {
      setToast(editingId ? "Route advisory updated." : "Route advisory published.");
      setShowModal(false);
      await fetchAdvisories();
    } else {
      setToast(`Error: ${result.error}`);
    }
    setIsSaving(false);
  };

  const handleDeactivate = async (advisory) => {
    const result = await setAdvisoryStatus(advisory.id, "Inactive");
    setToast(result.success ? "Route advisory deactivated." : result.error);
    if (result.success) await fetchAdvisories();
  };

  const handleReactivate = async (advisory) => {
    const result = await setAdvisoryStatus(advisory.id, "Active");
    setToast(result.success ? "Route advisory reactivated." : result.error);
    if (result.success) await fetchAdvisories();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this route advisory permanently?")) return;
    await deleteAdvisory(id);
    setToast("Route advisory removed.");
    await fetchAdvisories();
  };

  return (
    <div className="space-y-6 text-left">
      {toast && (
        <div className="fixed top-24 right-4 z-[200] bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold">
          {toast}
        </div>
      )}

      {!embedded && (
        <DashboardPageHeader
          title="Route Advisories"
          description="Publish tourist-facing routes. Map lines follow real roads from From → To (via OSRM routing)."
          action={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openCreate("primary")}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                <Plus size={16} /> New Route
              </button>
              <button
                type="button"
                onClick={() => openCreate("alternative")}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                <Navigation size={16} /> New Detour
              </button>
            </div>
          }
        />
      )}

      {embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openCreate("primary")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest"
          >
            <Plus size={16} /> New Route
          </button>
          <button
            type="button"
            onClick={() => openCreate("alternative")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest"
          >
            <Navigation size={16} /> New Detour
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
          <p className="font-black uppercase text-[10px] text-blue-700">Primary route</p>
          <p className="text-blue-900 mt-1">Main road status — Safe, Caution, or Closed.</p>
        </div>
        <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
          <p className="font-black uppercase text-[10px] text-green-700">Detour</p>
          <p className="text-green-900 mt-1">Alternative path linked to a closed/caution route.</p>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
          <p className="font-black uppercase text-[10px] text-zinc-500">Area hazards</p>
          <p className="text-zinc-700 mt-1">
            Point hazards (beaches, landmarks) are on the{" "}
            <button
              type="button"
              onClick={() => router.replace("/crisis/admin/routes?tab=areas", { scroll: false })}
              className="text-blue-600 font-bold hover:underline"
            >
              Area Hazards
            </button>{" "}
            tab.
          </p>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchAdvisories} title="Could not load route advisories" />}

      {loading ? (
        <StatCardSkeletonGrid count={4} className={statGrid.dashboard} />
      ) : (
        <div className={`${statGrid.dashboard} grid-cols-2 lg:grid-cols-4`}>
          <DashboardStatCard label="Active" value={activeAdvisories.length} icon={<Route size={iconSize.stat} />} accent="blue" />
          <DashboardStatCard label="Safe" value={activeAdvisories.filter((a) => a.route_status === "Safe").length} icon={<CheckCircle size={iconSize.stat} />} accent="green" />
          <DashboardStatCard label="Caution" value={activeAdvisories.filter((a) => a.route_status === "Caution").length} icon={<Navigation size={iconSize.stat} />} accent="orange" />
          <DashboardStatCard label="Closed" value={activeAdvisories.filter((a) => a.route_status === "Closed").length} icon={<Ban size={iconSize.stat} />} accent="red" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search routes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-3 bg-white border border-zinc-200 rounded-2xl text-xs font-black uppercase"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              {ROUTE_ADVISORY_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <AlertCardSkeletonList count={3} />
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-zinc-200 rounded-3xl">
              <Route size={40} className="mx-auto text-zinc-200 mb-3" />
              <p className="font-black uppercase text-xs text-zinc-400">No route advisories yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto">
              {filtered.map((advisory) => {
                const styles = getRouteAdvisoryStatusStyles(advisory.route_status);
                const pathReady = hasRoutePath(advisory) || (advisory.from_location && advisory.to_location);
                return (
                  <OutlinedCard
                    key={advisory.id}
                    padding={outlinedCard.alertPadding}
                    className={`border-2 ${styles.border} ${advisory.status === "Inactive" ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${styles.badge}`}>
                            {advisory.route_status}
                          </span>
                          <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-zinc-100 text-zinc-600">
                            {advisory.route_type === "alternative" ? "Detour" : "Primary"}
                          </span>
                        </div>
                        <h3 className={typography.cardTitle}>{advisory.title}</h3>
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          {advisory.from_location || "Start"} → {advisory.to_location}
                        </p>
                        {pathReady ? (
                          <p className="text-[10px] text-green-700 font-black uppercase mt-1">Map line ready</p>
                        ) : (
                          <p className="text-[10px] text-orange-700 font-black uppercase mt-1">Add From + To for map line</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button type="button" onClick={() => openEdit(advisory)} className="p-2 hover:bg-zinc-100 rounded-lg" aria-label="Edit">
                          <Edit3 size={14} />
                        </button>
                        {advisory.status === "Active" ? (
                          <button type="button" onClick={() => handleDeactivate(advisory)} className="p-2 hover:bg-zinc-100 rounded-lg text-orange-600" aria-label="Deactivate">
                            <Ban size={14} />
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleReactivate(advisory)} className="p-2 hover:bg-zinc-100 rounded-lg text-green-600" aria-label="Reactivate">
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button type="button" onClick={() => handleDelete(advisory.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600" aria-label="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </OutlinedCard>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-blue-600" /> Live Map
          </h2>
          {mounted && !showModal ? (
            <div className="h-[480px] rounded-3xl overflow-hidden border border-zinc-200">
              <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                <RouteAdvisoryPolylines advisories={activeAdvisories} />
              </MapContainer>
            </div>
          ) : (
            <div className="h-[480px] rounded-3xl bg-zinc-100 animate-pulse flex items-center justify-center">
              <p className="text-xs font-black uppercase text-zinc-400">Map preview</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-black uppercase text-zinc-900">
                  {editingId ? "Edit Route" : formData.route_type === "alternative" ? "New Detour" : "New Route"}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">Fill in From and To — the map line is created automatically.</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-2">
              <FormSection step={1} title="Route type" description="Primary = main road status. Detour = safer alternative.">
                <div className="grid grid-cols-2 gap-2">
                  {ROUTE_ADVISORY_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          route_type: type,
                          route_status: type === "alternative" ? "Safe" : prev.route_status === "Safe" && type === "primary" ? "Caution" : prev.route_status,
                        }))
                      }
                      className={`p-3 rounded-xl border-2 text-left text-xs font-black uppercase transition-colors ${
                        formData.route_type === type
                          ? type === "alternative"
                            ? "border-green-600 bg-green-50 text-green-800"
                            : "border-blue-600 bg-blue-50 text-blue-800"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                      }`}
                    >
                      {type === "alternative" ? "Detour" : "Primary route"}
                    </button>
                  ))}
                </div>
                {formData.route_type === "alternative" && (
                  <div className="space-y-1 mt-3">
                    <label className="text-[10px] font-black uppercase text-zinc-400">Linked primary route</label>
                    <select
                      value={formData.parent_route_id}
                      onChange={(e) => setFormData({ ...formData, parent_route_id: e.target.value })}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
                    >
                      <option value="">Select affected route (optional)</option>
                      {parentOptions.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </FormSection>

              <FormSection step={2} title="Route corridor" description="These locations define the line on the map.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400">From (start)</label>
                    <input
                      value={formData.from_location}
                      onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                      placeholder="e.g. Daet town proper"
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400">To (destination) *</label>
                    <input
                      required
                      value={formData.to_location}
                      onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
                      placeholder="e.g. Bagasbas Beach"
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
                    />
                  </div>
                  {formData.route_type === "alternative" && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase text-zinc-400">Via (detour path)</label>
                      <input
                        value={formData.via_location}
                        onChange={(e) => setFormData({ ...formData, via_location: e.target.value })}
                        placeholder="e.g. Mercedes road"
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
                      />
                    </div>
                  )}
                </div>
              </FormSection>

              <FormSection step={3} title="Status & hazard" description="What tourists should know about this route.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {formData.route_type === "primary" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-zinc-400">Status</label>
                      <select
                        value={formData.route_status}
                        onChange={(e) => setFormData({ ...formData, route_status: e.target.value })}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
                      >
                        {ROUTE_ADVISORY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400">Hazard type</label>
                    <select
                      value={formData.hazard_type}
                      onChange={(e) => setFormData({ ...formData, hazard_type: e.target.value })}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
                    >
                      {HAZARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400">Affected area (optional)</label>
                    <input
                      value={formData.affected_location}
                      onChange={(e) => setFormData({ ...formData, affected_location: e.target.value })}
                      placeholder="Specific segment, barangay, or landmark"
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection step={4} title="Tourist-facing details">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] font-black uppercase text-zinc-400">Route name</label>
                      <button type="button" onClick={applySuggestedTitle} className="text-[10px] font-black uppercase text-blue-600 hover:underline">
                        Use From → To
                      </button>
                    </div>
                    <input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={suggestRouteTitle(formData.from_location, formData.to_location, formData.via_location) || "Route title"}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400">Reason</label>
                    <textarea rows={2} value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium" placeholder="Why is this route safe, caution, or closed?" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400">What tourists should do</label>
                    <textarea rows={2} value={formData.safety_instructions} onChange={(e) => setFormData({ ...formData, safety_instructions: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium" placeholder="Follow guide, avoid area until 6 PM, etc." />
                  </div>
                </div>
              </FormSection>

              <FormSection step={5} title="Schedule">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400">Active from</label>
                    <input type="datetime-local" value={formData.warning_starts_at} onChange={(e) => setFormData({ ...formData, warning_starts_at: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400">Expected clear by</label>
                    <input type="datetime-local" value={formData.warning_ends_at} onChange={(e) => setFormData({ ...formData, warning_ends_at: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold" />
                  </div>
                </div>
              </FormSection>

              <FormSection step={6} title="Map preview" description="Line updates automatically when From / To / Via change.">
                {mounted && (
                  <div className="relative h-[240px] rounded-2xl overflow-hidden border border-zinc-200">
                    {isBuildingPath && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                        <Loader2 className="animate-spin text-blue-600" size={24} />
                      </div>
                    )}
                    <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                      {previewPath.length >= 2 && (
                        <RouteAdvisoryPolylines advisories={[previewAdvisory]} highlightId="preview" />
                      )}
                    </MapContainer>
                  </div>
                )}
                <p className="text-xs text-zinc-500 font-medium">
                  {previewPath.length >= 2
                    ? previewPath.length > 3
                      ? `Road-following route ready (${previewPath.length} points).`
                      : "Routing roads… or add more specific place names if the line stays straight."
                    : "Enter From and To using recognizable place names (e.g. Bagasbas, Daet, Mercedes)."}
                </p>
              </FormSection>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50">
                  {isSaving ? "Saving..." : editingId ? "Update Route" : "Publish Route"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-black uppercase text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const ADMIN_TABS = [
  { id: "routes", label: "Routes" },
  { id: "areas", label: "Area Hazards" },
];

function RoadsAndHazardsAdminPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") === "areas" ? "areas" : "routes";

  const setTab = (next) => {
    router.replace(next === "areas" ? "/crisis/admin/routes?tab=areas" : "/crisis/admin/routes", { scroll: false });
  };

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title={ROLE_INTERFACE.admin.roadsHazards.title}
        description={ROLE_INTERFACE.admin.roadsHazards.description}
      />

      <RoleContextBanner helper={ROLE_INTERFACE.admin.roadsHazards.helper} tone="info" />

      <div className="flex flex-wrap gap-2">
        {ADMIN_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
              tab === id ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "routes" ? <RouteAdvisoriesAdminPanel embedded /> : <AreaHazardsAdminPanel embedded />}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<StatCardSkeletonGrid count={3} className={statGrid.dashboardThree} />}>
      <RoadsAndHazardsAdminPage />
    </Suspense>
  );
}
