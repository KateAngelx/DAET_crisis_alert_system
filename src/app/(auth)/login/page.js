"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useRouter } from "next/navigation";
import { Card } from "@/app/components/ui/Card";
import { LogIn, Zap, Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { getRedirectForRole } from "@/lib/authGuard";
import { typography, iconSize } from "@/lib/designSystem";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const { login, loading } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    if (!email.trim() || !password.trim()) {
      setLoginError("Please enter your email and password.");
      return;
    }
    const result = await login(email, password);
    if (result.success) {
      router.replace(getRedirectForRole(result.role));
    } else {
      setLoginError(result.error || "Invalid email or password. Please try again.");
    }
  };

  return (
    <Card className="max-w-md w-full p-6 sm:p-8 lg:p-10 border-none shadow-2xl bg-white rounded-[32px]">
      <div className="text-center mb-6 sm:mb-8">
        <div className="bg-blue-600 size-12 sm:size-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
          <Zap size={iconSize.auth} className="text-white" fill="white" />
        </div>
        <p className={`${typography.statLabel} tracking-[0.25em] text-blue-600 mb-2`}>Account Access</p>
        <h1 className={typography.heroTitle}>Sign In</h1>
        <p className={`${typography.description} mt-2`}>
          Sign in to view alerts, submit incident reports, and track response status.
        </p>
      </div>

      {loginError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
          <div className="bg-red-600 p-1 rounded-md text-white shrink-0">
            <Lock size={12} />
          </div>
          {loginError}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-1.5 text-left">
          <label htmlFor="login-email" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
            <Mail size={12} /> Email Address
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            disabled={loading}
            placeholder="you@example.com"
            className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 disabled:opacity-50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5 text-left">
          <label htmlFor="login-password" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
            <Lock size={12} /> Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              disabled={loading}
              placeholder="Enter your password"
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 disabled:opacity-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium px-1 pt-1">
            Need help signing in?{" "}
            <Link href="/contact" className="text-blue-600 font-bold hover:underline">
              Contact support
            </Link>
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer group py-1">
          <input
            type="checkbox"
            disabled={loading}
            className="size-5 rounded-lg border-2 border-zinc-200 checked:bg-blue-600 checked:border-blue-600"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight group-hover:text-zinc-700">
            Keep me signed in
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 disabled:bg-blue-400"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn size={20} /> Sign In
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-zinc-50 text-center">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          New to CONNECT-DAET?
          <Link href="/register" className="ml-2 text-blue-600 hover:underline font-black">
            Create an account
          </Link>
        </p>
      </div>
    </Card>
  );
}
