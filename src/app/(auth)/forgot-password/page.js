"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/app/store/crisisStore";
import { Card } from "@/app/components/ui/Card";
import { AuthBackLink } from "@/app/components/AuthShell";
import { KeyRound, Mail, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { typography, iconSize, authForm } from "@/lib/designSystem";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const { requestPasswordReset, loading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    const result = await requestPasswordReset(email.trim());
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error || "Could not send reset email. Please try again.");
    }
  };

  if (sent) {
    return (
      <Card className={authForm.card}>
        <AuthBackLink />
        <div className="text-center">
          <div className="bg-blue-100 size-14 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={iconSize.empty} className="text-blue-600" />
          </div>
          <p className={`${typography.statLabel} tracking-[0.25em] text-blue-600 mb-1`}>Check Your Email</p>
          <h1 className={`${typography.heroTitle} mb-2`}>Reset Link Sent</h1>
          <p className="text-zinc-500 text-xs mb-5 leading-relaxed">
            If an account exists for <strong className="text-zinc-700">{email}</strong>, check your inbox for a
            CONNECT-DAET password reset email. The link expires in 1 hour.
          </p>
          <Link href="/login" className={authForm.submitBtn}>
            <ArrowLeft size={16} /> Back to Sign In
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
          <KeyRound size={iconSize.auth} className="text-white" />
        </div>
        <p className={`${typography.statLabel} tracking-[0.25em] text-blue-600 mb-1`}>Account Recovery</p>
        <h1 className={typography.heroTitle}>Forgot Password</h1>
        <p className={`${typography.description} mt-1 text-xs leading-snug`}>
          Enter your email and we will send a password reset link from CONNECT-DAET to your inbox.
        </p>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={authForm.formGap}>
        <div className={authForm.fieldGap}>
          <label htmlFor="forgot-email" className={authForm.label}>
            <Mail size={12} /> Email Address
          </label>
          <input
            id="forgot-email"
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

        <button type="submit" disabled={loading} className={authForm.submitBtn}>
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Sending link...
            </>
          ) : (
            "Send Reset Link"
          )}
        </button>
      </form>

      <div className={authForm.footer}>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          Remember your password?
          <Link href="/login" className="ml-2 text-blue-600 hover:underline font-black">
            Sign In
          </Link>
        </p>
      </div>
    </Card>
  );
}
