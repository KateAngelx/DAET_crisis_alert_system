"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { FileText, Plus, ArrowLeft } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { useAuthStore } from '@/app/store/crisisStore';
import { useIncidentStore } from '@/app/store/incidentStore';
import { getStatusColor, getSeverityColor } from '@/lib/constants';

export default function MyReportsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { incidents, fetchIncidents, loading } = useIncidentStore();

  useEffect(() => {
    if (user?.id) fetchIncidents({ reporterId: user.id });
  }, [user?.id, fetchIncidents]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <p className="text-gray-500 mb-4">Please sign in to view your reports.</p>
        <Link href="/login" className="text-blue-600 font-bold uppercase text-xs">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/crisis" className="inline-flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-blue-600 mb-2">
            <ArrowLeft size={14} /> Crisis Hub
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-tight">My Reports</h1>
        </div>
        <Link href="/crisis/report" className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-full font-black text-xs uppercase">
          <Plus size={16} /> New Report
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400 animate-pulse font-bold uppercase text-xs">Loading reports...</p>
      ) : incidents.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold uppercase text-xs">No reports submitted yet</p>
          <Link href="/crisis/report" className="inline-block mt-4 text-blue-600 font-black text-xs uppercase">Submit your first report</Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <Link key={inc.id} href={`/crisis/reports/${inc.id}`}>
              <Card className="p-5 hover:shadow-md transition-all cursor-pointer">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-blue-600 font-black">{inc.reference_number}</p>
                    <h3 className="font-bold text-gray-900 mt-1">{inc.category}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">{inc.location}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(inc.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getSeverityColor(inc.severity)}`}>
                      {inc.severity}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(inc.status)}`}>
                      {inc.status}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
