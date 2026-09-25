"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/app/components/ui/Card";
import { AuthBackLink } from "@/app/components/AuthShell";
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { typography, iconSize, authForm } from "@/lib/designSystem";

async function establishRecoverySession() {
  const url = new URL(window.location.href);
  const tokenHash = url.searchParams.get("token_hash");

  if (tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (!error && data.session) {
      window.history.replaceState({}, "", "/reset-password");
      return { ok: true, method: "token_hash_verify" };
    }
    return { ok: false, error: error?.message || "Invalid or expired reset link." };
  }

  const code = url.searchParams.get("code");

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      window.history.replaceState({}, "", "/reset-password");
      return { ok: true, method: "code_exchange" };
    }
    return { ok: false, error: error?.message || "Invalid or expired reset code." };
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const type = hashParams.get("type");

  if (accessToken && refreshToken && type === "recovery") {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error && data.session) {
      window.history.replaceState({}, "", "/reset-password");
      return { ok: true, method: "hash_recovery" };
    }
    return { ok: false, error: error?.message || "Invalid recovery session." };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    return { ok: true, method: "existing_session" };
  }

  return { ok: false, error: "This reset link is invalid or has expired. Please request a new one." };
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { updatePassword, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await establishRecoverySession();
      if (cancelled) return;

      if (result.ok) {
        setReady(true);
        setChecking(false);
        setError(null);
      } else {
        setError(result.error);
        setChecking(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setReady(true);
        setChecking(false);
        setError(null);
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const result = await updatePassword(password);
    if (result.success) {
      setSuccess(true);
      await supabase.auth.signOut();
    } else {
      setError(result.error || "Could not update password. Please try again.");
    }
  };

  if (checking) {
    return (
      <Card className={authForm.card}>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 size={28} className="animate-spin text-blue-600" />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Verifying reset link...</p>
        </div>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className={authForm.card}>
        <div className="text-center">
          <div className="bg-blue-100 size-14 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={iconSize.empty} className="text-blue-600" />
          </div>
          <p className={`${typography.statLabel} tracking-[0.25em] text-blue-600 mb-1`}>Password Updated</p>
          <h1 className={`${typography.heroTitle} mb-2`}>You&apos;re All Set</h1>
          <p className="text-zinc-500 text-xs mb-5 leading-relaxed">
            Your password has been changed. Sign in with your new password.
          </p>
          <button type="button" onClick={() => router.push("/login")} className={authForm.submitBtn}>
            Sign In
          </button>
        </div>
      </Card>
    );
  }

  if (!ready) {
    return (
      <Card className={authForm.card}>
        <AuthBackLink />
        <div className="text-center">
          <p className={`${typography.statLabel} tracking-[0.25em] text-red-600 mb-1`}>Link Expired</p>
          <h1 className={`${typography.heroTitle} mb-2`}>Reset Unavailable</h1>
          <p className="text-zinc-500 text-xs mb-5 leading-relaxed">{error}</p>
          <Link href="/forgot-password" className={authForm.submitBtn}>
            Request New Link
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className={authForm.card}>
      <AuthBackLink />
      <div className={authForm.header}>
        <div className={authForm.iconWrap}>
          <Lock size={iconSize.auth} className="text-white" />
        </div>
        <p className={`${typography.statLabel} tracking-[0.25em] text-blue-600 mb-1`}>Account Recovery</p>
        <h1 className={typography.heroTitle}>New Password</h1>
        <p className={`${typography.description} mt-1 text-xs leading-snug`}>
          Choose a new password for your CONNECT-DAET account.
        </p>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={authForm.formGap}>
        <div className={authForm.fieldGap}>
          <label htmlFor="reset-password" className={authForm.label}>
            <Lock size={12} /> New Password
          </label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              disabled={loading}
              placeholder="At least 8 characters"
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

        <div className={authForm.fieldGap}>
          <label htmlFor="reset-confirm" className={authForm.label}>
            <Lock size={12} /> Confirm Password
          </label>
          <input
            id="reset-confirm"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            disabled={loading}
            placeholder="Re-enter your password"
            className={authForm.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading} className={authForm.submitBtn}>
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Updating...
            </>
          ) : (
            "Update Password"
          )}
        </button>
      </form>
    </Card>
  );
}
