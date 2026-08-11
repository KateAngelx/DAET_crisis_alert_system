"use client";

import React, { useEffect } from "react";
import { useCrisisStore } from "@/app/store/crisisStore";
import { User, Shield, Phone, Globe, Hash } from "lucide-react";
import { Card } from "@/app/components/ui/Card";

export default function AdminUsersPage() {
  const { allUsers, fetchAllUsers, loading } = useCrisisStore();

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-sans tracking-tight">User Management</h1>
          <p className="text-gray-600 font-sans">List of all registered tourists and administrators in the system.</p>
        </div>
        <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl font-bold text-sm">
          Total: {allUsers.length}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <p className="text-gray-400 animate-pulse font-bold uppercase text-xs">Loading User Database...</p>
        ) : allUsers.length > 0 ? (
          allUsers.map((user) => (
            <Card key={user.id} className="p-6 hover:shadow-md transition-all border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl ${user.user_type === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    <User size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight leading-none mb-2">
                      {user.full_name}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-gray-400 tracking-widest">
                        <Shield size={14} className={user.user_type === 'admin' ? 'text-red-500' : 'text-blue-500'}/> 
                        {user.user_type}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                        <Phone size={14} className="text-gray-400"/> {user.phone || 'No Contact'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                        <Globe size={14} className="text-gray-400"/> {user.nationality}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 w-full md:w-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <Hash size={12} className="text-gray-400" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">System UID</p>
                  </div>
                  <p className="font-mono text-[10px] text-gray-500 break-all">{user.id}</p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-[40px]">
             <User size={48} className="mx-auto text-gray-200 mb-4" />
             <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No users found in database</p>
          </div>
        )}
      </div>
    </div>
  );
}