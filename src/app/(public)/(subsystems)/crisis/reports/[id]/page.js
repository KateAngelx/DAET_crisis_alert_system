"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, User, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { useAuthStore } from '@/app/store/crisisStore';
import { useIncidentStore } from '@/app/store/incidentStore';
import { getStatusColor, getSeverityColor } from '@/lib/constants';

export default function ReportDetailPage({ params }) {
  const { id } = React.use(params);
  const { user, isAuthenticated } = useAuthStore();
  const { currentIncident, history, fetchIncidentById, loading } = useIncidentStore();

  useEffect(() => {
    if (id) fetchIncidentById(id);
  }, [id, fetchIncidentById]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <Link href="/login" className="text-blue-600 font-bold uppercase text-xs">Sign In Required</Link>
      </div>
    );
  }

  if (loading || !currentIncident) {
    return <p className="text-center py-20 text-gray-400 animate-pulse font-bold uppercase text-xs">Loading report...</p>;
  }

  const inc = currentIncident;
  const isOwner = inc.reporter_id === user?.id;

  if (!isOwner && user?.role !== 'admin' && user?.role !== 'guide') {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <p className="text-red-500 font-bold">You do not have access to this report.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <Link href="/crisis/reports" className="inline-flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-blue-600">
        <ArrowLeft size={14} /> My Reports
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-blue-600 font-black">{inc.reference_number}</p>
          <h1 className="text-2xl font-black uppercase tracking-tight mt-1">{inc.category}</h1>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${getSeverityColor(inc.severity)}`}>{inc.severity}</span>
          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(inc.status)}`}>{inc.status}</span>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <p className="text-gray-700 leading-relaxed">{inc.description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1"><MapPin size={14} /> {inc.location}</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {new Date(inc.created_at).toLocaleString()}</span>
          {inc.reporter && <span className="flex items-center gap-1"><User size={14} /> {inc.reporter.full_name}</span>}
        </div>
      </Card>

      {inc.attachments?.length > 0 && (
        <Card className="p-6">
          <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
            <ImageIcon size={14} /> Evidence
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {inc.attachments.map((att) => (
              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-gray-100 hover:shadow-md">
                {att.file_type?.startsWith('image/') ? (
                  <img src={att.file_url} alt={att.file_name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="p-4 text-center text-xs font-bold text-gray-500">{att.file_name}</div>
                )}
              </a>
            ))}
          </div>
        </Card>
      )}

      {inc.response_actions && (
        <Card className="p-6 bg-green-50 border-green-100">
          <h3 className="font-black text-xs uppercase tracking-widest text-green-600 mb-2">Response Actions</h3>
          <p className="text-sm text-green-800">{inc.response_actions}</p>
        </Card>
      )}

      {history.length > 0 && (
        <Card className="p-6">
          <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-4">Status History</h3>
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-gray-900">
                    {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status || h.action}
                  </p>
                  {h.notes && <p className="text-gray-500 text-xs mt-0.5">{h.notes}</p>}
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
