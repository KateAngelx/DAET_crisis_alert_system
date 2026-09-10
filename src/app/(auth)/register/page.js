"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useRouter } from "next/navigation";
import { Card } from "@/app/components/ui/Card";
import { AuthBackLink } from "@/app/components/AuthShell";
import { UserPlus, CheckCircle, ArrowRight, User, Mail, Phone, Globe, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { typography, iconSize, authForm } from "@/lib/designSystem";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    nationality: "Filipino",
  });

  const [isRegistered, setIsRegistered] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [regError, setRegError] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const { register, loading } = useAuthStore();
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError(null);

    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setRegError("Please fill in all required fields.");
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      setRegError("Please agree to the Terms of Service and Privacy Policy before creating an account.");
      return;
    }

    if (formData.password.length < 8) {
      setRegError("Password must be at least 8 characters.");
      return;
    }

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.phone,
      formData.nationality
    );

    if (result.success) {
      setNeedsConfirmation(!!result.needsConfirmation);
      setIsRegistered(true);
    } else {
      setRegError(result.error);
    }
  };

  if (isRegistered) {
    return (
      <Card className={`${authForm.card} animate-in zoom-in-95 duration-300`}>
        <AuthBackLink />
        <div className="text-center">
          <div className="bg-blue-100 size-14 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={iconSize.empty} className="text-blue-600" />
          </div>
          <p className={`${typography.statLabel} tracking-[0.25em] text-blue-600 mb-1`}>Registration Complete</p>
          <h1 className={`${typography.heroTitle} mb-2`}>Welcome, {formData.name.split(" ")[0]}!</h1>
          <p className="text-zinc-500 text-xs mb-5 leading-relaxed">
            {needsConfirmation
              ? "Check your email to confirm your account, then sign in."
              : "Your account is ready. You can now receive alerts and submit reports through CONNECT-DAET."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className={authForm.submitBtn}
          >
            Sign In Now <ArrowRight size={16} />
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${authForm.cardWide} overflow-y-auto`}>
      <AuthBackLink />
      <div className={authForm.header}>
        <div className={authForm.iconWrap}>
          <UserPlus size={iconSize.auth} className="text-white" />
        </div>
        <p className={`${typography.statLabel} tracking-[0.25em] text-blue-600 mb-1`}>Tourist Registration</p>
        <h1 className={typography.heroTitle}>Create Account</h1>
        <p className={`${typography.description} mt-1 text-xs leading-snug`}>
          Register to receive emergency alerts and report incidents in Daet.
        </p>
      </div>

      {regError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
          {regError}
        </div>
      )}

      <form onSubmit={handleRegister} className={authForm.formGap}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={authForm.fieldGap}>
            <label htmlFor="register-name" className={authForm.label}>
              <User size={12} /> Full Name
            </label>
            <input
              id="register-name"
              required
              autoComplete="name"
              disabled={loading}
              placeholder="Juan Dela Cruz"
              className={authForm.input}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className={authForm.fieldGap}>
            <label htmlFor="register-email" className={authForm.label}>
              <Mail size={12} /> Email Address
            </label>
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              disabled={loading}
              placeholder="you@example.com"
              className={authForm.input}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        <div className={authForm.fieldGap}>
          <label htmlFor="register-password" className={authForm.label}>
            <Lock size={12} /> Password
          </label>
          <input
            id="register-password"
            type="password"
            required
            autoComplete="new-password"
            disabled={loading}
            placeholder="Create a secure password"
            className={authForm.input}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={authForm.fieldGap}>
            <label htmlFor="register-phone" className={authForm.label}>
              <Phone size={12} /> Phone Number
            </label>
            <input
              id="register-phone"
              type="tel"
              required
              autoComplete="tel"
              disabled={loading}
              placeholder="09123456789"
              className={authForm.input}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className={authForm.fieldGap}>
            <label htmlFor="register-nationality" className={authForm.label}>
              <Globe size={12} /> Nationality
            </label>
            <select
              id="register-nationality"
              required
              disabled={loading}
              className={`${authForm.input} appearance-none`}
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            >
              <option value="Filipino">Filipino</option>
              <option value="Foreigner">Foreigner</option>
            </select>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              disabled={loading}
              className="mt-0.5 size-4 rounded-md border-2 border-zinc-200 checked:bg-blue-600 checked:border-blue-600 shrink-0"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />
            <span className="text-[10px] font-medium text-zinc-500 leading-relaxed group-hover:text-zinc-700">
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-blue-600 font-black hover:underline">
                Terms of Service
              </Link>
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              disabled={loading}
              className="mt-0.5 size-4 rounded-md border-2 border-zinc-200 checked:bg-blue-600 checked:border-blue-600 shrink-0"
              checked={agreedToPrivacy}
              onChange={(e) => setAgreedToPrivacy(e.target.checked)}
            />
            <span className="text-[10px] font-medium text-zinc-500 leading-relaxed group-hover:text-zinc-700">
              I agree to the{" "}
              <Link href="/privacy" target="_blank" className="text-blue-600 font-black hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !agreedToTerms || !agreedToPrivacy}
          className={authForm.submitBtn}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className={authForm.footer}>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          Already have an account?
          <Link href="/login" className="ml-2 text-blue-600 hover:underline font-black">
            Sign In
          </Link>
        </p>
      </div>
    </Card>
  );
}
