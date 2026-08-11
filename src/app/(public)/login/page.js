"use client";
import React, { useState } from 'react';
import { useAuthStore } from '@/app/store/crisisStore';
import { useRouter } from 'next/navigation';
import { Card } from '@/app/components/ui/Card';
import { LogIn, Zap, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState(null); 
  
  // Kinuha ang login at loading state mula sa store
  const { login, loading } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);

    // Required checks para sa email at password
    if (!email.trim() || !password.trim()) return; 

    // Tinatawag ang async login function
    const result = await login(email, password); 
    
    if (result.success) {
      // FIX: Gumamit ng router.replace para sa admin para iwas-balik sa login
      if (result.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    } else {
      // Ipinapakita ang error message mula sa store/supabase
      setLoginError(result.error || "Invalid login credentials.");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 font-sans text-left">
      <Card className="max-w-md w-full p-10 border-none shadow-2xl bg-white rounded-[32px]">
        <div className="text-center mb-8">
          <div className="bg-blue-600 size-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 animate-in zoom-in duration-500">
            <Zap size={28} className="text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Welcome Back</h1>
          <p className="text-zinc-500 text-sm font-medium italic mt-1">Access the CONNECT-DAET Portal</p>
        </div>

        {/* Error Alert Display */}
        {loginError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold uppercase animate-in fade-in slide-in-from-top-2">
            <div className="bg-red-600 p-1 rounded-md text-white">
              <Lock size={12}/>
            </div>
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
              <Mail size={12}/> Email Address
            </label>
            <input 
              type="email" 
              required 
              disabled={loading}
              placeholder="tourist@example.com" 
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 disabled:opacity-50"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Lock size={12}/> Password
              </label>
              <Link href="#" className="text-[9px] font-black uppercase text-blue-600 hover:underline tracking-widest">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                disabled={loading}
                placeholder="••••••••" 
                className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 disabled:opacity-50"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  disabled={loading}
                  className="peer appearance-none size-5 border-2 border-zinc-200 rounded-lg checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <CheckCircleIcon size={12} className="absolute left-1 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight group-hover:text-zinc-700 transition-colors">Remember Me</span>
            </label>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 disabled:bg-blue-400"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                <LogIn size={20}/> Sign In to Portal
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-50 text-center">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            New to Connect-Daet? 
            <Link href="/register" className="ml-2 text-blue-600 hover:underline font-black">Create Account</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

// Custom Checkbox Icon
function CheckCircleIcon({ size, className }) {
  return (
    <svg 
      className={className} 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}