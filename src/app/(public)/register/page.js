"use client";
import React, { useState } from 'react';
import { useAuthStore } from '@/app/store/crisisStore';
import { useRouter } from 'next/navigation';
import { Card } from '@/app/components/ui/Card';
import { UserPlus, CheckCircle, ArrowRight, User, Mail, Phone, Globe, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    phone: '', 
    nationality: 'Filipino' 
  });
  
  const [isRegistered, setIsRegistered] = useState(false);
  const [regError, setRegError] = useState(null);
  
  const { register, loading } = useAuthStore();
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError(null);

    // Validation: Lahat ng fields ay required
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setRegError("Mangyaring punan ang lahat ng detalye.");
      return;
    }

    // IN-UPDATE: Pinasa ang 5 arguments sa register function
    const result = await register(
      formData.name, 
      formData.email, 
      formData.password, 
      formData.phone, 
      formData.nationality
    );

    if (result.success) {
      setIsRegistered(true);
    } else {
      setRegError(result.error);
    }
  };

  if (isRegistered) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 font-sans">
        <Card className="max-w-md w-full p-10 text-center animate-in zoom-in-95 duration-300 shadow-2xl border-none bg-white rounded-[32px]">
          <div className="bg-green-100 size-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-2">Mabuhay, {formData.name.split(' ')[0]}!</h1>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed italic">
            Ang iyong account ay matagumpay na nagawa sa database. Maaari mo nang ma-access ang CONNECT-DAET.
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
          >
            Mag-Login Na <ArrowRight size={18}/>
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-6 font-sans text-left">
      <Card className="max-w-lg w-full p-10 border-none shadow-2xl bg-white rounded-[32px]">
        <div className="text-center mb-10">
          <div className="bg-zinc-950 size-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <UserPlus size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Mag-Register</h1>
          <p className="text-zinc-500 text-sm font-medium italic mt-1">Sumali sa Connect-Daet para sa ligtas na paglalakbay</p>
        </div>

        {regError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase flex items-center gap-2">
            <Loader2 className="size-3 animate-spin" /> {regError}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
              <User size={12}/> Buong Pangalan
            </label>
            <input 
              required 
              disabled={loading}
              placeholder="Juan Dela Cruz" 
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 transition-all disabled:opacity-50"
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
              <Mail size={12}/> Email Address
            </label>
            <input 
              type="email" 
              required 
              disabled={loading}
              placeholder="juan@example.com" 
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 transition-all disabled:opacity-50"
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
              <Lock size={12}/> Password
            </label>
            <input 
              type="password" 
              required 
              disabled={loading}
              placeholder="••••••••" 
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 transition-all disabled:opacity-50"
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                <Phone size={12}/> Numero ng Telepono
              </label>
              <input 
                type="tel" 
                required 
                disabled={loading}
                placeholder="09123456789" 
                className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 transition-all disabled:opacity-50"
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                <Globe size={12}/> Nasyonalidad
              </label>
              <select 
                required
                disabled={loading}
                className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 appearance-none disabled:opacity-50"
                value={formData.nationality}
                onChange={(e) => setFormData({...formData, nationality: e.target.value})}
              >
                <option value="Filipino">Filipino</option>
                <option value="Foreigner">Foreigner</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-zinc-950 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20}/>
                  Processing...
                </>
              ) : (
                "Kumpirmahin ang Registration"
              )}
            </button>
          </div>
        </form>
        
        <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            May account na? 
            <Link href="/login" className="ml-2 text-blue-600 hover:underline font-black">Mag-Sign In</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}