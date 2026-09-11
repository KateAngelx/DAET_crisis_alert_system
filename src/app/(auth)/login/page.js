"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useRouter } from "next/navigation";
import { Card } from "@/app/components/ui/Card";
import { AuthBackLink } from "@/app/components/AuthShell";
import { LogIn, Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import Link from "next/link";
import { getRedirectForRole } from "@/lib/authGuard";
import { typography, authForm } from "@/lib/designSystem";

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
    <Card className={authForm.card}>
      <AuthBackLink />
      <div className={authForm.header}>
        <BrandLogo size={44} className="mx-auto mb-3" />
        <p className={`${typography.statLabel} tracking-[0.25em] text-blue-600 mb-1`}>Account Access</p>
        <h1 className={typography.heroTitle}>Sign In</h1>
        <p className={`${typography.description} mt-1 text-xs leading-snug`}>
          Sign in to view alerts, submit reports, and track response status.
        </p>
      </div>

      {loginError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
          <div className="bg-red-600 p-1 rounded-md text-white shrink-0">
            <Lock size={12} />
          </div>
          {loginError}
        </div>
      )}

      <form onSubmit={handleLogin} className={authForm.formGap}>
        <div className={authForm.fieldGap}>
          <label htmlFor="login-email" className={authForm.label}>
            <Mail size={12} /> Email Address
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            disabled={loading}
            placeholder="you@example.com"
            className={authForm.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className={authForm.fieldGap}>
          <div className="flex items-center justify-between ml-1">
            <label htmlFor="login-password" className={authForm.label}>
              <Lock size={12} /> Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              disabled={loading}
              placeholder="Enter your password"
              className={authForm.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            disabled={loading}
            className="size-4 rounded-md border-2 border-zinc-200 checked:bg-blue-600 checked:border-blue-600"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight group-hover:text-zinc-700">
            Keep me signed in
          </span>
        </label>

        <button type="submit" disabled={loading} className={authForm.submitBtn}>
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn size={18} /> Sign In
            </>
          )}
        </button>
      </form>

      <div className={authForm.footer}>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          New to DAET TOURISM?
          <Link href="/register" className="ml-2 text-blue-600 hover:underline font-black">
            Create an account
          </Link>
        </p>
      </div>
    </Card>
  );
}
