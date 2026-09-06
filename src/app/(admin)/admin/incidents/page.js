"use client";

import React, { useEffect, useState } from 'react';
import {
  Search, Eye, ChevronLeft, ChevronRight,
  MapPin, Clock, User, FileText,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { DashboardPageHeader } from '@/app/components/dashboard/DashboardPageHeader';
import { RoleContextBanner } from '@/app/components/dashboard/RoleContextBanner';
import { ROLE_INTERFACE } from '@/lib/roleInterfaceCopy';
import { useIncidentStore } from '@/app/store/incidentStore';
import { useGuideStore } from '@/app/store/guideStore';
import { useAuthStore } from '@/app/store/crisisStore';
import {
  INCIDENT_STATUSES, INCIDENT_CATEGORIES, INCIDENT_SEVERITIES,
  getStatusColor, getSeverityColor,
} from '@/lib/constants';
import { IncidentStatSkeleton, TableSkeleton } from '@/app/components/ui/Skeletons';
import { AsyncState, EmptyState } from '@/app/components/ui/AsyncState';
import { CharCounterTextarea } from '@/app/components/ui/CharCounterTextarea';

export default function AdminIncidentsPage() {
  const { user } = useAuthStore();
  const { incidents, fetchIncidents, updateIncidentStatus, getFilteredIncidents, getDashboardStats, setFilters, filters, loading, error } = useIncidentStore();
  const { guides, fetchGuides } = useGuideStore();
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', assignedTo: '', adminNotes: '', responseActions: '' });
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => {
    fetchIncidents();
    fetchGuides();
  }, [fetchIncidents, fetchGuides]);

  const stats = getDashboardStats();
  const filtered = getFilteredIncidents();
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const openDetail = (inc) => {
    setSelected(inc);
    setUpdateForm({
      status: inc.status,
      assignedTo: inc.assigned_to || '',
      adminNotes: inc.admin_notes || '',
      responseActions: inc.response_actions || '',
    });
    setShowModal(true);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    const assignee = guides.find((g) => g.id === updateForm.assignedTo);
    await updateIncidentStatus(selected.id, updateForm.status, {
      assignedTo: updateForm.assignedTo || null,
      adminNotes: updateForm.adminNotes,
      responseActions: updateForm.responseActions,
      changedBy: user.id,
      oldStatus: selected.status,
      action: 'admin_update',
      notes: updateForm.adminNotes,
      assigneeProfile: assignee,
    });
    setShowModal(false);
    fetchIncidents();
  };

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title={ROLE_INTERFACE.admin.incidents.title}
        description={ROLE_INTERFACE.admin.incidents.description}
      />
      <RoleContextBanner helper={ROLE_INTERFACE.admin.incidents.helper} tone="info" />

      {loading ? (
        <IncidentStatSkeleton count={7} />
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Active', value: stats.active, color: 'text-orange-600' },
          { label: 'Critical', value: stats.critical, color: 'text-red-600' },
          { label: 'High', value: stats.high, color: 'text-orange-500' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Responding', value: stats.responding, color: 'text-purple-600' },
          { label: 'Resolved', value: stats.resolved, color: 'text-green-600' },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>
      )}

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search reports..."
              value={filters.search}
              onChange={(e) => { setFilters({ search: e.target.value }); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium"
            />
          </div>
          <select value={filters.status} onChange={(e) => { setFilters({ status: e.target.value }); setPage(1); }} className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold">
            <option value="All">All Statuses</option>
            {INCIDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.category} onChange={(e) => { setFilters({ category: e.target.value }); setPage(1); }} className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold">
            <option value="All">All Categories</option>
            {INCIDENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.severity} onChange={(e) => { setFilters({ severity: e.target.value }); setPage(1); }} className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold">
            <option value="All">All Severities</option>
            {INCIDENT_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!loading && !error && paginated.length === 0}
        onRetry={fetchIncidents}
        loadingFallback={
          <Card className="overflow-hidden !p-0 border-zinc-100">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[9px] uppercase tracking-widest font-black">
                  <th className="px-6 py-4 text-left">Reference</th>
                  <th className="px-6 py-4 text-left">Category</th>
                  <th className="px-6 py-4 text-left">Location</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <TableSkeleton rows={8} columns={5} />
              </tbody>
            </table>
          </Card>
        }
        emptyFallback={
          <EmptyState icon={FileText} title="No incidents found" description="Incident reports from tourists will appear here." />
        }
      >
        <div className="space-y-3">
          {paginated.map((inc) => (
            <Card key={inc.id} className="p-5 hover:shadow-md transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-blue-600 font-black">{inc.reference_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getSeverityColor(inc.severity)}`}>{inc.severity}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getStatusColor(inc.status)}`}>{inc.status}</span>
                  </div>
                  <h3 className="font-bold text-gray-900">{inc.category}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{inc.description}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {inc.location}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(inc.created_at).toLocaleString()}</span>
                    {inc.reporter && <span className="flex items-center gap-1"><User size={12} /> {inc.reporter.full_name}</span>}
                  </div>
                </div>
                <button
                  onClick={() => openDetail(inc)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase shrink-0"
                >
                  <Eye size={14} /> Manage
                </button>
              </div>
            </Card>
          ))}
        </div>
      </AsyncState>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-2 rounded-lg border disabled:opacity-30"><ChevronLeft size={18} /></button>
          <span className="text-sm font-bold">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="p-2 rounded-lg border disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      )}

      {showModal && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-sm text-blue-600 font-black">{selected.reference_number}</p>
                <h2 className="text-xl font-black uppercase">{selected.category}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <p className="text-gray-700">{selected.description}</p>
            <p className="text-sm text-gray-500"><MapPin size={14} className="inline" /> {selected.location}</p>

            {selected.reporter && (
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-black text-xs uppercase text-gray-400 mb-1">Reporter</p>
                <p className="font-bold">{selected.reporter.full_name}</p>
                <p className="text-gray-500">{selected.reporter.phone} | {selected.reporter.nationality}</p>
              </div>
            )}

            {selected.attachments?.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {selected.attachments.map((a) => (
                  <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer">
                    <img src={a.file_url} alt={a.file_name} className="w-full h-20 object-cover rounded-lg" />
                  </a>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Status</label>
                <select value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })} className="w-full mt-1 p-3 bg-gray-50 rounded-xl font-bold text-sm">
                  {INCIDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Assign To</label>
                <select value={updateForm.assignedTo} onChange={(e) => setUpdateForm({ ...updateForm, assignedTo: e.target.value })} className="w-full mt-1 p-3 bg-gray-50 rounded-xl font-bold text-sm">
                  <option value="">Unassigned</option>
                  {guides.map((g) => <option key={g.id} value={g.id}>{g.full_name}</option>)}
                </select>
              </div>
            </div>

            <CharCounterTextarea
              label="Internal Notes"
              value={updateForm.adminNotes}
              onChange={(e) => setUpdateForm({ ...updateForm, adminNotes: e.target.value })}
              rows={2}
              className="w-full p-3 bg-gray-50 rounded-xl text-sm"
            />

            <CharCounterTextarea
              label="Response Actions"
              value={updateForm.responseActions}
              onChange={(e) => setUpdateForm({ ...updateForm, responseActions: e.target.value })}
              rows={2}
              className="w-full p-3 bg-gray-50 rounded-xl text-sm"
            />

            <button onClick={handleUpdate} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">
              Update Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
